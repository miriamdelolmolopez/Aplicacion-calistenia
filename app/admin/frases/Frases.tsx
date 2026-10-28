"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import PanelFiltros from "../../PanelFiltros";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import PanelCompleto from "../comunes/PanelCompleto";
import { borrarFrase, duplicarFrase, guardarFrase } from "./acciones";

export type Frase = { id: string; texto_es: string; texto_en: string; activa: boolean };

// Formulario para añadir una frase (sin frase) o cambiar una (con frase).
function FormularioFrase({ frase, alTerminar }: { frase?: Frase; alTerminar: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();
  const p = frase?.id ?? "n";

  function guardar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setError(null);
    empezar(async () => {
      const r = await guardarFrase(datos);
      if (!r.ok) return setError(r.error ?? "No se ha podido guardar.");
      router.refresh();
      alTerminar();
    });
  }

  return (
    <form onSubmit={guardar} className={styles.tarjeta}>
      <input type="hidden" name="id" value={frase?.id ?? ""} />
      <div className={styles.campo}>
        <label htmlFor={`es-${p}`}>Frase en español</label>
        <input id={`es-${p}`} name="texto_es" maxLength={140} defaultValue={frase?.texto_es} required />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`en-${p}`}>Frase en inglés</label>
        <input id={`en-${p}`} name="texto_en" maxLength={140} defaultValue={frase?.texto_en} required />
      </div>
      <label className={styles.casilla}>
        <input type="checkbox" name="activa" defaultChecked={frase?.activa ?? true} />
        <span>Activa (sale al azar en Inicio)</span>
      </label>
      <button type="submit" className={styles.boton} disabled={pendiente}>
        {pendiente ? "Guardando…" : frase ? "Guardar cambios" : "Añadir frase"}
      </button>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

// Frases de motivación de Inicio: arriba «+ Nueva», buscar y filtrar. Cada fila: editar, duplicar y eliminar.
export default function Frases({ frases }: { frases: Frase[] }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todas");
  const [editando, setEditando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    empezar(async () => {
      const r = await accion();
      if (!r.ok) return setError(r.error ?? "No se ha podido hacer.");
      router.refresh();
    });
  }

  const q = busqueda.trim().toLowerCase();
  const visibles = frases.filter(
    (f) =>
      (f.texto_es.toLowerCase().includes(q) || f.texto_en.toLowerCase().includes(q)) &&
      (estado === "todas" || (estado === "activas" ? f.activa : !f.activa)),
  );
  const abierta = frases.find((f) => f.id === editando);

  return (
    <section className={styles.tarjeta}>
      <h2>Frases de Inicio ({frases.filter((f) => f.activa).length} activas)</h2>
      <p className={styles.ayuda}>Cada vez que una alumna abre la app, sale una de estas frases al azar sobre la foto de Inicio.</p>

      <div className={comunes.barra}>
        <Nuevo etiqueta="Nueva" titulo="Nueva frase" render={(cerrar) => <FormularioFrase alTerminar={cerrar} />} />
      </div>
      <PanelFiltros activos={estado !== "todas" ? 1 : 0} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar frase…" />}>
        <div className={styles.campo}>
          <label htmlFor="ff-frases">Estado</label>
          <select id="ff-frases" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todas">Todas</option>
            <option value="activas">Activas</option>
            <option value="desactivadas">Desactivadas</option>
          </select>
        </div>
      </PanelFiltros>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {visibles.length === 0 && <p className={comunes.sinResultados}>{frases.length === 0 ? "Todavía no hay frases." : "No hay frases con ese filtro."}</p>}
      {visibles.map((f) => (
        <div key={f.id} className={comunes.fila}>
          <div>
            <strong style={f.activa ? undefined : { opacity: 0.5 }}>{f.texto_es}</strong>
            <div className={styles.ayuda}>
              {f.texto_en}
              {!f.activa && " · desactivada"}
            </div>
          </div>
          <AccionesFila
            nombre={f.texto_es.slice(0, 30)}
            ocupado={pendiente}
            alEditar={() => setEditando(f.id)}
            alDuplicar={() => ejecutar(() => duplicarFrase(f.id))}
            alEliminar={() => ejecutar(() => borrarFrase(f.id))}
          />
        </div>
      ))}

      {abierta && (
        <PanelCompleto titulo="Editar frase" cerrar={() => setEditando(null)}>
          <FormularioFrase frase={abierta} alTerminar={() => setEditando(null)} />
        </PanelCompleto>
      )}
    </section>
  );
}
