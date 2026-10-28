"use client";

import { useActionState, useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
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

// Panel «+ Nuevo»: invitar a una persona o dar de alta a una alumna con su bono.
export default function NuevoUsuario({ tarifas, formas, abiertoInicial = false }: { tarifas: TarifaOpcion[]; formas: { clave: string; nombre: string }[]; abiertoInicial?: boolean }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [tipo, setTipo] = useState<"invitado" | "alumno">("alumno");
  const [tarifa, setTarifa] = useState("");
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(crearUsuario, {});
  const { ref, alEnviar } = useEnvio(accion, estado, true);

  return (
    <section className={styles.tarjeta}>
      <button
        type="button"
        className={styles.boton}
        aria-expanded={abierto}
        onClick={() => setAbierto((a) => !a)}
      >
        {abierto ? "Cerrar" : "+ Nuevo usuario"}
      </button>

      {abierto && (
        <form ref={ref} onSubmit={alEnviar} className={styles.formularioInterno}>
          <div className={styles.campo}>
            <label htmlFor="nu-correo">Correo</label>
            <input id="nu-correo" name="correo" type="email" required />
          </div>

          <fieldset className={styles.grupo}>
            <legend>Tipo de usuario</legend>
            <label className={styles.casilla}>
              <input type="radio" name="tipo" value="alumno" checked={tipo === "alumno"} onChange={() => setTipo("alumno")} />
              Alumna (ya entrena contigo)
            </label>
            <label className={styles.casilla}>
              <input type="radio" name="tipo" value="invitado" checked={tipo === "invitado"} onChange={() => setTipo("invitado")} />
              Invitada (recibe un correo para crear su cuenta)
            </label>
          </fieldset>

          {tipo === "alumno" && (
            <>
              <fieldset className={styles.grupo}>
                <legend>Servicios que contrata</legend>
                {SERVICIOS.map((s) => (
                  <label key={s.valor} className={styles.casilla}>
                    <input type="checkbox" name="servicios" value={s.valor} />
                    {s.etiqueta}
                  </label>
                ))}
              </fieldset>

              <div className={styles.campo}>
                <label htmlFor="nu-tarifa">Tarifa o bono (opcional)</label>
                <select id="nu-tarifa" name="tarifa" value={tarifa} onChange={(e) => setTarifa(e.target.value)}>
                  <option value="">Sin bono por ahora</option>
                  {tarifas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {NOMBRE_SERVICIO[t.servicio] ?? t.servicio} · {t.nombre} · {euros(t.precio_centimos)}
                    </option>
                  ))}
                </select>
                <span className={styles.ayuda}>
                  Con un bono, la alumna ya puede reservar aunque todavía no haya pagado.
                </span>
              </div>

              {tarifa && (
                <>
                  <fieldset className={styles.grupo}>
                    <legend>Pago</legend>
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
                    <label htmlFor="nu-metodo">Cómo paga</label>
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
            {pendiente ? "Creando…" : tipo === "alumno" ? "Crear alumna y avisarle" : "Enviar invitación"}
          </button>
          {estado.mensaje && (
            <div role="status">
              <p className={styles.aviso}>{estado.mensaje}</p>
              {estado.enlace && <EnlaceCopiable enlace={estado.enlace} />}
            </div>
          )}
        </form>
      )}
    </section>
  );
}
