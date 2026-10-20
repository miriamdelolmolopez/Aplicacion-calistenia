"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "../admin.module.css";
import { MUSCULOS, TIPOS } from "@/lib/ejercicios";

type Filtros = { q: string; musculo: string; material: string; tipo: string };

// Buscador y filtros de la biblioteca: se aplican solos al escribir o elegir (sin pulsar Enter).
export default function FiltrosEjercicios({
  inicial,
  cat,
  archivados,
  materiales,
}: {
  inicial: Filtros;
  cat: string;
  archivados: boolean;
  materiales: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [f, setF] = useState<Filtros>(inicial);
  const primera = useRef(true);

  useEffect(() => {
    if (primera.current) {
      primera.current = false;
      return;
    }
    // Espera un momento tras la última letra para no recargar en cada pulsación.
    const espera = setTimeout(() => {
      const q = new URLSearchParams();
      if (cat) q.set("cat", cat);
      if (archivados) q.set("archivados", "1");
      if (f.q.trim()) q.set("q", f.q.trim());
      if (f.musculo) q.set("musculo", f.musculo);
      if (f.material) q.set("material", f.material);
      if (f.tipo) q.set("tipo", f.tipo);
      const texto = q.toString();
      router.replace(`/admin/ejercicios${texto ? `?${texto}` : ""}`, { scroll: false });
    }, 250);
    return () => clearTimeout(espera);
  }, [f, cat, archivados, router]);

  const hayFiltros = !!(f.q || f.musculo || f.material || f.tipo);

  return (
    <div className={styles.filtros}>
      <div className={styles.campo}>
        <label htmlFor="f-q">Buscar</label>
        <input
          id="f-q"
          type="search"
          value={f.q}
          placeholder="Nombre del ejercicio"
          onChange={(e) => setF((v) => ({ ...v, q: e.target.value }))}
        />
      </div>
      <div className={styles.campo}>
        <label htmlFor="f-musculo">Músculo</label>
        <select id="f-musculo" value={f.musculo} onChange={(e) => setF((v) => ({ ...v, musculo: e.target.value }))}>
          <option value="">Todos</option>
          {MUSCULOS.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.es}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="f-material">Material</label>
        <select id="f-material" value={f.material} onChange={(e) => setF((v) => ({ ...v, material: e.target.value }))}>
          <option value="">Todos</option>
          {materiales.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor="f-tipo">Tipo</label>
        <select id="f-tipo" value={f.tipo} onChange={(e) => setF((v) => ({ ...v, tipo: e.target.value }))}>
          <option value="">Todos</option>
          {TIPOS.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.es}
            </option>
          ))}
        </select>
      </div>
      {hayFiltros && (
        <button
          type="button"
          className={`${styles.boton} ${styles.botonSecundario}`}
          onClick={() => setF({ q: "", musculo: "", material: "", tipo: "" })}
        >
          Quitar filtros
        </button>
      )}
    </div>
  );
}
