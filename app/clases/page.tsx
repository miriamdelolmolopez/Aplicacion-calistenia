"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import { obtenerMisBonos } from "../cuenta/acciones";
import styles from "../formularios.module.css";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import { claveDia, textoDia, textoHora } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";
import {
  cancelarMiReserva,
  reservarClase,
  salirListaEspera,
  unirseListaEspera,
} from "./acciones";

type Clase = {
  id: string;
  tipo: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  ocupadas: number;
  mi_reserva: string | null;
  apuntados: string[];
  plazas_prueba: number;
  ocupadas_prueba: number;
  en_espera: boolean;
  posicion: number;
  hay_espera: number;
  prioridad: boolean;
  tarde: boolean; // quedan menos horas que el límite de cancelación
};

type Aviso = { tipo: "ok" | "error"; clave: ClaveTexto };

type Datos = {
  horas: number;
  rol: string;
  datosCompletos: boolean;
  pruebaGastada: boolean;
  restantes: number | null;
  lista: Clase[];
};

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
    ? await supabase
        .from("profiles")
        .select("rol, datos_completos")
        .eq("id", sesion.user.id)
        .maybeSingle()
    : { data: null };

  const { data } = await supabase.rpc("clases_proximas", { p_dias: dias });
  const ahora = Date.now();
  const lista = ((data ?? []) as Omit<Clase, "tarde">[]).map((c) => ({
    ...c,
    tarde: new Date(c.empieza_en).getTime() - horas * 3600 * 1000 < ahora,
  }));

  const { data: gastada } = await supabase.rpc("mi_prueba_gastada");
  const bonos = await obtenerMisBonos();
  // Solo cuenta el bono de clases grupales (el plan online no tiene clases).
  const activo = bonos.find((b) => b.estado === "activo" && b.servicio === "grupal");

  return {
    horas,
    rol: perfil?.rol ?? "",
    datosCompletos: !!perfil?.datos_completos,
    pruebaGastada: gastada === true,
    restantes: activo ? activo.clasesRestantes : null,
    lista,
  };
}

