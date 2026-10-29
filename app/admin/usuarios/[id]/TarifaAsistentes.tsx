"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Estado } from "../../acciones";
import styles from "../../admin.module.css";
import PanelCompleto from "../../comunes/PanelCompleto";
import { sumarDias } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { cambiarTarifaYFechas, quitarTarifa } from "../acciones";
import estilos from "./asistente.module.css";

export type TarifaOpcion = { id: string; nombre: string; servicio: string; clases: number; validez: number };
export type BonoAsistente = {
  id: string;
  nombre: string;
  tipoId: string;
  servicio: string;
  estado: string; // activo | en_cola
  clasesTotal: number;
  clasesRestantes: number;
  validez: number;
  desde: string | null; // AAAA-MM-DD (hora de Madrid)
  hasta: string | null;
  combo: boolean;
  cobrado: number; // céntimos ya cobrados de ese bono
  pendiente: number; // céntimos pendientes de ese bono
  reservasFuturas: number;
  enEspera: number; // otras cuotas en espera del mismo servicio
};

const SERVICIO: Record<string, string> = { grupal: "grupal", individual: "individual", online: "online" };
const dia = (f: string | null) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : "—");

function Pasos({ paso, total }: { paso: number; total: number }) {
  return (
    <div className={estilos.pasos} aria-label={`Paso ${paso} de ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i + 1 <= paso ? estilos.pasoActivo : ""} />
      ))}
    </div>
  );
}

function Opcion({ nombre, valor, marcado, alCambiar, titulo, ayuda, desactivada = false }: { nombre: string; valor: string; marcado: boolean; alCambiar: () => void; titulo: string; ayuda?: string; desactivada?: boolean }) {
  return (
    <label className={`${estilos.opcion} ${marcado ? estilos.opcionMarcada : ""} ${desactivada ? estilos.opcionApagada : ""}`}>
      <input type="radio" name={`ui-${nombre}`} value={valor} checked={marcado} onChange={alCambiar} disabled={desactivada} />
      <span>
        <b>{titulo}</b>
        {ayuda && <small>{ayuda}</small>}
      </span>
    </label>
  );
}

// Cierra el panel solo, un momento después de guardar.
function useCerrarAlTerminar(estado: Estado, cerrar: () => void) {
  const ref = useRef(cerrar);
  useEffect(() => {
    ref.current = cerrar;
  });
  useEffect(() => {
    if (!estado.mensaje) return;
    const t = setTimeout(() => ref.current(), 1100);
    return () => clearTimeout(t);
  }, [estado]);
}

function FormularioCambiar({ userId, bono, tarifas, cerrar }: { userId: string; bono: BonoAsistente; tarifas: TarifaOpcion[]; cerrar: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(cambiarTarifaYFechas, {});
  useCerrarAlTerminar(estado, cerrar);

  const [paso, setPaso] = useState(1);
  const [tipo, setTipo] = useState(bono.tipoId);
  const [modo, setModo] = useState<"ninguna" | "inicio" | "fin" | "ambas">("ninguna");
  const [inicio, setInicio] = useState(bono.desde ?? "");
  const [fin, setFin] = useState(bono.hasta ?? "");
  const [aviso, setAviso] = useState("");

  const conFechas = bono.estado === "activo";
  const nueva = tarifas.find((t) => t.id === tipo);
  const cambiaTarifa = tipo !== bono.tipoId && !!nueva;
  const usadas = bono.clasesTotal - bono.clasesRestantes;
  const restantes = cambiaTarifa && nueva ? Math.max(nueva.clases - usadas, 0) : bono.clasesRestantes;
  const total = cambiaTarifa && nueva ? nueva.clases : bono.clasesTotal;
  const validez = nueva?.validez ?? bono.validez;

  let nDesde = bono.desde;
  let nHasta = bono.hasta;
  if (modo === "inicio" && inicio) {
    nDesde = inicio;
    nHasta = sumarDias(inicio, validez);
  } else if (modo === "fin" && fin) {
    nHasta = fin;
    nDesde = sumarDias(fin, -validez);
  } else if (modo === "ambas") {
    nDesde = inicio || null;
    nHasta = fin || null;
  }
  const hayCambios = cambiaTarifa || modo !== "ninguna";

  function siguiente() {
    setAviso("");
    if (paso === 1) {
      if (!hayCambios) return setAviso("Elige una tarifa distinta o una fecha que ajustar.");
      return setPaso(modo === "ninguna" ? 3 : 2);
    }
    if (paso === 2) {
      if ((modo === "inicio" || modo === "ambas") && !inicio) return setAviso("Elige la fecha de inicio.");
      if ((modo === "fin" || modo === "ambas") && !fin) return setAviso("Elige la fecha de fin.");
      if (nDesde && nHasta && nHasta <= nDesde) return setAviso("La fecha de fin tiene que ser posterior a la de inicio.");
      return setPaso(3);
    }
  }

  return (
    <form action={accion} className={styles.tarjeta}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="bonoId" value={bono.id} />
      <input type="hidden" name="tipo" value={cambiaTarifa ? tipo : ""} />
      <input type="hidden" name="modo" value={modo} />
      <input type="hidden" name="inicio" value={inicio} />
      <input type="hidden" name="fin" value={fin} />

      <Pasos paso={paso} total={3} />

      {paso === 1 && (
        <>
          <p className={styles.ayuda}>
            Ahora: <strong>{bono.nombre}</strong>
            {conFechas && bono.desde ? ` · ${dia(bono.desde)} – ${dia(bono.hasta)}` : ""}
          </p>
          <div className={styles.campo}>
            <label htmlFor="as-tarifa">¿Qué tarifa tiene que tener?</label>
            <select id="as-tarifa" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={bono.combo}>
              {tarifas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </select>
            {bono.combo && <span className={styles.ayuda}>Es una tarifa combinada: aquí solo se cambian sus fechas.</span>}
          </div>
          {conFechas ? (
            <>
              <strong>¿Qué fecha quieres ajustar?</strong>
              <div className={estilos.opciones}>
                <Opcion nombre="modo" valor="ninguna" marcado={modo === "ninguna"} alCambiar={() => setModo("ninguna")} titulo="Ninguna" ayuda="Solo cambio la tarifa y dejo las fechas como están." />
                <Opcion nombre="modo" valor="inicio" marcado={modo === "inicio"} alCambiar={() => setModo("inicio")} titulo="La fecha de inicio" ayuda="Cambias cuándo empieza. La fecha de fin se recalcula." />
                <Opcion nombre="modo" valor="fin" marcado={modo === "fin"} alCambiar={() => setModo("fin")} titulo="La fecha de fin" ayuda="Cambias cuándo termina. La fecha de inicio se recalcula." />
                <Opcion nombre="modo" valor="ambas" marcado={modo === "ambas"} alCambiar={() => setModo("ambas")} titulo="Las dos fechas (periodo exacto)" ayuda="Fijas inicio y fin a mano." />
              </div>
            </>
          ) : (
            <p className={styles.ayuda}>Esta cuota está en espera: todavía no tiene fechas. Empezará cuando termine la actual.</p>
          )}
        </>
      )}

      {paso === 2 && (
        <>
          {(modo === "inicio" || modo === "ambas") && (
            <div className={styles.campo}>
              <label htmlFor="as-inicio">Fecha de inicio</label>
              <input id="as-inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
            </div>
          )}
          {(modo === "fin" || modo === "ambas") && (
            <div className={styles.campo}>
              <label htmlFor="as-fin">Fecha de fin</label>
              <input id="as-fin" type="date" value={fin} onChange={(e) => setFin(e.target.value)} />
            </div>
          )}
          {modo === "inicio" && <p className={styles.ayuda}>La fecha de fin será {dia(nHasta)} ({validez} días de duración).</p>}
          {modo === "fin" && <p className={styles.ayuda}>La fecha de inicio será {dia(nDesde)} ({validez} días de duración).</p>}
        </>
      )}

      {paso === 3 && (
        <>
          <div className={estilos.resumen}>
            <h3>Resumen</h3>
            {cambiaTarifa && nueva && (
              <>
                <div>
                  <span>Tarifa</span>
                  <b>
                    {bono.nombre} → {nueva.nombre}
                  </b>
                </div>
                <div>
                  <span>Clases</span>
                  <b>
                    {bono.clasesRestantes} → {restantes} (de {total})
                  </b>
                </div>
                <p className={styles.ayuda}>Se respetan las {usadas} clases que ya ha usado.</p>
              </>
            )}
            {modo !== "ninguna" && (
              <div>
                <span>Periodo</span>
                <b>
                  {dia(bono.desde)} – {dia(bono.hasta)} → {dia(nDesde)} – {dia(nHasta)}
                </b>
              </div>
            )}
          </div>
          <div className={styles.campo}>
            <label htmlFor="as-nota">Motivo (opcional)</label>
            <input id="as-nota" name="nota" maxLength={200} />
          </div>
        </>
      )}

      {aviso && (
        <p className={styles.error} role="alert">
          {aviso}
        </p>
      )}
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

      <div className={estilos.botones}>
        {paso > 1 && !estado.mensaje && (
          <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setPaso(paso === 3 && modo === "ninguna" ? 1 : paso - 1)}>
            ← Atrás
          </button>
        )}
        {paso < 3 ? (
          <button type="button" className={styles.boton} onClick={siguiente}>
            Siguiente →
          </button>
        ) : (
          <button type="submit" className={styles.boton} disabled={pendiente || !!estado.mensaje}>
            {pendiente ? "Guardando…" : "Confirmar cambios"}
          </button>
        )}
      </div>
    </form>
  );
}

function FormularioQuitar({ userId, bono, cerrar }: { userId: string; bono: BonoAsistente; cerrar: () => void }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>(quitarTarifa, {});
  useCerrarAlTerminar(estado, cerrar);

  const activo = bono.estado === "activo";
  const [paso, setPaso] = useState(1);
  const [modo, setModo] = useState<"ya" | "al_caducar">("ya");
  const [pago, setPago] = useState<"dejar" | "anular">("dejar");
  const [reservas, setReservas] = useState<"cancelar" | "dejar">(bono.reservasFuturas > 0 ? "cancelar" : "dejar");
  const [servicio, setServicio] = useState<"dejar" | "quitar">("dejar");

  const ya = modo === "ya" || !activo;
  const nombreServicio = SERVICIO[bono.servicio] ?? bono.servicio;

  return (
    <form action={accion} className={styles.tarjeta}>
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="bonoId" value={bono.id} />
      <input type="hidden" name="modo" value={ya ? "ya" : "al_caducar"} />
      <input type="hidden" name="pago" value={pago} />
      <input type="hidden" name="reservas" value={reservas} />
      <input type="hidden" name="servicio" value={servicio} />

      <Pasos paso={paso} total={2} />

      {paso === 1 && (
        <>
          <p className={styles.ayuda}>
            Vas a quitar: <strong>{bono.nombre}</strong>
          </p>

          {activo && (
            <>
              <strong>¿Qué pasa con la tarifa?</strong>
              <div className={estilos.opciones}>
                <Opcion nombre="modo" valor="ya" marcado={modo === "ya"} alCambiar={() => setModo("ya")} titulo="Quitarla ya" ayuda={`Deja de tener efecto ahora${bono.enEspera > 0 ? " y también sus cuotas en espera" : ""}.`} />
                <Opcion
                  nombre="modo"
                  valor="al_caducar"
                  marcado={modo === "al_caducar"}
                  alCambiar={() => setModo("al_caducar")}
                  titulo="Dejar que termine sin renovar"
                  ayuda={bono.enEspera > 0 ? "Sigue hasta que caduque y se quitan las cuotas en espera." : "Sigue hasta que caduque. No hay cuotas en espera, así que se acabará sola."}
                />
              </div>
            </>
          )}

          {ya && (bono.cobrado > 0 || bono.pendiente > 0) && (
            <>
              <strong>¿Y su pago?</strong>
              <div className={estilos.opciones}>
                <Opcion nombre="pago" valor="dejar" marcado={pago === "dejar"} alCambiar={() => setPago("dejar")} titulo="Dejarlo como está" ayuda={bono.cobrado > 0 ? `Ya cobraste ${euros(bono.cobrado)} y no se toca.` : `Pendiente de ${euros(bono.pendiente)}: se anula al quitar la tarifa.`} />
                {bono.cobrado > 0 && <Opcion nombre="pago" valor="anular" marcado={pago === "anular"} alCambiar={() => setPago("anular")} titulo="Anular el pago cobrado" ayuda={`Se anulan ${euros(bono.cobrado)} (devolución). Queda escrito el motivo.`} />}
              </div>
            </>
          )}

          {ya && bono.reservasFuturas > 0 && (
            <>
              <strong>¿Y sus clases reservadas desde hoy? ({bono.reservasFuturas})</strong>
              <div className={estilos.opciones}>
                <Opcion nombre="reservas" valor="cancelar" marcado={reservas === "cancelar"} alCambiar={() => setReservas("cancelar")} titulo="Cancelarlas" ayuda="No se le devuelve ninguna clase." />
                <Opcion nombre="reservas" valor="dejar" marcado={reservas === "dejar"} alCambiar={() => setReservas("dejar")} titulo="Dejarlas reservadas" ayuda="Podrá ir a esas clases." />
              </div>
            </>
          )}

          <strong>¿Y el servicio {nombreServicio}?</strong>
          <div className={estilos.opciones}>
            <Opcion nombre="servicio" valor="dejar" marcado={servicio === "dejar"} alCambiar={() => setServicio("dejar")} titulo="Dejarlo" ayuda={bono.servicio === "online" ? "En su app le saldrá «No tienes un plan online activo» y conserva su historial." : "Seguirá viendo la sección, pero sin poder reservar."} />
            <Opcion nombre="servicio" valor="quitar" marcado={servicio === "quitar"} alCambiar={() => setServicio("quitar")} titulo="Quitárselo" ayuda="Desaparece de su menú. El historial se conserva." />
          </div>
        </>
      )}

      {paso === 2 && (
        <>
          <div className={estilos.resumen}>
            <h3>Resumen</h3>
            <div>
              <span>Tarifa</span>
              <b>{ya ? "Se quita ya" : "Termina sin renovar"}</b>
            </div>
            {ya && (bono.cobrado > 0 || bono.pendiente > 0) && (
              <div>
                <span>Pago</span>
                <b>{pago === "anular" ? `Se anulan ${euros(bono.cobrado)}` : "Se deja como está"}</b>
              </div>
            )}
            {ya && bono.reservasFuturas > 0 && (
              <div>
                <span>Clases reservadas</span>
                <b>{reservas === "cancelar" ? `Se cancelan ${bono.reservasFuturas}` : "Se dejan"}</b>
              </div>
            )}
            <div>
              <span>Servicio</span>
              <b>{servicio === "quitar" ? "Se le quita" : "Se queda"}</b>
            </div>
          </div>
          <div className={styles.campo}>
            <label htmlFor="qt-nota">Motivo (opcional)</label>
            <input id="qt-nota" name="nota" maxLength={200} />
          </div>
        </>
      )}

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

      <div className={estilos.botones}>
        {paso === 2 && !estado.mensaje && (
          <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setPaso(1)}>
            ← Atrás
          </button>
        )}
        {paso === 1 ? (
          <button type="button" className={styles.boton} onClick={() => setPaso(2)}>
            Siguiente →
          </button>
        ) : (
          <button type="submit" className={styles.boton} disabled={pendiente || !!estado.mensaje}>
            {pendiente ? "Guardando…" : "Quitar la tarifa"}
          </button>
        )}
      </div>
    </form>
  );
}

// Los dos botones de cada bono de la ficha. Cada uno abre su asistente a pantalla completa.
export default function TarifaAsistentes({ userId, bono, tarifas }: { userId: string; bono: BonoAsistente; tarifas: TarifaOpcion[] }) {
  const [abierto, setAbierto] = useState<"cambiar" | "quitar" | null>(null);
  const cerrar = () => setAbierto(null);
  return (
    <div className={estilos.botonesBono}>
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setAbierto("cambiar")}>
        Cambiar tarifa y fechas
      </button>
      <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setAbierto("quitar")}>
        Quitar tarifa
      </button>
      {abierto === "cambiar" && (
        <PanelCompleto titulo="Tarifa y cuotas" cerrar={cerrar}>
          <FormularioCambiar userId={userId} bono={bono} tarifas={tarifas} cerrar={cerrar} />
        </PanelCompleto>
      )}
      {abierto === "quitar" && (
        <PanelCompleto titulo="Quitar tarifa" cerrar={cerrar}>
          <FormularioQuitar userId={userId} bono={bono} cerrar={cerrar} />
        </PanelCompleto>
      )}
    </div>
  );
}
