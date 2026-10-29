// Calendario de reservas de una persona. Cada clase lleva el color de su tipo.
// Al tocar un día se abre «reservar como ella», donde se puede reservar y anular (en pasado, presente y futuro).
import Link from "next/link";
import { nombreCorto } from "@/lib/colores";
import estilos from "./calendario.module.css";

export type EventoCalendario = {
  dia: string; // AAAA-MM-DD en hora de Madrid
  hora: string; // HH:MM
  nombre: string;
  color: string;
  estado: string; // reservada | cancelada | ...
  asistencia: string | null; // asistio | no_asistio | null
};

const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

function tituloMes(mes: string): string {
  const [a, m] = mes.split("-").map(Number);
  const texto = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(Date.UTC(a, m - 1, 1)));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function Mes({ mes, eventos, userId, hoy }: { mes: string; eventos: EventoCalendario[]; userId: string; hoy: string }) {
  const [a, m] = mes.split("-").map(Number);
  const primero = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7; // lunes = 0
  const diasMes = new Date(Date.UTC(a, m, 0)).getUTCDate();
  const celdas: (string | null)[] = [...Array(primero).fill(null), ...Array.from({ length: diasMes }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`)];

  return (
    <section className={estilos.mes}>
      <h3>{tituloMes(mes)}</h3>
      <div className={estilos.cuadricula}>
        {DIAS.map((d) => (
          <span key={d} className={estilos.cabecera}>
            {d}
          </span>
        ))}
        {celdas.map((fecha, i) => {
          if (!fecha) return <span key={`v${i}`} />;
          const delDia = eventos.filter((e) => e.dia === fecha).sort((x, y) => x.hora.localeCompare(y.hora));
          return (
            <Link
              key={fecha}
              href={`/admin/reservas/como/${userId}?dia=${fecha}`}
              className={`${estilos.dia} ${fecha === hoy ? estilos.hoy : ""}`}
              aria-label={`${fecha}: ${delDia.length} ${delDia.length === 1 ? "clase" : "clases"}`}
            >
              <span className={estilos.numero}>{Number(fecha.slice(8))}</span>
              {delDia.map((e, n) => {
                const cancelada = e.estado === "cancelada";
                const faltó = e.asistencia === "no_asistio";
                return (
                  <span
                    key={n}
                    className={`${estilos.clase} ${cancelada ? estilos.cancelada : ""} ${faltó ? estilos.falto : ""}`}
                    style={{ background: e.color }}
                    title={`${e.hora} · ${e.nombre}${cancelada ? " (cancelada)" : faltó ? " (no vino)" : ""}`}
                  >
                    <b>{e.hora}</b>
                    <span>{nombreCorto(e.nombre)}</span>
                    {cancelada && <i>✕</i>}
                    {faltó && <i>!</i>}
                  </span>
                );
              })}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function CalendarioReservas({ meses, eventos, userId, hoy }: { meses: string[]; eventos: EventoCalendario[]; userId: string; hoy: string }) {
  return (
    <div className={estilos.calendario}>
      {meses.map((m) => (
        <Mes key={m} mes={m} eventos={eventos} userId={userId} hoy={hoy} />
      ))}
      <p className={estilos.leyenda}>Toca un día para reservar o anular clases como si fueras ella. ✕ = cancelada · ! = no vino.</p>
    </div>
  );
}
