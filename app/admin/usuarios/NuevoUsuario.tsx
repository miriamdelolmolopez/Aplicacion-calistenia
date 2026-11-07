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
type Forma = { clave: string; nombre: string };

const SERVICIOS = [
  { valor: "grupal", etiqueta: "Clases grupales" },
  { valor: "individual", etiqueta: "Entrenamiento individual" },
  { valor: "taller", etiqueta: "Talleres (gente externa)" },
  { valor: "online", etiqueta: "Entrenamiento online" },
];

// Un servicio del alta: su tarifa, sus fechas y su pago, independientes de los demás.
type Fila = { id: number; servicio: string; tarifaId: string; inicio: string; fin: string | null; pagado: boolean; fechaPago: string; descuentoId: string };

function TarjetaServicio({
  n,
  fila,
  usados,
  tarifas,
  descuentos,
  hoy,
  ahora,
  formas,
  cambiar,
  quitar,
}: {
  n: number;
  fila: Fila;
  usados: string[];
  tarifas: TarifaOpcion[];
  descuentos: DescuentoOpcion[];
  hoy: string;
  ahora: string;
  formas: Forma[];
  cambiar: (cambios: Partial<Fila>) => void;
  quitar?: () => void;
}) {
  const p = `s${n}_`;
  const tarifasDelServicio = tarifas.filter((t) => t.servicio === fila.servicio);
  const tarifa = tarifasDelServicio.find((t) => t.id === fila.tarifaId);
  const descuento = descuentos.find((d) => d.id === fila.descuentoId);
  const rebaja = tarifa && descuento ? (descuento.tipo === "porcentaje" ? Math.round((tarifa.precio_centimos * descuento.valor) / 100) : Math.min(descuento.valor, tarifa.precio_centimos)) : 0;
  const finValor = fila.fin ?? (tarifa && fila.inicio ? sumarDias(fila.inicio, tarifa.validez_dias) : "");

  return (
    <fieldset className={styles.grupo}>
      <legend>
        Servicio {n + 1} <AyudaI texto="Cada servicio tiene su propia tarifa, sus fechas y su pago. Puedes añadir varios." />
      </legend>

      <div className={styles.campo}>
        <label htmlFor={`${p}servicio`}>¿Qué se le da de alta?</label>
        <select
          id={`${p}servicio`}
          name={`${p}servicio`}
          value={fila.servicio}
          onChange={(e) => cambiar({ servicio: e.target.value, tarifaId: "", fin: null, descuentoId: "", pagado: false })}
        >
          <option value="">Elige un servicio</option>
          {SERVICIOS.filter((s) => s.valor === fila.servicio || !usados.includes(s.valor)).map((s) => (
            <option key={s.valor} value={s.valor}>
              {s.etiqueta}
            </option>
          ))}
        </select>
      </div>

      {fila.servicio && (
        <div className={styles.campo}>
          <label htmlFor={`${p}tarifa`}>
            Tarifa <AyudaI texto="La tarifa que tiene. Con «Sin tarifa» solo se le da de alta en el servicio y le asignas la tarifa más tarde." />
          </label>
          <select id={`${p}tarifa`} name={`${p}tarifa`} value={fila.tarifaId} onChange={(e) => cambiar({ tarifaId: e.target.value, fin: null, pagado: false })}>
            <option value="">Sin tarifa por ahora</option>
            {tarifasDelServicio.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} · {euros(t.precio_centimos)}
              </option>
            ))}
          </select>
        </div>
      )}

      {tarifa && (
        <>
          <div className={estilos.dos}>
            <div className={styles.campo}>
              <label htmlFor={`${p}inicio`}>
                Empieza <AyudaI texto="El día en que empieza la tarifa. Por defecto, hoy. Puede ser un día pasado (si ya venía antes de usar la app) o futuro (por ejemplo, el día de un taller)." />
              </label>
              <input id={`${p}inicio`} name={`${p}inicio`} type="date" value={fila.inicio} onChange={(e) => cambiar({ inicio: e.target.value, fin: null })} required />
            </div>
            <div className={styles.campo}>
              <label htmlFor={`${p}fin`}>
                Termina <AyudaI texto="Hasta qué día dura. Sale sola según los días de validez de la tarifa; la puedes cambiar para alargarla o acortarla." />
              </label>
              <input id={`${p}fin`} name={`${p}fin`} type="date" value={finValor} min={fila.inicio} onChange={(e) => cambiar({ fin: e.target.value })} />
            </div>
          </div>
          <span className={styles.ayuda}>
            Por defecto dura {tarifa.validez_dias} {tarifa.validez_dias === 1 ? "día" : "días"} desde el inicio. Cambia cualquiera de las dos fechas si hace falta.
          </span>

          {descuentos.length > 0 && (
            <div className={styles.campo}>
              <label htmlFor={`${p}descuento`}>
                Aplicar descuento (opcional) <AyudaI texto="Si la persona tiene un descuento, elígelo aquí. Rebaja el importe y cuenta como un uso de ese descuento." />
              </label>
              <select id={`${p}descuento`} name={`${p}descuento`} value={fila.descuentoId} onChange={(e) => cambiar({ descuentoId: e.target.value })}>
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

          <label className={styles.casilla}>
            <input type="checkbox" name={`${p}pagado`} checked={fila.pagado} onChange={(e) => cambiar({ pagado: e.target.checked })} />
            <span>
              Marcar como pagado <AyudaI texto="Si la marcas, el pago de este servicio queda cobrado con el día y la hora que pongas. Si no, queda pendiente de cobrar y la persona ya puede reservar." />
            </span>
          </label>

          {fila.pagado && (
            <>
              <div className={estilos.dos}>
                <div className={styles.campo}>
                  <label htmlFor={`${p}fecha`}>Día del pago</label>
                  <input id={`${p}fecha`} name={`${p}fecha`} type="date" value={fila.fechaPago} max={hoy} onChange={(e) => cambiar({ fechaPago: e.target.value })} required />
                </div>
                <div className={styles.campo}>
                  <label htmlFor={`${p}hora`}>Hora del pago</label>
                  <input id={`${p}hora`} name={`${p}hora`} type="time" defaultValue={ahora} required />
                </div>
              </div>
              <div className={styles.campo}>
                <label htmlFor={`${p}metodo`}>Cómo paga</label>
                <select id={`${p}metodo`} name={`${p}metodo`} defaultValue={formas.find((f) => f.clave === "bizum")?.clave ?? formas[0]?.clave}>
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

      {quitar && (
        <button type="button" className={styles.botonSecundario} onClick={quitar}>
          Quitar este servicio
        </button>
      )}
    </fieldset>
  );
}

// Panel «+ Nuevo»: invitar a una persona o dar de alta a un/a alumno/a, con uno o varios servicios.
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
  formas: Forma[];
  abiertoInicial?: boolean;
}) {
  const nueva = (id: number): Fila => ({ id, servicio: "", tarifaId: "", inicio: hoy, fin: null, pagado: false, fechaPago: hoy, descuentoId: "" });
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [tipo, setTipo] = useState<"invitado" | "alumno">("alumno");
  const [filas, setFilas] = useState<Fila[]>([nueva(0)]);
  const [siguiente, setSiguiente] = useState(1);
  // Prueba gratuita del invitado/a
  const [prueba, setPrueba] = useState("grupal");
  const [diasPrueba, setDiasPrueba] = useState("14");
  const [inicioPrueba, setInicioPrueba] = useState(hoy);
  const [finPrueba, setFinPrueba] = useState<string | null>(null);
  const diasNum = Math.floor(Number(diasPrueba));
  const finPruebaValor = finPrueba ?? (inicioPrueba && diasNum >= 1 ? sumarDias(inicioPrueba, diasNum) : "");
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearUsuario, {});
  const { ref, alEnviar } = useEnvio(accion, estado, true);

  const usados = filas.map((f) => f.servicio).filter(Boolean);
  const puedeAnadir = filas.length < SERVICIOS.length && filas[filas.length - 1]?.servicio !== "";

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

          <div className={styles.campo}>
            <label htmlFor="nu-idioma">Idioma <AyudaI texto="El idioma del correo de bienvenida y de los avisos que le lleguen. Después, ella puede cambiarlo en la app." /></label>
            <select id="nu-idioma" name="idioma" defaultValue="es">
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>

          <fieldset className={styles.grupo}>
            <legend>Tipo de usuario <AyudaI texto="Alumno/a: ya entrena contigo y puede tener servicios y tarifa. Invitado/a: recibe un correo para crear su cuenta y hacer su clase de prueba." /></legend>
            <label className={styles.casilla}>
              <input type="radio" name="tipo" value="alumno" checked={tipo === "alumno"} onChange={() => setTipo("alumno")} />
              Alumno/a (ya entrena contigo)
            </label>
            <label className={styles.casilla}>
              <input type="radio" name="tipo" value="invitado" checked={tipo === "invitado"} onChange={() => setTipo("invitado")} />
              Invitado/a (viene a probar)
            </label>
          </fieldset>

          {tipo === "alumno" && (
            <>
              <div className={styles.campo}>
                <label htmlFor="nu-desde">Alumno/a desde (opcional) <AyudaI texto="La fecha en que empezó con vosotras. Sirve para la automatización de aniversario y para tener la base de datos al día. Si la dejas vacía, cuenta desde hoy." /></label>
                <input id="nu-desde" name="alumno_desde" type="date" />
              </div>
              <input type="hidden" name="filas" value={filas.length} />
              {filas.map((f, i) => (
                <TarjetaServicio
                  key={f.id}
                  n={i}
                  fila={f}
                  usados={usados}
                  tarifas={tarifas}
                  descuentos={descuentos}
                  hoy={hoy}
                  ahora={ahora}
                  formas={formas}
                  cambiar={(cambios) => setFilas((fs) => fs.map((x) => (x.id === f.id ? { ...x, ...cambios } : x)))}
                  quitar={filas.length > 1 ? () => setFilas((fs) => fs.filter((x) => x.id !== f.id)) : undefined}
                />
              ))}
              {puedeAnadir && (
                <button
                  type="button"
                  className={styles.botonSecundario}
                  onClick={() => {
                    setFilas((fs) => [...fs, nueva(siguiente)]);
                    setSiguiente((s) => s + 1);
                  }}
                >
                  + Añadir otro servicio
                </button>
              )}
              <span className={styles.ayuda}>Si solo quieres dar de alta a la persona, deja el servicio sin elegir.</span>
            </>
          )}

          {tipo === "invitado" && (
            <>
              <div className={styles.campo}>
                <label htmlFor="nu-prueba">
                  ¿Qué va a probar? <AyudaI texto="Qué prueba gratis tiene: presencial grupal, presencial personal u online. En presencial eliges cuántas clases y los días para gastarlas; en online, cuántos días de rutina." />
                </label>
                <select
                  id="nu-prueba"
                  name="prueba"
                  value={prueba}
                  onChange={(e) => {
                    setPrueba(e.target.value);
                    setDiasPrueba(e.target.value === "online" ? "7" : "14");
                    setFinPrueba(null);
                  }}
                >
                  <option value="grupal">Presencial grupal</option>
                  <option value="individual">Presencial personal</option>
                  <option value="online">Online</option>
                </select>
              </div>

              {prueba !== "normal" && (
                <>
                  {prueba !== "online" && (
                    <div className={styles.campo}>
                      <label htmlFor="nu-pn">
                        Número de clases gratis <AyudaI texto="Cuántas clases puede hacer gratis durante su prueba." />
                      </label>
                      <input id="nu-pn" name="pn" type="number" min={1} max={50} defaultValue={1} required />
                    </div>
                  )}
                  <div className={styles.campo}>
                    <label htmlFor="nu-pd">
                      {prueba === "online" ? "Días de rutina" : "Días para gastarlas"}{" "}
                      <AyudaI texto={prueba === "online" ? "Cuántos días puede usar su rutina online gratis." : "Cuántos días tiene para gastar sus clases gratis. Después, la prueba termina."} />
                    </label>
                    <input
                      id="nu-pd"
                      name="pd"
                      type="number"
                      min={1}
                      max={365}
                      value={diasPrueba}
                      onChange={(e) => {
                        setDiasPrueba(e.target.value);
                        setFinPrueba(null);
                      }}
                      required
                    />
                  </div>
                  <div className={estilos.dos}>
                    <div className={styles.campo}>
                      <label htmlFor="nu-pi">
                        Empieza <AyudaI texto="El día en que empieza la prueba. Por defecto, hoy." />
                      </label>
                      <input
                        id="nu-pi"
                        name="pi"
                        type="date"
                        value={inicioPrueba}
                        onChange={(e) => {
                          setInicioPrueba(e.target.value);
                          setFinPrueba(null);
                        }}
                        required
                      />
                    </div>
                    <div className={styles.campo}>
                      <label htmlFor="nu-pf">
                        Termina <AyudaI texto="Hasta qué día puede usar la prueba. Sale sola según los días; la puedes cambiar." />
                      </label>
                      <input id="nu-pf" name="pf" type="date" value={finPruebaValor} min={inicioPrueba} onChange={(e) => setFinPrueba(e.target.value)} />
                    </div>
                  </div>
                  <span className={styles.ayuda}>
                    {prueba === "online"
                      ? "Durante esos días podrá usar su rutina online; la asignas desde Rutinas."
                      : "La persona reserva con su prueba como una alumna. No se crea ningún pago ni factura."}
                  </span>
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
