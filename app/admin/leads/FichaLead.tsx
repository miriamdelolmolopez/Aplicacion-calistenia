"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Icono from "../../Icono";
import styles from "../admin.module.css";
import { useEnvio } from "../useEnvio";
import SelectorOpciones from "./SelectorOpciones";
import estilos from "./leads.module.css";
import { anadirNotaVenta, cambiarEstadoLead, convertirEnCliente, guardarLead } from "./acciones";
import SelectorEtiquetas from "./SelectorEtiquetas";
import SelectorTipo from "./SelectorTipo";
import { SERVICIOS_CONTRATO, type EstadoLead, type InfoLead, type ItemColor, type Lead, type NotaVenta, type TarifaLead } from "./tipos";

const fechaHora = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

// Ficha de un lead: el estado arriba (con su flechita para cambiarlo), sus datos, las notas de venta y la información del formulario.
type FilaContrato = { clave: number; servicio: string; tarifaId: string; pagado: boolean };
const euros = (c: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(c / 100);

export default function FichaLead({ lead, estados, etiquetas, tipos, notas, tarifas, formas }: { lead: Lead; estados: EstadoLead[]; etiquetas: ItemColor[]; tipos: ItemColor[]; notas: NotaVenta[]; tarifas: TarifaLead[]; formas: { clave: string; nombre: string }[] }) {
  const router = useRouter();
  const [estadoId, setEstadoId] = useState(lead.estado_id);
  const [errorEstado, setErrorEstado] = useState("");
  const [, empezar] = useTransition();
  const cajaHistorial = useRef<HTMLDivElement>(null);
  const [verHistorial, setVerHistorial] = useState(false);
  const actual = estados.find((e) => e.id === estadoId);

  const [estadoGuardado, accionGuardar, guardando] = useActionState(guardarLead, {});
  const { ref, alEnviar } = useEnvio(accionGuardar, estadoGuardado, false);
  const [info, setInfo] = useState<InfoLead[]>(lead.info);

  const [nota, setNota] = useState("");
  const [errorNota, setErrorNota] = useState("");
  const [anadiendo, empezarNota] = useTransition();

  const [eligiendoTipo, setEligiendoTipo] = useState(false);
  // Lo que ha contratado: cada fila es un servicio con su tarifa (o ninguna por ahora) y si ya ha pagado.
  const [contratos, setContratos] = useState<FilaContrato[]>(() => {
    const nombreTipo = (tipos.find((t) => t.id === lead.tipo_id)?.nombre ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const inicial = nombreTipo === "presencial" ? ["grupal"] : nombreTipo === "hibrido" ? ["online", "grupal"] : ["online"];
    return inicial.map((servicio, i) => ({ clave: i, servicio, tarifaId: "", pagado: false }));
  });
  const [metodo, setMetodo] = useState(formas[0]?.clave ?? "");
  const [resultado, setResultado] = useState<{ error?: string; mensaje?: string; enlace?: string } | null>(null);
  const [convirtiendo, empezarConvertir] = useTransition();

  useEffect(() => {
    if (!verHistorial) return;
    const fuera = (e: MouseEvent) => {
      if (cajaHistorial.current && !cajaHistorial.current.contains(e.target as Node)) setVerHistorial(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setVerHistorial(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [verHistorial]);

  function elegirEstado(id: string) {
    if (id === estadoId) return;
    const anterior = estadoId;
    setEstadoId(id);
    setErrorEstado("");
    empezar(async () => {
      const r = await cambiarEstadoLead(lead.id, id);
      if (!r.ok) {
        setEstadoId(anterior);
        setErrorEstado(r.error ?? "No se ha podido cambiar el estado.");
        return;
      }
      router.refresh();
    });
  }

  function guardarNota() {
    setErrorNota("");
    empezarNota(async () => {
      const r = await anadirNotaVenta(lead.id, nota);
      if (!r.ok) {
        setErrorNota(r.error ?? "No se ha podido guardar la nota.");
        return;
      }
      setNota("");
      router.refresh();
    });
  }

  function convertir() {
    setResultado(null);
    empezarConvertir(async () => {
      const r = await convertirEnCliente(
        lead.id,
        contratos.map((c) => ({ servicio: c.servicio, tarifaId: c.tarifaId, pagado: c.pagado })),
        metodo,
      );
      setResultado(r);
      if (!r.error) {
        setEligiendoTipo(false);
        router.refresh();
      }
    });
  }

  const esCambio = (n: NotaVenta) => n.texto.startsWith("Estado:");
  const comentarios = notas.filter((n) => !esCambio(n));
  const cambios = notas.filter(esCambio);

  const puedeConvertir = !!actual?.es_ganado && !lead.cliente_id;

  return (
    <div className={estilos.ficha}>
      <div className={estilos.columnaPrincipal}>
        <section className={`${styles.tarjeta} ${estilos.seccionEstado}`}>
          <h2 className={estilos.subtitulo}>Estado del lead</h2>
          <div className={estilos.estadoFila}>
          <div className={estilos.estadoCaja}>
            <SelectorOpciones tabla="estados" opciones={estados} multiple={false} valores={[estadoId]} variante="pastilla" alCambiar={(ids) => ids[0] && elegirEstado(ids[0])} />
          </div>
          <div className={estilos.historialCaja} ref={cajaHistorial}>
            <button type="button" className={estilos.botonHistorial} onClick={() => setVerHistorial((v) => !v)} aria-haspopup="dialog" aria-expanded={verHistorial} aria-label={`Historial de estados (${cambios.length})`} title="Historial de estados">
              <Icono nombre="historial" tamano={18} />
            </button>
            {verHistorial && (
              <div className={estilos.panelHistorial} role="dialog" aria-label="Historial de estados">
                <strong>Historial de estados</strong>
                {cambios.length === 0 ? (
                  <p className={estilos.vacioFiltro}>Todavía no ha cambiado de estado.</p>
                ) : (
                  <ul>
                    {cambios.map((n) => (
                      <li key={n.id}>
                        <span>{n.estado_nombre || n.texto.replace(/^Estado:\s*/, "")}</span>
                        <small>{fechaHora(n.creado_en)}</small>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          </div>
          {errorEstado && <p className={styles.error}>{errorEstado}</p>}

          <div className={estilos.convertir}>
            {lead.cliente_id ? (
              <p className={styles.aviso}>
                Ya es cliente. <Link href={`/admin/usuarios/${lead.cliente_id}`}>Ver su ficha</Link>
              </p>
            ) : (
              <>
                <button type="button" className={`${styles.boton} ${styles.botonOscuro}`} disabled={!puedeConvertir} onClick={() => setEligiendoTipo((v) => !v)} title={puedeConvertir ? "" : "Se activa cuando el lead está en el estado «Ganado»"}>
                  Convertir en cliente
                </button>
                {!puedeConvertir && <small className={estilos.ayudaConvertir}>Se activa con el estado «Ganado».</small>}
              </>
            )}
          </div>
          {eligiendoTipo && puedeConvertir && (
            <div className={estilos.elegirTipo}>
              <div className={estilos.contratos}>
                <strong>¿Qué ha contratado?</strong>
                {contratos.map((c, i) => {
                  const delServicio = tarifas.filter((t) => t.servicio === c.servicio);
                  const usados = contratos.filter((_, n) => n !== i).map((x) => x.servicio);
                  return (
                    <div key={c.clave} className={estilos.filaContrato}>
                      <select value={c.servicio} onChange={(e) => setContratos((l) => l.map((x, n) => (n === i ? { ...x, servicio: e.target.value, tarifaId: "" } : x)))} aria-label="Servicio">
                        {SERVICIOS_CONTRATO.filter((s) => s.valor === c.servicio || !usados.includes(s.valor)).map((s) => (
                          <option key={s.valor} value={s.valor}>
                            {s.texto}
                          </option>
                        ))}
                      </select>
                      <select value={c.tarifaId} onChange={(e) => setContratos((l) => l.map((x, n) => (n === i ? { ...x, tarifaId: e.target.value, pagado: e.target.value ? x.pagado : false } : x)))} aria-label="Tarifa">
                        <option value="">Sin tarifa por ahora</option>
                        {delServicio.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.nombre} · {euros(t.precio_centimos)}
                          </option>
                        ))}
                      </select>
                      <label className={estilos.marcaGanado}>
                        <input type="checkbox" checked={c.pagado} disabled={!c.tarifaId} onChange={(e) => setContratos((l) => l.map((x, n) => (n === i ? { ...x, pagado: e.target.checked } : x)))} />
                        Ya ha pagado
                      </label>
                      <button type="button" className={estilos.iconoBoton} onClick={() => setContratos((l) => l.filter((_, n) => n !== i))} aria-label="Quitar este servicio">
                        ×
                      </button>
                    </div>
                  );
                })}
                {contratos.length < SERVICIOS_CONTRATO.length && (
                  <button
                    type="button"
                    className={`${styles.boton} ${styles.botonSecundario}`}
                    onClick={() =>
                      setContratos((l) => {
                        const libre = SERVICIOS_CONTRATO.find((s) => !l.some((x) => x.servicio === s.valor));
                        return libre ? [...l, { clave: Date.now(), servicio: libre.valor, tarifaId: "", pagado: false }] : l;
                      })
                    }
                  >
                    + Añadir servicio
                  </button>
                )}
                {contratos.some((c) => c.pagado) && (
                  <div className={styles.campo}>
                    <label htmlFor="metodo-pago">¿Cómo ha pagado?</label>
                    <select id="metodo-pago" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                      {formas.map((f) => (
                        <option key={f.clave} value={f.clave}>
                          {f.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {contratos.length === 0 && <small className={estilos.ayudaConvertir}>Sin servicios por ahora: se crea la cuenta y le das la tarifa después desde su ficha.</small>}
              </div>
              <button type="button" className={styles.boton} onClick={convertir} disabled={convirtiendo}>
                {convirtiendo ? "Creando cuenta…" : "Crear cliente"}
              </button>
            </div>
          )}
          {resultado?.error && <p className={styles.error}>{resultado.error}</p>}
          {resultado?.mensaje && (
            <p className={styles.aviso}>
              {resultado.mensaje} {resultado.enlace && <code className={estilos.enlace}>{resultado.enlace}</code>}
            </p>
          )}
        </section>

        <section className={`${styles.tarjeta} ${estilos.seccionDatos}`}>
          <h2 className={estilos.subtitulo}>Datos del lead</h2>
          <form ref={ref} onSubmit={alEnviar} className={estilos.formulario}>
            <input type="hidden" name="id" value={lead.id} />
            <input type="hidden" name="info" value={JSON.stringify(info)} />
            <div className={styles.campo}>
              <label htmlFor="fl-nombre">Nombre *</label>
              <input id="fl-nombre" name="nombre" defaultValue={lead.nombre} required maxLength={80} />
            </div>
            <div className={styles.campo}>
              <label htmlFor="fl-apellidos">Apellidos</label>
              <input id="fl-apellidos" name="apellidos" defaultValue={lead.apellidos} maxLength={120} />
            </div>
            <div className={styles.campo}>
              <label htmlFor="fl-telefono">Teléfono</label>
              <input id="fl-telefono" name="telefono" type="tel" defaultValue={lead.telefono} maxLength={30} />
            </div>
            <div className={styles.campo}>
              <label htmlFor="fl-email">Email *</label>
              <input id="fl-email" name="email" type="email" defaultValue={lead.email} required maxLength={200} />
            </div>
            <SelectorTipo id="fl-tipo" tipos={tipos} inicial={lead.tipo_id} />
            <div className={`${styles.campo} ${estilos.ancho}`}>
              <span className={estilos.etiquetaCampo}>Etiquetas</span>
              <SelectorEtiquetas etiquetas={etiquetas} iniciales={lead.etiqueta_ids} />
            </div>
            <div className={styles.campo}>
              <label htmlFor="fl-pais">País</label>
              <input id="fl-pais" name="pais" defaultValue={lead.pais} maxLength={60} />
            </div>
            <div className={styles.campo}>
              <label htmlFor="fl-idioma">Idioma *</label>
              <select id="fl-idioma" name="idioma" defaultValue={lead.idioma}>
                <option value="es">Español (ES)</option>
                <option value="en">English (EN)</option>
              </select>
            </div>
            <div className={styles.campo}>
              <label htmlFor="fl-destino">Origen</label>
              {lead.manual ? <input id="fl-destino" name="destino" defaultValue={lead.destino} maxLength={120} /> : <input id="fl-destino" value={lead.destino} readOnly aria-readonly="true" />}
              {!lead.manual && <small className={styles.ayuda}>Solo se puede cambiar en los leads creados a mano.</small>}
            </div>
            <div className={`${styles.campo} ${estilos.ancho}`}>
              <label htmlFor="fl-notas">Notas asociadas al lead</label>
              <textarea id="fl-notas" name="notas" defaultValue={lead.notas} rows={3} maxLength={4000} className={estilos.areaTexto} />
            </div>
            {estadoGuardado.error && <p className={`${styles.error} ${estilos.ancho}`}>{estadoGuardado.error}</p>}
            {estadoGuardado.mensaje && <p className={`${styles.aviso} ${estilos.ancho}`}>{estadoGuardado.mensaje}</p>}
            <div className={`${estilos.acciones} ${estilos.ancho}`}>
              <button type="submit" className={styles.boton} disabled={guardando}>
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
              <Link href="/admin/leads" className={`${styles.boton} ${styles.botonSecundario}`}>
                Volver a Leads
              </Link>
            </div>
          </form>
        </section>
      </div>

      <div className={estilos.columnaLateral}>
        <section className={`${styles.tarjeta} ${estilos.seccionNotas}`}>
          <h2 className={estilos.subtitulo}>Notas internas de venta</h2>
          <div className={estilos.nuevaNota}>
            <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Escribe un comentario aquí…" maxLength={2000} aria-label="Nueva nota de venta" />
            <button type="button" className={styles.boton} onClick={guardarNota} disabled={anadiendo || !nota.trim()}>
              Añadir comentario
            </button>
          </div>
          {errorNota && <p className={styles.error}>{errorNota}</p>}
          <ul className={estilos.listaNotas}>
            {comentarios.length === 0 && <li className={estilos.vacioFiltro}>Todavía no hay notas.</li>}
            {comentarios.map((n) => (
              <li key={n.id}>
                <small>
                  {n.autor} · {fechaHora(n.creado_en)}
                </small>
                <p>{n.texto}</p>
                {n.estado_nombre && <small>Estado: {n.estado_nombre}</small>}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.tarjeta} ${estilos.seccionInfo}`}>
          <h2 className={estilos.subtitulo}>Información sobre el lead</h2>
          {lead.manual ? (
            <p className={styles.ayuda}>Es un lead manual: rellena aquí lo que sepas de la persona y pulsa «Guardar cambios».</p>
          ) : (
            <p className={styles.ayuda}>Lo que rellenó en «{lead.destino}».</p>
          )}
          {lead.manual ? (
            <div className={estilos.infoEditable}>
              {info.map((x, i) => (
                <div key={i} className={estilos.parInfo}>
                  <input value={x.clave} onChange={(e) => setInfo((l) => l.map((y, n) => (n === i ? { ...y, clave: e.target.value } : y)))} placeholder="Pregunta (ej. Objetivo)" aria-label={`Pregunta ${i + 1}`} maxLength={80} />
                  <input value={x.valor} onChange={(e) => setInfo((l) => l.map((y, n) => (n === i ? { ...y, valor: e.target.value } : y)))} placeholder="Respuesta" aria-label={`Respuesta ${i + 1}`} maxLength={500} />
                  <button type="button" className={estilos.iconoBoton} onClick={() => setInfo((l) => l.filter((_, n) => n !== i))} aria-label="Quitar esta fila">
                    ×
                  </button>
                </div>
              ))}
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setInfo((l) => [...l, { clave: "", valor: "" }])}>
                + Añadir dato
              </button>
            </div>
          ) : lead.info.length === 0 ? (
            <p className={estilos.vacioFiltro}>No hay información.</p>
          ) : (
            <dl className={estilos.infoLista}>
              {lead.info.map((x, i) => (
                <div key={i}>
                  <dt>{x.clave}</dt>
                  <dd>{x.valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
    </div>
  );
}
