import "server-only";
import { enviarCorreo } from "./email";
import { enviable } from "./avisos";
import { notificarApp } from "./notificaciones";
import { claveDia } from "./fechas";
import { correoAutomatico, soloFecha } from "./plantillas-email";
import { esSuelto } from "./regalos";
import { createAdminClient } from "./supabase/admin";
import { tipoDeCondicion, type Accion, type Condicion, type Regla } from "./reglasCatalogo";

// Motor de las automatizaciones propias: calcula datos de cada persona, mira quién cumple las condiciones
// y aplica las consecuencias. Lo lanza el cron cada mañana, o Miriam con «Ejecutar ahora».

type Fila = Record<string, unknown>;

// Supabase devuelve como mucho 1000 filas por consulta: se lee por trozos.
async function leerTodo<T = Fila>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: unknown[] | null }>): Promise<T[]> {
  const todo: T[] = [];
  for (let i = 0; ; i += 1000) {
    const { data } = await consulta(i, i + 999);
    const filas = (data ?? []) as T[];
    todo.push(...filas);
    if (filas.length < 1000) break;
  }
  return todo;
}

const DIA = 24 * 3600 * 1000;
const diasEntre = (desde: string, hasta: string) => Math.round((Date.UTC(+hasta.slice(0, 4), +hasta.slice(5, 7) - 1, +hasta.slice(8, 10)) - Date.UTC(+desde.slice(0, 4), +desde.slice(5, 7) - 1, +desde.slice(8, 10))) / DIA);

export type DatosPersona = {
  id: string;
  email: string | null;
  nombre: string | null;
  apellidos: string | null;
  telefono: string | null;
  idioma: "es" | "en";
  admiteCorreos: boolean; // false si desactivó los avisos de novedades
  num: Record<string, number | null>;
  opc: Record<string, string>;
  tarifaIds: string[];
  tarifaNombres: string[];
  servicios: string[];
  caducaIso: string | null;
};

const ROLES = ["alumno", "exalumno", "invitado", "coach"];

