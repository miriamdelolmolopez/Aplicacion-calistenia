"use client";

import { useActionState, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import comunes from "../comunes/comunes.module.css";
import PanelCompleto from "../comunes/PanelCompleto";
import EnlaceCopiable from "../EnlaceCopiable";
import { useEnvio } from "../useEnvio";
import { crearUsuario } from "./acciones";

export type TarifaOpcion = { id: string; nombre: string; servicio: string; precio_centimos: number };

const SERVICIOS = [
  { valor: "grupal", etiqueta: "Clases grupales" },
  { valor: "individual", etiqueta: "Entrenamiento individual" },
  { valor: "online", etiqueta: "Entrenamiento online" },
];
const NOMBRE_SERVICIO: Record<string, string> = { grupal: "Grupal", individual: "Individual", online: "Online" };

function euros(centimos: number): string {
  return (centimos / 100).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}

// Panel «+ Nuevo»: invitar a una persona o dar de alta a un/a alumno/a con su bono.
export default function NuevoUsuario({ tarifas, formas, abiertoInicial = false }: { tarifas: TarifaOpcion[]; formas: { clave: string; nombre: string }[]; abiertoInicial?: boolean }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [tipo, setTipo] = useState<"invitado" | "alumno">("alumno");
  const [tarifa, setTarifa] = useState("");
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearUsuario, {});
  const { ref, alEnviar } = useEnvio(accion, estado, true);

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
              <fieldset className={styles.grupo}>
                <legend>Servicios que contrata <AyudaI texto="Qué servicios puede ver y usar: clases grupales, entrenamiento individual o entrenamiento online." /></legend>
                {SERVICIOS.map((s) => (
                  <label key={s.valor} className={styles.casilla}>
                    <input type="checkbox" name="servicios" value={s.valor} />
                    {s.etiqueta}
                  </label>
                ))}
              </fieldset>

              <div className={styles.campo}>
                <label htmlFor="nu-tarifa">Tarifa o bono (opcional) <AyudaI texto="Si eliges una, la persona ya la tiene asignada desde el primer día y puede reservar. Si no, la asignas más tarde." /></label>
                <select id="nu-tarifa" name="tarifa" value={tarifa} onChange={(e) => setTarifa(e.target.value)}>
                  <option value="">Sin bono por ahora</option>
                  {tarifas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {NOMBRE_SERVICIO[t.servicio] ?? t.servicio} · {t.nombre} · {euros(t.precio_centimos)}
                    </option>
                  ))}
                </select>
                <span className={styles.ayuda}>
                  Con un bono, el/la alumno/a ya puede reservar aunque todavía no haya pagado.
                </span>
              </div>

              {tarifa && (
                <>
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
                    <label htmlFor="nu-inicio">¿Ya lo tenía empezado? Fecha en que empezó (opcional) <AyudaI texto="Si la persona ya venía antes de usar la app, pon el día en que empezó su tarifa. Si lo dejas vacío, empieza hoy." /></label>
                    <input id="nu-inicio" name="inicio" type="date" max={new Date().toISOString().slice(0, 10)} />
                    <span className={styles.ayuda}>Si la dejas vacía, empieza a contar hoy. Después podrás marcar en su ficha las clases que ya hizo.</span>
                  </div>
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
