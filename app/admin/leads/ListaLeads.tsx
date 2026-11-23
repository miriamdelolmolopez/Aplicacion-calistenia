"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Icono from "../../Icono";
import styles from "../admin.module.css";
import BarraSeleccion from "./BarraSeleccion";
import Chip from "./Chip";
import ChipsConMas from "./ChipsConMas";
import IconoColumna from "./IconoColumna";
import { Flecha } from "./FiltroColumna";
import MenuColumna, { type FiltroOpciones, type Sentido } from "./MenuColumna";
import MenuFila from "./MenuFila";
import NuevoLead from "./NuevoLead";
import estilos from "./leads.module.css";
import { colorDe, type EstadoLead, type ItemColor, type Lead } from "./tipos";
import Asa from "./Asa";
import { moverElemento, useArrastre } from "./useArrastre";
import { useOrdenFilas } from "./useOrdenFilas";
import { useOrdenColumnas } from "./useOrdenColumnas";

const diaMadrid = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date(iso));
const fechaBonita = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type ColId = "nombre" | "etiquetas" | "telefono" | "destino" | "estado" | "tipo" | "fecha";
const COLUMNAS: readonly ColId[] = ["nombre", "etiquetas", "telefono", "destino", "estado", "tipo", "fecha"];

// Qué es cada columna (lo que cuenta la «i» del menú) y cómo se filtra.
const META: Record<ColId, { titulo: string; descripcion: string; filtro: "opciones" | "texto" | "fecha" }> = {
  nombre: { titulo: "Nombre del lead", descripcion: "Nombre y apellidos de la persona que ha mostrado interés.", filtro: "texto" },
  etiquetas: { titulo: "Etiquetas", descripcion: "Marcas de colores para clasificar al lead, por ejemplo por dónde ha llegado.", filtro: "opciones" },
  telefono: { titulo: "Número de teléfono", descripcion: "Teléfono con el que contactar con el lead.", filtro: "texto" },
  destino: { titulo: "Origen", descripcion: "De dónde llegó el lead: la landing o el formulario («Manual» si lo creaste tú).", filtro: "opciones" },
  estado: { titulo: "Estado", descripcion: "En qué punto del seguimiento está el lead: nuevo, contactado, ganado…", filtro: "opciones" },
  tipo: { titulo: "Tipo de lead", descripcion: "El servicio que le interesa al lead, por ejemplo online o presencial.", filtro: "opciones" },
  fecha: { titulo: "Fecha de llegada", descripcion: "Día y hora en que el lead llegó a tu lista.", filtro: "fecha" },
};

