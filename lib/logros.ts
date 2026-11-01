// Logros de una persona a partir de sus clases: totales, comparación con el mes anterior, rachas, medallas,
// clases por tipo y por día de la semana. Se calcula igual para la alumna y para la ficha de Miriam.
import { claveDia, lunesDe, sumarDias } from "./fechas";

export type ReservaLogro = {
  estado: string; // reservada | cancelada | ...
  asistencia: string | null; // asistio | no_asistio | null
  empieza_en: string;
  sesion_estado: string; // programada | cancelada
  tipo: string;
  color: string | null;
};

export type Medalla = {
  id: string;
  clave: "clases" | "racha" | "mes";
  meta: number;
  valor: number; // lo que lleva
  conseguidaEn: string | null; // AAAA-MM-DD
};

export type Logros = {
  total: number;
  mesActual: number;
  mesAnterior: number;
  rachaActual: number;
  mejorRacha: number;
  asistenciaPct: number | null; // clases a las que vino sobre las que tenía (sin las canceladas con tiempo)
  faltas: number;
  medallas: Medalla[];
  porTipo: { tipo: string; color: string | null; clases: number }[];
  porDia: number[]; // lunes (0) a domingo (6)
  tipoFavorito: string | null;
  diaFuerte: number | null; // 0 = lunes
};

const CLASES_META = [1, 10, 25, 50, 100];
const RACHA_META = [4, 8];
const MES_COMPLETO = 8;

export function calcularLogros(reservas: ReservaLogro[], ahora = new Date()): Logros {
  const ahoraMs = ahora.getTime();
  const hoy = claveDia(ahora.toISOString());
  const mesActualClave = hoy.slice(0, 7);
  const [a, m] = mesActualClave.split("-").map(Number);
  const anterior = new Date(Date.UTC(a, m - 2, 1));
  const mesAnteriorClave = `${anterior.getUTCFullYear()}-${String(anterior.getUTCMonth() + 1).padStart(2, "0")}`;

  // Clases pasadas, reservadas y sin cancelar: las que cuentan como hechas o como falta.
  const pasadas = reservas
    .filter((r) => r.estado === "reservada" && r.sesion_estado === "programada" && new Date(r.empieza_en).getTime() <= ahoraMs)
    .map((r) => ({ ...r, dia: claveDia(r.empieza_en), ms: new Date(r.empieza_en).getTime() }))
    .sort((x, y) => x.ms - y.ms);
  const hechas = pasadas.filter((r) => r.asistencia !== "no_asistio");
  const faltas = pasadas.length - hechas.length;

  // Semanas con al menos una clase (por su lunes).
  const semanas = [...new Set(hechas.map((r) => lunesDe(r.dia)))].sort();
  const conClase = new Set(semanas);

  // Racha actual: semanas seguidas con clase hacia atrás; si esta semana aún no ha ido, no se rompe.
  let rachaActual = 0;
  const lunesHoy = lunesDe(hoy);
  for (let i = 0; i < 520; i++) {
    const semana = sumarDias(lunesHoy, -7 * i);
    if (conClase.has(semana)) rachaActual++;
    else if (i > 0) break;
  }

  // Mejor racha y la semana en que se llegó a cada meta.
  let mejorRacha = 0;
  let corrida = 0;
  const llegoRacha = new Map<number, string>();
  let previa: string | null = null;
  for (const s of semanas) {
    corrida = previa && sumarDias(previa, 7) === s ? corrida + 1 : 1;
    previa = s;
    mejorRacha = Math.max(mejorRacha, corrida);
    for (const meta of RACHA_META) if (corrida >= meta && !llegoRacha.has(meta)) llegoRacha.set(meta, s);
  }

  // Medalla del mes completo: la fecha de la clase que completó el primer mes con 8 o más.
  const porMes = new Map<string, number>();
  let diaMesCompleto: string | null = null;
  for (const r of hechas) {
    const mes = r.dia.slice(0, 7);
    const n = (porMes.get(mes) ?? 0) + 1;
    porMes.set(mes, n);
    if (n === MES_COMPLETO && !diaMesCompleto) diaMesCompleto = r.dia;
  }
  const mejorMes = Math.max(0, ...porMes.values());

  const medallas: Medalla[] = [
    ...CLASES_META.map((meta) => ({ id: `clases-${meta}`, clave: "clases" as const, meta, valor: hechas.length, conseguidaEn: hechas[meta - 1]?.dia ?? null })),
    ...RACHA_META.map((meta) => ({ id: `racha-${meta}`, clave: "racha" as const, meta, valor: mejorRacha, conseguidaEn: llegoRacha.get(meta) ?? null })),
    { id: "mes-completo", clave: "mes" as const, meta: MES_COMPLETO, valor: mejorMes, conseguidaEn: diaMesCompleto },
  ];

  // Por tipo de clase y por día de la semana.
  const tipos = new Map<string, { color: string | null; clases: number }>();
  const porDia = [0, 0, 0, 0, 0, 0, 0];
  for (const r of hechas) {
    const t = tipos.get(r.tipo) ?? { color: r.color, clases: 0 };
    t.clases++;
    tipos.set(r.tipo, t);
    porDia[(new Date(`${r.dia}T12:00:00Z`).getUTCDay() + 6) % 7]++;
  }
  const porTipo = [...tipos.entries()].map(([tipo, v]) => ({ tipo, ...v })).sort((x, y) => y.clases - x.clases);
  const maxDia = Math.max(...porDia);

  return {
    total: hechas.length,
    mesActual: hechas.filter((r) => r.dia.slice(0, 7) === mesActualClave).length,
    mesAnterior: hechas.filter((r) => r.dia.slice(0, 7) === mesAnteriorClave).length,
    rachaActual,
    mejorRacha,
    asistenciaPct: pasadas.length > 0 ? Math.round((hechas.length / pasadas.length) * 100) : null,
    faltas,
    medallas,
    porTipo,
    porDia,
    tipoFavorito: porTipo[0]?.tipo ?? null,
    diaFuerte: maxDia > 0 ? porDia.indexOf(maxDia) : null,
  };
}
