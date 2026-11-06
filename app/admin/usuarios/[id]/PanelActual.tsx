"use client";

import { useState } from "react";
import styles from "../../admin.module.css";
import estilos from "../usuarios.module.css";
import Anillo from "../../../ui/Anillo";
import clay from "../../../ui/clay.module.css";
import CalendarioReservas, { type EventoCalendario } from "./CalendarioReservas";
import type { Periodo, ReservaFila, TipoClaseChip } from "./periodos";

const NOMBRE_SERVICIO: Record<string, string> = { grupal: "Clases grupales", individual: "Entrenamiento personal", online: "Plan online", taller: "Talleres" };

const dmy = (dia: string) => `${dia.slice(8, 10)}/${dia.slice(5, 7)}/${dia.slice(0, 4)}`;
const ms = (dia: string) => Date.UTC(Number(dia.slice(0, 4)), Number(dia.slice(5, 7)) - 1, Number(dia.slice(8, 10)));
const diasEntre = (a: string, b: string) => Math.round((ms(b) - ms(a)) / 86_400_000);

// Los meses (AAAA-MM) que toca un periodo, del primero al último.
function mesesDe(desde: string, hasta: string): string[] {
  const salida: string[] = [];
  let a = Number(desde.slice(0, 4));
  let m = Number(desde.slice(5, 7));
  const fin = hasta.slice(0, 7);
  for (let n = 0; n < 24; n++) {
    const clave = `${a}-${String(m).padStart(2, "0")}`;
    salida.push(clave);
    if (clave >= fin) break;
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return salida;
}

// Pestaña «Actual»: la tarifa de la persona (la actual o cualquiera anterior), cuánto lleva gastado de cada servicio y su calendario.
// Clases o días sueltos (regalos, favores…): van aparte de la tarifa, con su motivo.
function Sueltas({ sueltos }: { sueltos: Periodo[] }) {
  const vivos = sueltos.filter((s) => s.bonos.some((b) => b.restantes > 0 && b.estado !== "caducado"));
  const usados = sueltos.filter((s) => !vivos.includes(s));
  if (sueltos.length === 0) return null;
  return (
    <section className={styles.tarjeta}>
      <h3 style={{ margin: 0 }}>Clases sueltas</h3>
      {vivos.length === 0 && <p className={styles.ayuda}>Ahora no le quedan clases sueltas.</p>}
      <ul className={styles.lista}>
        {vivos.map((s) => {
          const b = s.bonos[0];
          const usadas = b.total - b.restantes;
          const pct = b.total > 0 ? Math.round((usadas / b.total) * 100) : 0;
          return (
            <li key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "space-between" }}>
              <div>
                <strong>{NOMBRE_SERVICIO[b.servicio] ?? b.servicio}</strong>
                <div className={styles.ayuda} style={{ margin: "4px 0 0" }}>
                  Ha reservado {usadas} de {b.total} · le quedan {b.restantes}
                </div>
                <div className={styles.ayuda} style={{ margin: "2px 0 0" }}>
                  {s.motivo ? `${s.motivo} · ` : ""}dadas el {dmy(s.dado)}
                  {s.sinCaducidad ? " · no caducan" : s.hasta ? ` · hasta el ${dmy(s.hasta)}` : ""}
                </div>
                <span className={estilos.activa}>{b.estado === "activo" ? "En uso" : "Se usan cuando termine la tarifa"}</span>
              </div>
              <div className={clay.gaugeWrap}>
                <Anillo porcentaje={pct} />
                <span className={clay.gaugePct}>{pct}%</span>
              </div>
            </li>
          );
        })}
      </ul>
      {usados.length > 0 && (
        <details>
          <summary>Ya usadas ({usados.length})</summary>
          <ul className={styles.lista}>
            {usados.map((s) => (
              <li key={s.id}>
                {NOMBRE_SERVICIO[s.bonos[0].servicio] ?? s.bonos[0].servicio} · {s.bonos[0].total} dadas el {dmy(s.dado)}
                {s.motivo ? ` · ${s.motivo}` : ""}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

// Una tarifa (compra) con sus servicios: cada servicio lleva sus propias fechas y su propio gasto de clases.
function BloquePeriodo({ p, titulo, selector, reservas, tipos, userId, hoy }: { p: Periodo; titulo: string; selector?: React.ReactNode; reservas: ReservaFila[]; tipos: TipoClaseChip[]; userId: string; hoy: string }) {
  const ids = new Set(p.bonos.map((b) => b.id));
  const eventos: EventoCalendario[] = reservas
    .filter((r) => r.bonoId && ids.has(r.bonoId))
    .map((r) => ({ dia: r.dia, hora: r.hora, nombre: r.nombre, color: r.color, estado: r.estado, asistencia: r.asistencia }));
  const total = p.desde && p.hasta ? diasEntre(p.desde, p.hasta) + 1 : 0;
  // Sin fecha de fin (un regalo que no caduca): el calendario llega hasta dentro de dos meses.
  const hastaCalendario =
    p.hasta ??
    (() => {
      const d = new Date(`${hoy}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 60);
      return d.toISOString().slice(0, 10);
    })();
  const llevados = p.desde && total ? Math.min(total, Math.max(0, diasEntre(p.desde, hoy) + 1)) : 0;
  const pct = total ? Math.round((llevados / total) * 100) : 0;
  const soloOnline = p.bonos.every((b) => b.servicio === "online");

  return (
    <>
      <section className={styles.tarjeta}>
        <div className={estilos.periodoCabecera}>
          <h2>{titulo}</h2>
          {selector}
        </div>
        <p style={{ margin: 0 }}>
          Tarifa: <strong>{p.nombre}</strong> {p.pendiente ? <span className={estilos.sinPagar}>Sin pagar</span> : p.pagado ? <span className={estilos.activa}>Pagado</span> : <span className={estilos.activa}>Sin cobro</span>}
        </p>
        {p.pagado && p.hasta && (
          <p style={{ margin: 0 }}>
            Pagado hasta: <strong>{dmy(p.hasta)}</strong>
          </p>
        )}
        {p.desde && !p.hasta && (
          <div className={estilos.periodoCaja}>
            <span>Periodo:</span>
            <strong>Desde {dmy(p.desde)} · sin fecha de fin</strong>
          </div>
        )}
        {p.desde && p.hasta && (
          <div className={estilos.periodoCaja}>
            <span>Periodo{p.estado === "activo" ? " actual" : ""}:</span>
            <strong>
              {dmy(p.desde)} – {dmy(p.hasta)}
            </strong>
            <div className={estilos.barraProgreso} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Días del periodo">
              <div style={{ width: `${pct}%` }} />
            </div>
            <small>{p.estado === "activo" ? `Día ${llevados} de ${total}` : `${total} días`}</small>
          </div>
        )}
      </section>

      {p.bonos.map((b) => {
        const chips = tipos.filter((t) => t.servicio === b.servicio);
        const usadas = b.total - b.restantes;
        const hastaServicio = b.hasta ?? p.hasta;
        const diasQuedan = hastaServicio ? Math.max(0, diasEntre(hoy, hastaServicio) + 1) : 0;
        const empiezaDespues = !!b.desde && b.desde > hoy && b.estado === "en_cola";
        return (
          <section key={b.id} className={styles.tarjeta}>
            <div className={estilos.tarjetaServicio}>
              <div>
                <h3 style={{ margin: "0 0 8px" }}>{NOMBRE_SERVICIO[b.servicio] ?? b.servicio}</h3>
                {chips.length > 0 && (
                  <div className={estilos.chipsClases}>
                    {chips.map((t) => (
                      <span key={t.nombre} style={{ background: t.color, color: t.colorTexto }}>
                        {t.nombre}
                      </span>
                    ))}
                  </div>
                )}
                {b.desde && hastaServicio && (
                  <p className={styles.ayuda} style={{ margin: "10px 0 0" }}>
                    Del {dmy(b.desde)} al {dmy(hastaServicio)}
                    {empiezaDespues ? " · todavía no ha empezado" : ""}
                  </p>
                )}
                <p className={styles.ayuda} style={{ margin: "6px 0 0" }}>
                  {b.servicio === "online"
                    ? b.estado === "activo"
                      ? `Le quedan ${diasQuedan} ${diasQuedan === 1 ? "día" : "días"} de plan.`
                      : "Plan online."
                    : `Ha reservado ${usadas} de ${b.total} · le quedan ${b.restantes}`}
                </p>
              </div>
              {b.servicio !== "online" && <div className={estilos.numeroGrande}>{b.restantes}</div>}
            </div>
          </section>
        );
      })}

      {p.desde && !soloOnline && (
        <section className={styles.tarjeta}>
          <h2>Calendario del periodo</h2>
          <CalendarioReservas meses={mesesDe(p.desde, hastaCalendario)} eventos={eventos} userId={userId} hoy={hoy} desde={p.desde} hasta={hastaCalendario} />
        </section>
      )}
    </>
  );
}

// Pestaña «Actual»: todas las tarifas que tiene en marcha (cada servicio con sus fechas), las que empiezan más adelante y las anteriores.
export default function PanelActual({ periodos: todos, reservas, tipos, userId, hoy }: { periodos: Periodo[]; reservas: ReservaFila[]; tipos: TipoClaseChip[]; userId: string; hoy: string }) {
  const periodos = todos.filter((x) => !x.suelto);
  const sueltos = todos.filter((x) => x.suelto);
  const ordenados = [...periodos].sort((a, b) => (b.desde ?? "").localeCompare(a.desde ?? ""));
  const consulta = ordenados.filter((p) => p.estado !== "en_cola");
  const proximas = ordenados.filter((p) => p.estado === "en_cola");
  const actuales = consulta.filter((p) => p.estado === "activo");
  const anteriores = consulta.filter((p) => p.estado !== "activo");
  const [elegido, setElegido] = useState<string>(actuales.length > 0 ? "actual" : (anteriores[0]?.id ?? "actual"));

  const selector =
    anteriores.length > 0 ? (
      <div className={styles.campo}>
        <label htmlFor="periodo-elegido">Ver</label>
        <select id="periodo-elegido" value={elegido} onChange={(e) => setElegido(e.target.value)}>
          {actuales.length > 0 && <option value="actual">{actuales.length === 1 ? "Tarifa actual" : "Tarifas actuales"}</option>}
          {anteriores.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombre}
              {x.desde && x.hasta ? ` · ${dmy(x.desde)} – ${dmy(x.hasta)}` : ""}
            </option>
          ))}
        </select>
      </div>
    ) : undefined;

  const mostrarAnterior = elegido !== "actual" ? anteriores.find((x) => x.id === elegido) : undefined;
  const mostrados = mostrarAnterior ? [mostrarAnterior] : actuales;

  return (
    <>
      {mostrados.length === 0 && (
        <section className={styles.tarjeta}>
          <h2>Tarifa actual</h2>
          <p className={styles.ayuda}>No tiene ninguna tarifa activa.</p>
          {selector}
        </section>
      )}
      {mostrados.map((p, n) => (
        <BloquePeriodo
          key={p.id}
          p={p}
          titulo={mostrarAnterior ? "Tarifa anterior" : mostrados.length > 1 ? `Tarifa actual ${n + 1}` : "Tarifa actual"}
          selector={n === 0 ? selector : undefined}
          reservas={reservas}
          tipos={tipos}
          userId={userId}
          hoy={hoy}
        />
      ))}

      <Sueltas sueltos={sueltos} />

      {proximas.length > 0 && (
        <section className={styles.tarjeta}>
          <h3 style={{ margin: 0 }}>Próximas cuotas</h3>
          <ul className={styles.lista}>
            {proximas.map((x) => {
              const empieza = x.bonos.map((b) => b.desde).filter((d): d is string => !!d && d > hoy).sort()[0];
              return (
                <li key={x.id}>
                  {x.nombre} · {empieza ? `empieza el ${dmy(empieza)}` : "se activa cuando termine la actual"}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
