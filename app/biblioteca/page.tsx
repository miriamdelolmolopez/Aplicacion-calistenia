"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import Cargando from "../Cargando";
import styles from "../formularios.module.css";
import Icono from "../Icono";
import aprende from "../aprende/aprende.module.css";
import { useIdioma } from "../useIdioma";
import estilos from "./biblioteca.module.css";
import Medidor from "./Medidor";
import { CATEGORIAS } from "@/lib/ejercicios";
import { createClient } from "@/lib/supabase/client";

type Fila = {
  id: string;
  nombre: string;
  nombre_en: string | null;
  categoria: string;
  foto_url: string | null;
  dificultad: string | null;
  ejercicio_materiales: { materiales: { nombre: string; nombre_en: string | null } | null }[];
};

const limpiar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Los ejercicios que la persona tiene en sus rutinas, con buscador y filtro por tipo.
export default function Biblioteca() {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const [lista, setLista] = useState<Fila[] | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("todas");

  useEffect(() => {
    createClient()
      .from("ejercicios")
      .select("id, nombre, nombre_en, categoria, foto_url, dificultad, ejercicio_materiales(materiales(nombre, nombre_en))")
      .eq("activo", true)
      .order("nombre")
      .then(({ data }) => setLista((data ?? []) as unknown as Fila[]));
  }, []);

  const nombre = (e: Fila) => (en && e.nombre_en) || e.nombre;
  const q = limpiar(busqueda.trim());
  const visibles = (lista ?? []).filter((e) => (categoria === "todas" || e.categoria === categoria) && (!q || limpiar(`${e.nombre} ${e.nombre_en ?? ""}`).includes(q)));
  const categorias = CATEGORIAS.filter((c) => (lista ?? []).some((e) => e.categoria === c.valor));

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 6px", fontSize: "2rem" }}>{en ? "Exercise library" : "Biblioteca de ejercicios"}</h1>
      <p className={styles.ayuda}>{en ? "The exercises in your routines: watch how they are done." : "Los ejercicios de tus rutinas: mira cómo se hacen."}</p>

      <div className={aprende.buscador}>
        <Icono nombre="lupa" tamano={22} />
        <input type="search" value={busqueda} placeholder={en ? "Search an exercise" : "Buscar un ejercicio"} aria-label={en ? "Search an exercise" : "Buscar un ejercicio"} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      {categorias.length > 1 && (
        <div className={aprende.chips} style={{ marginBottom: 14 }}>
          <button type="button" className={`${aprende.chip} ${categoria === "todas" ? aprende.chipActivo : ""}`} onClick={() => setCategoria("todas")}>
            {en ? "All" : "Todos"}
          </button>
          {categorias.map((c) => (
            <button key={c.valor} type="button" className={`${aprende.chip} ${categoria === c.valor ? aprende.chipActivo : ""}`} onClick={() => setCategoria(c.valor)}>
              {c[idioma]}
            </button>
          ))}
        </div>
      )}

      {lista === null && <Cargando />}
      {lista !== null && lista.length === 0 && <p className={styles.aviso}>{en ? "When you have a routine, its exercises will show up here." : "Cuando tengas una rutina, sus ejercicios saldrán aquí."}</p>}
      {lista !== null && lista.length > 0 && visibles.length === 0 && <p className={styles.aviso}>{en ? "No exercise matches your search." : "Ningún ejercicio coincide con tu búsqueda."}</p>}

      <div className={estilos.lista}>
        {visibles.map((e) => {
          const materiales = e.ejercicio_materiales.map((m) => (en && m.materiales?.nombre_en) || m.materiales?.nombre).filter(Boolean);
          return (
            <Link key={e.id} href={`/biblioteca/${e.id}`} className={estilos.tarjeta}>
              <span className={estilos.foto} style={e.foto_url ? { backgroundImage: `url("${e.foto_url}")` } : undefined} />
              <span className={estilos.texto}>
                <strong>{nombre(e)}</strong>
                <small>
                  {CATEGORIAS.find((c) => c.valor === e.categoria)?.[idioma]}
                  {materiales.length > 0 && ` · ${materiales.join(", ")}`}
                </small>
                <Medidor dificultad={e.dificultad} idioma={idioma} />
              </span>
              <span aria-hidden="true">›</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