export async function datosPersonas(): Promise<DatosPersona[]> {
  const admin = createAdminClient();
  const ahora = Date.now();
  const hoy = claveDia(new Date(ahora).toISOString());
  const [anio, mes, diaMes] = hoy.split("-").map(Number);
  const diaSemana = ((new Date(`${hoy}T12:00:00Z`).getUTCDay() + 6) % 7) + 1; // lunes = 1

  const [perfiles, bonos, reservas, entrenos, pagos, servicios] = await Promise.all([
    leerTodo((a, b) => admin.from("profiles").select("id, email, nombre, apellidos, telefono, rol, idioma, creado_en, fecha_nacimiento, avisos_novedades").in("rol", ROLES).order("id").range(a, b)),
    leerTodo((a, b) => admin.from("bonos").select("user_id, estado, servicio, clases_restantes, caduca_en, tipo_bono_id, tipos_bono(nombre)").order("id").range(a, b)),
    leerTodo((a, b) => admin.from("reservas").select("user_id, asistencia, sesiones_clase(empieza_en, estado)").eq("estado", "reservada").order("id").range(a, b)),
    leerTodo((a, b) => admin.from("entrenos").select("user_id, terminado_en").eq("estado", "terminado").order("id").range(a, b)),
    leerTodo((a, b) => admin.from("pagos").select("user_id, pagado_en").eq("estado", "pagado").order("id").range(a, b)),
    leerTodo((a, b) => admin.from("perfil_servicios").select("user_id, servicio").order("user_id").order("servicio").range(a, b)),
  ]);

  const porUsuario = <T extends Fila>(filas: Fila[]) => {
    const m = new Map<string, T[]>();
    for (const f of filas) {
      const id = f.user_id as string;
      (m.get(id) ?? m.set(id, []).get(id)!).push(f as T);
    }
    return m;
  };
  const bonosDe = porUsuario(bonos);
  const reservasDe = porUsuario(reservas);
  const entrenosDe = porUsuario(entrenos);
  const pagosDe = porUsuario(pagos);
  const serviciosDe = porUsuario(servicios);

  const resultado: DatosPersona[] = [];
  for (const p of perfiles) {
    const id = p.id as string;

    // Actividad.
    let ultima = 0;
    let proxima = Infinity;
    let hechas = 0;
    let total = 0;
    for (const r of reservasDe.get(id) ?? []) {
      const s = r.sesiones_clase as unknown as { empieza_en: string; estado: string } | null;
      if (!s || s.estado !== "programada") continue;
      total++;
      const t = Date.parse(s.empieza_en);
      if (t > ahora) proxima = Math.min(proxima, t);
      else if (r.asistencia !== "no_asistio") {
        hechas++;
        ultima = Math.max(ultima, t);
      }
    }
    const misEntrenos = entrenosDe.get(id) ?? [];
    for (const e of misEntrenos) {
      const t = e.terminado_en ? Date.parse(e.terminado_en as string) : NaN;
      if (!Number.isNaN(t)) ultima = Math.max(ultima, t);
    }

    // Tarifas.
    let hastaCaducar: number | null = null;
    let caducaIso: string | null = null;
    let desdeCaducada: number | null = null;
    let clasesRestantes = 0;
    const tarifaIds: string[] = [];
    const tarifaNombres: string[] = [];
    let tarifaActiva = false;
    for (const b of bonosDe.get(id) ?? []) {
      const nombre = (b.tipos_bono as unknown as { nombre: string } | null)?.nombre ?? "";
      const suelto = esSuelto(nombre);
      const estado = b.estado as string;
      // Una tarifa sin clases pero dentro de sus fechas sigue siendo una tarifa en vigor.
      const vigente = estado === "agotado" && !!b.caduca_en && Date.parse(b.caduca_en as string) > ahora;
      if (estado === "activo" || estado === "en_cola" || vigente) {
        if (b.servicio !== "online") clasesRestantes += Number(b.clases_restantes) || 0;
        if (!suelto) {
          tarifaIds.push(b.tipo_bono_id as string);
          if (!tarifaNombres.includes(nombre)) tarifaNombres.push(nombre);
        }
      }
      if ((estado === "activo" || vigente) && !suelto) {
        tarifaActiva = true;
        if (b.caduca_en && Date.parse(b.caduca_en as string) > ahora) {
          const d = diasEntre(hoy, claveDia(b.caduca_en as string));
          if (hastaCaducar === null || d < hastaCaducar) {
            hastaCaducar = d;
            caducaIso = b.caduca_en as string;
          }
        }
      }
      if (estado === "caducado" && !suelto && b.caduca_en) {
        const d = diasEntre(claveDia(b.caduca_en as string), hoy);
        if (d >= 0 && (desdeCaducada === null || d < desdeCaducada)) desdeCaducada = d;
      }
    }

    // Pagos.
    let ultimoPago = 0;
    const misPagos = pagosDe.get(id) ?? [];
    for (const g of misPagos) if (g.pagado_en) ultimoPago = Math.max(ultimoPago, Date.parse(g.pagado_en as string));

    // Persona.
    let edad: number | null = null;
    let hastaCumple: number | null = null;
    if (p.fecha_nacimiento) {
      const [ya, ym, yd] = (p.fecha_nacimiento as string).split("-").map(Number);
      edad = anio - ya - (mes < ym || (mes === ym && diaMes < yd) ? 1 : 0);
      let proximo = Date.UTC(anio, ym - 1, yd);
      if (proximo < Date.UTC(anio, mes - 1, diaMes)) proximo = Date.UTC(anio + 1, ym - 1, yd);
      hastaCumple = Math.round((proximo - Date.UTC(anio, mes - 1, diaMes)) / DIA);
    }

    resultado.push({
      id,
      email: (p.email as string | null) ?? null,
      nombre: (p.nombre as string | null) ?? null,
      apellidos: (p.apellidos as string | null) ?? null,
      telefono: (p.telefono as string | null) ?? null,
      idioma: p.idioma === "en" ? "en" : "es",
      admiteCorreos: p.avisos_novedades !== false,
      num: {
        dias_ultimo_entreno: ultima > 0 ? diasEntre(claveDia(new Date(ultima).toISOString()), hoy) : null,
        dias_proxima_reserva: proxima < Infinity ? diasEntre(hoy, claveDia(new Date(proxima).toISOString())) : null,
        reservas_total: total,
        clases_hechas: hechas,
        entrenos_online: misEntrenos.length,
        dias_hasta_caducar: hastaCaducar,
        dias_desde_caducada: desdeCaducada,
        clases_restantes: clasesRestantes,
        dias_ultimo_pago: ultimoPago > 0 ? diasEntre(claveDia(new Date(ultimoPago).toISOString()), hoy) : null,
        pagos_total: misPagos.length,
        dias_alta: p.creado_en ? diasEntre(claveDia(p.creado_en as string), hoy) : null,
        edad,
        dias_hasta_cumple: hastaCumple,
        dia_mes: diaMes,
      },
      opc: { rol: p.rol as string, tarifa_activa: tarifaActiva ? "si" : "no", dia_semana: String(diaSemana), mes: String(mes) },
      tarifaIds,
      tarifaNombres,
      servicios: (serviciosDe.get(id) ?? []).map((s) => s.servicio as string),
      caducaIso,
    });
  }
  return resultado;
}

