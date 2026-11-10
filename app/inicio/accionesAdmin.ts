"use server";

import { requireAdmin } from "@/lib/admin";
import { cumpleanosProximos } from "@/lib/cumpleanos";
import { bonosPorCaducar, diasAvisoBonos } from "@/lib/bonosPorCaducar";
import type { CumpleProximo } from "@/lib/cumpleanosTexto";
import { createAdminClient } from "@/lib/supabase/admin";

// Cumpleaños de hoy y de los próximos días para el inicio de la administradora.
export async function obtenerCumpleanosAdmin(): Promise<CumpleProximo[]> {
  await requireAdmin();
  return (await cumpleanosProximos()).lista;
}

export type PersonaResumen = { id: string; nombre: string; detalle: string };

export type ResumenAdmin = {
  ingresosMes: number; // céntimos
  ingresosMesAnterior: number;
  diferenciaPct: number | null; // null si el mes anterior fue 0
  activos: { total: number; grupal: number; individual: number; online: number };
  activosMesAnterior: number; // personas con un bono en marcha al acabar el mes anterior
  activosPorServicio: { grupal: PersonaResumen[]; individual: PersonaResumen[]; online: PersonaResumen[] };
  activosMesAnteriorServicio: { grupal: number; individual: number; online: number };
  ingresosServicio: Record<"grupal" | "individual" | "online" | "otros", { mes: number; anterior: number }>;
  caducanPronto: PersonaResumen[];
  diasAvisoBonos: number;
  pagosMes: Record<"todos" | "grupal" | "individual" | "online" | "otros", PersonaResumen[]>; // quién ha pagado este mes y cuánto
  nuevos: PersonaResumen[];
  nuevosMesAnterior: PersonaResumen[];
  diferenciaNuevosPct: number | null; // este mes frente al anterior; null si el anterior fue 0
  porRenovar: PersonaResumen[];
  perdidos: PersonaResumen[]; // su bono terminó este mes y no tienen otro
  perdidosMesAnterior: PersonaResumen[];
  pendientes: { total: number; personas: PersonaResumen[] };
};

const ZONA = "Europe/Madrid";

// Primer instante (UTC) de un mes, a las 00:00 en hora de Madrid.
function inicioMes(año: number, mes: number): Date {
  for (const horas of [2, 1]) {
    const candidato = new Date(Date.UTC(año, mes, 1) - horas * 3600 * 1000);
    const partes = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(candidato);
    const dia = partes.find((p) => p.type === "day")?.value;
    const hora = partes.find((p) => p.type === "hour")?.value;
    if (dia === "01" && (hora === "00" || hora === "24")) return candidato;
  }
  return new Date(Date.UTC(año, mes, 1));
}

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, day: "numeric", month: "short" }).format(new Date(iso));
}

