"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "../../../admin.module.css";
import estilos from "./textosLegales.module.css";

export type Aceptacion = {
  clave: string;
  tipo: string;
  titulo: string;
  version: string;
  aceptadoEn: string; // ISO
  noAutorizo: boolean;
  hayTexto: boolean;
};

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const cuando = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

// Listado de lo que ha aceptado una persona: ordenar, filtrar por texto, buscar y descargar cada uno en PDF.
// El texto completo de cada versión es largo: se pide solo cuando se pulsa «Ver el texto».
function TextoVersion({ tipo, version, aceptadoEn, hayTexto }: { tipo: string; version: string; aceptadoEn: string; hayTexto: boolean }) {
  const [texto, setTexto] = useState<string | null | undefined>(undefined);
  async function cargar() {
    if (texto !== undefined || !hayTexto) return;
    const { data } = await createClient().from("textos_legales").select("contenido").eq("documento", tipo).eq("version", version).maybeSingle();
    setTexto(data?.contenido ?? null);
  }
  return (
    <details className={styles.detalles} onToggle={(e) => e.currentTarget.open && cargar()}>
      <summary>Ver el texto</summary>
      {!hayTexto || texto === null ? (
        <p className={styles.ayuda}>No se guardó el texto de esta versión: solo consta que la aceptó el {cuando(aceptadoEn)}.</p>
      ) : texto === undefined ? (
        <p className={styles.ayuda}>Cargando…</p>
      ) : (
        <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>{texto}</pre>
      )}
    </details>
  );
}

export default function ListaTextosLegales({ userId, aceptaciones, propia = false, idioma = "es" }: { userId: string; aceptaciones: Aceptacion[]; propia?: boolean; idioma?: "es" | "en" }) {
  const en = idioma === "en";
  const [orden, setOrden] = useState<"reciente" | "antiguo">("reciente");
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const tipos = [...new Map(aceptaciones.map((a) => [a.tipo, a.titulo])).entries()];
  const q = normal(busqueda.trim());
  const visibles = aceptaciones
    .filter((a) => filtro === "todos" || a.tipo === filtro)
    .filter((a) => !q || normal(`${a.titulo} ${a.version} ${cuando(a.aceptadoEn)}`).includes(q))
    .sort((x, y) => (orden === "reciente" ? y.aceptadoEn.localeCompare(x.aceptadoEn) : x.aceptadoEn.localeCompare(y.aceptadoEn)));

  if (aceptaciones.length === 0) {
    return (
      <section className={styles.tarjeta}>
        <p className={styles.ayuda}>{propia ? (en ? "You have not accepted any legal text yet." : "Todavía no has aceptado ningún texto legal.") : "Todavía no ha aceptado ningún texto legal."}</p>
      </section>
    );
  }

  return (
    <>
      <section className={styles.tarjeta}>
        <div className={estilos.controles}>
          <div className={styles.campo}>
            <label htmlFor="tl-buscar">Buscar</label>
            <input id="tl-buscar" type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre, versión o fecha…" />
          </div>
          <div className={styles.campo}>
            <label htmlFor="tl-filtro">Texto</label>
            <select id="tl-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option value="todos">Todos</option>
              {tipos.map(([tipo, titulo]) => (
                <option key={tipo} value={tipo}>
                  {titulo}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="tl-orden">Orden</label>
            <select id="tl-orden" value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)}>
              <option value="reciente">Del más reciente al más antiguo</option>
              <option value="antiguo">Del más antiguo al más reciente</option>
            </select>
          </div>
        </div>
        <p className={styles.ayuda} style={{ margin: 0 }}>
          {visibles.length} de {aceptaciones.length}
        </p>
        <a href={`/admin/usuarios/${userId}/aceptaciones`} download className={`${styles.boton} ${styles.botonSecundario}`}>
          {propia ? (en ? "Download a PDF of the latest version of each text" : "Descargar PDF de lo último que has aceptado de cada texto") : "Descargar PDF de lo último que aceptó de cada texto"}
        </a>
      </section>

      {visibles.length === 0 && <p className={styles.ayuda}>Ningún texto coincide con lo que has buscado.</p>}
      {visibles.map((a) => (
        <section key={a.clave} className={styles.tarjeta}>
          <div className={estilos.cabecera}>
            <div>
              <strong>{a.titulo}</strong>
              <div className={styles.ayuda}>
                Versión {a.version} · {cuando(a.aceptadoEn)}
              </div>
              {a.noAutorizo && <span className={estilos.aviso}>{propia ? (en ? "You did NOT authorise it" : "NO lo autorizaste") : "NO lo autorizó"}</span>}
            </div>
            <a
              href={`/admin/usuarios/${userId}/aceptaciones?tipo=${encodeURIComponent(a.tipo)}&version=${encodeURIComponent(a.version)}`}
              download
              className={`${styles.boton} ${styles.botonSecundario}`}
            >
              Descargar PDF
            </a>
          </div>
          <TextoVersion tipo={a.tipo} version={a.version} aceptadoEn={a.aceptadoEn} hayTexto={a.hayTexto} />
        </section>
      ))}
    </>
  );
}
