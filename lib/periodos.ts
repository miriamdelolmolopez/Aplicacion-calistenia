// Periodos de tiempo para los informes (fechas AAAA-MM-DD, en hora de Madrid).
export type Periodo = "ultimos_7" | "ultimos_30" | "mes" | "mes_anterior" | "trimestre" | "ano" | "ano_anterior" | "personalizado";

export const PERIODOS: { id: Periodo; texto: string }[] = [
  { id: "ultimos_7", texto: "Últimos 7 días" },
  { id: "ultimos_30", texto: "Últimos 30 días" },
  { id: "mes", texto: "Este mes" },
  { id: "mes_anterior", texto: "Mes anterior" },
  { id: "trimestre", texto: "Últimos 3 meses" },
  { id: "ano", texto: "Este año" },
  { id: "ano_anterior", texto: "Año anterior" },
  { id: "personalizado", texto: "Elegir fechas" },
];

const dos = (n: number) => String(n).padStart(2, "0");
const fecha = (a: number, m: number, d: number) => `${a}-${dos(m)}-${dos(d)}`;
const ultimoDia = (a: number, m: number) => new Date(Date.UTC(a, m, 0)).getUTCDate(); // m = 1..12

export function rangoDe(
  periodo: Periodo,
  hoy: string,
  desde?: string,
  hasta?: string,
): { desde: string; hasta: string } {
  const a = Number(hoy.slice(0, 4));
  const m = Number(hoy.slice(5, 7));

  switch (periodo) {
    case "ultimos_7":
    case "ultimos_30": {
      const dias = periodo === "ultimos_7" ? 6 : 29;
      const d = new Date(Date.UTC(a, m - 1, Number(hoy.slice(8, 10)) - dias));
      return { desde: fecha(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()), hasta: hoy };
    }
    case "mes_anterior": {
      const ma = m === 1 ? 12 : m - 1;
      const aa = m === 1 ? a - 1 : a;
      return { desde: fecha(aa, ma, 1), hasta: fecha(aa, ma, ultimoDia(aa, ma)) };
    }
    case "trimestre": {
      const d = new Date(Date.UTC(a, m - 3, 1));
      return { desde: fecha(d.getUTCFullYear(), d.getUTCMonth() + 1, 1), hasta: fecha(a, m, ultimoDia(a, m)) };
    }
    case "ano":
      return { desde: fecha(a, 1, 1), hasta: fecha(a, 12, 31) };
    case "ano_anterior":
      return { desde: fecha(a - 1, 1, 1), hasta: fecha(a - 1, 12, 31) };
    case "personalizado":
      if (desde && hasta && /^\d{4}-\d{2}-\d{2}$/.test(desde) && /^\d{4}-\d{2}-\d{2}$/.test(hasta) && desde <= hasta) {
        return { desde, hasta };
      }
      return { desde: fecha(a, m, 1), hasta: fecha(a, m, ultimoDia(a, m)) };
    default:
      return { desde: fecha(a, m, 1), hasta: fecha(a, m, ultimoDia(a, m)) };
  }
}
