"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useEffect,
  useId,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { FotoEditable, FotoRutina, IconoBoton, PreviaAlumno, ResumenRutina, VentanaMusculos } from "./PiezasEditor";
import { minutosEstimados } from "@/lib/duracion";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import AyudaI from "../../comunes/AyudaI";
import {
  CATEGORIAS,
  TIPOS,
  nombreCategoria,
  nombreTipo,
  type Campo,
} from "@/lib/ejercicios";
import {
  actualizarRutina,
  agregarItem,
  agregarSesion,
  copiarRutina,
  despublicarRutina,
  eliminarRutina,
  guardarCambioSemana,
  guardarExtraSemana,
  guardarItem,
  publicarRutina,
  quitarCambioSemana,
  quitarExtraSemana,
  quitarItem,
  quitarSesion,
  archivarSesion,
  renombrarSesion,
  reordenarItems,
  reordenarSesiones,
  separarItem,
  unirConAnterior,
  type Resultado,
} from "../acciones";

export type CatalogoEjercicio = {
  id: string;
  nombre: string;
  categoria: string;
  tipo: string;
  activo: boolean;
  musculos: { musculo: string; rol: string }[];
  materiales: string[];
  foto_url?: string | null;
};

export type ItemRutina = {
  id: string;
  ejercicio_id: string;
  orden: number;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  descanso_seg: number;
  nota: string | null;
  grupo: number | null;
};

export type CambioSemana = {
  id: string;
  item_id: string;
  semana: number;
  ejercicio_id: string | null;
  series: number | null;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  descanso_seg: number | null;
  nota: string | null;
  quitado: boolean;
};

export type ExtraSemana = {
  id: string;
  sesion_id: string;
  semana: number;
  ejercicio_id: string;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  descanso_seg: number | null;
  nota: string | null;
};

export type SesionRutina = {
  id: string;
  nombre: string;
  nota: string | null;
  foto_url: string | null;
  orden: number;
  archivada: boolean;
  items: ItemRutina[];
};

export type DatosRutina = {
  id: string;
  nombre: string;
  nota: string | null;
  estado: string;
  entrenosSemana: number | null;
  semanas: number;
  esPlantilla: boolean;
  alumno: string | null;
  fotoUrl: string | null;
};

type Avisar = (mensaje: string) => void;

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  publicada: { texto: "Publicada", clase: "estadoPublicada" },
  borrador: { texto: "Borrador", clase: "estadoBorrador" },
  historial: { texto: "Historial", clase: "estadoHistorial" },
};

function Mensajes({ estado }: { estado: Estado }) {
  return (
    <>
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
    </>
  );
}

// ---------- Arrastrar y ordenar ----------

function ListaOrdenable({
  ids,
  onReordenar,
  children,
}: {
  ids: string[];
  onReordenar: (ids: string[]) => void;
  children: ReactNode;
}) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const idDnd = useId();

  function alSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    const desde = ids.indexOf(String(active.id));
    const hasta = ids.indexOf(String(over.id));
    if (desde < 0 || hasta < 0) return;
    onReordenar(arrayMove(ids, desde, hasta));
  }

  return (
    <DndContext id={idDnd} sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

function Ordenable({ id, children }: { id: string; children: (asa: ReactNode) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const asa = (
    <button
      type="button"
      className={styles.asa}
      aria-label="Arrastrar para ordenar"
      {...attributes}
      {...listeners}
    >
      ⠿
    </button>
  );
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        position: "relative",
        zIndex: isDragging ? 2 : "auto",
      }}
    >
      {children(asa)}
    </div>
  );
}

// Orden mostrado: mientras se guarda un cambio de orden se ve ya el resultado.
function useOrden<T extends { id: string }>(
  elementos: T[],
  guardar: (ids: string[]) => Promise<Resultado>,
  avisar: Avisar,
) {
  const [local, setLocal] = useState<string[] | null>(null);
  const [, empezar] = useTransition();

  const mostrados = local
    ? local.map((id) => elementos.find((e) => e.id === id)).filter((e): e is T => !!e)
    : elementos;
  const ids = mostrados.map((e) => e.id);

  const reordenar = (nuevo: string[]) => {
    setLocal(nuevo);
    empezar(async () => {
      const r = await guardar(nuevo);
      if (!r.ok) avisar(r.error ?? "No se ha podido ordenar.");
      setLocal(null);
    });
  };
  const mover = (id: string, direccion: -1 | 1) => {
    const i = ids.indexOf(id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= ids.length) return;
    reordenar(arrayMove(ids, i, j));
  };

  return { mostrados, ids, reordenar, mover };
}

function useEjecutar(avisar: Avisar) {
  const [pendiente, empezar] = useTransition();
  const ejecutar = (accion: () => Promise<Resultado>) => {
    empezar(async () => {
      const r = await accion();
      if (!r.ok) avisar(r.error ?? "No se ha podido completar.");
    });
  };
  return { pendiente, ejecutar };
}

// ---------- Resumen de material y músculos ----------

// ---------- Un ejercicio de la sesión ----------

function textoObjetivo(item: ItemRutina, campos: readonly Campo[]): string {
  const partes: string[] = [];
  if (campos.includes("reps") && item.reps_min !== null) {
    partes.push(item.reps_max ? `${item.reps_min}-${item.reps_max} rep.` : `${item.reps_min} rep.`);
  }
  if (campos.includes("segundos") && item.segundos_min !== null) {
    partes.push(item.segundos_max ? `${item.segundos_min}-${item.segundos_max} s` : `${item.segundos_min} s`);
  }
  if (campos.includes("peso") && item.peso_kg !== null) partes.push(`${item.peso_kg} kg`);
  if (campos.includes("distancia") && item.distancia_m !== null) partes.push(`${item.distancia_m} m`);
  return `${item.series} × ${partes.join(" · ") || "—"}`;
}

