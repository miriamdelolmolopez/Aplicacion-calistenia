"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import AyudaI from "../../comunes/AyudaI";
import PanelCompleto from "../../comunes/PanelCompleto";
import { anadirSinCobrar } from "../acciones";
import estilos from "../usuarios.module.css";
import type { TarifaOpcion } from "./TarifaAsistentes";

const SERVICIOS = [
  { valor: "grupal", texto: "Clases grupales" },
  { valor: "individual", texto: "Entrenamiento personal" },
  { valor: "taller", texto: "Talleres" },
  { valor: "online", texto: "Entrenamiento online (por días)" },
];

// «Añadir tarifa o regalo»: da una tarifa del catálogo, o clases / entrenamientos sueltos, SIN cobrar nada:
// no crea ningún pago (ni pendiente ni cobrado) ni factura. Siempre queda como un bono aparte.
function Formulario({ userId, tarifas, hoy, cerrar }: { userId: string; tarifas: TarifaOpcion[]; hoy: string; cerrar: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(anadirSinCobrar, {});
  const [que, setQue] = useState<"tarifa" | "clases">("tarifa");
  const [servicio, setServicio] = useState("grupal");
  const [termina, setTermina] = useState<"tarifa" | "dias" | "fecha" | "nunca">("tarifa");
  const ref = useRef(cerrar);
  useEffect(() => {
    ref.current = cerrar;
  });
  useEffect(() => {
    if (!estado.mensaje) return;
    const t = setTimeout(() => ref.current(), 2200);
    return () => clearTimeout(t);
  }, [estado]);

  const terminaReal = que === "clases" && termina === "tarifa" ? "nunca" : termina;

  return (
    <form action={accion} className={styles.tarjeta}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="que" value={que} />
      <input type="hidden" name="termina" value={terminaReal} />

      <p className={styles.ayuda}>No se crea ningún pago ni factura: es un regalo o una tarifa sin cobro. Queda como un bono aparte en su ficha.</p>

      <fieldset className={styles.grupo}>
        <legend>¿Qué le das?</legend>
        <label className={styles.casilla}>
          <input type="radio" checked={que === "tarifa"} onChange={() => setQue("tarifa")} />
          Una tarifa del catálogo
        </label>
        <label className={styles.casilla}>
          <input type="radio" checked={que === "clases"} onChange={() => setQue("clases")} />
          Clases o entrenamientos sueltos (el número que quieras)
        </label>
      </fieldset>

      {que === "tarifa" ? (
        <div className={styles.campo}>
          <label htmlFor="as-sc-tarifa">
            Tarifa <AyudaI texto="Con las clases que trae esa tarifa. Los precios no cuentan: no se cobra nada." />
          </label>
          <select id="as-sc-tarifa" name="tarifa" required defaultValue="">
            <option value="" disabled>
              Elige una tarifa…
            </option>
            {tarifas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <div className={styles.campo}>
            <label htmlFor="as-sc-servicio">Servicio</label>
            <select id="as-sc-servicio" name="servicio" value={servicio} onChange={(e) => setServicio(e.target.value)}>
              {SERVICIOS.map((s) => (
                <option key={s.valor} value={s.valor}>
                  {s.texto}
                </option>
              ))}
            </select>
          </div>
          {servicio !== "online" && (
            <div className={styles.campo}>
              <label htmlFor="as-sc-clases">
                Cuántas clases <AyudaI texto="Pon el número que quieras: 2 para un regalo de cumpleaños, 30 para un favor…" />
              </label>
              <input id="as-sc-clases" name="clases" type="number" min={1} max={500} defaultValue={2} required />
            </div>
          )}
        </>
      )}

      <div className={styles.campo}>
        <label htmlFor="as-sc-inicio">Desde cuándo</label>
        <input id="as-sc-inicio" name="inicio" type="date" defaultValue={hoy} />
      </div>

      <fieldset className={styles.grupo}>
        <legend>Hasta cuándo</legend>
        {que === "tarifa" && (
          <label className={styles.casilla}>
            <input type="radio" checked={termina === "tarifa"} onChange={() => setTermina("tarifa")} />
            Lo que dura la tarifa
          </label>
        )}
        <label className={styles.casilla}>
          <input type="radio" checked={terminaReal === "dias"} onChange={() => setTermina("dias")} />
          Durante unos días (por ejemplo, una semana de prueba = 7)
        </label>
        <label className={styles.casilla}>
          <input type="radio" checked={terminaReal === "fecha"} onChange={() => setTermina("fecha")} />
          Hasta una fecha
        </label>
        <label className={styles.casilla}>
          <input type="radio" checked={terminaReal === "nunca"} onChange={() => setTermina("nunca")} />
          No caduca (sin fecha de fin)
        </label>
      </fieldset>
      {terminaReal === "dias" && (
        <div className={styles.campo}>
          <label htmlFor="as-sc-dias">Días</label>
          <input id="as-sc-dias" name="dias" type="number" min={1} max={3650} defaultValue={7} required />
        </div>
      )}
      {terminaReal === "fecha" && (
        <div className={styles.campo}>
          <label htmlFor="as-sc-fin">Fecha de fin</label>
          <input id="as-sc-fin" name="fin" type="date" required />
        </div>
      )}

      <div className={styles.campo}>
        <label htmlFor="as-sc-nota">
          Motivo (opcional) <AyudaI texto="Por ejemplo «Regalo de cumpleaños» o «Favor a un amigo». Se guarda en su historial." />
        </label>
        <input id="as-sc-nota" name="nota" maxLength={200} />
      </div>

      <p className={styles.ayuda}>
        Solo se puede usar un bono de cada servicio a la vez: si ya tiene una tarifa activa de ese servicio, este bono empieza cuando termine la actual (te lo diré al guardar).
      </p>
      <label className={styles.casilla}>
        <input type="checkbox" name="sumar" />
        En vez de un bono aparte, sumar las clases a su tarifa actual (solo para clases sueltas)
      </label>

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
      <button type="submit" className={styles.boton} disabled={pendiente || !!estado.mensaje}>
        {pendiente ? "Guardando…" : "Añadir sin cobrar"}
      </button>
    </form>
  );
}

export default function AnadirSinCobrar({ userId, tarifas, hoy }: { userId: string; tarifas: TarifaOpcion[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className={estilos.botonesBono}>
      <button type="button" className={styles.boton} onClick={() => setAbierto(true)}>
        + Añadir tarifa o regalo (sin cobrar)
      </button>
      {abierto && (
        <PanelCompleto titulo="Añadir tarifa o regalo" cerrar={() => setAbierto(false)}>
          <Formulario userId={userId} tarifas={tarifas} hoy={hoy} cerrar={() => setAbierto(false)} />
        </PanelCompleto>
      )}
    </div>
  );
}
