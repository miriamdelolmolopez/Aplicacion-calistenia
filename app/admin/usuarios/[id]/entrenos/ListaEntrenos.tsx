"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { fechaCorta, textoHora } from "@/lib/fechas";
import { nombreEstado, tiempo } from "@/lib/entrenoDocumento";
import PanelFiltros from "../../../../PanelFiltros";
import BotonDocumento from "../../../../rutina/BotonDocumento";
import styles from "../../../admin.module.css";
import AccionesFila from "../../../comunes/AccionesFila";
import Buscador from "../../../comunes/Buscador";
import comunes from "../../../comunes/comunes.module.css";
import { IconoOjo } from "../../../comunes/iconos";
import { eliminarEntreno } from "./acciones";
import { EditarEntreno, VerEntreno } from "./DetalleEntreno";

export type FilaEntreno = { id: string; rutina: string; sesion: string; estado: string; empezado: string; duracionSeg: number | null; series: number; hechas: number };

const ORDENES = [
  { v: "reciente", t: "Más recientes primero" },
  { v: "antiguo", t: "Más antiguos primero" },
  { v: "nombre", t: "Nombre (A-Z)" },
  { v: "duracion", t: "Más largos primero" },
  { v: "corto", t: "Más cortos primero" },
];

const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Tarjetas con todos los entrenos de una persona: buscador, filtros y orden; en cada una, ver, editar, descargar y eliminar.
export default function ListaEntrenos({ entrenos }: { userId: string; entrenos: FilaEntreno[] }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [rutina, setRutina] = useState("todas");
  const [orden, setOrden] = useState("reciente");
  const [viendo, setViendo] = useState<FilaEntreno | null>(null);
  const [editando, setEditando] = useState<FilaEntreno | null>(null);
  const [aviso, setAviso] = useState("");
  const [pendiente, empezar] = useTransition();

  const rutinas = useMemo(() => [...new Set(entrenos.map((e) => e.rutina))].sort((a, b) => a.localeCompare(b, "es")), [entrenos]);

  const visibles = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    const lista = entrenos.filter((e) => (estado === "todos" || e.estado === estado) && (rutina === "todas" || e.rutina === rutina) && (!q || sinTildes(`${e.sesion} ${e.rutina} ${fechaCorta(e.empezado)}`).includes(q)));
    const t = (e: FilaEntreno) => new Date(e.empezado).getTime();
    lista.sort((a, b) => {
      if (orden === "antiguo") return t(a) - t(b);
      if (orden === "nombre") return a.sesion.localeCompare(b.sesion, "es") || t(b) - t(a);
      if (orden === "duracion") return (b.duracionSeg ?? 0) - (a.duracionSeg ?? 0);
      if (orden === "corto") return (a.duracionSeg ?? Infinity) - (b.duracionSeg ?? Infinity);
      return t(b) - t(a);
    });
    return lista;
  }, [entrenos, busqueda, estado, rutina, orden]);

  function eliminar(id: string) {
    setAviso("");
    empezar(async () => {
      const r = await eliminarEntreno(id);
      if (r.error) setAviso(r.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <PanelFiltros
        activos={(estado !== "todos" ? 1 : 0) + (rutina !== "todas" ? 1 : 0) + (orden !== "reciente" ? 1 : 0)}
        buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar entrenamiento…" />}
      >
        <div className={styles.campo}>
          <label htmlFor="fe-estado">Estado</label>
          <select id="fe-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="terminado">Terminados</option>
            <option value="descartado">Descartados</option>
            <option value="en_curso">En curso</option>
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="fe-rutina">Rutina</label>
          <select id="fe-rutina" value={rutina} onChange={(e) => setRutina(e.target.value)}>
            <option value="todas">Todas</option>
            {rutinas.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="fe-orden">Ordenar por</label>
          <select id="fe-orden" value={orden} onChange={(e) => setOrden(e.target.value)}>
            {ORDENES.map((o) => (
              <option key={o.v} value={o.v}>
                {o.t}
              </option>
            ))}
          </select>
        </div>
      </PanelFiltros>

      {aviso && (
        <p className={styles.error} role="alert">
          {aviso}
        </p>
      )}
      {visibles.length === 0 && <p className={styles.ayuda}>{entrenos.length === 0 ? "No hay entrenamientos todavía." : "Ningún entrenamiento coincide con la búsqueda."}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {visibles.map((e) => (
          <article key={e.id} className={comunes.fila} style={{ alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setViendo(e)} aria-label={`Ver el entreno ${e.sesion}`} style={{ all: "unset", cursor: "pointer", display: "block", flex: 1, minWidth: 180 }}>
              <strong>{e.sesion}</strong>
              <div className={styles.ayuda}>
                {fechaCorta(e.empezado)} · {textoHora(e.empezado)}
                {e.duracionSeg ? ` · ${tiempo(e.duracionSeg)}` : ""} · {e.hechas}/{e.series} series
                {e.estado !== "terminado" && ` · ${nombreEstado(e.estado)}`}
              </div>
            </button>
            <div className={comunes.acciones}>
              <button type="button" className={comunes.icono} onClick={() => setViendo(e)} aria-label={`Ver ${e.sesion}`} title="Ver">
                <IconoOjo />
              </button>
              <AccionesFila nombre={e.sesion} ocupado={pendiente} alEditar={() => setEditando(e)} alEliminar={() => eliminar(e.id)} extra={<BotonDocumento id={e.id} base={`/api/entreno/${e.id}/documento`} excel className={comunes.icono} />} />
            </div>
          </article>
        ))}
      </div>

      {viendo && <VerEntreno id={viendo.id} nombre={viendo.sesion} cerrar={() => setViendo(null)} />}
      {editando && <EditarEntreno id={editando.id} nombre={editando.sesion} cerrar={() => setEditando(null)} />}
    </div>
  );
}