// Cambiar un ejercicio solo en una semana: lo que se deja vacío se queda como en la rutina.
function CambiosSemana({
  rutinaId,
  item,
  semanas,
  cambios,
  opciones,
  catalogo,
  avisar,
}: {
  rutinaId: string;
  item: ItemRutina;
  semanas: number;
  cambios: CambioSemana[];
  opciones: CatalogoEjercicio[];
  catalogo: Map<string, CatalogoEjercicio>;
  avisar: Avisar;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarCambioSemana, {});
  const { pendiente: ocupado, ejecutar } = useEjecutar(avisar);
  const resumen = (x: CambioSemana) => {
    if (x.quitado) return "ese ejercicio no se hace";
    const partes: string[] = [];
    if (x.ejercicio_id) partes.push(catalogo.get(x.ejercicio_id)?.nombre ?? "otro ejercicio");
    if (x.series !== null) partes.push(`${x.series} series`);
    if (x.reps_min !== null) partes.push(`${x.reps_min}${x.reps_max ? `-${x.reps_max}` : ""} reps`);
    if (x.segundos_min !== null) partes.push(`${x.segundos_min}${x.segundos_max ? `-${x.segundos_max}` : ""} s`);
    if (x.peso_kg !== null) partes.push(`${x.peso_kg} kg`);
    if (x.distancia_m !== null) partes.push(`${x.distancia_m} m`);
    if (x.descanso_seg !== null) partes.push(`descanso ${x.descanso_seg} s`);
    if (x.nota) partes.push("con nota");
    return partes.join(" · ") || "igual que la rutina";
  };

  return (
    <details className={styles.detalles}>
      <summary>Cambiar solo en una semana{cambios.length > 0 ? ` (${cambios.length})` : ""}</summary>
      {cambios.length > 0 && (
        <ul className={styles.lista}>
          {cambios.map((x) => (
            <li key={x.id} className={styles.personaCabecera}>
              <span>
                <strong>Semana {x.semana}:</strong> {resumen(x)}
              </span>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={ocupado} onClick={() => ejecutar(() => quitarCambioSemana(rutinaId, x.id))}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <form action={accion} className={styles.formularioInterno}>
        <input type="hidden" name="item" value={item.id} />
        <input type="hidden" name="rutina" value={rutinaId} />
        <label className={styles.casilla}>
          <input type="checkbox" name="quitar" />
          Quitar este ejercicio esa semana (no se hace)
        </label>
        <p className={styles.ayuda}>Elige la semana y rellena solo lo que cambia: lo que dejes vacío se queda como en la rutina. Si cambias el ejercicio, pon también sus series y repeticiones.</p>
        <div className={styles.camposItem}>
          <div className={styles.campo}>
            <label htmlFor={`cs-semana-${item.id}`}>Semana <AyudaI texto="La semana de la rutina en la que vale este cambio. Las demás semanas no cambian." /></label>
            <select id={`cs-semana-${item.id}`} name="semana" required defaultValue="">
              <option value="" disabled>
                Elige…
              </option>
              {Array.from({ length: semanas }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Semana {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cs-ej-${item.id}`}>Ejercicio</label>
            <select id={`cs-ej-${item.id}`} name="ejercicio" defaultValue={item.ejercicio_id}>
              {opciones.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id === item.ejercicio_id ? `${e.nombre} (el de la rutina)` : e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cs-se-${item.id}`}>Series</label>
            <input id={`cs-se-${item.id}`} name="series" type="number" min={1} max={20} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cs-rm-${item.id}`}>Repeticiones</label>
            <input id={`cs-rm-${item.id}`} name="reps_min" type="number" min={1} max={500} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cs-rx-${item.id}`}>hasta</label>
            <input id={`cs-rx-${item.id}`} name="reps_max" type="number" min={1} max={500} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cs-sm-${item.id}`}>Segundos</label>
            <input id={`cs-sm-${item.id}`} name="segundos_min" type="number" min={1} max={7200} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cs-sx-${item.id}`}>hasta</label>
            <input id={`cs-sx-${item.id}`} name="segundos_max" type="number" min={1} max={7200} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cs-pe-${item.id}`}>Peso (kg)</label>
            <input id={`cs-pe-${item.id}`} name="peso_kg" inputMode="decimal" />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cs-di-${item.id}`}>Distancia (m)</label>
            <input id={`cs-di-${item.id}`} name="distancia_m" type="number" min={1} max={100000} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cs-de-${item.id}`}>Descanso (s)</label>
            <input id={`cs-de-${item.id}`} name="descanso_seg" type="number" min={0} max={900} />
          </div>
        </div>
        <div className={styles.campo}>
          <label htmlFor={`cs-no-${item.id}`}>Nota para esa semana (opcional) <AyudaI texto="Un consejo que solo ve la persona esa semana." /></label>
          <input id={`cs-no-${item.id}`} name="nota" maxLength={300} />
        </div>
        <button className={styles.boton} type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar el cambio de esa semana"}
        </button>
        <Mensajes estado={estado} />
      </form>
    </details>
  );
}

function TarjetaItem({
  rutinaId,
  item,
  ejercicio,
  etiquetaSuper,
  esUltimoDelGrupo,
  puedeUnir,
  asa,
  subir,
  bajar,
  avisar,
  semanas,
  cambios,
  opciones,
  catalogo,
}: {
  semanas: number;
  cambios: CambioSemana[];
  opciones: CatalogoEjercicio[];
  catalogo: Map<string, CatalogoEjercicio>;
  rutinaId: string;
  item: ItemRutina;
  ejercicio: CatalogoEjercicio | undefined;
  etiquetaSuper: string | null;
  esUltimoDelGrupo: boolean;
  puedeUnir: boolean;
  asa: ReactNode;
  subir: (() => void) | null;
  bajar: (() => void) | null;
  avisar: Avisar;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarItem, {});
  const { pendiente: ocupado, ejecutar } = useEjecutar(avisar);
  const tipo = TIPOS.find((t) => t.valor === ejercicio?.tipo);
  const campos: readonly Campo[] = tipo?.campos ?? [];

  const enSuper = item.grupo !== null;
  const [abierto, setAbierto] = useState(false);
  const [musculos, setMusculos] = useState(false);
  // Al quitar un ejercicio desaparece al momento; el servidor lo borra y recarga la rutina después (si falla, vuelve a salir).
  const [quitado, setQuitado] = useState(false);

  if (quitado) return null;

  return (
    <div className={`${styles.itemCaja} ${enSuper ? styles.itemSuper : ""}`}>
      <div className={styles.itemCabecera}>
        {asa}
        {ejercicio && (
          <FotoEditable
            destino="ejercicio"
            id={item.ejercicio_id}
            url={ejercicio.foto_url ?? null}
            etiqueta="este ejercicio"
            tamano={72}
            aviso="Esta foto es la del ejercicio: se verá igual en todas las rutinas."
          />
        )}
        <div className={styles.itemTitulo} onClick={() => setAbierto((a) => !a)} style={{ cursor: "pointer" }}>
          <strong>
            {etiquetaSuper && <span className={styles.etiquetaSuper}>{etiquetaSuper}</span>}
            {ejercicio?.nombre ?? "(ejercicio borrado)"}
          </strong>
          <div className={styles.ayuda}>
            {ejercicio ? `${nombreCategoria(ejercicio.categoria)} · ${nombreTipo(ejercicio.tipo)} · ` : ""}
            {textoObjetivo(item, campos)} · descanso {item.descanso_seg} s
            {!ejercicio?.activo && ejercicio && " · archivado"}
          </div>
          {item.nota && <div className={styles.ayuda}>📝 {item.nota}</div>}
        </div>
        <div style={{ display: "flex", gap: 6, flex: "none", marginLeft: "auto" }}>
          <IconoBoton titulo={abierto ? "Cerrar" : "Editar el ejercicio"} onClick={() => setAbierto((a) => !a)}>
            ✎
          </IconoBoton>
          <IconoBoton titulo="Ver los músculos" onClick={() => setMusculos(true)}>
            🧍
          </IconoBoton>
          <IconoBoton
            titulo="Quitar el ejercicio"
            peligro
            disabled={ocupado}
            onClick={() => {
              if (!window.confirm("¿Quitar este ejercicio de la rutina?")) return;
              setQuitado(true);
              ejecutar(async () => {
                const r = await quitarItem(rutinaId, item.id);
                if (!r.ok) setQuitado(false);
                return r;
              });
            }}
          >
            🗑
          </IconoBoton>
        </div>
        <div className={styles.flechas}>
          <button type="button" aria-label="Subir" disabled={!subir || ocupado} onClick={() => subir?.()}>
            ↑
          </button>
          <button type="button" aria-label="Bajar" disabled={!bajar || ocupado} onClick={() => bajar?.()}>
            ↓
          </button>
        </div>
      </div>

      {musculos && <VentanaMusculos titulo={ejercicio?.nombre ?? "Ejercicio"} items={[item]} catalogo={catalogo} cerrar={() => setMusculos(false)} />}

      {abierto && (
        <>

        <form action={accion} className={styles.formularioInterno}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="rutina" value={rutinaId} />
          <div className={styles.camposItem}>
            <div className={styles.campo}>
              <label htmlFor={`se-${item.id}`}>Series <AyudaI texto="Cuántas veces se repite el ejercicio seguido (cada vuelta, con su descanso)." /></label>
              <input id={`se-${item.id}`} name="series" type="number" min={1} max={20} required defaultValue={item.series} />
            </div>
            {campos.includes("reps") && (
              <>
                <div className={styles.campo}>
                  <label htmlFor={`rm-${item.id}`}>Repeticiones <AyudaI texto="Cuántas repeticiones en cada serie. Si pones «hasta», es un rango, por ejemplo de 8 a 12." /></label>
                  <input id={`rm-${item.id}`} name="reps_min" type="number" min={1} max={500} required defaultValue={item.reps_min ?? ""} />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`rx-${item.id}`}>hasta (opcional) <AyudaI texto="Para un rango de repeticiones: el número más alto. Déjalo vacío si son siempre las mismas." /></label>
                  <input id={`rx-${item.id}`} name="reps_max" type="number" min={1} max={500} defaultValue={item.reps_max ?? ""} />
                </div>
              </>
            )}
            {campos.includes("segundos") && (
              <>
                <div className={styles.campo}>
                  <label htmlFor={`sm-${item.id}`}>Segundos{tipo?.valor === "duracion" ? "" : " (opcional)"} <AyudaI texto="Cuántos segundos dura cada serie, en los ejercicios que se hacen por tiempo." /></label>
                  <input id={`sm-${item.id}`} name="segundos_min" type="number" min={1} max={7200} required={tipo?.valor === "duracion"} defaultValue={item.segundos_min ?? ""} />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`sx-${item.id}`}>hasta (opcional) <AyudaI texto="Para un rango de tiempo: los segundos más altos. Déjalo vacío si es siempre el mismo." /></label>
                  <input id={`sx-${item.id}`} name="segundos_max" type="number" min={1} max={7200} defaultValue={item.segundos_max ?? ""} />
                </div>
              </>
            )}
            {campos.includes("peso") && (
              <div className={styles.campo}>
                <label htmlFor={`pe-${item.id}`}>{tipo?.peso?.es ?? "Peso (kg)"} · opcional <AyudaI texto="El peso que se añade al ejercicio, en kilos. Puedes dejarlo vacío." /></label>
                <input id={`pe-${item.id}`} name="peso_kg" inputMode="decimal" defaultValue={item.peso_kg ?? ""} />
              </div>
            )}
            {campos.includes("distancia") && (
              <div className={styles.campo}>
                <label htmlFor={`di-${item.id}`}>Distancia (m) <AyudaI texto="Cuántos metros se recorren en cada serie." /></label>
                <input id={`di-${item.id}`} name="distancia_m" type="number" min={1} max={100000} required defaultValue={item.distancia_m ?? ""} />
              </div>
            )}
            <div className={styles.campo}>
              <label htmlFor={`de-${item.id}`}>
                {enSuper ? "Descanso al terminar la vuelta (s)" : "Descanso (s)"} <AyudaI texto="Cuántos segundos descansa la persona entre una serie y la siguiente." />
              </label>
              <input id={`de-${item.id}`} name="descanso_seg" type="number" min={0} max={900} required defaultValue={item.descanso_seg} />
              {enSuper && !esUltimoDelGrupo && (
                <span className={styles.ayuda}>En una superserie solo cuenta el descanso del último ejercicio.</span>
              )}
            </div>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`no-${item.id}`}>Nota para el/la alumno/a (opcional) <AyudaI texto="Un consejo que ve la persona junto a este ejercicio, por ejemplo «con banda de 15 kg»." /></label>
            <input id={`no-${item.id}`} name="nota" maxLength={300} placeholder="Por ejemplo: con banda de 15 kg" defaultValue={item.nota ?? ""} />
          </div>
          <button className={styles.boton} type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar este ejercicio"}
          </button>
          <Mensajes estado={estado} />
        </form>

      <CambiosSemana rutinaId={rutinaId} item={item} semanas={semanas} cambios={cambios} opciones={opciones} catalogo={catalogo} avisar={avisar} />

      <div className={styles.accionesItem}>
        {puedeUnir && (
          <button
            type="button"
            className={`${styles.boton} ${styles.botonSecundario}`}
            disabled={ocupado}
            onClick={() => ejecutar(() => unirConAnterior(rutinaId, item.id))}
          >
            Unir con el anterior (superserie)
          </button>
        )}
        {enSuper && (
          <button
            type="button"
            className={`${styles.boton} ${styles.botonSecundario}`}
            disabled={ocupado}
            onClick={() => ejecutar(() => separarItem(rutinaId, item.id))}
          >
            Sacar de la superserie
          </button>
        )}
      </div>
        </>
      )}
    </div>
  );
}

// ---------- Una sesión ----------

// Ejercicios extra que solo hay en una semana concreta de una sesión.
function ExtrasSemana({
  rutinaId,
  sesionId,
  semanas,
  extras,
  opciones,
  catalogo,
  avisar,
}: {
  rutinaId: string;
  sesionId: string;
  semanas: number;
  extras: ExtraSemana[];
  opciones: CatalogoEjercicio[];
  catalogo: Map<string, CatalogoEjercicio>;
  avisar: Avisar;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarExtraSemana, {});
  const { pendiente: ocupado, ejecutar } = useEjecutar(avisar);
  const objetivo = (x: ExtraSemana) => {
    const partes = [`${x.series} series`];
    if (x.reps_min !== null) partes.push(`${x.reps_min}${x.reps_max ? `-${x.reps_max}` : ""} reps`);
    if (x.segundos_min !== null) partes.push(`${x.segundos_min}${x.segundos_max ? `-${x.segundos_max}` : ""} s`);
    if (x.distancia_m !== null) partes.push(`${x.distancia_m} m`);
    return partes.join(" · ");
  };

  return (
    <details className={styles.detalles}>
      <summary>Ejercicio extra solo en una semana{extras.length > 0 ? ` (${extras.length})` : ""}</summary>
      {extras.length > 0 && (
        <ul className={styles.lista}>
          {extras.map((x) => (
            <li key={x.id} className={styles.personaCabecera}>
              <span>
                <strong>Semana {x.semana}:</strong> {catalogo.get(x.ejercicio_id)?.nombre ?? "ejercicio"} · {objetivo(x)}
              </span>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={ocupado} onClick={() => ejecutar(() => quitarExtraSemana(rutinaId, x.id))}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
      <form action={accion} className={styles.formularioInterno}>
        <input type="hidden" name="sesion" value={sesionId} />
        <input type="hidden" name="rutina" value={rutinaId} />
        <p className={styles.ayuda}>Añade un ejercicio que solo se hace en una semana concreta (se hace al final de la sesión).</p>
        <div className={styles.camposItem}>
          <div className={styles.campo}>
            <label htmlFor={`ex-semana-${sesionId}`}>Semana <AyudaI texto="La semana en la que se añade este ejercicio extra. Solo sale esa semana." /></label>
            <select id={`ex-semana-${sesionId}`} name="semana" required defaultValue="">
              <option value="" disabled>
                Elige…
              </option>
              {Array.from({ length: semanas }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Semana {i + 1}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`ex-ej-${sesionId}`}>Ejercicio <AyudaI texto="El ejercicio que se añade, solo esa semana, a esta sesión." /></label>
            <select id={`ex-ej-${sesionId}`} name="ejercicio" required defaultValue="">
              <option value="" disabled>
                Elige…
              </option>
              {opciones.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`ex-se-${sesionId}`}>Series</label>
            <input id={`ex-se-${sesionId}`} name="series" type="number" min={1} max={20} required defaultValue={3} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`ex-rm-${sesionId}`}>Repeticiones</label>
            <input id={`ex-rm-${sesionId}`} name="reps_min" type="number" min={1} max={500} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`ex-rx-${sesionId}`}>hasta</label>
            <input id={`ex-rx-${sesionId}`} name="reps_max" type="number" min={1} max={500} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`ex-sm-${sesionId}`}>Segundos</label>
            <input id={`ex-sm-${sesionId}`} name="segundos_min" type="number" min={1} max={7200} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`ex-sx-${sesionId}`}>hasta</label>
            <input id={`ex-sx-${sesionId}`} name="segundos_max" type="number" min={1} max={7200} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`ex-pe-${sesionId}`}>Peso (kg)</label>
            <input id={`ex-pe-${sesionId}`} name="peso_kg" inputMode="decimal" />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`ex-di-${sesionId}`}>Distancia (m)</label>
            <input id={`ex-di-${sesionId}`} name="distancia_m" type="number" min={1} max={100000} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`ex-de-${sesionId}`}>Descanso (s)</label>
            <input id={`ex-de-${sesionId}`} name="descanso_seg" type="number" min={0} max={900} defaultValue={60} />
          </div>
        </div>
        <div className={styles.campo}>
          <label htmlFor={`ex-no-${sesionId}`}>Nota (opcional)</label>
          <input id={`ex-no-${sesionId}`} name="nota" maxLength={300} />
        </div>
        <button className={styles.boton} type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Añadir a esa semana"}
        </button>
        <Mensajes estado={estado} />
      </form>
    </details>
  );
}

function TarjetaSesion({
  rutinaId,
  sesion,
  catalogo,
  asa,
  subir,
  bajar,
  avisar,
  semanas,
  cambios,
  extras,
}: {
  semanas: number;
  cambios: CambioSemana[];
  extras: ExtraSemana[];
  rutinaId: string;
  sesion: SesionRutina;
  catalogo: Map<string, CatalogoEjercicio>;
  asa: ReactNode;
  subir: (() => void) | null;
  bajar: (() => void) | null;
  avisar: Avisar;
}) {
  const { pendiente, ejecutar } = useEjecutar(avisar);
  const orden = useOrden(sesion.items, (ids) => reordenarItems(rutinaId, sesion.id, ids), avisar);
  const [elegido, setElegido] = useState("");
  const [abierta, setAbierta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [anadiendo, setAnadiendo] = useState(false);
  const [musculos, setMusculos] = useState(false);

  // Letra de cada superserie (A, B…) y posición dentro de ella (A1, A2…).
  const letras = new Map<number, string>();
  const dentro = new Map<number, number>();
  const etiquetas = orden.mostrados.map((it) => {
    if (it.grupo === null) return null;
    if (!letras.has(it.grupo)) letras.set(it.grupo, String.fromCharCode(65 + letras.size));
    dentro.set(it.grupo, (dentro.get(it.grupo) ?? 0) + 1);
    return `${letras.get(it.grupo)}${dentro.get(it.grupo)}`;
  });

  function guardarNombre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    setEditando(false);
    ejecutar(() => renombrarSesion(rutinaId, sesion.id, String(datos.get("nombre") ?? ""), String(datos.get("nota") ?? "")));
  }

  const activos = [...catalogo.values()].filter((e) => e.activo);
  const resumen =
    sesion.items.length === 0
      ? "Sin ejercicios"
      : `${sesion.items.length} ${sesion.items.length === 1 ? "ejercicio" : "ejercicios"} · ~${minutosEstimados(sesion.items)} min`;

  return (
    <section className={styles.sesionCaja} style={sesion.archivada ? { opacity: 0.65 } : undefined}>
      {sesion.archivada && (
        <p className={styles.ayuda} style={{ margin: "0 0 6px" }}>
          <strong>📦 Archivado:</strong> la persona no ve este día ni sus ejercicios. Pulsa 📤 para desarchivarlo.
        </p>
      )}
      <div className={styles.itemCabecera}>
        {asa}
        <FotoEditable destino="sesion" id={sesion.id} url={sesion.foto_url} etiqueta="la sesión" tamano={56} proporcion={2.4} />
        <button
          type="button"
          onClick={() => setAbierta((a) => !a)}
          aria-expanded={abierta}
          style={{ flex: "1 1 150px", minWidth: 0, display: "flex", flexDirection: "column", gap: 2, padding: 0, font: "inherit", textAlign: "left", background: "none", border: 0, cursor: "pointer", color: "inherit" }}
        >
          <h3 className={styles.sesionTitulo}>
            {abierta ? "▾" : "▸"} {sesion.nombre}
          </h3>
          <span className={styles.ayuda}>
            {resumen}
            {!abierta && sesion.items.length > 0 && ` · ${sesion.items.slice(0, 3).map((i) => catalogo.get(i.ejercicio_id)?.nombre ?? "?").join(", ")}${sesion.items.length > 3 ? "…" : ""}`}
          </span>
        </button>
        <div style={{ display: "flex", gap: 6, flex: "none", marginLeft: "auto" }}>
          <IconoBoton titulo="Cambiar el nombre y la nota" onClick={() => { setEditando((v) => !v); setAbierta(true); }}>
            ✎
          </IconoBoton>
          <IconoBoton titulo="Ver los músculos de la sesión" onClick={() => setMusculos(true)}>
            🧍
          </IconoBoton>
          <IconoBoton
            titulo={sesion.archivada ? "Desarchivar el día: la persona volverá a verlo" : "Archivar el día: la persona dejará de verlo"}
            disabled={pendiente}
            onClick={() => ejecutar(() => archivarSesion(rutinaId, sesion.id, !sesion.archivada))}
          >
            {sesion.archivada ? "📤" : "📦"}
          </IconoBoton>
          <IconoBoton
            titulo="Quitar la sesión"
            peligro
            disabled={pendiente}
            onClick={() => {
              if (window.confirm(`¿Quitar la sesión «${sesion.nombre}» con sus ${sesion.items.length} ejercicios?`)) ejecutar(() => quitarSesion(rutinaId, sesion.id));
            }}
          >
            🗑
          </IconoBoton>
        </div>
        <div className={styles.flechas}>
          <button type="button" aria-label="Subir sesión" disabled={!subir || pendiente} onClick={() => subir?.()}>
            ↑
          </button>
          <button type="button" aria-label="Bajar sesión" disabled={!bajar || pendiente} onClick={() => bajar?.()}>
            ↓
          </button>
        </div>
      </div>

      {sesion.nota && !editando && <p className={styles.ayuda} style={{ margin: "4px 0 0" }}>📝 {sesion.nota}</p>}

      {editando && (
        <form onSubmit={guardarNombre} className={styles.formularioInterno}>
          <div className={styles.campo}>
            <label htmlFor={`sn-${sesion.id}`}>Nombre <AyudaI texto="Cómo se llama esta sesión, por ejemplo «Día 1 · Tren superior». La persona lo ve en su rutina." /></label>
            <input id={`sn-${sesion.id}`} name="nombre" required maxLength={80} defaultValue={sesion.nombre} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`sno-${sesion.id}`}>Nota (opcional) <AyudaI texto="Un mensaje para la persona sobre esta sesión completa." /></label>
            <input id={`sno-${sesion.id}`} name="nota" maxLength={1000} defaultValue={sesion.nota ?? ""} />
          </div>
          <div className={styles.accionesItem}>
            <button className={styles.boton} type="submit" disabled={pendiente}>
              Guardar
            </button>
            <button className={`${styles.boton} ${styles.botonSecundario}`} type="button" onClick={() => setEditando(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {musculos && <VentanaMusculos titulo={`Músculos · ${sesion.nombre}`} items={sesion.items} catalogo={catalogo} cerrar={() => setMusculos(false)} />}

      {abierta && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "8px 0" }}>
            <strong>Ejercicios</strong>
            <IconoBoton titulo="Añadir un ejercicio" onClick={() => setAnadiendo((v) => !v)}>
              ＋
            </IconoBoton>
          </div>

          {anadiendo && (
            <div className={styles.añadirItem}>
              <label htmlFor={`add-${sesion.id}`} className={styles.oculto}>
                Ejercicio que añadir
              </label>
              <select id={`add-${sesion.id}`} value={elegido} onChange={(e) => setElegido(e.target.value)}>
                <option value="">Añadir ejercicio…</option>
                {CATEGORIAS.map((c) => {
                  const delGrupo = activos.filter((e) => e.categoria === c.valor);
                  if (delGrupo.length === 0) return null;
                  return (
                    <optgroup key={c.valor} label={c.es}>
                      {delGrupo.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nombre}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <button
                type="button"
                className={styles.boton}
                disabled={!elegido || pendiente}
                onClick={() => {
                  const id = elegido;
                  setElegido("");
                  setAnadiendo(false);
                  ejecutar(() => agregarItem(rutinaId, sesion.id, id));
                }}
              >
                Añadir
              </button>
            </div>
          )}

          {orden.mostrados.length === 0 && <p className={styles.ayuda}>Esta sesión aún no tiene ejercicios. Pulsa ＋ para añadir el primero.</p>}

          <ListaOrdenable ids={orden.ids} onReordenar={orden.reordenar}>
            <div className={styles.listaItems}>
              {orden.mostrados.map((item, pos) => {
                const previo = orden.mostrados[pos - 1];
                const siguiente = orden.mostrados[pos + 1];
                return (
                  <Ordenable key={item.id} id={item.id}>
                    {(asaItem) => (
                      <TarjetaItem
                        rutinaId={rutinaId}
                        item={item}
                        ejercicio={catalogo.get(item.ejercicio_id)}
                        etiquetaSuper={etiquetas[pos]}
                        esUltimoDelGrupo={item.grupo === null || siguiente?.grupo !== item.grupo}
                        puedeUnir={pos > 0 && !(item.grupo !== null && previo?.grupo === item.grupo)}
                        asa={asaItem}
                        subir={pos > 0 ? () => orden.mover(item.id, -1) : null}
                        bajar={pos < orden.mostrados.length - 1 ? () => orden.mover(item.id, 1) : null}
                        avisar={avisar}
                        semanas={semanas}
                        cambios={cambios.filter((x) => x.item_id === item.id)}
                        opciones={activos}
                        catalogo={catalogo}
                      />
                    )}
                  </Ordenable>
                );
              })}
            </div>
          </ListaOrdenable>

          <ExtrasSemana rutinaId={rutinaId} sesionId={sesion.id} semanas={semanas} extras={extras.filter((x) => x.sesion_id === sesion.id)} opciones={activos} catalogo={catalogo} avisar={avisar} />
        </>
      )}
    </section>
  );
}

// ---------- Datos de la rutina y acciones ----------

function CabeceraRutina({
  rutina,
  alumnos,
}: {
  rutina: DatosRutina;
  alumnos: { id: string; texto: string }[];
}) {
  const router = useRouter();
  const [nombre, setNombre] = useState(rutina.nombre);
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [estadoDatos, accionDatos, pendienteDatos] = useActionState<Estado, FormData>(actualizarRutina, {});
  const [estadoPub, accionPub, pendientePub] = useActionState<Estado, FormData>(publicarRutina, {});
  const [estadoDes, accionDes, pendienteDes] = useActionState<Estado, FormData>(despublicarRutina, {});
  const [estadoCopia, accionCopia, pendienteCopia] = useActionState<Estado, FormData>(copiarRutina, {});
  const [estadoBorrar, accionBorrar, pendienteBorrar] = useActionState<Estado, FormData>(eliminarRutina, {});

  useEffect(() => {
    if (estadoBorrar.mensaje) router.push("/admin/rutinas");
  }, [estadoBorrar.mensaje, router]);

  const e = ESTADOS[rutina.estado];

  return (
    <section className={styles.tarjeta}>
      <form action={accionDatos} className={styles.formularioInterno}>
        <input type="hidden" name="id" value={rutina.id} />
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <FotoRutina rutinaId={rutina.id} url={rutina.fotoUrl} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {editandoNombre ? (
              <input name="nombre" required maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} aria-label="Nombre de la rutina" autoFocus />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{ margin: 0, minWidth: 0, overflowWrap: "anywhere" }}>{nombre}</h2>
                <input type="hidden" name="nombre" value={nombre} />
                <IconoBoton titulo="Cambiar el nombre" onClick={() => setEditandoNombre(true)}>
                  ✎
                </IconoBoton>
              </div>
            )}
            <div className={styles.ayuda}>{rutina.esPlantilla ? "Plantilla (sin alumno/a)" : `Alumno/a: ${rutina.alumno ?? "—"}`}</div>
            <span className={`${styles.estadoChip} ${styles[e.clase]}`}>{e.texto}</span>
          </div>
        </div>
        <div className={styles.campo}>
          <label htmlFor="rut-nota">Nota para el/la alumno/a (opcional) <AyudaI texto="Un mensaje para la persona sobre toda la rutina. Lo ve al abrirla." /></label>
          <textarea id="rut-nota" name="nota" rows={3} maxLength={1000} defaultValue={rutina.nota ?? ""} />
        </div>
        <div className={styles.camposItem}>
          <div className={styles.campo}>
            <label htmlFor="rut-semanas">Semanas que dura la rutina <AyudaI texto="Cuántas semanas dura. La primera semana es la semana en la que se publica la rutina." /></label>
            <select id="rut-semanas" name="semanas" defaultValue={rutina.semanas}>
              {Array.from({ length: 52 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} {i === 0 ? "semana" : "semanas"}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="rut-entrenos">Entrenos por semana <AyudaI texto="Cuántos entrenos tiene que hacer la persona cada semana. Con «Los de las sesiones» se usa el número de sesiones de la rutina." /></label>
            <select id="rut-entrenos" name="entrenos_semana" defaultValue={rutina.entrenosSemana ?? ""}>
              <option value="">Los de las sesiones</option>
              {Array.from({ length: 14 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} por semana
                </option>
              ))}
            </select>
          </div>
        </div>
        <span className={styles.ayuda}>Las sesiones se repiten cada semana. El/la alumno/a ve «Semana 1», «Semana 2»… con un check al completar cada sesión.</span>
        <button className={styles.boton} type="submit" disabled={pendienteDatos}>
          {pendienteDatos ? "Guardando…" : "Guardar"}
        </button>
        <Mensajes estado={estadoDatos} />
      </form>

      {!rutina.esPlantilla && (
        <>
          {rutina.estado !== "publicada" ? (
            <form action={accionPub} className={styles.formularioInterno}>
              <input type="hidden" name="id" value={rutina.id} />
              <button className={styles.boton} type="submit" disabled={pendientePub}>
                {pendientePub ? "Publicando…" : rutina.estado === "historial" ? "Volver a publicar" : "Publicar para el/la alumno/a"}
              </button>
              <p className={styles.ayuda}>
                El/la alumno/a la verá al momento (si tiene su plan online activo). La rutina publicada
                anterior pasa a su historial.
              </p>
              <Mensajes estado={estadoPub} />
            </form>
          ) : (
            <form action={accionDes} className={styles.formularioInterno}>
              <input type="hidden" name="id" value={rutina.id} />
              <button className={`${styles.boton} ${styles.botonSecundario}`} type="submit" disabled={pendienteDes}>
                Pasar a borrador (el/la alumno/a deja de verla)
              </button>
              <p className={styles.ayuda}>
                Está publicada: los cambios que hagas aquí los ve el/la alumno/a al momento.
              </p>
              <Mensajes estado={estadoDes} />
            </form>
          )}
        </>
      )}

      <details className={styles.detalles}>
        <summary>Copiar a otro/a alumno/a o guardar como plantilla</summary>
        <form action={accionCopia} className={styles.formularioInterno}>
          <input type="hidden" name="id" value={rutina.id} />
          <div className={styles.campo}>
            <label htmlFor="cop-alumno">Copiar a <AyudaI texto="La persona o plantilla a la que se copia esta rutina. La original no cambia." /></label>
            <select id="cop-alumno" name="alumno" required defaultValue="">
              <option value="" disabled>
                Elige…
              </option>
              <option value="plantilla">Plantilla (sin alumno/a)</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.texto}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="cop-nombre">Nombre de la copia (opcional) <AyudaI texto="Cómo se llamará la copia. Es opcional." /></label>
            <input id="cop-nombre" name="nombre" maxLength={80} placeholder={`${rutina.nombre} (copia)`} />
          </div>
          <button className={`${styles.boton} ${styles.botonSecundario}`} type="submit" disabled={pendienteCopia}>
            Crear copia
          </button>
          <p className={styles.ayuda}>La copia nace como borrador y es independiente de esta.</p>
          <Mensajes estado={estadoCopia} />
        </form>
      </details>

      {rutina.estado !== "publicada" && (
        <details className={styles.detalles}>
          <summary>Borrar esta rutina</summary>
          <form action={accionBorrar} className={styles.formularioInterno}>
            <input type="hidden" name="id" value={rutina.id} />
            <p className={styles.ayuda}>Se borra para siempre, con todas sus sesiones y ejercicios.</p>
            <button className={`${styles.boton} ${styles.botonSecundario}`} type="submit" disabled={pendienteBorrar}>
              Sí, borrar la rutina
            </button>
            <Mensajes estado={estadoBorrar} />
          </form>
        </details>
      )}
    </section>
  );
}

// ---------- Pantalla completa ----------

export function Constructor({
  rutina,
  sesiones,
  catalogo: lista,
  alumnos,
  cambios,
  extras,
}: {
  rutina: DatosRutina;
  sesiones: SesionRutina[];
  catalogo: CatalogoEjercicio[];
  alumnos: { id: string; texto: string }[];
  cambios: CambioSemana[];
  extras: ExtraSemana[];
}) {
  const [aviso, setAviso] = useState("");
  const catalogo = new Map(lista.map((e) => [e.id, e]));
  const { pendiente, ejecutar } = useEjecutar(setAviso);
  const orden = useOrden(sesiones, (ids) => reordenarSesiones(rutina.id, ids), setAviso);
  const [nueva, setNueva] = useState("");
  const [anadiendoSesion, setAnadiendoSesion] = useState(false);
  const [previa, setPrevia] = useState(false);

  return (
    <>
      {aviso && (
        <p className={styles.error} role="alert" onClick={() => setAviso("")}>
          {aviso} (toca para cerrar)
        </p>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setPrevia(true)}>
          👁 Ver como alumno/a
        </button>
      </div>
      {previa && <PreviaAlumno nombre={rutina.nombre} nota={rutina.nota} sesiones={sesiones.filter((s) => !s.archivada)} semanas={rutina.semanas} entrenosSemana={rutina.entrenosSemana} catalogo={catalogo} cerrar={() => setPrevia(false)} />}

      <CabeceraRutina rutina={rutina} alumnos={alumnos} />

      <section className={styles.tarjeta}>
        <h2>Resumen de la rutina</h2>
        <ResumenRutina sesiones={sesiones} semanas={rutina.semanas} entrenosSemana={rutina.entrenosSemana} catalogo={catalogo} />
      </section>

      <section className={styles.tarjeta}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h2 style={{ margin: 0 }}>Sesiones ({sesiones.length})</h2>
          <IconoBoton titulo="Añadir una sesión" onClick={() => setAnadiendoSesion((v) => !v)}>
            ＋
          </IconoBoton>
        </div>
        {anadiendoSesion && (
          <form
            className={styles.añadirItem}
            onSubmit={(e) => {
              e.preventDefault();
              const nombre = nueva.trim();
              if (!nombre) return;
              setNueva("");
              setAnadiendoSesion(false);
              ejecutar(() => agregarSesion(rutina.id, nombre));
            }}
          >
            <label htmlFor="nueva-sesion" className={styles.oculto}>
              Nombre de la nueva sesión
            </label>
            <input id="nueva-sesion" value={nueva} onChange={(e) => setNueva(e.target.value)} maxLength={80} placeholder="Nueva sesión (por ejemplo: Día 1 · Empuje)" autoFocus />
            <button className={styles.boton} type="submit" disabled={pendiente || !nueva.trim()}>
              Añadir sesión
            </button>
          </form>
        )}
        <p className={styles.ayuda}>
          Ordena arrastrando ⠿ o con las flechas. Al pulsar «Unir con el anterior» creas una
          superserie: se hacen seguidas y solo cuenta el descanso del último ejercicio.
        </p>

        {sesiones.length === 0 && <p className={styles.ayuda}>Añade la primera sesión para empezar.</p>}

        <ListaOrdenable ids={orden.ids} onReordenar={orden.reordenar}>
          <div className={styles.listaItems}>
            {orden.mostrados.map((s, pos) => (
              <Ordenable key={s.id} id={s.id}>
                {(asa) => (
                  <TarjetaSesion
                    rutinaId={rutina.id}
                    sesion={s}
                    catalogo={catalogo}
                    asa={asa}
                    subir={pos > 0 ? () => orden.mover(s.id, -1) : null}
                    bajar={pos < orden.mostrados.length - 1 ? () => orden.mover(s.id, 1) : null}
                    avisar={setAviso}
                    semanas={rutina.semanas}
                    cambios={cambios}
                    extras={extras}
                  />
                )}
              </Ordenable>
            ))}
          </div>
        </ListaOrdenable>

      </section>
    </>
  );
}