function euros(centimos: number): string {
  return (centimos / 100).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

type Persona = { id: string; nombre: string | null; apellidos: string | null; email: string | null };
type BonoFila = {
  id: string;
  user_id: string;
  servicio: string;
  estado: string;
  caduca_en: string | null;
  activo_desde: string | null;
  creado_en: string;
  clases_restantes: number;
  tipos_bono: { nombre: string } | null;
};

export async function obtenerResumenAdmin(): Promise<ResumenAdmin> {
  await requireAdmin();
  const admin = createAdminClient();

  const ahora = new Date();
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit" }).formatToParts(ahora);
  const año = Number(partes.find((p) => p.type === "year")?.value);
  const mes = Number(partes.find((p) => p.type === "month")?.value) - 1;
  const desdeMes = inicioMes(año, mes);
  const desdeMesAnterior = inicioMes(mes === 0 ? año - 1 : año, mes === 0 ? 11 : mes - 1);

  const [{ data: personasDatos }, { data: bonosDatos }, { data: pagosDatos }, { data: finesDatos }] = await Promise.all([
    admin.from("profiles").select("id, nombre, apellidos, email"),
    admin
      .from("bonos")
      .select("id, user_id, servicio, estado, caduca_en, activo_desde, creado_en, clases_restantes, tipos_bono(nombre)")
      .neq("estado", "anulado"),
    admin.from("pagos").select("bono_id, user_id, importe_centimos, estado, pagado_en, creado_en, persona_nombre"),
    admin.from("movimientos_bono").select("bono_id, creado_en").in("tipo", ["agotado", "caducidad"]),
  ]);

  const personas = new Map(((personasDatos ?? []) as Persona[]).map((p) => [p.id, p]));
  const nombre = (id: string | null, respaldo?: string | null) => {
    const p = id ? personas.get(id) : undefined;
    if (!p) return respaldo || "(persona borrada)";
    return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
  };

  const bonos = (bonosDatos ?? []) as unknown as BonoFila[];
  const pagos = (pagosDatos ?? []) as {
    bono_id: string | null;
    user_id: string | null;
    importe_centimos: number;
    estado: string;
    pagado_en: string | null;
    creado_en: string;
    persona_nombre: string | null;
  }[];

  // Ingresos: pagos cobrados este mes y el mes anterior.
  let ingresosMes = 0;
  let ingresosMesAnterior = 0;
  const servicioDeBono = new Map(bonos.map((b) => [b.id, b.servicio]));
  const ingresosServicio: ResumenAdmin["ingresosServicio"] = { grupal: { mes: 0, anterior: 0 }, individual: { mes: 0, anterior: 0 }, online: { mes: 0, anterior: 0 }, otros: { mes: 0, anterior: 0 } };
  const tarifaDeBono = new Map(bonos.map((b) => [b.id, b.tipos_bono?.nombre ?? ""]));
  const pagosMes: ResumenAdmin["pagosMes"] = { todos: [], grupal: [], individual: [], online: [], otros: [] };
  for (const p of pagos) {
    if (p.estado !== "pagado") continue;
    const cuando = new Date(p.pagado_en ?? p.creado_en);
    const s = p.bono_id ? servicioDeBono.get(p.bono_id) : undefined;
    const clave = s === "grupal" || s === "individual" || s === "online" ? s : "otros";
    if (cuando >= desdeMes) {
      ingresosMes += p.importe_centimos;
      ingresosServicio[clave].mes += p.importe_centimos;
      const fila = { id: p.user_id ?? "", nombre: nombre(p.user_id, p.persona_nombre), detalle: `${euros(p.importe_centimos)} · ${(p.bono_id && tarifaDeBono.get(p.bono_id)) || "Pago suelto"} · ${fechaCorta(cuando.toISOString())}` };
      pagosMes.todos.push(fila);
      pagosMes[clave].push(fila);
    } else if (cuando >= desdeMesAnterior) {
      ingresosMesAnterior += p.importe_centimos;
      ingresosServicio[clave].anterior += p.importe_centimos;
    }
  }
  const diferenciaPct =
    ingresosMesAnterior > 0 ? Math.round(((ingresosMes - ingresosMesAnterior) / ingresosMesAnterior) * 100) : null;

  // Alumnas activas: personas con un bono activo, por tipo de servicio.
  // Un bono sin clases pero dentro de sus fechas sigue siendo activo.
  const vigente = (b: BonoFila) => b.estado === "activo" || (b.estado === "agotado" && !!b.caduca_en && new Date(b.caduca_en) > ahora);
  const activosBonos = bonos.filter(vigente);
  const porServicio = (servicio: string): PersonaResumen[] => {
    const vistos = new Set<string>();
    const lista: PersonaResumen[] = [];
    for (const b of activosBonos.filter((x) => x.servicio === servicio)) {
      if (vistos.has(b.user_id)) continue;
      vistos.add(b.user_id);
      lista.push({
        id: b.user_id,
        nombre: nombre(b.user_id),
        detalle: b.servicio === "online" ? (b.tipos_bono?.nombre ?? "") : `${b.clases_restantes} clases · ${b.tipos_bono?.nombre ?? ""}`,
      });
    }
    return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  };
  const grupal = porServicio("grupal");
  const individual = porServicio("individual");
  const online = porServicio("online");
  const totalActivos = new Set(activosBonos.map((b) => b.user_id)).size;

  // Caducan pronto: bonos activos (de cualquier tipo) que caducan en los próximos días.
  const diasAvisoBonosElegidos = await diasAvisoBonos();
  const limite = new Date(ahora.getTime() + diasAvisoBonosElegidos * 24 * 3600 * 1000);
  // No salen quienes ya han renovado: tienen otra tarifa del mismo servicio que dura más o que empieza después.
  const yaRenovado = (b: BonoFila) =>
    bonos.some(
      (x) =>
        x.id !== b.id &&
        x.user_id === b.user_id &&
        x.servicio === b.servicio &&
        (x.estado === "en_cola" || (vigente(x) && !!x.caduca_en && new Date(x.caduca_en) > new Date(b.caduca_en as string))),
    );
  const caducanPronto = activosBonos
    .filter((b) => b.caduca_en && new Date(b.caduca_en) <= limite && !yaRenovado(b))
    .sort((a, b) => (a.caduca_en ?? "").localeCompare(b.caduca_en ?? ""))
    .map((b) => ({
      id: b.user_id,
      nombre: nombre(b.user_id),
      detalle: `${b.tipos_bono?.nombre ?? ""} · caduca el ${fechaCorta(b.caduca_en as string)}`,
    }));

  // Nuevos del mes: personas cuyo primer bono es de este mes.
  const primerBono = new Map<string, BonoFila>();
  for (const b of [...bonos].sort((a, c) => a.creado_en.localeCompare(c.creado_en))) {
    if (!primerBono.has(b.user_id)) primerBono.set(b.user_id, b);
  }
  const nuevos = [...primerBono.values()]
    .filter((b) => new Date(b.creado_en) >= desdeMes)
    .map((b) => ({ id: b.user_id, nombre: nombre(b.user_id), detalle: `${b.tipos_bono?.nombre ?? ""} · ${fechaCorta(b.creado_en)}` }));

  const nuevosMesAnterior = [...primerBono.values()]
    .filter((b) => new Date(b.creado_en) >= desdeMesAnterior && new Date(b.creado_en) < desdeMes)
    .map((b) => ({ id: b.user_id, nombre: nombre(b.user_id), detalle: `${b.tipos_bono?.nombre ?? ""} · ${fechaCorta(b.creado_en)}` }));
  const diferenciaNuevosPct =
    nuevosMesAnterior.length > 0 ? Math.round(((nuevos.length - nuevosMesAnterior.length) / nuevosMesAnterior.length) * 100) : null;

  // Bonos por renovar: bonos agotados de personas que no tienen otro bono activo o en cola de ese servicio.
  const vigentes = new Set(bonos.filter((b) => vigente(b) || b.estado === "en_cola").map((b) => `${b.user_id}:${b.servicio}`));
  const vistosRenovar = new Set<string>();
  const porRenovar: PersonaResumen[] = [];
  for (const b of bonos.filter((x) => x.estado === "agotado" && !vigente(x))) {
    const clave = `${b.user_id}:${b.servicio}`;
    if (vigentes.has(clave) || vistosRenovar.has(clave)) continue;
    vistosRenovar.add(clave);
    porRenovar.push({ id: b.user_id, nombre: nombre(b.user_id), detalle: b.tipos_bono?.nombre ?? "Bono agotado" });
  }

  // Cuándo terminó cada bono (se agotó o caducó), según su historial.
  const finDe = new Map<string, Date>();
  for (const m of (finesDatos ?? []) as { bono_id: string; creado_en: string }[]) {
    const d = new Date(m.creado_en);
    const previo = finDe.get(m.bono_id);
    if (!previo || d < previo) finDe.set(m.bono_id, d);
  }
  // Un bono estaba en marcha en un instante si ya estaba activo y todavía no había terminado.
  const enMarchaEn = (b: BonoFila, instante: Date) => {
    if (b.estado === "en_cola" || b.estado === "anulado") return false;
    const desde = new Date(b.activo_desde ?? b.creado_en);
    const fin = finDe.get(b.id) ?? (b.estado === "activo" ? null : b.caduca_en ? new Date(b.caduca_en) : null);
    return desde <= instante && (fin === null || fin > instante);
  };
  const conBonoAlAcabarMesAnterior = new Set(bonos.filter((b) => enMarchaEn(b, desdeMes)).map((b) => b.user_id));
  const activosMesAnterior = conBonoAlAcabarMesAnterior.size;
  const anteriorDe = (servicio: string) => new Set(bonos.filter((b) => b.servicio === servicio && enMarchaEn(b, desdeMes)).map((b) => b.user_id)).size;
  const activosMesAnteriorServicio = { grupal: anteriorDe("grupal"), individual: anteriorDe("individual"), online: anteriorDe("online") };

  // Alumnos perdidos: su bono terminó en el periodo y no tienen otro en marcha (ni esperando) al acabar.
  const perdidosEntre = (desde: Date, hasta: Date, sigueActiva: (id: string) => boolean): PersonaResumen[] => {
    const vistos = new Set<string>();
    const lista: PersonaResumen[] = [];
    for (const b of bonos) {
      const fin = finDe.get(b.id);
      if (!fin || fin < desde || fin >= hasta) continue;
      if (vistos.has(b.user_id) || sigueActiva(b.user_id)) continue;
      vistos.add(b.user_id);
      lista.push({ id: b.user_id, nombre: nombre(b.user_id), detalle: `${b.tipos_bono?.nombre ?? ""} · terminó el ${fechaCorta(fin.toISOString())}` });
    }
    return lista.sort((a, c) => a.nombre.localeCompare(c.nombre, "es"));
  };
  const conBonoAhora = new Set(bonos.filter((b) => vigente(b) || b.estado === "en_cola").map((b) => b.user_id));
  const perdidos = perdidosEntre(desdeMes, new Date(ahora.getTime() + 1), (id) => conBonoAhora.has(id));
  const perdidosMesAnterior = perdidosEntre(desdeMesAnterior, desdeMes, (id) => conBonoAlAcabarMesAnterior.has(id));

  // Pagos pendientes: dinero por cobrar y quién lo debe.
  const pendientesPagos = pagos.filter((p) => p.estado === "pendiente");
  const porPersona = new Map<string, { id: string; nombre: string; total: number; n: number }>();
  for (const p of pendientesPagos) {
    const clave = p.user_id ?? `x:${p.persona_nombre ?? ""}`;
    const fila = porPersona.get(clave) ?? { id: p.user_id ?? "", nombre: nombre(p.user_id, p.persona_nombre), total: 0, n: 0 };
    fila.total += p.importe_centimos;
    fila.n += 1;
    porPersona.set(clave, fila);
  }
  const pendientes = {
    total: pendientesPagos.reduce((s, p) => s + p.importe_centimos, 0),
    personas: [...porPersona.values()]
      .sort((a, b) => b.total - a.total)
      .map((f) => ({ id: f.id, nombre: f.nombre, detalle: `${euros(f.total)}${f.n > 1 ? ` · ${f.n} pagos` : ""}` })),
  };

  return {
    ingresosMes,
    ingresosMesAnterior,
    diferenciaPct,
    activos: { total: totalActivos, grupal: grupal.length, individual: individual.length, online: online.length },
    activosMesAnterior,
    activosPorServicio: { grupal, individual, online },
    activosMesAnteriorServicio,
    ingresosServicio,
    caducanPronto,
    diasAvisoBonos: diasAvisoBonosElegidos,
    pagosMes,
    nuevos,
    nuevosMesAnterior,
    diferenciaNuevosPct,
    porRenovar,
    perdidos,
    perdidosMesAnterior,
    pendientes,
  };
}

// Los dos avisos de arriba del Inicio de la administradora: cumpleaños y tarifas a punto de caducar, con los días que haya elegido.
export type AvisosInicio = {
  cumples: CumpleProximo[];
  antelacionCumples: number;
  caducan: { userId: string; nombre: string; tarifa: string; cuando: string }[];
  diasBonos: number;
};

export async function obtenerAvisosInicio(): Promise<AvisosInicio> {
  await requireAdmin();
  const { lista, antelacion } = await cumpleanosProximos();
  const diasBonos = await diasAvisoBonos();
  const caducan = (await bonosPorCaducar(diasBonos)).map((b) => ({ userId: b.userId, nombre: b.nombre, tarifa: b.tarifa, cuando: b.cuando }));
  return { cumples: lista, antelacionCumples: antelacion, caducan, diasBonos };
}

export async function elegirDiasAvisoInicio(que: "cumples" | "bonos", dias: number): Promise<void> {
  await requireAdmin();
  const n = Math.floor(Number(dias));
  const clave = que === "cumples" ? "cumple_aviso_dias" : "bonos_aviso_dias";
  const min = que === "cumples" ? 0 : 1;
  if (!(n >= min && n <= 60)) return;
  await createAdminClient().from("ajustes").upsert({ clave, valor: String(n), actualizado_en: new Date().toISOString() });
}
