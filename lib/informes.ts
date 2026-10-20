import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// Datos de los informes de la administradora (se calculan al abrir la pantalla; no cambian nada).

export type Rango = { desde: string; hasta: string }; // AAAA-MM-DD, ambos incluidos

type Perfil = {
  id: string;
  nombre: string | null;
  apellidos: string | null;
  email: string | null;
  dni: string | null;
  telefono: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  rol: string;
  creado_en: string;
};
type Bono = {
  user_id: string;
  servicio: string;
  estado: string;
  activo_desde: string | null;
  caduca_en: string | null;
  creado_en: string;
  tipos_bono: { nombre: string } | null;
};
type Pago = { user_id: string | null; importe_centimos: number; descuento_centimos: number | null; estado: string };

const ZONA = "Europe/Madrid";
const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export function nombreDe(p: Pick<Perfil, "nombre" | "apellidos" | "email">): string {
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

function fechaCorta(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

// Instante (UTC) de las 00:00 de una fecha en Madrid, aproximado con el desfase de ese día.
function inicioDia(fecha: string): Date {
  for (const horas of [2, 1]) {
    const d = new Date(Date.parse(`${fecha}T00:00:00Z`) - horas * 3600 * 1000);
    const f = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(d);
    const v = (t: string) => f.find((p) => p.type === t)?.value;
    if (`${v("year")}-${v("month")}-${v("day")}` === fecha && (v("hour") === "00" || v("hour") === "24")) return d;
  }
  return new Date(`${fecha}T00:00:00Z`);
}

async function leerTodo<T>(tabla: string, seleccion: string): Promise<T[]> {
  const admin = createAdminClient();
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await admin.from(tabla).select(seleccion).range(desde, desde + 999);
    if (error) throw new Error(error.message);
    const lote = (data ?? []) as unknown as T[];
    filas.push(...lote);
    if (lote.length < 1000) break;
  }
  return filas;
}

export type PersonaLinea = { id: string; nombre: string; detalle: string };

export type InformeAtletas = {
  nuevos: PersonaLinea[];
  perdidas: PersonaLinea[];
  ausencias: { id: string; nombre: string; veces: number }[];
  totalAusencias: number;
  retencion: { base: number; siguen: number } | null;
  ocupacion: { texto: string; valor: number; detalle: string }[];
  pruebas: number;
};

export async function informeAtletas(rango: Rango): Promise<InformeAtletas> {
  const desde = inicioDia(rango.desde);
  const hastaExcl = inicioDia(new Date(Date.parse(`${rango.hasta}T12:00:00Z`) + 86400000).toISOString().slice(0, 10));
  const ahora = new Date();

  const [perfiles, bonos, reservas, sesiones] = await Promise.all([
    leerTodo<Perfil>("profiles", "id, nombre, apellidos, email, dni, telefono, fecha_nacimiento, sexo, rol, creado_en"),
    leerTodo<Bono>("bonos", "user_id, servicio, estado, activo_desde, caduca_en, creado_en, tipos_bono(nombre)"),
    leerTodo<{ user_id: string; estado: string; es_prueba: boolean; asistencia: string | null; sesiones_clase: { empieza_en: string } | null }>(
      "reservas",
      "user_id, estado, es_prueba, asistencia, sesiones_clase(empieza_en)",
    ),
    leerTodo<{ plazas: number; empieza_en: string; estado: string; tipos_clase: { nombre: string } | null; reservas: { estado: string }[] }>(
      "sesiones_clase",
      "plazas, empieza_en, estado, tipos_clase(nombre), reservas(estado)",
    ),
  ]);
  const personas = new Map(perfiles.map((p) => [p.id, p]));
  const nombre = (id: string) => (personas.get(id) ? nombreDe(personas.get(id)!) : "(persona borrada)");
  const bonosVivos = bonos.filter((b) => b.estado !== "anulado");

  // Nuevos: personas cuyo primer bono es de este periodo.
  const primero = new Map<string, Bono>();
  for (const b of [...bonosVivos].sort((x, y) => x.creado_en.localeCompare(y.creado_en))) if (!primero.has(b.user_id)) primero.set(b.user_id, b);
  const nuevos = [...primero.values()]
    .filter((b) => new Date(b.creado_en) >= desde && new Date(b.creado_en) < hastaExcl)
    .map((b) => ({ id: b.user_id, nombre: nombre(b.user_id), detalle: `${b.tipos_bono?.nombre ?? ""} · ${fechaCorta(b.creado_en)}` }));

  // Perdidas: ya no tienen bono en vigor y su último bono terminó dentro del periodo.
  const porPersona = new Map<string, Bono[]>();
  for (const b of bonosVivos) porPersona.set(b.user_id, [...(porPersona.get(b.user_id) ?? []), b]);
  const perdidas: PersonaLinea[] = [];
  for (const [id, lista] of porPersona) {
    if (lista.some((b) => b.estado === "activo" || b.estado === "en_cola")) continue;
    const ultimo = [...lista].sort((a, b) => (b.caduca_en ?? b.creado_en).localeCompare(a.caduca_en ?? a.creado_en))[0];
    const fin = new Date(ultimo.caduca_en ?? ultimo.creado_en);
    const finReal = fin > ahora ? ahora : fin;
    if (finReal >= desde && finReal < hastaExcl) {
      perdidas.push({ id, nombre: nombre(id), detalle: `${ultimo.tipos_bono?.nombre ?? "Bono"} · terminó el ${fechaCorta(finReal.toISOString())}` });
    }
  }

  // Ausencias: quienes no se presentaron a una clase del periodo.
  const veces = new Map<string, number>();
  for (const r of reservas) {
    if (r.asistencia !== "no_asistio" || !r.sesiones_clase) continue;
    const f = new Date(r.sesiones_clase.empieza_en);
    if (f >= desde && f < hastaExcl) veces.set(r.user_id, (veces.get(r.user_id) ?? 0) + 1);
  }
  const ausencias = [...veces.entries()].map(([id, n]) => ({ id, nombre: nombre(id), veces: n })).sort((a, b) => b.veces - a.veces);

  // Retención: de quienes tenían bono en vigor al empezar el periodo, cuántas lo siguen teniendo al final.
  const activaEn = (id: string, d: Date) => (porPersona.get(id) ?? []).some((b) => b.activo_desde && new Date(b.activo_desde) <= d && b.caduca_en && new Date(b.caduca_en) >= d);
  const base = [...porPersona.keys()].filter((id) => activaEn(id, desde));
  const fin = new Date(Math.min(hastaExcl.getTime() - 1, ahora.getTime()));
  const retencion = base.length === 0 ? null : { base: base.length, siguen: base.filter((id) => activaEn(id, fin)).length };

  // Ocupación de cada clase de la semana (por ejemplo, calistenia los lunes a las 19:40).
  const grupos = new Map<string, { suma: number; clases: number }>();
  for (const s of sesiones) {
    const f = new Date(s.empieza_en);
    if (s.estado !== "programada" || f < desde || f >= hastaExcl || f > ahora || s.plazas <= 0) continue;
    const dia = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, weekday: "long" }).format(f);
    const indice = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].indexOf(dia);
    const hora = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false }).format(f);
    const clave = `${s.tipos_clase?.nombre ?? "?"} · ${DIAS_SEMANA[indice]?.toLowerCase()} ${hora}`;
    const ocupadas = s.reservas.filter((r) => r.estado === "reservada").length;
    const g = grupos.get(clave) ?? { suma: 0, clases: 0 };
    grupos.set(clave, { suma: g.suma + Math.min(1, ocupadas / s.plazas), clases: g.clases + 1 });
  }
  const ocupacion = [...grupos.entries()]
    .map(([texto, g]) => ({ texto, valor: Math.round((g.suma / g.clases) * 100), detalle: `${g.clases} ${g.clases === 1 ? "clase" : "clases"}` }))
    .sort((a, b) => b.valor - a.valor);

  const pruebas = new Set(
    reservas.filter((r) => r.es_prueba && r.estado !== "cancelada" && r.sesiones_clase && new Date(r.sesiones_clase.empieza_en) >= desde && new Date(r.sesiones_clase.empieza_en) < hastaExcl).map((r) => r.user_id),
  ).size;

  return { nuevos, perdidas, ausencias, totalAusencias: ausencias.reduce((n, a) => n + a.veces, 0), retencion, ocupacion, pruebas };
}

