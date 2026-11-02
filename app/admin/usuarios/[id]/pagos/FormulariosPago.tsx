"use client";

import { useActionState, useState } from "react";
import type { Estado } from "../../../acciones";
import styles from "../../../admin.module.css";
import { euros } from "@/lib/formato";
import { anularPagoPersona, editarPago, cobrarPendiente, guardarPrecioPersonalizado, pagoGuiado, pagoManual, quitarPrecioPersonalizado } from "./acciones";
import estilos from "./pagosPersona.module.css";

export type FormaOpcion = { clave: string; nombre: string };
export type TipoPago = { id: string; nombre: string; servicio: string; precio: number; iva: number; clases: number; validez: number };
export type DescuentoOpcion = { id: string; texto: string; tipo: string; valor: number };
export type PendienteOpcion = { id: string; tipoId: string | null; importe: number; metodo: string };
export type BonoOpcion = { id: string; texto: string };
export type FilaPagoPersona = {
  id: string;
  concepto: string;
  importe: number;
  descuento: number;
  metodo: string;
  metodoNombre: string;
  estado: string; // pagado | pendiente | anulado
  fecha: string; // texto ya formateado
  periodo: string | null; // AAAA-MM
  nota: string | null;
  notaCompleta: string | null;
  dia: string; // AAAA-MM-DD
  hora: string; // HH:MM
  tieneFactura: boolean;
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesTexto = (p: string | null) => (p ? `${MESES[Number(p.slice(5, 7)) - 1]} ${p.slice(0, 4)}` : "—");

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

function CamposFechaHora({ hoy, ahora, id }: { hoy: string; ahora: string; id: string }) {
  return (
    <div className={estilos.dos}>
      <div className={styles.campo}>
        <label htmlFor={`${id}-fecha`}>Día del pago</label>
        <input id={`${id}-fecha`} name="fecha" type="date" defaultValue={hoy} max={hoy} />
      </div>
      <div className={styles.campo}>
        <label htmlFor={`${id}-hora`}>Hora</label>
        <input id={`${id}-hora`} name="hora" type="time" defaultValue={ahora} />
      </div>
    </div>
  );
}

function SelectorForma({ formas, id }: { formas: FormaOpcion[]; id: string }) {
  return (
    <div className={styles.campo}>
      <label htmlFor={`${id}-metodo`}>Forma de pago</label>
      <select id={`${id}-metodo`} name="metodo" defaultValue="" required>
        <option value="" disabled>
          Selecciona…
        </option>
        {formas.map((f) => (
          <option key={f.clave} value={f.clave}>
            {f.nombre}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
export function FormGuiado({
  userId,
  hoy,
  ahora,
  formas,
  tipos,
  descuentos,
  ultimoTipoId,
  creditos,
  pendientes,
  precios,
}: {
  userId: string;
  hoy: string;
  ahora: string;
  formas: FormaOpcion[];
  tipos: TipoPago[];
  descuentos: DescuentoOpcion[];
  ultimoTipoId: string | null;
  creditos: Record<string, number>;
  pendientes: PendienteOpcion[];
  precios: Record<string, number>; // precio fijo personalizado por tarifa (céntimos)
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(pagoGuiado, {});
  const [tipoId, setTipoId] = useState(ultimoTipoId && tipos.some((t) => t.id === ultimoTipoId) ? ultimoTipoId : (tipos[0]?.id ?? ""));
  const [descuentoId, setDescuentoId] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [sinCobrar, setSinCobrar] = useState(false);
  const [cobrarPend, setCobrarPend] = useState(true);

  const tipo = tipos.find((t) => t.id === tipoId);
  const pend = pendientes.find((p) => p.tipoId === tipoId);
  const usaPendiente = !!pend && cobrarPend;
  const d = descuentos.find((x) => x.id === descuentoId);
  const personalizado = tipo ? precios[tipo.id] : undefined;
  const precio = personalizado ?? tipo?.precio ?? 0;
  const rebaja = tipo && d && !usaPendiente ? (d.tipo === "porcentaje" ? Math.round((precio * d.valor) / 100) : Math.min(d.valor, precio)) : 0;
  const total = usaPendiente && pend ? pend.importe : precio - rebaja;
  const base = tipo ? Math.round(total / (1 + tipo.iva / 100)) : 0;
  const antes = tipo ? (creditos[tipo.servicio] ?? 0) : 0;
  const despues = usaPendiente ? antes : antes + (tipo?.clases ?? 0);
  const textoBoton = usaPendiente ? "Cobrar el pago pendiente" : sinCobrar ? "Asignar sin cobrar" : "Añadir pago";

  return (
    <div className={estilos.guiado}>
      <form action={accion} className={styles.tarjeta}>
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="pendienteId" value={usaPendiente && pend ? pend.id : ""} />

        <div className={styles.campo}>
          <label htmlFor="pg-tipo">¿Qué pagará?</label>
          <select id="pg-tipo" name="tipo" value={tipoId} onChange={(e) => setTipoId(e.target.value)} required>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} · {euros(precios[t.id] ?? t.precio)}
                {precios[t.id] !== undefined ? " (precio personalizado)" : ""}
              </option>
            ))}
          </select>
          {personalizado !== undefined && !usaPendiente && <span className={styles.ayuda}>Tiene un precio fijo personalizado para esta tarifa: {euros(personalizado)} en vez de {euros(tipo?.precio ?? 0)}.</span>}
        </div>

        {pend && (
          <div className={estilos.opciones}>
            <label className={`${estilos.opcion} ${cobrarPend ? estilos.opcionMarcada : ""}`}>
              <input type="radio" checked={cobrarPend} onChange={() => setCobrarPend(true)} />
              <span>
                <b>Cobrar el pago pendiente de {euros(pend.importe)}</b>
                <small>Ya tiene esta tarifa asignada sin cobrar. Se marca como cobrado.</small>
              </span>
            </label>
            <label className={`${estilos.opcion} ${!cobrarPend ? estilos.opcionMarcada : ""}`}>
              <input type="radio" checked={!cobrarPend} onChange={() => setCobrarPend(false)} />
              <span>
                <b>Crear un pago nuevo</b>
                <small>Se le añade otra tarifa igual (por ejemplo, la del mes siguiente).</small>
              </span>
            </label>
          </div>
        )}

        {!usaPendiente && descuentos.length > 0 && (
          <div className={styles.campo}>
            <label htmlFor="pg-desc">Descuento (opcional)</label>
            <select id="pg-desc" name="descuento" value={descuentoId} onChange={(e) => setDescuentoId(e.target.value)}>
              <option value="">Sin descuento</option>
              {descuentos.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.texto}
                </option>
              ))}
            </select>
          </div>
        )}

        <SelectorForma formas={formas} id="pg" />

        <div className={estilos.dos}>
          <div className={styles.campo}>
            <label htmlFor="pg-fecha">Día del pago</label>
            <input id="pg-fecha" name="fecha" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="pg-hora">Hora</label>
            <input id="pg-hora" name="hora" type="time" defaultValue={ahora} />
          </div>
        </div>

        {!usaPendiente && (
          <label className={styles.casilla}>
            <input type="checkbox" name="sinCobrar" checked={sinCobrar} onChange={(e) => setSinCobrar(e.target.checked)} />
            Asignar la tarifa sin cobrar (el pago queda pendiente)
          </label>
        )}

        <div className={styles.campo}>
          <label htmlFor="pg-nota">Nota (opcional)</label>
          <input id="pg-nota" name="nota" maxLength={200} />
        </div>

        <Mensajes estado={estado} />
        <button type="submit" className={styles.boton} disabled={pendiente || !tipo}>
          {pendiente ? "Guardando…" : textoBoton}
        </button>
      </form>

      <aside className={estilos.resumen} aria-label="Resumen del pago">
        <h3>Resumen</h3>
        <div>
          <span>El pago corresponde a</span>
          <b>{mesTexto(fecha ? fecha.slice(0, 7) : null)}</b>
        </div>
        <div>
          <span>Importe</span>
          <b>
            {euros(total)}
            {rebaja > 0 && <small> (descuento −{euros(rebaja)})</small>}
          </b>
          {tipo && (
            <small>
              base {euros(base)} + IVA {euros(total - base)} ({tipo.iva} %)
            </small>
          )}
        </div>
        {tipo && tipo.servicio !== "online" && (
          <div>
            <span>Créditos</span>
            <b>
              {antes} → {despues}
            </b>
          </div>
        )}
        {tipo && tipo.servicio === "online" && (
          <div>
            <span>Plan online</span>
            <b>{tipo.validez} días</b>
          </div>
        )}
        <div>
          <span>Estado</span>
          <b>{usaPendiente || !sinCobrar ? "Se cobra ahora" : "Pendiente de cobrar"}</b>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
function FormCobrar({ userId, pagoId, formas, hoy, ahora, metodoActual }: { userId: string; pagoId: string; formas: FormaOpcion[]; hoy: string; ahora: string; metodoActual: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cobrarPendiente, {});
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="pagoId" value={pagoId} />
      <div className={styles.campo}>
        <label htmlFor={`co-${pagoId}`}>Forma de pago</label>
        <select id={`co-${pagoId}`} name="metodo" defaultValue={metodoActual} required>
          {formas.map((f) => (
            <option key={f.clave} value={f.clave}>
              {f.nombre}
            </option>
          ))}
        </select>
      </div>
      <CamposFechaHora hoy={hoy} ahora={ahora} id={`co-${pagoId}`} />
      <button type="submit" className={styles.boton} disabled={pendiente}>
        {pendiente ? "Guardando…" : "Marcar como cobrado"}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

function FormEditar({ userId, pago, formas, hoy }: { userId: string; pago: FilaPagoPersona; formas: FormaOpcion[]; hoy: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(editarPago, {});
  const id = `ed-${pago.id}`;
  return (
    <form action={accion} className={styles.formularioInterno}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="pagoId" value={pago.id} />
      <div className={estilos.dos}>
        <div className={styles.campo}>
          <label htmlFor={`${id}-fecha`}>Día del pago</label>
          <input id={`${id}-fecha`} name="fecha" type="date" defaultValue={pago.dia} max={hoy} />
        </div>
        <div className={styles.campo}>
          <label htmlFor={`${id}-hora`}>Hora</label>
          <input id={`${id}-hora`} name="hora" type="time" defaultValue={pago.hora} />
        </div>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`${id}-importe`}>Importe (€)</label>
        <input id={`${id}-importe`} name="importe" inputMode="decimal" required defaultValue={(pago.importe / 100).toFixed(2).replace(".", ",")} />
        {pago.tieneFactura && <span className={styles.ayuda}>Si cambias el importe, este pago se anula con su factura rectificativa y se crea una factura nueva con el importe correcto.</span>}
      </div>
      <div className={styles.campo}>
        <label htmlFor={`${id}-metodo`}>Forma de pago</label>
        <select id={`${id}-metodo`} name="metodo" defaultValue={pago.metodo} required>
          {formas.map((f) => (
            <option key={f.clave} value={f.clave}>
              {f.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.campo}>
        <label htmlFor={`${id}-nota`}>Nota (opcional)</label>
        <input id={`${id}-nota`} name="nota" maxLength={200} defaultValue={pago.notaCompleta ?? ""} />
      </div>
      <button type="submit" className={styles.boton} disabled={pendiente}>
        {pendiente ? "Guardando…" : "Guardar los cambios"}
      </button>
      <Mensajes estado={estado} />
    </form>
  );
}

function FormAnular({ userId, pagoId }: { userId: string; pagoId: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(anularPagoPersona, {});
  return (
    <form
      action={accion}
      className={styles.formularioInterno}
      onSubmit={(e) => {
        if (!window.confirm("¿Anular este pago? Quedará escrito el motivo. El bono no se toca.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="pagoId" value={pagoId} />
      <div className={styles.campo}>
        <label htmlFor={`an-${pagoId}`}>Motivo (opcional)</label>
        <input id={`an-${pagoId}`} name="nota" maxLength={200} />
      </div>
      <button type="submit" className={`${styles.boton} ${styles.botonSecundario}`} disabled={pendiente}>
        {pendiente ? "Anulando…" : "Anular el pago"}
      </button>
      <p className={styles.ayuda}>El bono no se toca. Si también quieres quitar la tarifa, usa «Quitar tarifa» en Acciones.</p>
      <Mensajes estado={estado} />
    </form>
  );
}

export function HistorialPersona({ userId, pagos, formas, hoy, ahora }: { userId: string; pagos: FilaPagoPersona[]; formas: FormaOpcion[]; hoy: string; ahora: string }) {
  if (pagos.length === 0) return <p className={styles.ayuda}>Todavía no tiene ningún pago.</p>;
  return (
    <ul className={styles.lista}>
      {pagos.map((p) => (
        <li key={p.id} className={styles.persona}>
          <div className={styles.personaCabecera}>
            <div>
              <strong>{p.concepto}</strong>
              <div className={styles.ayuda}>
                {p.fecha} · {p.metodoNombre}
                {p.periodo ? ` · corresponde a ${mesTexto(p.periodo)}` : ""}
              </div>
              {p.descuento > 0 && <div className={styles.ayuda}>Descuento −{euros(p.descuento)}</div>}
              {p.nota && <div className={styles.ayuda}>{p.nota}</div>}
            </div>
            <div className={estilos.derecha}>
              <b>{euros(p.importe)}</b>
              <span className={p.estado === "pagado" ? estilos.cobrado : p.estado === "pendiente" ? estilos.sinPagar : estilos.anulado}>
                {p.estado === "pagado" ? "Cobrado" : p.estado === "pendiente" ? "Pendiente" : "Anulado"}
              </span>
            </div>
          </div>
          {p.estado === "pendiente" && (
            <details>
              <summary className={styles.ayuda}>Cobrar</summary>
              <FormCobrar userId={userId} pagoId={p.id} formas={formas} hoy={hoy} ahora={ahora} metodoActual={p.metodo} />
            </details>
          )}
          {p.estado === "anulado" && p.tieneFactura && (
            <>
              <a href={`/pagos/recibo/${p.id}`} download className={styles.ayuda} style={{ textDecoration: "underline" }}>
                Descargar rectificativa
              </a>
              <a href={`/pagos/recibo/${p.id}?tipo=original`} download className={styles.ayuda} style={{ textDecoration: "underline" }}>
                Descargar la original
              </a>
            </>
          )}
          {p.estado === "pagado" && (
            <a href={`/pagos/recibo/${p.id}`} download className={styles.ayuda} style={{ textDecoration: "underline", display: "inline-flex", alignItems: "center", minHeight: 40 }}>
              Descargar factura
            </a>
          )}
          {p.estado === "pagado" && (
            <details>
              <summary className={styles.ayuda}>Editar</summary>
              <FormEditar userId={userId} pago={p} formas={formas} hoy={hoy} />
            </details>
          )}
          {p.estado === "pagado" && (
            <details>
              <summary className={styles.ayuda}>Anular</summary>
              <FormAnular userId={userId} pagoId={p.id} />
            </details>
          )}
        </li>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------------------------------------
export function FormManual({ userId, hoy, ahora, formas, bonos, tipos, precios }: { userId: string; hoy: string; ahora: string; formas: FormaOpcion[]; bonos: BonoOpcion[]; tipos: TipoPago[]; precios: Record<string, number> }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(pagoManual, {});
  const anio = Number(hoy.slice(0, 4));
  const [mes, setMes] = useState(Number(hoy.slice(5, 7)));
  const [anioElegido, setAnioElegido] = useState(anio);
  // Qué paga: una tarifa o bono de la lista (rellena el concepto y el importe) u otro concepto libre.
  const [queId, setQueId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [importe, setImporte] = useState("");

  function elegirQue(id: string) {
    setQueId(id);
    const t = tipos.find((x) => x.id === id);
    if (t) {
      setConcepto(t.nombre);
      setImporte(((precios[t.id] ?? t.precio) / 100).toFixed(2).replace(".", ","));
    } else {
      setConcepto("");
      setImporte("");
    }
  }

  return (
    <form action={accion} className={styles.tarjeta}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="mes" value={`${anioElegido}-${String(mes).padStart(2, "0")}`} />

      <CamposFechaHora hoy={hoy} ahora={ahora} id="pm" />

      <div className={estilos.dos}>
        <div className={styles.campo}>
          <label htmlFor="pm-mes">Corresponde al mes</label>
          <select id="pm-mes" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="pm-anio">Año</label>
          <select id="pm-anio" value={anioElegido} onChange={(e) => setAnioElegido(Number(e.target.value))}>
            {[anio - 1, anio, anio + 1].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="pm-que">¿Qué paga?</label>
        <select id="pm-que" value={queId} onChange={(e) => elegirQue(e.target.value)} required>
          <option value="" disabled>
            Elige…
          </option>
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre} · {euros(t.precio)}
            </option>
          ))}
          <option value="otro">Otro concepto (lo escribo yo)…</option>
        </select>
      </div>
      {queId === "otro" ? (
        <div className={styles.campo}>
          <label htmlFor="pm-concepto">Concepto</label>
          <input id="pm-concepto" name="concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} required maxLength={120} placeholder="Por ejemplo: material, taller…" />
        </div>
      ) : (
        <input type="hidden" name="concepto" value={concepto} />
      )}
      <div className={estilos.dos}>
        <div className={styles.campo}>
          <label htmlFor="pm-importe">Importe (€)</label>
          <input id="pm-importe" name="importe" inputMode="decimal" required placeholder="15,00" value={importe} onChange={(e) => setImporte(e.target.value)} />
        </div>
        <SelectorForma formas={formas} id="pm" />
      </div>

      {bonos.length > 0 && (
        <>
          <div className={styles.campo}>
            <label htmlFor="pm-bono">Aplicar a un bono (opcional)</label>
            <select id="pm-bono" name="bonoId" defaultValue="">
              <option value="">Ninguno (pago suelto)</option>
              {bonos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.texto}
                </option>
              ))}
            </select>
          </div>
          <div className={estilos.dos}>
            <div className={styles.campo}>
              <label htmlFor="pm-clases">Créditos que se suman</label>
              <input id="pm-clases" name="clases" type="number" step={1} defaultValue={0} />
            </div>
            <div className={styles.campo}>
              <label htmlFor="pm-fin">Nueva fecha de fin (opcional)</label>
              <input id="pm-fin" name="nuevaFin" type="date" />
            </div>
          </div>
        </>
      )}

      <Mensajes estado={estado} />
      <button type="submit" className={styles.boton} disabled={pendiente}>
        {pendiente ? "Guardando…" : "Añadir pago"}
      </button>
    </form>
  );
}

// Precio fijo personalizado: lista de lo que tiene esta persona y formulario para añadir uno.
export function PreciosPersonalizados({ userId, tipos, precios }: { userId: string; tipos: TipoPago[]; precios: Record<string, number> }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(guardarPrecioPersonalizado, {});
  const [estadoQuitar, accionQuitar, quitando] = useActionState<Estado, FormData>(quitarPrecioPersonalizado, {});
  const lista = tipos.filter((t) => precios[t.id] !== undefined);
  return (
    <details className={styles.detalles}>
      <summary>Precio fijo personalizado{lista.length > 0 ? ` (${lista.length})` : ""}</summary>
      <p className={styles.ayuda}>Un precio propio para esta persona en una tarifa. «Nuevo guiado» lo usa solo. El alta de usuarios y el registro general de pagos usan el precio normal.</p>
      {lista.map((t) => (
        <form key={t.id} action={accionQuitar} className={estilos.filaPrecio}>
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="tipo" value={t.id} />
          <span>
            <strong>{t.nombre}</strong>
            <small>
              {euros(precios[t.id])} en vez de {euros(t.precio)}
            </small>
          </span>
          <button type="submit" className={`${styles.boton} ${styles.botonSecundario}`} disabled={quitando}>
            Quitar
          </button>
        </form>
      ))}
      <Mensajes estado={estadoQuitar} />
      <form action={accion} className={styles.formularioInterno}>
        <input type="hidden" name="userId" value={userId} />
        <div className={styles.campo}>
          <label htmlFor="pp-tipo">Tarifa</label>
          <select id="pp-tipo" name="tipo" defaultValue="" required>
            <option value="" disabled>
              Elige…
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} · {euros(t.precio)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="pp-precio">Su precio (€)</label>
          <input id="pp-precio" name="precio" inputMode="decimal" required placeholder="70,00" />
        </div>
        <button type="submit" className={styles.boton} disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar precio"}
        </button>
        <Mensajes estado={estado} />
      </form>
    </details>
  );
}