export default function Clases() {
  const [idioma] = useIdioma();
  const t = textos[idioma];

  const [datos, setDatos] = useState<Datos | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);

  const cargar = useCallback(async () => setDatos(await obtenerDatos()), []);

  useEffect(() => {
    obtenerDatos().then(setDatos);
  }, []);

  const esAlumno = datos?.rol === "alumno";
  const esInvitado = datos?.rol === "invitado";

  async function ejecutar(
    c: Clase,
    accion: () => Promise<{ ok: boolean; codigo?: string; devuelta?: boolean }>,
    claveOk: (devuelta?: boolean) => ClaveTexto,
  ) {
    setAviso(null);
    setConfirmando(null);
    setTrabajando(c.id);
    const r = await accion();
    setTrabajando(null);
    setAviso(
      r.ok
        ? { tipo: "ok", clave: claveOk(r.devuelta) }
        : { tipo: "error", clave: `err_${r.codigo}` as ClaveTexto },
    );
    await cargar();
  }

  const reservar = (c: Clase) =>
    ejecutar(c, () => reservarClase(c.id), () => (esInvitado ? "okReservadaPrueba" : "okReservada"));

  const cancelar = (c: Clase) =>
    c.mi_reserva
      ? ejecutar(
          c,
          () => cancelarMiReserva(c.mi_reserva!),
          (devuelta) =>
            esInvitado
              ? devuelta
                ? "okPruebaConservada"
                : "okPruebaPerdida"
              : devuelta
                ? "okDevuelta"
                : "okPerdida",
        )
      : Promise.resolve();

  const unirse = (c: Clase) => ejecutar(c, () => unirseListaEspera(c.id), () => "okEsperaUnido");
  const salir = (c: Clase) => ejecutar(c, () => salirListaEspera(c.id), () => "okEsperaSalido");

  const porDia = new Map<string, Clase[]>();
  for (const c of datos?.lista ?? []) {
    const dia = claveDia(c.empieza_en);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  const boton = { minHeight: 44 } as const;

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <div className={styles.cabecera}>
        <h1>{t.horarioTitulo}</h1>
        <p>{t.horarioIntro}</p>
      </div>

      {datos && esAlumno && datos.restantes !== null && (
        <p className={styles.aviso}>
          {t.tienesClases}: <strong>{datos.restantes}</strong>
        </p>
      )}
      {datos && esAlumno && datos.restantes === null && (
        <p className={styles.aviso}>{t.sinBono}</p>
      )}
      {datos && esInvitado && (
        <p className={styles.aviso}>
          {datos.pruebaGastada ? (
            t.pruebaUsada
          ) : !datos.datosCompletos ? (
            <>
              {t.completaDatos}{" "}
              <Link href="/datos">
                <strong>{t.completarDatos}</strong>
              </Link>
            </>
          ) : (
            t.tienesPrueba
          )}
        </p>
      )}
      {datos && !esAlumno && !esInvitado && <p className={styles.aviso}>{t.soloAlumnosInfo}</p>}
      {aviso && (
        <p
          className={aviso.tipo === "error" ? styles.error : styles.aviso}
          role={aviso.tipo === "error" ? "alert" : "status"}
        >
          {t[aviso.clave]}
        </p>
      )}

      {datos === null && <p className={styles.aviso}>{t.cargando}</p>}
      {datos?.lista.length === 0 && <p className={styles.aviso}>{t.sinClases}</p>}

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
              const libres = Math.max(c.plazas - c.ocupadas, 0);
              const pruebaLibres = Math.max(
                Math.min(c.plazas_prueba, c.plazas) - c.ocupadas_prueba,
                0,
              );
              const puedeProbar = !!datos && esInvitado && datos.datosCompletos && !datos.pruebaGastada;

              return (
                <li key={c.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                          : `${libres} ${libres === 1 ? t.libre : t.libres} · ${c.ocupadas}/${c.plazas} ${t.plazasTotales}`}
                      </div>
                      {!cancelada && esInvitado && !completa && (
                        <div className={styles.ayuda}>
                          {pruebaLibres} {pruebaLibres === 1 ? t.pruebaLibre : t.pruebaLibres}
                        </div>
                      )}
                      {!cancelada && c.apuntados.length > 0 && (
                        <div className={styles.ayuda}>
                          {t.apuntadosLabel}: {c.apuntados.join(", ")}
                        </div>
                      )}
                      {!cancelada && c.hay_espera > 0 && (
                        <div className={styles.ayuda}>
                          {t.listaEspera}: {c.hay_espera}
                        </div>
                      )}
                    </div>

                    {/* Ya tiene reserva */}
                    {!cancelada && c.mi_reserva && confirmando !== c.id && (
                      <div style={{ textAlign: "right" }}>
                        <div className={styles.ayuda}>✓ {t.reservada}</div>
                        <button
                          className={`${styles.boton} ${styles.botonSecundario}`}
                          style={boton}
                          disabled={trabajando === c.id}
                          onClick={() => setConfirmando(c.id)}
                        >
                          {t.cancelarReserva}
                        </button>
                      </div>
                    )}

                    {/* Alumno sin reserva */}
                    {!cancelada && !c.mi_reserva && esAlumno && (
                      <>
                        {completa && !c.en_espera && (
                          <button
                            className={styles.boton}
                            style={boton}
                            disabled={trabajando === c.id}
                            onClick={() => unirse(c)}
                          >
                            {trabajando === c.id ? t.cargando : t.unirseEspera}
                          </button>
                        )}
                        {completa && c.en_espera && (
                          <div style={{ textAlign: "right" }}>
                            <div className={styles.ayuda}>
                              {t.enListaEspera} · {t.posicion} {c.posicion}
                            </div>
                            <button
                              className={`${styles.boton} ${styles.botonSecundario}`}
                              style={boton}
                              disabled={trabajando === c.id}
                              onClick={() => salir(c)}
                            >
                              {t.salirEspera}
                            </button>
                          </div>
                        )}
                        {!completa && c.prioridad && !c.en_espera && (
                          <span className={styles.ayuda}>{t.plazaParaEspera}</span>
                        )}
                        {!completa && (!c.prioridad || c.en_espera) && (
                          <div style={{ textAlign: "right" }}>
                            {c.prioridad && c.en_espera && (
                              <div className={styles.ayuda}>
                                <strong>{t.hayPlaza}</strong>
                              </div>
                            )}
                            <button
                              className={styles.boton}
                              style={boton}
                              disabled={trabajando === c.id}
                              onClick={() => reservar(c)}
                            >
                              {trabajando === c.id
                                ? t.cargando
                                : c.prioridad && c.en_espera
                                  ? t.confirmarPlaza
                                  : t.reservar}
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Invitado sin reserva */}
                    {!cancelada && !c.mi_reserva && puedeProbar && (
                      <>
                        {completa ? (
                          <span className={styles.ayuda}>{t.completa}</span>
                        ) : pruebaLibres === 0 ? (
                          <span className={styles.ayuda}>{t.sinPlazasPrueba}</span>
                        ) : c.prioridad ? (
                          <span className={styles.ayuda}>{t.plazaParaEspera}</span>
                        ) : (
                          <button
                            className={styles.boton}
                            style={boton}
                            disabled={trabajando === c.id}
                            onClick={() => reservar(c)}
                          >
                            {trabajando === c.id ? t.cargando : t.reservarPrueba}
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  {confirmando === c.id && (
                    <div className={styles.aviso} role="alert">
                      <p style={{ margin: "0 0 10px" }}>
                        {esInvitado
                          ? c.tarde
                            ? t.confirmaPierdePrueba.replace("{h}", String(datos?.horas ?? 2))
                            : t.confirmaConservaPrueba
                          : c.tarde
                            ? t.confirmaPierde.replace("{h}", String(datos?.horas ?? 2))
                            : t.confirmaDevuelve}
                      </p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button className={styles.boton} style={boton} onClick={() => cancelar(c)}>
                          {t.confirmar}
                        </button>
                        <button
                          className={`${styles.boton} ${styles.botonSecundario}`}
                          style={boton}
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