export type Cumple = { id: string; nombre: string; fecha: string; edad: number };

// Cumpleaños dentro de un periodo.
export async function cumpleanos(rango: Rango): Promise<Cumple[]> {
  const perfiles = await leerTodo<Perfil>("profiles", "id, nombre, apellidos, email, dni, telefono, fecha_nacimiento, sexo, rol, creado_en");
  const lista: Cumple[] = [];
  const a0 = Number(rango.desde.slice(0, 4));
  const a1 = Number(rango.hasta.slice(0, 4));
  for (const p of perfiles) {
    if (!p.fecha_nacimiento || p.rol === "admin") continue;
    const [aN, m, d] = p.fecha_nacimiento.split("-").map(Number);
    for (let a = a0; a <= a1; a++) {
      const f = `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      if (f >= rango.desde && f <= rango.hasta) lista.push({ id: p.id, nombre: nombreDe(p), fecha: f, edad: a - aN });
    }
  }
  return lista.sort((x, y) => x.fecha.localeCompare(y.fecha) || x.nombre.localeCompare(y.nombre, "es"));
}

// Una fila por persona para descargar en Excel.
export async function filasAtletas(): Promise<{ columnas: string[]; filas: string[][] }> {
  const [perfiles, bonos, pagos, reservas, entrenos] = await Promise.all([
    leerTodo<Perfil>("profiles", "id, nombre, apellidos, email, dni, telefono, fecha_nacimiento, sexo, rol, creado_en"),
    leerTodo<Bono>("bonos", "user_id, servicio, estado, activo_desde, caduca_en, creado_en, tipos_bono(nombre)"),
    leerTodo<Pago>("pagos", "user_id, importe_centimos, descuento_centimos, estado"),
    leerTodo<{ user_id: string; estado: string; asistencia: string | null; sesiones_clase: { empieza_en: string } | null }>("reservas", "user_id, estado, asistencia, sesiones_clase(empieza_en)"),
    leerTodo<{ user_id: string; empezado_en: string }>("entrenos", "user_id, empezado_en").catch(() => []),
  ]);
  const ahora = Date.now();
  const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso)) : "");
  const sexoTexto: Record<string, string> = { mujer: "Mujer", hombre: "Hombre", otro: "Otro" };

  const filas = perfiles
    .filter((p) => p.rol !== "admin")
    .map((p) => {
      const mios = bonos.filter((b) => b.user_id === p.id && b.estado !== "anulado");
      const activos = mios.filter((b) => b.estado === "activo");
      const misPagos = pagos.filter((x) => x.user_id === p.id);
      const gastado = misPagos.filter((x) => x.estado === "pagado").reduce((n, x) => n + x.importe_centimos, 0);
      const conDescuento = misPagos.some((x) => (x.descuento_centimos ?? 0) > 0);
      const hasta = activos.map((b) => b.caduca_en).filter((c): c is string => !!c).sort().pop() ?? null;
      const ultima = [
        ...reservas
          .filter((r) => r.user_id === p.id && r.estado === "reservada" && r.asistencia !== "no_asistio" && r.sesiones_clase && new Date(r.sesiones_clase.empieza_en).getTime() <= ahora)
          .map((r) => r.sesiones_clase!.empieza_en),
        ...entrenos.filter((e) => e.user_id === p.id).map((e) => e.empezado_en),
      ].sort().pop();
      return [
        p.dni ?? "",
        p.nombre ?? "",
        p.apellidos ?? "",
        p.email ?? "",
        p.telefono ?? "",
        fecha(p.fecha_nacimiento),
        fecha(p.creado_en),
        p.rol === "invitado" ? "Invitada" : "Alumna",
        activos.map((b) => b.tipos_bono?.nombre ?? "").filter(Boolean).join(" + "),
        conDescuento ? "Sí" : "No",
        (gastado / 100).toFixed(2).replace(".", ","),
        fecha(hasta),
        p.sexo ? (sexoTexto[p.sexo] ?? p.sexo) : "",
        ultima ? String(Math.floor((ahora - new Date(ultima).getTime()) / 86400000)) : "",
        String(Math.floor((ahora - new Date(p.creado_en).getTime()) / 86400000)),
      ];
    });
  return {
    columnas: ["DNI", "Nombre", "Apellidos", "Correo", "Teléfono", "Fecha de nacimiento", "Fecha de alta", "Tipo", "Tarifa actual", "Tiene descuentos", "Gastado en total (€)", "Pagado hasta", "Sexo", "Días sin entrenar", "Días desde el alta"],
    filas,
  };
}

export type IngresosMes = { mes: string; grupal: number; individual: number; online: number; otros: number; total: number };

// Ingresos cobrados cada mes (últimos 12 meses hasta el final del periodo) separados por tipo de servicio.
export async function ingresosPorMesYServicio(hasta: string): Promise<IngresosMes[]> {
  const [pagos, bonos] = await Promise.all([
    leerTodo<{ bono_id: string | null; importe_centimos: number; estado: string; pagado_en: string | null; creado_en: string }>("pagos", "bono_id, importe_centimos, estado, pagado_en, creado_en"),
    leerTodo<{ id: string; servicio: string }>("bonos", "id, servicio"),
  ]);
  const servicioDe = new Map(bonos.map((b) => [b.id, b.servicio]));
  const [a, m] = [Number(hasta.slice(0, 4)), Number(hasta.slice(5, 7))];
  const meses: IngresosMes[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    meses.push({ mes: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`, grupal: 0, individual: 0, online: 0, otros: 0, total: 0 });
  }
  for (const p of pagos) {
    if (p.estado !== "pagado") continue;
    const mes = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit" }).format(new Date(p.pagado_en ?? p.creado_en)).slice(0, 7);
    const fila = meses.find((x) => x.mes === mes);
    if (!fila) continue;
    const s = p.bono_id ? servicioDe.get(p.bono_id) : undefined;
    const clave = s === "grupal" || s === "individual" || s === "online" ? s : "otros";
    fila[clave] += p.importe_centimos;
    fila.total += p.importe_centimos;
  }
  return meses;
}
