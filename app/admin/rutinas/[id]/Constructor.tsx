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
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import MapaCorporal from "../../../MapaCorporal";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import {
  CATEGORIAS,
  TIPOS,
  intensidadesAgregadas,
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
  guardarItem,
  publicarRutina,
  quitarItem,
  quitarSesion,
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

export type SesionRutina = {
  id: string;
  nombre: string;
  nota: string | null;
  orden: number;
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

  function alSoltar(evento: DragEndEvent) {
    const { active, over } = evento;
    if (!over || active.id === over.id) return;
    const desde = ids.indexOf(String(active.id));
    const hasta = ids.indexOf(String(over.id));
    if (desde < 0 || hasta < 0) return;
    onReordenar(arrayMove(ids, desde, hasta));
  }

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
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

function Resumen({
  items,
  catalogo,
  titulo,
}: {
  items: ItemRutina[];
  catalogo: Map<string, CatalogoEjercicio>;
  titulo: string;
}) {
  const materiales = [
    ...new Set(items.flatMap((i) => catalogo.get(i.ejercicio_id)?.materiales ?? [])),
  ].sort((a, b) => a.localeCompare(b));
  const intensidades = intensidadesAgregadas(
    items.map((i) => ({ series: i.series, musculos: catalogo.get(i.ejercicio_id)?.musculos ?? [] })),
  );

  if (items.length === 0) return <p className={styles.ayuda}>Añade ejercicios para ver el resumen.</p>;

  return (
    <details className={styles.detalles}>
      <summary>{titulo}</summary>
      <div className={styles.formularioInterno}>
        <div>
          <strong>Material necesario</strong>
          {materiales.length === 0 ? (
            <p className={styles.ayuda}>Ningún material.</p>
          ) : (
            <ul className={styles.lista}>
              {materiales.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <strong>Músculos trabajados</strong>
          <MapaCorporal intensidades={intensidades} />
        </div>
      </div>
    </details>
  );
}

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
}: {
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

  return (
    <div className={`${styles.itemCaja} ${enSuper ? styles.itemSuper : ""}`}>
      <div className={styles.itemCabecera}>
        {asa}
        <div className={styles.itemTitulo}>
          <strong>
            {etiquetaSuper && <span className={styles.etiquetaSuper}>{etiquetaSuper}</span>}
            {ejercicio?.nombre ?? "(ejercicio borrado)"}
          </strong>
          <div className={styles.ayuda}>
            {ejercicio ? `${nombreCategoria(ejercicio.categoria)} · ${nombreTipo(ejercicio.tipo)} · ` : ""}
            {textoObjetivo(item, campos)} · descanso {item.descanso_seg} s
            {!ejercicio?.activo && ejercicio && " · archivado"}
          </div>
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

      <details className={styles.detalles}>
        <summary>Series, objetivos y notas</summary>
        <form action={accion} className={styles.formularioInterno}>
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="rutina" value={rutinaId} />
          <div className={styles.camposItem}>
            <div className={styles.campo}>
              <label htmlFor={`se-${item.id}`}>Series</label>
              <input id={`se-${item.id}`} name="series" type="number" min={1} max={20} required defaultValue={item.series} />
            </div>
            {campos.includes("reps") && (
              <>
                <div className={styles.campo}>
                  <label htmlFor={`rm-${item.id}`}>Repeticiones</label>
                  <input id={`rm-${item.id}`} name="reps_min" type="number" min={1} max={500} required defaultValue={item.reps_min ?? ""} />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`rx-${item.id}`}>hasta (opcional)</label>
                  <input id={`rx-${item.id}`} name="reps_max" type="number" min={1} max={500} defaultValue={item.reps_max ?? ""} />
                </div>
              </>
            )}
            {campos.includes("segundos") && (
              <>
                <div className={styles.campo}>
                  <label htmlFor={`sm-${item.id}`}>Segundos{tipo?.valor === "duracion" ? "" : " (opcional)"}</label>
                  <input id={`sm-${item.id}`} name="segundos_min" type="number" min={1} max={7200} required={tipo?.valor === "duracion"} defaultValue={item.segundos_min ?? ""} />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`sx-${item.id}`}>hasta (opcional)</label>
                  <input id={`sx-${item.id}`} name="segundos_max" type="number" min={1} max={7200} defaultValue={item.segundos_max ?? ""} />
                </div>
              </>
            )}
            {campos.includes("peso") && (
              <div className={styles.campo}>
                <label htmlFor={`pe-${item.id}`}>{tipo?.peso?.es ?? "Peso (kg)"} · opcional</label>
                <input id={`pe-${item.id}`} name="peso_kg" inputMode="decimal" defaultValue={item.peso_kg ?? ""} />
              </div>
            )}
            {campos.includes("distancia") && (
              <div className={styles.campo}>
                <label htmlFor={`di-${item.id}`}>Distancia (m)</label>
                <input id={`di-${item.id}`} name="distancia_m" type="number" min={1} max={100000} required defaultValue={item.distancia_m ?? ""} />
              </div>
            )}
            <div className={styles.campo}>
              <label htmlFor={`de-${item.id}`}>
                {enSuper ? "Descanso al terminar la vuelta (s)" : "Descanso (s)"}
              </label>
              <input id={`de-${item.id}`} name="descanso_seg" type="number" min={0} max={900} required defaultValue={item.descanso_seg} />
              {enSuper && !esUltimoDelGrupo && (
                <span className={styles.ayuda}>En una superserie solo cuenta el descanso del último ejercicio.</span>
              )}
            </div>
          </div>
          <div className={styles.campo}>
            <label htmlFor={`no-${item.id}`}>Nota para el alumno (opcional)</label>
            <input id={`no-${item.id}`} name="nota" maxLength={300} placeholder="Por ejemplo: con banda de 15 kg" defaultValue={item.nota ?? ""} />
          </div>
          <button className={styles.boton} type="submit" disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar este ejercicio"}
          </button>
          <Mensajes estado={estado} />
        </form>
      </details>

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
        <button
          type="button"
          className={`${styles.boton} ${styles.botonSecundario}`}
          disabled={ocupado}
          onClick={() => ejecutar(() => quitarItem(rutinaId, item.id))}
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

// ---------- Una sesión ----------

function TarjetaSesion({
  rutinaId,
  sesion,
  catalogo,
  asa,
  subir,
  bajar,
  avisar,
}: {
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
  const [confirmando, setConfirmando] = useState(false);

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
    ejecutar(() =>
      renombrarSesion(rutinaId, sesion.id, String(datos.get("nombre") ?? ""), String(datos.get("nota") ?? "")),
    );
  }

  const activos = [...catalogo.values()].filter((e) => e.activo);

  return (
    <section className={styles.sesionCaja}>
      <div className={styles.itemCabecera}>
        {asa}
        <h3 className={styles.sesionTitulo}>{sesion.nombre}</h3>
        <div className={styles.flechas}>
          <button type="button" aria-label="Subir sesión" disabled={!subir || pendiente} onClick={() => subir?.()}>
            ↑
          </button>
          <button type="button" aria-label="Bajar sesión" disabled={!bajar || pendiente} onClick={() => bajar?.()}>
            ↓
          </button>
        </div>
      </div>

      <details className={styles.detalles}>
        <summary>Nombre y nota de la sesión</summary>
        <form onSubmit={guardarNombre} className={styles.formularioInterno}>
          <div className={styles.campo}>
            <label htmlFor={`sn-${sesion.id}`}>Nombre</label>
            <input id={`sn-${sesion.id}`} name="nombre" required maxLength={80} defaultValue={sesion.nombre} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`sno-${sesion.id}`}>Nota (opcional)</label>
            <input id={`sno-${sesion.id}`} name="nota" maxLength={1000} defaultValue={sesion.nota ?? ""} />
          </div>
          <button className={styles.boton} type="submit" disabled={pendiente}>
            Guardar
          </button>
        </form>
      </details>

      {orden.mostrados.length === 0 && <p className={styles.ayuda}>Esta sesión aún no tiene ejercicios.</p>}

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
                  />
                )}
              </Ordenable>
            );
          })}
        </div>
      </ListaOrdenable>

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
            ejecutar(() => agregarItem(rutinaId, sesion.id, id));
          }}
        >
          Añadir
        </button>
      </div>

      <Resumen items={sesion.items} catalogo={catalogo} titulo="Material y músculos de esta sesión" />

      {confirmando ? (
        <div className={styles.aviso} role="alert">
          <p style={{ margin: "0 0 10px" }}>
            ¿Quitar la sesión «{sesion.nombre}» con sus {sesion.items.length} ejercicios?
          </p>
          <div className={styles.accionesItem}>
            <button
              type="button"
              className={styles.boton}
              disabled={pendiente}
              onClick={() => ejecutar(() => quitarSesion(rutinaId, sesion.id))}
            >
              Sí, quitar la sesión
            </button>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setConfirmando(false)}>
              No
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setConfirmando(true)}>
          Quitar esta sesión
        </button>
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
      <div className={styles.personaCabecera}>
        <div>
          <h2 style={{ margin: 0 }}>{rutina.nombre}</h2>
          <div className={styles.ayuda}>
            {rutina.esPlantilla ? "Plantilla (sin alumno)" : `Alumno: ${rutina.alumno ?? "—"}`}
          </div>
        </div>
        <span className={`${styles.estadoChip} ${styles[e.clase]}`}>{e.texto}</span>
      </div>

      {!rutina.esPlantilla && (
        <>
          {rutina.estado !== "publicada" ? (
            <form action={accionPub} className={styles.formularioInterno}>
              <input type="hidden" name="id" value={rutina.id} />
              <button className={styles.boton} type="submit" disabled={pendientePub}>
                {pendientePub ? "Publicando…" : rutina.estado === "historial" ? "Volver a publicar" : "Publicar para el alumno"}
              </button>
              <p className={styles.ayuda}>
                El alumno la verá al momento (si tiene su plan online activo). La rutina publicada
                anterior pasa a su historial.
              </p>
              <Mensajes estado={estadoPub} />
            </form>
          ) : (
            <form action={accionDes} className={styles.formularioInterno}>
              <input type="hidden" name="id" value={rutina.id} />
              <button className={`${styles.boton} ${styles.botonSecundario}`} type="submit" disabled={pendienteDes}>
                Pasar a borrador (el alumno deja de verla)
              </button>
              <p className={styles.ayuda}>
                Está publicada: los cambios que hagas aquí los ve el alumno al momento.
              </p>
              <Mensajes estado={estadoDes} />
            </form>
          )}
        </>
      )}

      <details className={styles.detalles}>
        <summary>Nombre, nota, semanas y entrenos por semana</summary>
        <form action={accionDatos} className={styles.formularioInterno}>
          <input type="hidden" name="id" value={rutina.id} />
          <div className={styles.campo}>
            <label htmlFor="rut-nombre">Nombre</label>
            <input id="rut-nombre" name="nombre" required maxLength={80} defaultValue={rutina.nombre} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="rut-nota">Nota para el alumno (opcional)</label>
            <textarea id="rut-nota" name="nota" rows={3} maxLength={1000} defaultValue={rutina.nota ?? ""} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="rut-semanas">Semanas que dura la rutina</label>
            <input id="rut-semanas" name="semanas" type="number" min={1} max={52} defaultValue={rutina.semanas} />
            <span className={styles.ayuda}>
              Las sesiones se repiten cada semana. La alumna ve «Semana 1», «Semana 2»… con un check al completar cada sesión.
            </span>
          </div>
          <div className={styles.campo}>
            <label htmlFor="rut-entrenos">Entrenos por semana (opcional)</label>
            <input id="rut-entrenos" name="entrenos_semana" type="number" min={1} max={14} defaultValue={rutina.entrenosSemana ?? ""} />
            <span className={styles.ayuda}>
              Si lo dejas vacío cuenta el número de sesiones. Se usará para la racha del alumno.
            </span>
          </div>
          <button className={styles.boton} type="submit" disabled={pendienteDatos}>
            Guardar
          </button>
          <Mensajes estado={estadoDatos} />
        </form>
      </details>

      <details className={styles.detalles}>
        <summary>Copiar a otro alumno o guardar como plantilla</summary>
        <form action={accionCopia} className={styles.formularioInterno}>
          <input type="hidden" name="id" value={rutina.id} />
          <div className={styles.campo}>
            <label htmlFor="cop-alumno">Copiar a</label>
            <select id="cop-alumno" name="alumno" required defaultValue="">
              <option value="" disabled>
                Elige…
              </option>
              <option value="plantilla">Plantilla (sin alumno)</option>
              {alumnos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.texto}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="cop-nombre">Nombre de la copia (opcional)</label>
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
}: {
  rutina: DatosRutina;
  sesiones: SesionRutina[];
  catalogo: CatalogoEjercicio[];
  alumnos: { id: string; texto: string }[];
}) {
  const [aviso, setAviso] = useState("");
  const catalogo = new Map(lista.map((e) => [e.id, e]));
  const { pendiente, ejecutar } = useEjecutar(setAviso);
  const orden = useOrden(sesiones, (ids) => reordenarSesiones(rutina.id, ids), setAviso);
  const [nueva, setNueva] = useState("");

  const todos = sesiones.flatMap((s) => s.items);

  return (
    <>
      {aviso && (
        <p className={styles.error} role="alert" onClick={() => setAviso("")}>
          {aviso} (toca para cerrar)
        </p>
      )}

      <CabeceraRutina rutina={rutina} alumnos={alumnos} />

      <section className={styles.tarjeta}>
        <h2>Resumen de toda la rutina</h2>
        <Resumen items={todos} catalogo={catalogo} titulo="Material y músculos de la rutina completa" />
      </section>

      <section className={styles.tarjeta}>
        <h2>Sesiones ({sesiones.length})</h2>
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
                  />
                )}
              </Ordenable>
            ))}
          </div>
        </ListaOrdenable>

        <form
          className={styles.añadirItem}
          onSubmit={(e) => {
            e.preventDefault();
            const nombre = nueva.trim();
            if (!nombre) return;
            setNueva("");
            ejecutar(() => agregarSesion(rutina.id, nombre));
          }}
        >
          <label htmlFor="nueva-sesion" className={styles.oculto}>
            Nombre de la nueva sesión
          </label>
          <input
            id="nueva-sesion"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            maxLength={80}
            placeholder="Nueva sesión (por ejemplo: Día 1 · Empuje)"
          />
          <button className={styles.boton} type="submit" disabled={pendiente || !nueva.trim()}>
            Añadir sesión
          </button>
        </form>
      </section>
    </>
  );
}
