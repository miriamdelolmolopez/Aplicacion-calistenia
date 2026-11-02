"use client";

import { useActionState, useState } from "react";
import type { Estado } from "../../../acciones";
import styles from "../../../admin.module.css";
import AyudaI from "../../../comunes/AyudaI";
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
      <label htmlFor={`${id}-metodo`}>Forma de pago <AyudaI texto="Cómo ha pagado la persona. Las opciones salen de «Formas de pago» en Administración." /></label>
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
const MESES_NOMBRE = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

// Suma días a una fecha AAAA-MM-DD.
function masDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export function FormGuiado({
  userId,
  hoy,
  ahora,
  formas,
  tipos,
  descuentos,
  ultimoTipoId,
}: {
  userId: string;
  hoy: string;
  ahora: string;
  formas: FormaOpcion[];
  tipos: TipoPago[];
  descuentos: DescuentoOpcion[];
  ultimoTipoId: string | null;
}) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(pagoGuiado, {});
  const [tipoId, setTipoId] = useState(ultimoTipoId && tipos.some((t) => t.id === ultimoTipoId) ? ultimoTipoId : (tipos[0]?.id ?? ""));
  const [descuentoId, setDescuentoId] = useState("");
  const [fecha, setFecha] = useState(hoy);
  const [mes, setMes] = useState<number | null>(null);
  const [anio, setAnio] = useState<number | null>(null);
  const [importeTexto, setImporteTexto] = useState<string | null>(null);
  const [fin, setFin] = useState<string | null>(null);
  const [sinCobrar, setSinCobrar] = useState(false);

  const tipo = tipos.find((t) => t.id === tipoId);
  const d = descuentos.find((x) => x.id === descuentoId);
  const importeValor = importeTexto ?? ((tipo?.precio ?? 0) / 100).toFixed(2).replace(".", ",");
  const importe = Math.round(Number(importeValor.replace(",", ".")) * 100) || 0;
  const rebaja = d ? (d.tipo === "porcentaje" ? Math.round((importe * d.valor) / 100) : Math.min(d.valor, importe)) : 0;
  const mesValor = mes ?? Number(fecha.slice(5, 7));
  const anioValor = anio ?? Number(fecha.slice(0, 4));
  const finValor = fin ?? (fecha && tipo ? masDias(fecha, tipo.validez) : "");
  const anioActual = Number(hoy.slice(0, 4));

  return (
    <form action={accion} className={styles.tarjeta}>
      <input type="hidden" name="userId" value={userId} />

      <div className={styles.campo}>
        <label htmlFor="pg-tipo">¿Qué pagará? <AyudaI texto="La tarifa que contrata. Al añadir el pago, la persona recibe ese servicio." /></label>
        <select
          id="pg-tipo"
          name="tipo"
          value={tipoId}
          onChange={(e) => {
            setTipoId(e.target.value);
            setImporteTexto(null);
            setFin(null);
          }}
          required
        >
          {tipos.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nombre} · {euros(t.precio)}
            </option>
          ))}
        </select>
      </div>

      <div className={estilos.dos}>
        <div className={styles.campo}>
          <label htmlFor="pg-fecha">Día del pago <AyudaI texto="El día en que pagó. No puede ser futuro." /></label>
          <input id="pg-fecha" name="fecha" type="date" value={fecha} max={hoy} onChange={(e) => { setFecha(e.target.value); setMes(null); setAnio(null); setFin(null); }} />
        </div>
        <div className={styles.campo}>
          <label htmlFor="pg-hora">Hora del pago <AyudaI texto="La hora a la que pagó. Sale en la factura." /></label>
          <input id="pg-hora" name="hora" type="time" defaultValue={ahora} />
        </div>
      </div>

      <div className={estilos.dos}>
        <div className={styles.campo}>
          <label htmlFor="pg-mes">Corresponde al mes <AyudaI texto="El mes al que corresponde este pago, aunque se cobre otro día. Sirve para tus cuentas e informes." /></label>
          <select id="pg-mes" name="mes" value={mesValor} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES_NOMBRE.map((n, i) => (
              <option key={n} value={i + 1}>
                {n.charAt(0).toUpperCase() + n.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="pg-anio">Corresponde al año <AyudaI texto="El año al que corresponde este pago." /></label>
          <select id="pg-anio" name="anio" value={anioValor} onChange={(e) => setAnio(Number(e.target.value))}>
            {[anioActual - 2, anioActual - 1, anioActual, anioActual + 1].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.campo}>
        <label htmlFor="pg-importe">Importe (€, IVA incluido) <AyudaI texto="Lo que paga la persona. Viene con el precio de la tarifa, pero puedes cambiarlo solo para este pago." /></label>
        <input id="pg-importe" name="importe" inputMode="decimal" value={importeValor} onChange={(e) => setImporteTexto(e.target.value)} required />
        {tipo && importe !== tipo.precio && <span className={styles.ayuda}>El precio de la tarifa es {euros(tipo.precio)}.</span>}
      </div>

      <SelectorForma formas={formas} id="pg" />

      <div className={styles.campo}>
        <label htmlFor="pg-fin">Fecha de fin <AyudaI texto="Hasta qué día dura el servicio. Si no la cambias, son los días de validez de la tarifa." /></label>
        <input id="pg-fin" name="fin" type="date" value={finValor} min={fecha} onChange={(e) => setFin(e.target.value)} />
        <span className={styles.ayuda}>Hasta cuándo dura. Por defecto, los días de validez de la tarifa.</span>
      </div>

      {descuentos.length > 0 && (
        <div className={styles.campo}>
          <label htmlFor="pg-desc">Aplicar un descuento <AyudaI texto="Rebaja el importe con uno de los descuentos que tienes creados. Cuenta como un uso de ese descuento." /></label>
          <select id="pg-desc" name="descuento" value={descuentoId} onChange={(e) => setDescuentoId(e.target.value)}>
            <option value="">Sin descuento</option>
            {descuentos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.texto}
              </option>
            ))}
          </select>
          {rebaja > 0 && (
            <span className={styles.ayuda}>
              Descuento −{euros(rebaja)}: total {euros(importe - rebaja)}.
            </span>
          )}
        </div>
      )}

      <label className={styles.casilla}>
        <input type="checkbox" name="sinCobrar" checked={sinCobrar} onChange={(e) => setSinCobrar(e.target.checked)} />
        <span>
          Asignar tarifa sin cobrar (el pago queda pendiente) <AyudaI texto="Si la marcas, la persona recibe la tarifa ya (puede reservar o entrenar), pero el dinero no se da por cobrado: el pago queda como «pendiente» y lo cobras después desde el Historial. Si no la marcas, el pago se registra como cobrado ahora." />
        </span>
      </label>

      <Mensajes estado={estado} />
      <button type="submit" className={styles.boton} disabled={pendiente || !tipo}>
        {pendiente ? "Guardando…" : sinCobrar ? "Asignar sin cobrar" : "Añadir pago"}
      </button>
    </form>
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
