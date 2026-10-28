"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
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

  useEffect(() => {
    if (!estado.mensaje) return;
    router.refresh();
    const t = setTimeout(alTerminar, 700);
    return () => clearTimeout(t);
  }, [estado, alTerminar, router]);

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
  const [cambios, setCambios] = useState<Record<string, string>>({}); // rutina -> carpeta elegida, todavía sin guardar
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

  const fila = (r: FilaRutina) => (
    <div key={r.id} className={comunes.fila} style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
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
              value={cambios[r.id] ?? r.carpetaId ?? ""}
              disabled={pendiente}
              onChange={(e) => setCambios((c) => ({ ...c, [r.id]: e.target.value }))}
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
            {r.id in cambios && cambios[r.id] !== (r.carpetaId ?? "") && (
              <span style={{ display: "inline-flex", gap: 6, marginLeft: 8 }}>
                <button
                  type="button"
                  className={comunes.volver}
                  disabled={pendiente}
                  onClick={() => {
                    const destino = cambios[r.id] || null;
                    setCambios((c) => {
                      const resto = { ...c };
                      delete resto[r.id];
                      return resto;
                    });
                    ejecutar(() => moverRutina(r.id, destino));
                  }}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className={comunes.volver}
                  onClick={() =>
                    setCambios((c) => {
                      const resto = { ...c };
                      delete resto[r.id];
                      return resto;
                    })
                  }
                >
                  Cancelar
                </button>
              </span>
            )}
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

      {modoDrive && !buscando && (
        <nav aria-label="Carpetas" className={styles.ayuda} style={{ margin: "6px 0 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
          <button type="button" className={comunes.volver} onClick={() => setActual(null)}>
            Rutinas
          </button>
          {migas.map((c) => (
            <span key={c.id} style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              ›
              <button type="button" className={comunes.volver} onClick={() => setActual(c.id)}>
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
          <div key={c.id} className={comunes.fila}>
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