// Lista de leads: buscador arriba y, en cada columna, un menú (como en Notion) para ver qué es, editar sus opciones, filtrar y ordenar.
export default function ListaLeads({ leads, estados, etiquetas, tipos }: { leads: Lead[]; estados: EstadoLead[]; etiquetas: ItemColor[]; tipos: ItemColor[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [filtros, setFiltros] = useState<Partial<Record<ColId, FiltroOpciones>>>({});
  const [textos, setTextos] = useState<{ nombre: string; telefono: string }>({ nombre: "", telefono: "" });
  const [orden, setOrden] = useState<{ col: ColId; sentido: Sentido }>({ col: "fecha", sentido: "desc" });
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [creando, setCreando] = useState(false);
  const [menuCol, setMenuCol] = useState<{ id: ColId; ancla: HTMLElement } | null>(null);

  const nombreEstado = useMemo(() => new Map(estados.map((e) => [e.id, e.nombre])), [estados]);
  const estadoPorId = useMemo(() => new Map(estados.map((e) => [e.id, e])), [estados]);
  const etiquetaPorId = useMemo(() => new Map(etiquetas.map((e) => [e.id, e])), [etiquetas]);
  const tipoPorId = useMemo(() => new Map(tipos.map((t) => [t.id, t])), [tipos]);
  const destinos = useMemo(() => [...new Set(leads.map((l) => l.destino).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")), [leads]);

  // Los valores que tiene un lead en una columna con opciones (para comparar con el filtro).
  const valoresDe = (l: Lead, id: ColId): string[] => {
    if (id === "estado") return [nombreEstado.get(l.estado_id) ?? ""].filter(Boolean);
    if (id === "tipo") return [l.tipo_id ? (tipoPorId.get(l.tipo_id)?.nombre ?? "") : ""].filter(Boolean);
    if (id === "etiquetas") return l.etiqueta_ids.map((x) => etiquetaPorId.get(x)?.nombre ?? "").filter(Boolean);
    if (id === "destino") return l.destino ? [l.destino] : [];
    return [];
  };

  const filasAMano = useOrdenFilas();
  const visibles = useMemo(() => {
    const q = sinTildes(busqueda.trim());
    const digitos = busqueda.replace(/\D/g, "");
    const clave = (l: Lead, id: ColId): string | number => {
      if (id === "nombre") return sinTildes(`${l.nombre} ${l.apellidos}`);
      if (id === "telefono") return l.telefono.replace(/\D/g, "");
      if (id === "destino") return sinTildes(l.destino);
      if (id === "estado") return estadoPorId.get(l.estado_id)?.orden ?? 9999;
      if (id === "tipo") return l.tipo_id ? (tipoPorId.get(l.tipo_id)?.orden ?? 9999) : 9999;
      if (id === "etiquetas") return l.etiqueta_ids.reduce((m, x) => Math.min(m, etiquetaPorId.get(x)?.orden ?? 9999), 9999);
      return l.llegada_en;
    };
    return leads
      .filter((l) => {
        if (q) {
          const nombre = sinTildes(`${l.nombre} ${l.apellidos}`);
          const tel = l.telefono.replace(/\D/g, "");
          if (!nombre.includes(q) && !(digitos.length >= 3 && tel.includes(digitos))) return false;
        }
        if (textos.nombre && !sinTildes(`${l.nombre} ${l.apellidos}`).includes(sinTildes(textos.nombre))) return false;
        if (textos.telefono && !l.telefono.replace(/\D/g, "").includes(textos.telefono.replace(/\D/g, "")) && !l.telefono.includes(textos.telefono)) return false;
        for (const id of ["etiquetas", "destino", "estado", "tipo"] as const) {
          const f = filtros[id];
          if (!f) continue;
          const v = valoresDe(l, id);
          if (f.op === "vacio" && v.length > 0) return false;
          if (f.op === "no_vacio" && v.length === 0) return false;
          if (f.op === "es" && f.valores.length > 0 && !v.some((x) => f.valores.includes(x))) return false;
          if (f.op === "no_es" && f.valores.length > 0 && v.some((x) => f.valores.includes(x))) return false;
        }
        const dia = diaMadrid(l.llegada_en);
        if (desde && dia < desde) return false;
        if (hasta && dia > hasta) return false;
        return true;
      })
      .sort((a, b) => {
        if (filasAMano.activo) {
          // Orden arrastrado a mano: los que no están en la lista guardada (los nuevos) van arriba, por fecha.
          const ia = filasAMano.ids.indexOf(a.id);
          const ib = filasAMano.ids.indexOf(b.id);
          if (ia !== ib) return (ia === -1 ? -1 : ia) - (ib === -1 ? -1 : ib) || b.llegada_en.localeCompare(a.llegada_en);
        }
        const ka = clave(a, orden.col);
        const kb = clave(b, orden.col);
        const c = typeof ka === "number" && typeof kb === "number" ? ka - kb : String(ka).localeCompare(String(kb), "es");
        if (c !== 0) return orden.sentido === "asc" ? c : -c;
        return b.llegada_en.localeCompare(a.llegada_en);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, busqueda, textos, filtros, desde, hasta, orden, filasAMano.activo, filasAMano.ids, nombreEstado, estadoPorId, etiquetaPorId, tipoPorId]);

  // Arrastrar una fila por sus seis puntitos: se queda en el sitio donde se suelta.
  const arrastreFilas = useArrastre((desdeI, hastaI) => filasAMano.guardar(moverElemento(visibles.map((l) => l.id), desdeI, hastaI)));

  // Leads marcados con las casillas (solo cuentan los que se están viendo).
  const [marcados, setMarcados] = useState<string[]>([]);
  const idsMarcados = visibles.filter((l) => marcados.includes(l.id)).map((l) => l.id);
  const todosMarcados = visibles.length > 0 && idsMarcados.length === visibles.length;
  const alternarMarca = (id: string) => setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));

  // Las columnas se pueden arrastrar por su cabecera para cambiarlas de sitio.
  const [ordenCols, guardarOrden] = useOrdenColumnas(COLUMNAS);
  const [arrastrada, setArrastrada] = useState<ColId | null>(null);
  const [sobre, setSobre] = useState<ColId | null>(null);
  const finArrastre = () => {
    setArrastrada(null);
    setSobre(null);
  };

  const filtrada = (id: ColId) => {
    if (id === "nombre" || id === "telefono") return !!textos[id];
    if (id === "fecha") return !!desde || !!hasta;
    const f = filtros[id];
    return !!f && (f.op === "vacio" || f.op === "no_vacio" || f.valores.length > 0);
  };

  const celdas: Record<ColId, (l: Lead) => React.ReactNode> = {
    nombre: (l) => (
      <Link href={`/admin/leads/${l.id}`} className={estilos.enlaceNombre}>
        {`${l.nombre} ${l.apellidos}`.trim()}
      </Link>
    ),
    etiquetas: (l) => (
      <ChipsConMas items={l.etiqueta_ids.map((id) => etiquetaPorId.get(id)).filter((e): e is ItemColor => !!e)} />
    ),
    telefono: (l) => l.telefono || "—",
    destino: (l) => l.destino,
    estado: (l) => (
      <span className={estilos.estado} style={{ color: colorDe(estadoPorId.get(l.estado_id)?.color).fg, borderColor: colorDe(estadoPorId.get(l.estado_id)?.color).fg }}>
        {nombreEstado.get(l.estado_id) ?? "—"}
      </span>
    ),
    tipo: (l) => {
      const tipo = l.tipo_id ? tipoPorId.get(l.tipo_id) : undefined;
      return tipo ? <Chip item={tipo} /> : "—";
    },
    fecha: (l) => fechaBonita(l.llegada_en),
  };

  // Lo que cambia según la columna cuyo menú está abierto.
  const m = menuCol?.id;
  const edicion = m === "estado" ? { tabla: "estados" as const, items: estados } : m === "etiquetas" ? { tabla: "etiquetas" as const, items: etiquetas } : m === "tipo" ? { tabla: "tipos" as const, items: tipos } : undefined;
  const opcionesDe = (id: ColId): string[] => (id === "estado" ? estados.map((e) => e.nombre) : id === "etiquetas" ? etiquetas.map((e) => e.nombre) : id === "tipo" ? tipos.map((t) => t.nombre) : destinos);

  return (
    <>
      <div className={estilos.barra}>
        <div className={estilos.buscador}>
          <Icono nombre="lupa" tamano={18} />
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o teléfono…" aria-label="Buscar leads" />
        </div>
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setCreando((c) => !c)} aria-expanded={creando}>
          Crear lead
        </button>
        <Link href="/admin/leads/conexiones" className={`${styles.boton} ${styles.botonSecundario}`}>
          Conectar formularios
        </Link>
        <button type="button" className={`${styles.boton} ${styles.botonOscuro}`} disabled title="Próximamente: se activará con los pagos">
          Enviar oferta <small className={estilos.proximamente}>Próximamente</small>
        </button>
      </div>

      {creando && <NuevoLead etiquetas={etiquetas} tipos={tipos} destinos={destinos} alCerrar={() => setCreando(false)} />}

      {idsMarcados.length > 0 && (
        <BarraSeleccion
          ids={idsMarcados}
          marcados={visibles.filter((l) => marcados.includes(l.id)).map((l) => ({ id: l.id, etiqueta_ids: l.etiqueta_ids }))}
          estados={estados}
          etiquetas={etiquetas}
          tipos={tipos}
          alQuitarSeleccion={() => setMarcados([])}
        />
      )}

      <div className={estilos.contenedorTabla}>
        <table className={estilos.tabla}>
          <thead>
            <tr>
              <th scope="col" className={estilos.celdaCasilla}>
                <input
                  type="checkbox"
                  ref={(el) => {
                    if (el) el.indeterminate = idsMarcados.length > 0 && !todosMarcados;
                  }}
                  checked={todosMarcados}
                  onChange={() => setMarcados(todosMarcados ? [] : visibles.map((l) => l.id))}
                  aria-label="Marcar o desmarcar todos los leads"
                />
              </th>
              {ordenCols.map((id) => (
                <th
                  key={id}
                  scope="col"
                  className={`${estilos.columnaArrastrable} ${sobre === id && arrastrada && arrastrada !== id ? estilos.columnaSobre : ""}`}
                  draggable
                  onDragStart={(e) => {
                    setArrastrada(id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", id);
                  }}
                  onDragOver={(e) => {
                    if (!arrastrada) return;
                    e.preventDefault();
                    setSobre(id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (arrastrada && arrastrada !== id) guardarOrden(moverElemento(ordenCols, ordenCols.indexOf(arrastrada), ordenCols.indexOf(id)));
                    finArrastre();
                  }}
                  onDragEnd={finArrastre}
                >
                  <button type="button" className={estilos.cabeceraBoton} aria-haspopup="dialog" aria-expanded={menuCol?.id === id} onClick={(e) => setMenuCol(menuCol?.id === id ? null : { id, ancla: e.currentTarget })} title="Pulsa para ver las opciones de la columna. Arrástrala para cambiarla de sitio">
                    <span className={estilos.iconoColumna}>
                      <IconoColumna id={id} />
                    </span>
                    <span>{META[id].titulo}</span>
                    <span className={estilos.iconoPulsable} aria-hidden="true">
                      <Flecha tamano={13} />
                    </span>
                    {filtrada(id) && <span className={estilos.puntoFiltro} aria-label="Con filtro" title="Con filtro" />}
                    {orden.col === id && !filasAMano.activo && <span className={estilos.flechaOrden} aria-label={orden.sentido === "asc" ? "Ascendente" : "Descendente"}>{orden.sentido === "asc" ? "↑" : "↓"}</span>}
                  </button>
                </th>
              ))}
              <th scope="col" aria-label="Opciones" />
            </tr>
          </thead>
          <tbody>
            {visibles.map((l, i) => (
              <tr key={l.id} className={`${marcados.includes(l.id) ? estilos.filaMarcada : ""} ${arrastreFilas.marcada(i) ? estilos.filaDestino : ""}`} {...arrastreFilas.propsFila(i)}>
                <td className={estilos.celdaCasilla}>
                  <span className={estilos.controlesFila}>
                    <Asa className={estilos.asaFila} {...arrastreFilas.propsAsa(i)} />
                    <input type="checkbox" checked={marcados.includes(l.id)} onChange={() => alternarMarca(l.id)} aria-label={`Marcar a ${l.nombre} ${l.apellidos}`.trim()} />
                  </span>
                </td>
                {ordenCols.map((id) => (
                  <td key={id}>{celdas[id](l)}</td>
                ))}
                <td className={estilos.celdaOpciones}>
                  <MenuFila id={l.id} nombre={`${l.nombre} ${l.apellidos}`.trim()} />
                </td>
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td colSpan={9} className={estilos.sinLeads}>
                  {leads.length === 0 ? "Todavía no tienes leads. Pulsa «Crear lead» para añadir el primero." : "Ningún lead coincide con la búsqueda o los filtros."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {menuCol && m && (
        <MenuColumna
          key={m}
          ancla={menuCol.ancla}
          titulo={META[m].titulo}
          descripcion={META[m].descripcion}
          edicion={edicion}
          filtro={META[m].filtro}
          filtroOpciones={META[m].filtro === "opciones" ? { opciones: opcionesDe(m), valor: filtros[m] } : undefined}
          alFiltrarOpciones={(f) => setFiltros((x) => ({ ...x, [m]: f }))}
          filtroTexto={m === "nombre" || m === "telefono" ? textos[m] : undefined}
          alFiltrarTexto={(t) => m !== "fecha" && (m === "nombre" || m === "telefono") && setTextos((x) => ({ ...x, [m]: t }))}
          contenidoFiltroFecha={
            <div className={estilos.fechas}>
              <label>
                Desde
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
              </label>
              <label>
                Hasta
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
              </label>
              {(desde || hasta) && (
                <button
                  type="button"
                  className={estilos.limpiar}
                  onClick={() => {
                    setDesde("");
                    setHasta("");
                  }}
                >
                  Quitar fechas
                </button>
              )}
            </div>
          }
          sentido={orden.col === m ? orden.sentido : null}
          alOrdenar={(sentido) => {
            filasAMano.desactivar();
            setOrden({ col: m, sentido });
          }}
          alCerrar={() => setMenuCol(null)}
        />
      )}
    </>
  );
}
