"use client";

import { useCallback, useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import { obtenerMisBonos } from "../cuenta/acciones";
import styles from "../formularios.module.css";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import { claveDia, textoDia, textoHora } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";
import { cancelarMiReserva, reservarClase } from "./acciones";

type Clase = {
  id: string;
  tipo: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  ocupadas: number;
  mi_reserva: string | null;
  apuntados: string[];
  tarde: boolean; // quedan menos horas que el límite de cancelación
};

type Aviso = { tipo: "ok" | "error"; clave: ClaveTexto };

type Datos = { horas: number; esAlumno: boolean; restantes: number | null; lista: Clase[] };

// Lee todo lo que necesita la pantalla (no cambia ningún estado).
async function obtenerDatos(): Promise<Datos> {
  const supabase = createClient();

  const { data: ajustes } = await supabase.from("ajustes").select("clave, valor");
  const valor = (clave: string, defecto: number) =>
    Number(ajustes?.find((a) => a.clave === clave)?.valor ?? defecto);
  const horas = valor("cancelacion_horas", 2);
  const dias = valor("reserva_dias_max", 14);

  const { data: sesion } = await supabase.auth.getUser();
  const { data: perfil } = sesion.user
    ? await supabase.from("profiles").select("rol").eq("id", sesion.user.id).maybeSingle()
    : { data: null };

  const { data } = await supabase.rpc("clases_proximas", { p_dias: dias });
  const ahora = Date.now();
  const lista = ((data ?? []) as Omit<Clase, "tarde">[]).map((c) => ({
    ...c,
    tarde: new Date(c.empieza_en).getTime() - horas * 3600 * 1000 < ahora,
  }));

  const bonos = await obtenerMisBonos();
  const activo = bonos.find((b) => b.estado === "activo");

  return {
    horas,
    esAlumno: perfil?.rol === "alumno",
    restantes: activo ? activo.clasesRestantes : null,
    lista,
  };
}

export default function Clases() {
  const [idioma] = useIdioma();
  const t = textos[idioma];

  const [clases, setClases] = useState<Clase[] | null>(null);
  const [horas, setHoras] = useState(2);
  const [esAlumno, setEsAlumno] = useState(false);
  const [restantes, setRestantes] = useState<number | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const aplicar = useCallback((d: Datos) => {
    setHoras(d.horas);
    setEsAlumno(d.esAlumno);
    setRestantes(d.restantes);
    setClases(d.lista);
  }, []);

  const cargar = useCallback(async () => aplicar(await obtenerDatos()), [aplicar]);

  useEffect(() => {
    obtenerDatos().then(aplicar);
  }, [aplicar]);

  async function reservar(c: Clase) {
    setAviso(null);
    setTrabajando(c.id);
    const r = await reservarClase(c.id);
    setTrabajando(null);
    setAviso(
      r.ok
        ? { tipo: "ok", clave: "okReservada" }
        : { tipo: "error", clave: `err_${r.codigo}` as ClaveTexto },
    );
    await cargar();
  }

  async function cancelar(c: Clase) {
    if (!c.mi_reserva) return;
    setAviso(null);
    setConfirmando(null);
    setTrabajando(c.id);
    const r = await cancelarMiReserva(c.mi_reserva);
    setTrabajando(null);
    setAviso(
      r.ok
        ? { tipo: "ok", clave: r.devuelta ? "okDevuelta" : "okPerdida" }
        : { tipo: "error", clave: `err_${r.codigo}` as ClaveTexto },
    );
    await cargar();
  }

  const porDia = new Map<string, Clase[]>();
  for (const c of clases ?? []) {
    const dia = claveDia(c.empieza_en);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/cuenta", texto: "volver" }} />
      <div className={styles.cabecera}>
        <h1>{t.horarioTitulo}</h1>
        <p>{t.horarioIntro}</p>
      </div>

      {esAlumno && restantes !== null && (
        <p className={styles.aviso}>
          {t.tienesClases}: <strong>{restantes}</strong>
        </p>
      )}
      {clases && esAlumno && restantes === null && (
        <p className={styles.aviso}>{t.sinBono}</p>
      )}
      {clases && !esAlumno && <p className={styles.aviso}>{t.soloAlumnosInfo}</p>}
      {aviso && (
        <p
          className={aviso.tipo === "error" ? styles.error : styles.aviso}
          role={aviso.tipo === "error" ? "alert" : "status"}
        >
          {t[aviso.clave]}
        </p>
      )}

      {clases === null && <p className={styles.aviso}>{t.cargando}</p>}
      {clases?.length === 0 && <p className={styles.aviso}>{t.sinClases}</p>}

      {[...porDia.entries()].map(([dia, lista]) => (
        <section key={dia} className={styles.tarjeta} style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>
            {textoDia(lista[0].empieza_en, idioma)}
          </h2>
          <ul
            className={styles.lista}
            style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 18 }}
          >
            {lista.map((c) => {
              const cancelada = c.estado === "cancelada";
              const completa = c.ocupadas >= c.plazas;
              return (
                <li
                  key={c.id}
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      opacity: cancelada ? 0.55 : 1,
                    }}
                  >
                    <div>
                      <strong style={{ textDecoration: cancelada ? "line-through" : "none" }}>
                        {textoHora(c.empieza_en)} · {c.tipo}
                      </strong>
                      <div className={styles.ayuda}>
                        {cancelada
                          ? t.cancelada
                          : `${Math.max(c.plazas - c.ocupadas, 0)} ${
                              c.plazas - c.ocupadas === 1 ? t.libre : t.libres
                            } · ${c.ocupadas}/${c.plazas} ${t.plazasTotales}`}
                      </div>
                      {!cancelada && c.apuntados.length > 0 && (
                        <div className={styles.ayuda}>
                          {t.apuntadosLabel}: {c.apuntados.join(", ")}
                        </div>
                      )}
                    </div>

                    {!cancelada && c.mi_reserva && confirmando !== c.id && (
                      <div style={{ textAlign: "right" }}>
                        <div className={styles.ayuda}>✓ {t.reservada}</div>
                        <button
                          className={`${styles.boton} ${styles.botonSecundario}`}
                          style={{ minHeight: 44 }}
                          disabled={trabajando === c.id}
                          onClick={() => setConfirmando(c.id)}
                        >
                          {t.cancelarReserva}
                        </button>
                      </div>
                    )}

                    {!cancelada && !c.mi_reserva && esAlumno && !completa && (
                      <button
                        className={styles.boton}
                        style={{ minHeight: 44 }}
                        disabled={trabajando === c.id}
                        onClick={() => reservar(c)}
                      >
                        {trabajando === c.id ? t.cargando : t.reservar}
                      </button>
                    )}

                    {!cancelada && !c.mi_reserva && completa && (
                      <span className={styles.ayuda}>{t.completa}</span>
                    )}
                  </div>

                  {confirmando === c.id && (
                    <div className={styles.aviso} role="alert">
                      <p style={{ margin: "0 0 10px" }}>
                        {c.tarde
                          ? t.confirmaPierde.replace("{h}", String(horas))
                          : t.confirmaDevuelve}
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          className={styles.boton}
                          style={{ minHeight: 44 }}
                          onClick={() => cancelar(c)}
                        >
                          {t.confirmar}
                        </button>
                        <button
                          className={`${styles.boton} ${styles.botonSecundario}`}
                          style={{ minHeight: 44 }}
                          onClick={() => setConfirmando(null)}
                        >
                          {t.noCancelar}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </main>
  );
}