export function cumpleCondicion(c: Condicion, d: DatosPersona): boolean {
  const t = tipoDeCondicion(c.tipo);
  if (!t) return false;
  if (t.clase === "numero") {
    const v = d.num[c.tipo] ?? null;
    if (c.operador === "vacio") return v === null;
    if (v === null) return false;
    const a = Number(c.valor);
    if (c.valor === "" || Number.isNaN(a)) return false;
    if (c.operador === "igual") return v === a;
    if (c.operador === "mayor") return v > a;
    if (c.operador === "menor") return v < a;
    if (c.operador === "entre") {
      const b = Number(c.valor2);
      return c.valor2 !== undefined && c.valor2 !== "" && !Number.isNaN(b) && v >= Math.min(a, b) && v <= Math.max(a, b);
    }
    return false;
  }
  if (t.clase === "opcion") {
    const v = d.opc[c.tipo];
    return c.operador === "distinto" ? v !== c.valor : v === c.valor;
  }
  const tiene = c.tipo === "tarifa" ? d.tarifaIds.includes(c.valor) : d.servicios.includes(c.valor);
  return c.operador === "no_tiene" ? !tiene : tiene;
}

export const cumpleTodas = (condiciones: Condicion[], d: DatosPersona) => condiciones.length > 0 && condiciones.every((c) => cumpleCondicion(c, d));

const nombreCompleto = (d: DatosPersona) => d.nombre || d.email || "(sin nombre)";

// «Ahora mismo cumplen X personas»: para ver a quién afectaría antes de activarla. No envía nada.
export async function muestraCondiciones(condiciones: Condicion[]): Promise<{ total: number; nombres: string[] }> {
  if (condiciones.length === 0) return { total: 0, nombres: [] };
  const lista = (await datosPersonas()).filter((d) => cumpleTodas(condiciones, d));
  return { total: lista.length, nombres: lista.slice(0, 12).map((d) => [d.nombre, d.apellidos].filter(Boolean).join(" ") || d.email || "(sin nombre)") };
}

function valoresDe(d: DatosPersona): Record<string, string> {
  return {
    nombre: d.nombre ?? "",
    tarifa: d.tarifaNombres[0] ?? "",
    clases: String(d.num.clases_restantes ?? 0),
    fecha_caducidad: d.caducaIso ? soloFecha(d.caducaIso, d.idioma) : "",
    dias_sin_venir: d.num.dias_ultimo_entreno === null ? "" : String(d.num.dias_ultimo_entreno),
    edad: d.num.edad === null ? "" : String(d.num.edad),
  };
}

const poner = (texto: string, valores: Record<string, string>) => texto.replace(/\{(\w+)\}/g, (c, k: string) => (k in valores ? valores[k] : c));
const rutaInterna = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/inicio");

