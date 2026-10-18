"use client";

import Link from "next/link";
import { useState } from "react";
import Avatar from "../../Avatar";
import styles from "../admin.module.css";
import estilos from "./usuarios.module.css";
import { fechaCorta } from "@/lib/fechas";

export type Usuario = {
  id: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
  rol: string;
  foto: string | null;
  creado_en: string;
  ultima_conexion: string | null;
  servicios: string[];
  clases_restantes: number | null;
  bono_caduca: string | null;
  plan_online_hasta: string | null;
  proxima_clase: string | null;
  ultima_clase: string | null;
  clases_mes: number;
  entrenos_mes: number;
  ultimo_entreno: string | null;
};

const FILTROS = [
  { id: "todos", texto: "Todos" },
  { id: "grupal", texto: "Grupales" },
  { id: "individual", texto: "Individuales" },
  { id: "online", texto: "Online" },
  { id: "invitado", texto: "Invitadas" },
  { id: "sin", texto: "Sin servicio" },
] as const;

const NOMBRE_SERVICIO: Record<string, string> = { grupal: "Grupal", individual: "Individual", online: "Online" };

// Días que han pasado desde una fecha (se calcula fuera de los componentes).
function diasDesde(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function hace(dias: number): string {
  return dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;
}

function nombreDe(u: Usuario): string {
  return [u.nombre, u.apellidos].filter(Boolean).join(" ") || u.email || "(sin nombre)";
}

// Resumen de una línea según lo que tenga contratado.
function resumen(u: Usuario): { texto: string; alerta: boolean } {
  const partes: string[] = [];
  let alerta = false;
  const presencial = u.servicios.includes("grupal") || u.servicios.includes("individual");
  const online = u.servicios.includes("online");

  if (presencial) {
    partes.push(
      u.clases_restantes !== null
        ? `Bono: ${u.clases_restantes} ${u.clases_restantes === 1 ? "clase" : "clases"}${u.bono_caduca ? ` · caduca ${fechaCorta(u.bono_caduca)}` : ""}`
        : "Sin bono activo",
    );
  }
  if (online) {
    partes.push(u.plan_online_hasta ? `Plan online hasta ${fechaCorta(u.plan_online_hasta)}` : "Sin plan online activo");
    partes.push(`${u.entrenos_mes} ${u.entrenos_mes === 1 ? "entreno" : "entrenos"} este mes`);
  }
  if (u.ultima_clase) {
    const d = diasDesde(u.ultima_clase);
    partes.push(`Última clase ${hace(d)}`);
    if (presencial && d > 14 && !u.proxima_clase) alerta = true;
  } else if (presencial) {
    partes.push("Aún no ha venido a ninguna clase");
  }
  if (online && u.ultimo_entreno) {
    const d = diasDesde(u.ultimo_entreno);
    partes.push(`Último entreno ${hace(d)}`);
    if (d > 7 && u.plan_online_hasta) alerta = true;
  }
  if (u.rol === "invitado") partes.push(u.ultima_clase ? "Ha hecho su clase de prueba" : "Todavía no ha hecho la clase de prueba");
  if (partes.length === 0) partes.push(`Registrada el ${fechaCorta(u.creado_en)}`);
  return { texto: partes.join(" · "), alerta };
}

export default function ListaUsuarios({ usuarios }: { usuarios: Usuario[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["id"]>("todos");

  const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const q = normal(busqueda.trim());

  const visibles = usuarios.filter((u) => {
    if (filtro === "invitado" && u.rol !== "invitado") return false;
    if (filtro === "sin" && !(u.rol === "alumno" && u.servicios.length === 0)) return false;
    if (["grupal", "individual", "online"].includes(filtro) && !u.servicios.includes(filtro)) return false;
    if (q && !normal(`${nombreDe(u)} ${u.email ?? ""}`).includes(q)) return false;
    return true;
  });

  return (
    <>
      <section className={styles.tarjeta}>
        <div className={styles.campo}>
          <label htmlFor="buscar">Buscar por nombre o correo</label>
          <input id="buscar" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className={estilos.filtros}>
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`${estilos.filtro} ${filtro === f.id ? estilos.filtroActivo : ""}`}
              onClick={() => setFiltro(f.id)}
            >
              {f.texto}
            </button>
          ))}
        </div>
        <p className={styles.ayuda}>
          {visibles.length} de {usuarios.length} {usuarios.length === 1 ? "persona" : "personas"}
        </p>
      </section>

      <ul className={estilos.lista}>
        {visibles.map((u) => {
          const r = resumen(u);
          return (
            <li key={u.id}>
              <Link href={`/admin/usuarios/${u.id}`} className={estilos.fila}>
                <Avatar nombre={nombreDe(u)} url={u.foto} tamano={48} />
                <div className={estilos.datos}>
                  <strong>{nombreDe(u)}</strong>
                  <div className={estilos.etiquetas}>
                    {u.rol === "invitado" && <span className={styles.etiquetaSuave}>Invitada</span>}
                    {u.servicios.map((s) => (
                      <span key={s} className={styles.etiquetaSuave}>
                        {NOMBRE_SERVICIO[s] ?? s}
                      </span>
                    ))}
                  </div>
                  <div className={`${styles.ayuda} ${r.alerta ? estilos.alerta : ""}`}>{r.texto}</div>
                </div>
                <span aria-hidden="true">›</span>
              </Link>
            </li>
          );
        })}
        {visibles.length === 0 && <p className={styles.ayuda}>No hay nadie que coincida.</p>}
      </ul>
    </>
  );
}
