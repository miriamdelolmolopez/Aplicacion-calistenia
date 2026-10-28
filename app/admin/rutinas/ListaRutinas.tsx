"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import PanelFiltros from "../../PanelFiltros";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AccionesFila from "../comunes/AccionesFila";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import PanelCompleto from "../comunes/PanelCompleto";
import { crearCarpeta, duplicarRutinaLista, eliminarCarpeta, eliminarRutinaLista, moverRutina, renombrarCarpeta } from "./acciones";
import { NuevaRutina, type OpcionAlumno, type OpcionRutina } from "./Nueva";

export type FilaRutina = { id: string; nombre: string; alumno: string; estado: string; resumen: string; carpetaId: string | null };
export type FilaCarpeta = { id: string; nombre: string; padreId: string | null };

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  publicada: { texto: "Publicada", clase: "estadoPublicada" },
  borrador: { texto: "Borrador", clase: "estadoBorrador" },
  historial: { texto: "Historial", clase: "estadoHistorial" },
};

// Crear o renombrar una carpeta.
function FormularioCarpeta({ carpeta, padre, alTerminar }: { carpeta?: FilaCarpeta; padre: string | null; alTerminar: () => void }) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(carpeta ? renombrarCarpeta : crearCarpeta, {});

  // alTerminar cambia en cada refresco de la lista; se guarda aparte para que el temporizador no se reinicie y el panel se cierre.
  const terminar = useRef(alTerminar);
  useEffect(() => {
    terminar.current = alTerminar;
  });

  useEffect(() => {
    if (!estado.mensaje) return;
    router.refresh();
    const t = setTimeout(() => terminar.current(), 700);
    return () => clearTimeout(t);
  }, [estado, router]);

  return (
    <form action={accion} className={styles.tarjeta}>
      {carpeta ? <input type="hidden" name="id" value={carpeta.id} /> : <input type="hidden" name="padre" value={padre ?? ""} />}
      <div className={styles.campo}>
        <label htmlFor="carpeta-nombre">Nombre de la carpeta</label>
        <input id="carpeta-nombre" name="nombre" required maxLength={60} defaultValue={carpeta?.nombre ?? ""} />
      </div>
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Guardando…" : carpeta ? "Guardar nombre" : "Crear carpeta"}
      </button>
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      {estado.mensaje && (
        <p className={styles.aviso} role="status">
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}

// Rutinas de alumnos. Con carpetas funciona como un Drive; sin carpetas, agrupadas por alumno como siempre.
export default function ListaRutinas({
  rutinas,
  carpetas,
  alumnos,
  rutinasBase,
  hayCarpetas,
}: {
  rutinas: FilaRutina[];
  carpetas: FilaCarpeta[];
  alumnos: OpcionAlumno[];
  rutinasBase: OpcionRutina[];
  hayCarpetas: boolean; // si ya existe la tabla de carpetas en la base de datos
}) {
  const router = useRouter();
  const [actual, setActual] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [estado, setEstado] = useState("todos");
  const [alumno, setAlumno] = useState("todos");
  const [renombrando, setRenombrando] = useState<string | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null); // rutina que se está arrastrando
  const [sobre, setSobre] = useState<string | null>(null); // carpeta (o «raiz») sobre la que está
  const [aviso, setAviso] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function ejecutar(accion: () => Promise<Estado>) {
    empezar(async () => {
      const r = await accion();
      setAviso(r);
      if (!r.error) router.refresh();
    });
  }

  const porId = new Map(carpetas.map((c) => [c.id, c]));
  const ruta = (id: string | null): FilaCarpeta[] => {
    const lista: FilaCarpeta[] = [];
    for (let c = id ? porId.get(id) : undefined; c; c = c.padreId ? porId.get(c.padreId) : undefined) lista.unshift(c);
    return lista;
  };
  const nombreRuta = (id: string) => ruta(id).map((c) => c.nombre).join(" / ");
  const migas = ruta(actual);
  const hijas = carpetas.filter((c) => c.padreId === actual).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const modoDrive = hayCarpetas && (carpetas.length > 0 || actual !== null);

  const q = busqueda.trim().toLowerCase();
  const buscando = q !== "" || estado !== "todos" || alumno !== "todos";
  const filtradas = rutinas.filter(
    (r) =>
      (q === "" || r.nombre.toLowerCase().includes(q) || r.alumno.toLowerCase().includes(q)) &&
      (estado === "todos" || r.estado === estado) &&
      (alumno === "todos" || r.alumno === alumno),
  );
  const aqui = buscando ? filtradas : modoDrive ? filtradas.filter((r) => r.carpetaId === actual) : filtradas;
  const alumnosConRutina = [...new Set(rutinas.map((r) => r.alumno))].sort((a, b) => a.localeCompare(b, "es"));
  const abierta = carpetas.find((c) => c.id === renombrando);

  // Arrastrar una rutina y soltarla en una carpeta (o en «Rutinas» para sacarla). Mover no pide confirmación.
  const puedeArrastrar = hayCarpetas && carpetas.length > 0;
  const soltarEn = (destino: string | null) => {
    const id = arrastrando;
    setArrastrando(null);
    setSobre(null);
    const rutina = rutinas.find((x) => x.id === id);
    if (id && rutina && rutina.carpetaId !== destino) ejecutar(() => moverRutina(id, destino));
  };
  const zona = (clave: string, destino: string | null) => ({
    onDragOver: (e: React.DragEvent) => {
      if (!arrastrando) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setSobre(clave);
    },
    onDragLeave: () => setSobre((s) => (s === clave ? null : s)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      soltarEn(destino);
    },
  });
  const resaltado = (clave: string): React.CSSProperties => (sobre === clave ? { outline: "2px dashed var(--acento)", background: "rgba(10, 168, 192, 0.08)" } : {});

  const fila = (r: FilaRutina) => (
    <div
      key={r.id}
      className={comunes.fila}
      style={{ alignItems: "flex-start", flexWrap: "wrap", opacity: arrastrando === r.id ? 0.45 : 1, cursor: puedeArrastrar ? "grab" : undefined }}
      draggable={puedeArrastrar}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", r.id);
        e.dataTransfer.effectAllowed = "move";
        setArrastrando(r.id);
      }}
      onDragEnd={() => {
        setArrastrando(null);
        setSobre(null);
      }}
    >
      <div>
        <strong>{r.nombre}</strong>
        <div className={styles.ayuda}>
          {r.alumno} · {r.resumen}
          {buscando && modoDrive && r.carpetaId && ` · en ${nombreRuta(r.carpetaId)}`}
        </div>
        <span className={`${styles.estadoChip} ${styles[ESTADOS[r.estado]?.clase ?? "estadoBorrador"]}`}>{ESTADOS[r.estado]?.texto ?? r.estado}</span>
        {hayCarpetas && carpetas.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <label className={styles.ayuda} htmlFor={`mv-${r.id}`}>
              Mover a:{" "}
            </label>
            <select
              id={`mv-${r.id}`}
              value={r.carpetaId ?? ""}
              disabled={pendiente}
              onChange={(e) => ejecutar(() => moverRutina(r.id, e.target.value || null))}
              style={{ maxWidth: 220 }}
            >
              <option value="">Inicio</option>
              {carpetas
                .map((c) => ({ id: c.id, texto: nombreRuta(c.id) }))
                .sort((a, b) => a.texto.localeCompare(b.texto, "es"))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.texto}
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
      <AccionesFila
        nombre={r.nombre}
        ocupado={pendiente}
        alEditar={() => router.push(`/admin/rutinas/${r.id}`)}
        alDuplicar={() => ejecutar(() => duplicarRutinaLista(r.id))}
        alEliminar={() => ejecutar(() => eliminarRutinaLista(r.id))}
      />
    </div>
  );

  // Sin carpetas: agrupadas por alumno, como siempre.
  const porAlumno = new Map<string, FilaRutina[]>();
  for (const r of aqui) porAlumno.set(r.alumno, [...(porAlumno.get(r.alumno) ?? []), r]);

  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo etiqueta="Nueva" titulo="Nueva rutina" render={() => <NuevaRutina alumnos={alumnos} rutinasBase={rutinasBase} />} />
        {hayCarpetas && (
          <Nuevo etiqueta="Carpeta" titulo="Nueva carpeta" render={(cerrar) => <FormularioCarpeta padre={actual} alTerminar={cerrar} />} />
        )}
      </div>
      <PanelFiltros
        activos={(estado !== "todos" ? 1 : 0) + (alumno !== "todos" ? 1 : 0)}
        buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar rutina o alumno…" />}
      >
        <div className={styles.campo}>
          <label htmlFor="fr-estado">Estado</label>
          <select id="fr-estado" value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="publicada">Publicadas</option>
            <option value="borrador">Borradores</option>
            <option value="historial">Historial</option>
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="fr-alumno">Alumno</label>
          <select id="fr-alumno" value={alumno} onChange={(e) => setAlumno(e.target.value)}>
            <option value="todos">Todos</option>
            {alumnosConRutina.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </PanelFiltros>

      {puedeArrastrar && <p className={styles.ayuda}>Arrastra una rutina y suéltala sobre una carpeta para moverla (o sobre «Rutinas» para sacarla).</p>}

      {modoDrive && !buscando && (
        <nav aria-label="Carpetas" className={styles.ayuda} style={{ margin: "6px 0 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" className={comunes.volver} style={resaltado("raiz")} onClick={() => setActual(null)} {...zona("raiz", null)}>
            Rutinas
          </button>
          {migas.map((c) => (
            <span key={c.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              ›
              <button type="button" className={comunes.volver} style={resaltado(c.id)} onClick={() => setActual(c.id)} {...zona(c.id, c.id)}>
                {c.nombre}
              </button>
            </span>
          ))}
        </nav>
      )}

      {aviso.error && (
        <p className={styles.error} role="alert">
          {aviso.error}
        </p>
      )}
      {aviso.mensaje && (
        <p className={styles.aviso} role="status">
          {aviso.mensaje}
        </p>
      )}

      {modoDrive &&
        !buscando &&
        hijas.map((c) => (
          <div key={c.id} className={comunes.fila} style={resaltado(c.id)} {...zona(c.id, c.id)}>
            <button type="button" onClick={() => setActual(c.id)} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
              <span aria-hidden="true" style={{ fontSize: 22 }}>
                📁
              </span>
              <div>
                <strong>{c.nombre}</strong>
                <div className={styles.ayuda}>
                  {rutinas.filter((r) => r.carpetaId === c.id).length} rutinas · {carpetas.filter((x) => x.padreId === c.id).length} carpetas
                </div>
              </div>
            </button>
            <AccionesFila nombre={c.nombre} ocupado={pendiente} alEditar={() => setRenombrando(c.id)} alEliminar={() => ejecutar(() => eliminarCarpeta(c.id))} />
          </div>
        ))}

      {aqui.length === 0 && (!modoDrive || buscando || hijas.length === 0) && (
        <p className={comunes.sinResultados}>{rutinas.length === 0 ? "Todavía no hay rutinas de alumnos." : "No hay rutinas aquí."}</p>
      )}

      {modoDrive || buscando
        ? aqui.map(fila)
        : [...porAlumno.entries()].map(([nombre, lista]) => (
            <div key={nombre}>
              <h3 className={styles.dia}>{nombre}</h3>
              {lista.map(fila)}
            </div>
          ))}

      {abierta && (
        <PanelCompleto titulo={`Renombrar ${abierta.nombre}`} cerrar={() => setRenombrando(null)}>
          <FormularioCarpeta carpeta={abierta} padre={abierta.padreId} alTerminar={() => setRenombrando(null)} />
        </PanelCompleto>
      )}
    </div>
  );
}