async function darClases(userId: string, a: Extract<Accion, { tipo: "clases" }>): Promise<boolean> {
  const admin = createAdminClient();
  const { data: tipo } = await admin.from("tipos_bono").select("id").eq("nombre", `Regalo · ${a.servicio}`).maybeSingle();
  if (!tipo) return false;
  const { data: nuevo, error } = await admin
    .from("bonos")
    .insert({ user_id: userId, tipo_bono_id: tipo.id, servicio: a.servicio, clases_total: a.cantidad, clases_restantes: a.cantidad, validez_dias: 1095, nota: a.nota || "Automatización", sin_caducidad: true })
    .select("id")
    .single();
  if (error || !nuevo) return false;
  await admin.from("movimientos_bono").insert({ bono_id: nuevo.id, tipo: "alta", clases: a.cantidad, nota: `Automatización${a.nota ? ": " + a.nota : ""}`, creado_por: null });
  await admin.from("perfil_servicios").upsert({ user_id: userId, servicio: a.servicio }, { onConflict: "user_id,servicio", ignoreDuplicates: true });
  await admin.rpc("refrescar_bonos", { p_user: userId });
  await admin.from("bonos").update({ caduca_en: null }).eq("id", nuevo.id);
  return true;
}

// Aplica las consecuencias a una persona y dice qué ha hecho.
async function aplicar(regla: Regla, d: DatosPersona, ejecucionId: string): Promise<{ hecho: string[]; tareas: number }> {
  const admin = createAdminClient();
  const valores = valoresDe(d);
  const hecho: string[] = [];
  let tareas = 0;
  for (const [i, a] of regla.acciones.entries()) {
    try {
      if (a.tipo === "app") {
        await notificarApp(d.id, { tipo: "mensaje", titulo: poner(a.titulo, valores).slice(0, 120), cuerpo: poner(a.texto, valores).slice(0, 300), enlace: rutaInterna(a.enlace), ref: `regla:${ejecucionId}:${i}` });
        hecho.push("aviso en la app");
      } else if (a.tipo === "correo") {
        if (!enviable(d.email)) {
          hecho.push("correo no enviado (sin correo válido)");
          continue;
        }
        if (!d.admiteCorreos) {
          hecho.push("correo no enviado (tiene desactivados los avisos de novedades)");
          continue;
        }
        const en = d.idioma === "en" && !!a.asunto_en && !!a.mensaje_en;
        const ok = await enviarCorreo(correoAutomatico({ para: d.email, idioma: d.idioma, asunto: en ? a.asunto_en! : a.asunto, mensaje: en ? a.mensaje_en! : a.mensaje, valores, ruta: rutaInterna(a.enlace) }));
        hecho.push(ok ? "correo" : "correo fallido");
      } else if (a.tipo === "clases") {
        hecho.push((await darClases(d.id, a)) ? `+${a.cantidad} ${a.cantidad === 1 ? "clase" : "clases"}` : "clases no añadidas");
      } else if (a.tipo === "tarea") {
        const { error } = await admin.from("reglas_tareas").insert({ regla_id: regla.id, user_id: d.id, texto: poner(a.texto, valores) });
        if (!error) {
          tareas++;
          hecho.push("tarea para ti");
        }
      }
    } catch (e) {
      console.warn("[reglas] «%s»: %s", regla.nombre, String(e));
      hecho.push(`${a.tipo} fallida`);
    }
  }
  return { hecho, tareas };
}

export type ResultadoRegla = { aplicadas: number; omitidas: number; tareas: number };

