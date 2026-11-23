"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Icono from "../../Icono";
import { Flecha } from "./FiltroColumna";
import ChipsConMas from "./ChipsConMas";
import Flotante from "./Flotante";
import ListaBuscable from "./ListaBuscable";
import estilos from "./leads.module.css";
import { cambiarEstadoVarios, cambiarTipoVarios, eliminarLeads, etiquetaVarios } from "./acciones";
import { crearElemento } from "./accionesCatalogos";
import { PALETA, type EstadoLead, type ItemColor } from "./tipos";

type Panel = { cual: "estado" | "tipo" | "etiquetas" | "anadir" | "quitar"; ancla: HTMLElement };
type Resultado = { ok: boolean; error?: string; cambiados?: number; eliminados?: number };

// La barra que aparece al marcar leads con las casillas: cuántos hay marcados y lo que se puede hacer con todos a la vez
// (cambiarles el estado, el tipo o las etiquetas, o eliminarlos).
export default function BarraSeleccion({
  ids,
  marcados,
  estados,
  etiquetas,
  tipos,
  alQuitarSeleccion,
}: {
  ids: string[];
  marcados: { id: string; etiqueta_ids: string[] }[];
  estados: EstadoLead[];
  etiquetas: ItemColor[];
  tipos: ItemColor[];
  alQuitarSeleccion: () => void;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [elegidas, setElegidas] = useState<string[]>([]); // en «Añadir»: las que se van a añadir
  const [conservar, setConservar] = useState<string[]>([]); // en «Eliminar»: las que se quedan (las desmarcadas se quitan)
  const [extras, setExtras] = useState<ItemColor[]>([]); // etiquetas creadas al momento desde el buscador
  const [listaAbierta, setListaAbierta] = useState<HTMLElement | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();

  const todas = [...etiquetas, ...extras.filter((x) => !etiquetas.some((e) => e.id === x.id))];
  // Las que ya tienen todos los marcados no se ofrecen para añadir; las que tiene alguno son las que se pueden quitar.
  const tienenTodos = todas.filter((e) => marcados.length > 0 && marcados.every((l) => l.etiqueta_ids.includes(e.id))).map((e) => e.id);
  const paraAnadir = todas.filter((e) => !tienenTodos.includes(e.id));
  const presentes = todas.filter((e) => marcados.some((l) => l.etiqueta_ids.includes(e.id)));
  const aQuitar = presentes.filter((e) => !conservar.includes(e.id)).map((e) => e.id);

  function ejecutar(accion: () => Promise<Resultado>, texto: (n: number) => string, limpiar = false) {
    setError("");
    setMensaje("");
    empezar(async () => {
      const r = await accion();
      if (!r.ok) {
        setError(r.error ?? "No se ha podido hacer.");
        return;
      }
      cerrarPanel();
      setMensaje(texto(r.cambiados ?? r.eliminados ?? ids.length));
      if (limpiar) alQuitarSeleccion();
      router.refresh();
    });
  }

  const cerrarPanel = () => {
    setPanel(null);
    setListaAbierta(null);
    setElegidas([]);
  };

  const abrir = (cual: Panel["cual"]) => (e: React.MouseEvent<HTMLButtonElement>) => {
    const ancla = e.currentTarget;
    setElegidas([]);
    setListaAbierta(null);
    setPanel((p) => (p?.cual === cual ? null : { cual, ancla }));
  };

  function eliminar() {
    if (!window.confirm(`¿Eliminar ${ids.length} ${ids.length === 1 ? "lead" : "leads"}? Se borrarán con sus notas y no se puede deshacer.`)) return;
    ejecutar(() => eliminarLeads(ids), (n) => `Eliminados ${n}.`, true);
  }

  // Escribir en el buscador y dar Intro: la etiqueta se crea y se añade ya a los leads marcados (junto con las que ya se hubieran elegido).
  async function crearEtiqueta(nombre: string) {
    setError("");
    setMensaje("");
    const r = await crearElemento("etiquetas", nombre, PALETA[(todas.length + 1) % PALETA.length].valor);
    if (!r.ok || !r.item) {
      setError(r.error ?? "No se ha podido crear la etiqueta.");
      return;
    }
    const nueva = r.item;
    setExtras((x) => [...x, nueva]);
    ejecutar(
      () => etiquetaVarios(ids, [...elegidas, nueva.id], "anadir"),
      (n) => (n === 0 ? `Etiqueta «${nueva.nombre}» creada.` : `Etiqueta «${nueva.nombre}» creada y añadida a ${n}.`),
    );
  }

  const elegidasItems = elegidas.map((id) => todas.find((e) => e.id === id)).filter((e): e is ItemColor => !!e);
  const alternar = (lista: string[], id: string) => (lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id]);

  return (
    <div className={estilos.barraSeleccion} role="region" aria-label="Acciones sobre los leads marcados">
      <span className={estilos.pildoraSeleccion}>
        <Icono nombre="usuarios" tamano={16} />
        Seleccionado: {ids.length}
      </span>
      <button type="button" className={estilos.accionBarra} onClick={abrir("estado")} aria-haspopup="dialog" disabled={pendiente}>
        Cambiar estado
      </button>
      <button type="button" className={estilos.accionBarra} onClick={abrir("etiquetas")} aria-haspopup="dialog" disabled={pendiente}>
        Etiquetas
      </button>
      <button type="button" className={estilos.accionBarra} onClick={abrir("tipo")} aria-haspopup="dialog" disabled={pendiente}>
        Tipo de lead
      </button>
      <button type="button" className={`${estilos.accionBarra} ${estilos.accionPeligro}`} onClick={eliminar} disabled={pendiente}>
        <Icono nombre="papelera" tamano={14} /> Eliminar
      </button>
      <button type="button" className={estilos.accionBarra} onClick={alQuitarSeleccion} disabled={pendiente}>
        Quitar selección
      </button>
      {mensaje && <span className={estilos.mensajeBarra}>{mensaje}</span>}
      {error && <span className={estilos.errorBarra}>{error}</span>}

      {panel?.cual === "estado" && (
        <Flotante ancla={panel.ancla} ancho={260} etiqueta="Cambiar el estado" alCerrar={cerrarPanel}>
          <p className={estilos.tituloMenu}>Poner a los {ids.length} marcados en el estado…</p>
          <ListaBuscable items={estados} filas={10} buscador={estados.length > 10} alElegir={(e) => ejecutar(() => cambiarEstadoVarios(ids, e.id), (n) => `Estado «${e.nombre}» puesto a ${n}.`)} />
        </Flotante>
      )}

      {panel?.cual === "tipo" && (
        <Flotante ancla={panel.ancla} ancho={260} etiqueta="Cambiar el tipo de lead" alCerrar={cerrarPanel}>
          <p className={estilos.tituloMenu}>Poner a los {ids.length} marcados el tipo…</p>
          <ListaBuscable
            items={tipos}
            filas={10}
            buscador={tipos.length > 10}
            alElegir={(t) => ejecutar(() => cambiarTipoVarios(ids, t.id), (n) => `Tipo «${t.nombre}» puesto a ${n}.`)}
            final={
              <li className={estilos.opcionFila}>
                <button type="button" className={estilos.opcionElegir} onClick={() => ejecutar(() => cambiarTipoVarios(ids, null), (n) => `Tipo quitado a ${n}.`)}>
                  <span>Sin tipo</span>
                </button>
              </li>
            }
          />
        </Flotante>
      )}

      {panel?.cual === "etiquetas" && (
        <Flotante ancla={panel.ancla} ancho={220} etiqueta="Etiquetas de los marcados" alCerrar={cerrarPanel}>
          <button type="button" className={estilos.accionMenu} onClick={() => setPanel({ cual: "anadir", ancla: panel.ancla })}>
            Añadir etiquetas
          </button>
          <button
            type="button"
            className={estilos.accionMenu}
            onClick={() => {
              setConservar(presentes.map((e) => e.id));
              setPanel({ cual: "quitar", ancla: panel.ancla });
            }}
          >
            Eliminar etiquetas
          </button>
        </Flotante>
      )}

      {panel?.cual === "anadir" && (
        <Flotante ancla={panel.ancla} ancho={340} etiqueta="Añadir etiquetas" alCerrar={cerrarPanel}>
          <p className={estilos.tituloMenu}>Añadir etiquetas a los {ids.length} marcados</p>
          <button type="button" className={estilos.disparadorCampo} aria-expanded={!!listaAbierta} onClick={(e) => setListaAbierta(listaAbierta ? null : e.currentTarget)}>
            {elegidasItems.length > 0 ? <ChipsConMas items={elegidasItems} /> : <span className={estilos.marcador}>Seleccionar etiquetas</span>}
            <Flecha tamano={16} />
          </button>
          {listaAbierta && (
            <Flotante ancla={listaAbierta} ancho={320} etiqueta="Etiquetas" alCerrar={() => setListaAbierta(null)}>
              <ListaBuscable items={paraAnadir} filas={6} buscador marcadas={elegidas} alElegir={(e) => setElegidas((l) => alternar(l, e.id))} alCrear={crearEtiqueta} />
            </Flotante>
          )}
          {error && <p className={estilos.errorMenu}>{error}</p>}
          <div className={estilos.acciones}>
            <button type="button" className={estilos.botonPrimarioLote} disabled={pendiente || elegidas.length === 0} onClick={() => ejecutar(() => etiquetaVarios(ids, elegidas, "anadir"), (n) => (n === 0 ? "Los leads marcados ya tenían esas etiquetas." : `Etiquetas añadidas a ${n}.`))}>
              Añadir etiquetas
            </button>
            <button type="button" className={estilos.accionBarra} onClick={cerrarPanel}>
              Cancelar
            </button>
          </div>
        </Flotante>
      )}

      {panel?.cual === "quitar" && (
        <Flotante ancla={panel.ancla} ancho={340} etiqueta="Eliminar etiquetas" alCerrar={cerrarPanel}>
          <p className={estilos.tituloMenu}>Etiquetas que tienen los {ids.length} marcados: desmarca las que quieras quitar</p>
          {presentes.length === 0 ? (
            <p className={estilos.vacioFiltro}>Los leads marcados no tienen etiquetas.</p>
          ) : (
            <ListaBuscable items={presentes} filas={6} buscador={presentes.length > 6} marcadas={conservar} alElegir={(e) => setConservar((l) => alternar(l, e.id))} />
          )}
          <div className={estilos.acciones}>
            <button type="button" className={estilos.botonPrimarioLote} disabled={pendiente || aQuitar.length === 0} onClick={() => ejecutar(() => etiquetaVarios(ids, aQuitar, "quitar"), (n) => (n === 0 ? "Los leads marcados no tenían esas etiquetas." : `Etiquetas quitadas a ${n}.`))}>
              Eliminar etiquetas
            </button>
            <button type="button" className={estilos.accionBarra} onClick={cerrarPanel}>
              Cancelar
            </button>
          </div>
        </Flotante>
      )}
    </div>
  );
}
