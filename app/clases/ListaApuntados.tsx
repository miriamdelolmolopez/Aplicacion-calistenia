"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "../Avatar";
import { textoHora } from "@/lib/fechas";
import { marcarAsistenciaClase, obtenerApuntadosClase, type Apuntado } from "./acciones";
import estilos from "./listaApuntados.module.css";

// Ventana para la administradora: todas las personas apuntadas a una clase, con su ficha, sus pagos
// y la opción de marcar que no se presentaron.
export default function ListaApuntados({
  clase,
  fotos,
  alCerrar,
  soloCoach = false,
}: {
  clase: { id: string; tipo: string; empieza_en: string };
  fotos: Record<string, string>;
  alCerrar: () => void;
  soloCoach?: boolean; // un coach no ve los pagos ni el perfil de las personas
}) {
  const [lista, setLista] = useState<Apuntado[] | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [empezada] = useState(() => new Date(clase.empieza_en).getTime() <= Date.now());

  useEffect(() => {
    obtenerApuntadosClase(clase.id).then(setLista);
  }, [clase.id]);

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [alCerrar]);

  async function marcar(p: Apuntado, valor: "no_asistio" | null) {
    setError("");
    setTrabajando(p.reservaId);
    const r = await marcarAsistenciaClase(p.reservaId, valor);
    setTrabajando(null);
    setConfirmando(null);
    if (!r.ok) return setError(r.error ?? "No se ha podido guardar.");
    setLista((l) => (l ?? []).map((x) => (x.reservaId === p.reservaId ? { ...x, asistencia: valor } : x)));
  }

  return (
    <div className={estilos.capa} onClick={alCerrar}>
      <div className={estilos.panel} role="dialog" aria-modal="true" aria-label={clase.tipo} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={estilos.cerrar} aria-label="Cerrar" onClick={alCerrar}>
          ✕
        </button>
        <h2>{clase.tipo}</h2>
        <p className={estilos.sub}>
          {textoHora(clase.empieza_en)} · {lista === null ? "…" : `${lista.length} ${lista.length === 1 ? "persona apuntada" : "personas apuntadas"}`}
        </p>
        {error && (
          <p className={estilos.error} role="alert">
            {error}
          </p>
        )}

        {lista === null && <p className={estilos.sub}>Cargando…</p>}
        {lista?.length === 0 && <p className={estilos.sub}>Todavía no hay nadie apuntado.</p>}

        <ul className={estilos.lista}>
          {(lista ?? []).map((p) => (
            <li key={p.reservaId} className={estilos.tarjeta}>
              <div className={estilos.cabecera}>
                <Avatar nombre={p.nombre} url={fotos[p.userId]} tamano={44} />
                <div className={estilos.nombre}>
                  <strong>{p.nombre}</strong>
                  <span>
                    {p.esPrueba && <em className={estilos.etiqueta}>Clase de prueba</em>}
                    {p.asistencia === "no_asistio" && <em className={`${estilos.etiqueta} ${estilos.noVino}`}>No se presentó</em>}
                  </span>
                </div>
              </div>

              {confirmando === p.reservaId ? (
                <div className={estilos.confirmar} role="alert">
                  <p>¿Vas a marcar que este atleta no se ha presentado?</p>
                  <div className={estilos.botones}>
                    <button type="button" className={estilos.si} disabled={trabajando === p.reservaId} onClick={() => marcar(p, "no_asistio")}>
                      {trabajando === p.reservaId ? "Guardando…" : "Confirmar"}
                    </button>
                    <button type="button" className={estilos.no} onClick={() => setConfirmando(null)}>
                      Descartar
                    </button>
                  </div>
                </div>
              ) : (
                <div className={estilos.acciones}>
                  {!soloCoach && (
                    <>
                      <Link href={`/admin/usuarios/${p.userId}`} className={estilos.enlace}>
                        Perfil
                      </Link>
                      <Link href={`/admin/usuarios/${p.userId}/pagos`} className={estilos.enlace}>
                        Pagos
                      </Link>
                    </>
                  )}
                  {p.asistencia === "no_asistio" ? (
                    <button type="button" className={estilos.deshacer} disabled={trabajando === p.reservaId} onClick={() => marcar(p, null)}>
                      Quitar la marca
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={estilos.cruz}
                      aria-label="Marcar que no se presentó"
                      title={empezada ? "Marcar que no se presentó" : "Solo se puede cuando la clase ya ha empezado"}
                      disabled={!empezada}
                      onClick={() => setConfirmando(p.reservaId)}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