// Aplica una automatización a quien la cumple ahora y todavía no la ha recibido (o ya toca repetirla).
export async function ejecutarRegla(regla: Regla, datos?: DatosPersona[]): Promise<ResultadoRegla> {
  const admin = createAdminClient();
  const coinciden = (datos ?? (await datosPersonas())).filter((d) => cumpleTodas(regla.condiciones, d));
  if (coinciden.length === 0) return { aplicadas: 0, omitidas: 0, tareas: 0 };

  // Última vez que se aplicó a cada persona.
  const previas = await leerTodo<{ user_id: string; ejecutada_en: string }>((a, b) =>
    admin.from("reglas_ejecuciones").select("user_id, ejecutada_en").eq("regla_id", regla.id).order("ejecutada_en", { ascending: false }).range(a, b),
  );
  const ultima = new Map<string, number>();
  for (const p of previas) if (!ultima.has(p.user_id)) ultima.set(p.user_id, Date.parse(p.ejecutada_en));

  const ahora = Date.now();
  let aplicadas = 0;
  let omitidas = 0;
  let tareas = 0;
  // Primero se separan las que ya la recibieron; el tope de 300 por día se aplica solo a las que tocan.
  const pendientes: DatosPersona[] = [];
  for (const d of coinciden) {
    const antes = ultima.get(d.id);
    if (antes !== undefined && (regla.repeticion_dias === null || ahora - antes < regla.repeticion_dias * DIA)) omitidas++;
    else pendientes.push(d);
  }
  for (const d of pendientes.slice(0, 300)) {
    // Se apunta primero, para que un fallo a mitad no repita regalos ni correos.
    const { data: ej, error } = await admin.from("reglas_ejecuciones").insert({ regla_id: regla.id, user_id: d.id }).select("id").single();
    if (error || !ej) continue;
    const r = await aplicar(regla, d, ej.id as string);
    tareas += r.tareas;
    aplicadas++;
    await admin.from("reglas_ejecuciones").update({ resumen: r.hecho.join(", ") }).eq("id", ej.id);
  }

  if (tareas > 0) {
    const { data: admins } = await admin.from("profiles").select("id").eq("rol", "admin");
    await notificarApp((admins ?? []).map((a) => a.id as string), {
      tipo: "admin_tarea",
      titulo: `Tienes ${tareas} ${tareas === 1 ? "tarea nueva" : "tareas nuevas"}: ${regla.nombre}`.slice(0, 120),
      cuerpo: "Abre Automatizaciones para escribirles por WhatsApp.",
      enlace: "/admin/automatizaciones",
      ref: `regla:${regla.id}:${claveDia(new Date().toISOString())}:${aplicadas}`,
    });
  }
  return { aplicadas, omitidas, tareas };
}

// Lo lanza el cron cada mañana: todas las automatizaciones activadas.
export async function ejecutarReglas(): Promise<number> {
  const { data } = await createAdminClient().from("reglas_automaticas").select("*").eq("activa", true);
  let total = 0;
  const reglas = (data ?? []) as Regla[];
  // Los datos de todas las personas se leen una sola vez para todas las automatizaciones.
  const datos = reglas.length > 0 ? await datosPersonas() : [];
  for (const r of reglas) {
    try {
      total += (await ejecutarRegla(r, datos)).aplicadas;
    } catch (e) {
      console.warn("[reglas] «%s»: %s", r.nombre, String(e));
    }
  }
  return total;
}

// Prueba: manda los avisos y correos de la automatización solo a quien la pide (con datos de ejemplo). No añade clases ni crea tareas.
export async function probarRegla(regla: Regla, adminId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: yo } = await admin.from("profiles").select("email, nombre, idioma").eq("id", adminId).maybeSingle();
  const valores = { nombre: (yo?.nombre as string | null) ?? "Miriam", tarifa: "Tu tarifa", clases: "3", fecha_caducidad: "15 de diciembre de 2026", dias_sin_venir: "14", edad: "30" };
  const idioma = yo?.idioma === "en" ? "en" : "es";
  const hecho: string[] = [];
  for (const [i, a] of regla.acciones.entries()) {
    if (a.tipo === "app") {
      await notificarApp(adminId, { tipo: "mensaje", titulo: `[Prueba] ${poner(a.titulo, valores)}`.slice(0, 120), cuerpo: poner(a.texto, valores).slice(0, 300), enlace: rutaInterna(a.enlace), ref: `prueba:${regla.id}:${Date.now()}:${i}` });
      hecho.push("Aviso en la app enviado a ti.");
    } else if (a.tipo === "correo") {
      if (!enviable((yo?.email as string | null) ?? null)) hecho.push("Correo: tu cuenta no tiene un correo válido para recibir pruebas.");
      else {
        const ok = await enviarCorreo(correoAutomatico({ para: yo!.email as string, idioma, asunto: `[Prueba] ${poner(a.asunto, valores)}`, mensaje: a.mensaje, valores, ruta: rutaInterna(a.enlace) }));
        hecho.push(ok ? "Correo enviado a tu correo." : "No se ha podido enviar el correo de prueba.");
      }
    } else if (a.tipo === "clases") hecho.push("Añadir clases: no se hace en las pruebas.");
    else hecho.push("Tarea: no se crea en las pruebas.");
  }
  return hecho;
}

export const nombrePersona = nombreCompleto;
