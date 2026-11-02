"use client";

import { useActionState, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import comunes from "../comunes/comunes.module.css";
import PanelCompleto from "../comunes/PanelCompleto";
import EnlaceCopiable from "../EnlaceCopiable";
import { useEnvio } from "../useEnvio";
import estilos from "./usuarios.module.css";
import { crearUsuario } from "./acciones";
import { euros } from "@/lib/formato";
import { sumarDias } from "@/lib/fechas";

export type TarifaOpcion = { id: string; nombre: string; servicio: string; precio_centimos: number; validez_dias: number };
export type DescuentoOpcion = { id: string; texto: string; tipo: string; valor: number };

const SERVICIOS = [
  { valor: "grupal", etiqueta: "Clases grupales" },
  { valor: "individual", etiqueta: "Entrenamiento individual" },
  { valor: "online", etiqueta: "Entrenamiento online" },
];

// Panel «+ Nuevo»: invitar a una persona o dar de alta a un/a alumno/a, con su servicio y su tarifa si ya la tiene.
export default function NuevoUsuario({
  tarifas,
  descuentos,
  hoy,
  ahora,
  formas,
  abiertoInicial = false,
}: {
  tarifas: TarifaOpcion[];
  descuentos: DescuentoOpcion[];
  hoy: string;
  ahora: string;
  formas: { clave: string; nombre: string }[];
  abiertoInicial?: boolean;
}) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [tipo, setTipo] = useState<"invitado" | "alumno">("alumno");
  const [servicio, setServicio] = useState("");
  const [tarifaId, setTarifaId] = useState("");
  const [inicio, setInicio] = useState(hoy);
  const [fin, setFin] = useState<string | null>(null);
  const [descuentoId, setDescuentoId] = useState("");
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearUsuario, {});
  const { ref, alEnviar } = useEnvio(accion, estado, true);

  const tarifasDelServicio = tarifas.filter((t) => t.servicio === servicio);
  const tarifa = tarifas.find((t) => t.id === tarifaId && t.servicio === servicio);
  const descuento = descuentos.find((d) => d.id === descuentoId);
  const rebaja = tarifa && descuento ? (descuento.tipo === "porcentaje" ? Math.round((tarifa.precio_centimos * descuento.valor) / 100) : Math.min(descuento.valor, tarifa.precio_centimos)) : 0;
  const finPorDefecto = tarifa && inicio ? sumarDias(inicio, tarifa.validez_dias) : "";
  const finValor = fin ?? finPorDefecto;

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <button type="button" className={comunes.nuevo} onClick={() => setAbierto(true)}>
          <b aria-hidden="true">+</b> Nuevo usuario
        </button>
      </div>

      {abierto && (
        <PanelCompleto titulo="Nuevo usuario" cerrar={() => setAbierto(false)}>
        <form ref={ref} onSubmit={alEnviar} className={styles.tarjeta}>
          <div className={styles.campo}>
            <label htmlFor="nu-correo">Correo <AyudaI texto="El correo de la persona. Con él entra a la app y le llegan los avisos." /></label>
            <input id="nu-correo" name="correo" type="email" required />
          </div>

          <fieldset className={styles.grupo}>
            <legend>Tipo de usuario <AyudaI texto="Alumno/a: ya entrena contigo y puede tener servicios y tarifa. Invitado/a: recibe un correo para crear su cuenta y hacer su clase de prueba." /></legend>
            <label className={styles.casilla}>
              <input type="radio" name="tipo" value="alumno" checked={tipo === "alumno"} onChange={() => setTipo("alumno")} />
              Alumno/a (ya entrena contigo)
            </label>
            <label className={styles.casilla}>
              <input type="radio" name="tipo" value="invitado" checked={tipo === "invitado"} onChange={() => setTipo("invitado")} />
              Invitado/a (recibe un correo para crear su cuenta)
            </label>
          </fieldset>

          {tipo === "alumno" && (
            <>
              <div className={styles.campo}>
                <label htmlFor="nu-servicio">Servicio que contrata <AyudaI texto="Qué servicio va a usar: clases grupales, entrenamiento individual o entrenamiento online. Si solo quieres dar de alta a la persona, déjalo en «Ninguno»." /></label>
                <select
                  id="nu-servicio"
                  name="servicio"
                  value={servicio}
                  onChange={(e) => {
                    setServicio(e.target.value);
                    setTarifaId("");
                    setFin(null);
                    setDescuentoId("");
                  }}
                >
                  <option value="">Ninguno (solo dar de alta)</option>
                  {SERVICIOS.map((s) => (
                    <option key={s.valor} value={s.valor}>
                      {s.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              {servicio && (
                <div className={styles.campo}>
                  <label htmlFor="nu-tarifa">Tarifa <AyudaI texto="La tarifa que tiene. Si eliges una, la persona ya la tiene asignada y puede reservar o entrenar. Con «Sin tarifa» solo se le da de alta y la asignas más tarde." /></label>
                  <select
                    id="nu-tarifa"
                    name="tarifa"
                    value={tarifaId}
                    onChange={(e) => {
                      setTarifaId(e.target.value);
                      setFin(null);
                    }}
                  >
                    <option value="">Sin tarifa por ahora</option>
                    {tarifasDelServicio.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} · {euros(t.precio_centimos)}
                      </option>
                    ))}
                  </select>
                  <span className={styles.ayuda}>Con una tarifa, el/la alumno/a ya puede reservar aunque todavía no haya pagado.</span>
                </div>
              )}

              {tarifa && (
                <>
                  <div className={estilos.dos}>
                    <div className={styles.campo}>
                      <label htmlFor="nu-inicio">Fecha de inicio <AyudaI texto="El día en que empieza la tarifa. Si la persona ya venía antes de usar la app, pon el día en que empezó. Es también el día del pago." /></label>
                      <input
                        id="nu-inicio"
                        name="inicio"
                        type="date"
                        value={inicio}
                        max={hoy}
                        onChange={(e) => {
                          setInicio(e.target.value);
                          setFin(null);
                        }}
                        required
                      />
                    </div>
                    <div className={styles.campo}>
                      <label htmlFor="nu-hora">Hora <AyudaI texto="La hora a la que se registra el pago. Sale en la factura." /></label>
                      <input id="nu-hora" name="hora" type="time" defaultValue={ahora} />
                    </div>
                  </div>

                  <div className={styles.campo}>
                    <label htmlFor="nu-fin">Fecha de fin <AyudaI texto="Hasta qué día dura la tarifa. Sale sola según los días de validez de la tarifa. Para alargarla, pon una fecha posterior." /></label>
                    <input id="nu-fin" name="fin" type="date" value={finValor} min={inicio} onChange={(e) => setFin(e.target.value)} />
                    <span className={styles.ayuda}>
                      Por defecto, {tarifa.validez_dias} {tarifa.validez_dias === 1 ? "día" : "días"} desde el inicio. Para alargar la tarifa, pon una fecha posterior.
                    </span>
                  </div>

                  {descuentos.length > 0 && (
                    <div className={styles.campo}>
                      <label htmlFor="nu-descuento">Aplicar descuento (opcional) <AyudaI texto="Si la persona tiene un descuento, elígelo aquí. Rebaja el importe y cuenta como un uso de ese descuento." /></label>
                      <select id="nu-descuento" name="descuento" value={descuentoId} onChange={(e) => setDescuentoId(e.target.value)}>
                        <option value="">Sin descuento</option>
                        {descuentos.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.texto}
                          </option>
                        ))}
                      </select>
                      {rebaja > 0 && (
                        <span className={styles.ayuda}>
                          Descuento −{euros(rebaja)}: total {euros(tarifa.precio_centimos - rebaja)}.
                        </span>
                      )}
                    </div>
                  )}

                  <fieldset className={styles.grupo}>
                    <legend>Pago <AyudaI texto="Pagado ahora: el pago queda registrado como cobrado. Pagará luego: queda pendiente de cobrar y lo cobras después desde su ficha." /></legend>
                    <label className={styles.casilla}>
                      <input type="radio" name="pago" value="ahora" defaultChecked />
                      Pagado ahora
                    </label>
                    <label className={styles.casilla}>
                      <input type="radio" name="pago" value="luego" />
                      Pagará luego (queda pendiente de cobrar)
                    </label>
                  </fieldset>

                  <div className={styles.campo}>
                    <label htmlFor="nu-metodo">Cómo paga <AyudaI texto="La forma de pago de este primer pago. Las opciones salen de «Formas de pago»." /></label>
                    <select id="nu-metodo" name="metodo" defaultValue={formas.find((f) => f.clave === "bizum")?.clave ?? formas[0]?.clave}>
                      {formas.map((f) => (
                        <option key={f.clave} value={f.clave}>
                          {f.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </>
          )}

          {estado.error && (
            <p className={styles.error} role="alert">
              {estado.error}
            </p>
          )}
          <button className={styles.boton} type="submit" disabled={pendiente}>
            {pendiente ? "Creando…" : tipo === "alumno" ? "Crear alumno/a y avisarle" : "Enviar invitación"}
          </button>
          {estado.mensaje && (
            <div role="status">
              <p className={styles.aviso}>{estado.mensaje}</p>
              {estado.enlace && <EnlaceCopiable enlace={estado.enlace} />}
            </div>
          )}
        </form>
        </PanelCompleto>
      )}
    </>
  );
}
