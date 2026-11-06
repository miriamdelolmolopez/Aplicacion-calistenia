import Link from "next/link";
import PestanasFicha from "./PestanasFicha";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { colorDeTipo } from "@/lib/colores";
import { claveDia, fechaCorta, textoHora } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { nombresFormas } from "@/lib/formasPago";
import { createAdminClient } from "@/lib/supabase/admin";
import Avatar from "../../../Avatar";
import Medidas from "../../../perfil/Medidas";
import Progreso from "../../../progreso/Progreso";
import styles from "../../admin.module.css";
import estilos from "../usuarios.module.css";
import { EditorBono } from "../../bonos/Controles";
import AvancesSesion from "./AvancesSesion";
import Logros from "../../../progreso/Logros";
import CalendarioReservas, { type EventoCalendario } from "./CalendarioReservas";
import { AlargarCortesia } from "./CorreosYCortesia";
import CorreosPersona from "./CorreosPersona";
import EditorPersona from "../../EditorPersona";
import AccesosUsuario from "./AccesosUsuario";
import HistorialExamen, { type Intento } from "../../../aprende/examen/HistorialExamen";
import { textosAprende } from "../../../aprende/textosAprende";
import TarifaAsistentes, { type BonoAsistente, type TarifaOpcion } from "./TarifaAsistentes";
import Notas from "./Notas";
import HistorialReservas from "./HistorialReservas";
import { esSuelto, nombreVisible } from "@/lib/regalos";
import AnadirSinCobrar from "./AnadirSinCobrar";
import PanelActual from "./PanelActual";
import type { Periodo, ReservaFila, TipoClaseChip } from "./periodos";
import CabeceraAdmin from "../../CabeceraAdmin";

export const metadata = { title: "Ficha de usuario · Administración" };

const ROLES: Record<string, string> = { alumno: "Alumno/a", invitado: "Invitado/a", exalumno: "Exalumno/a", coach: "Coach", admin: "Administradora" };
const SERVICIOS: Record<string, string> = { grupal: "Grupal", individual: "Individual", online: "Online", taller: "Talleres" };
const ESTADOS_BONO: Record<string, string> = {
  activo: "Activo",
  en_cola: "En espera",
  agotado: "Agotado",
  caducado: "Caducado",
  anulado: "Anulado",
};

const PESTANAS = [
  { id: "actual", texto: "Actual" },
  { id: "reservas", texto: "Reservas" },
  { id: "logros", texto: "Logros" },
  { id: "perfil", texto: "Perfil" },
  { id: "acciones", texto: "Acciones" },
] as const;
type Pestana = (typeof PESTANAS)[number]["id"] | "accesos";
const PESTANA_ACCESOS = { id: "accesos", texto: "Accesos" } as const;

type Asistencia = {
  total_clases: number;
  clases_mes: number;
  ultima_clase: string | null;
  dias_sin_venir: number | null;
  racha_semanas: number;
  por_mes: { mes: string; clases: number }[];
};

type Bono = {
  id: string;
  servicio: string;
  estado: string;
  tipo_bono_id: string;
  clases_total: number;
  clases_restantes: number;
  activo_desde: string | null;
  caduca_en: string | null;
  creado_en: string;
  sin_caducidad: boolean;
  tipos_bono: { nombre: string } | null;
  pagos: { importe_centimos: number; estado: string; metodo: string; descuento_centimos: number }[];
};

type ReservaCalendario = {
  id: string;
  estado: string;
  asistencia: string | null;
  bono_id: string | null;
  sesiones_clase: { empieza_en: string; estado: string; tipos_clase: { nombre: string; color: string | null; servicio: string } | null } | null;
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

// Suma (o resta) meses a «AAAA-MM».
function sumarMeses(mes: string, n: number): string {
  const d = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Teléfono para WhatsApp: solo cifras y con el prefijo de España si falta.
function paraWhatsapp(tel: string): string {
  const cifras = tel.replace(/\D/g, "");
  return cifras.length === 9 ? `34${cifras}` : cifras;
}

export default async function FichaUsuario({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pestana?: string; mes?: string }>;
}) {
  const { id } = await params;
  const { pestana: pedida, mes: mesPedido } = await searchParams;
  const { supabase, user: yo } = await requireAdmin("usuarios");
  const admin = createAdminClient();
  const ahora = new Date().toISOString();
  // Si todavía no está el archivo 066 en Supabase, la consulta falla y se usan valores por defecto.
  const { data: accesos } = await admin.from("profiles").select("es_coach, excluidos_admin, tambien_alumno, fue_alumno").eq("id", id).maybeSingle();

  // Todo lo que no depende de otra consulta se pide a la vez.
  const [METODOS, { data: p }, , { data: usuarioAuth }, { data: asistenciaDatos }, { data: nota }, { data: avisosPersona }, { data: aceptacionesDatos }, { data: intentosDatos }, { data: todasDatos }, { data: tarifasDatos }, { data: futurasDatos }] = await Promise.all([
    nombresFormas(),
    supabase
      .from("profiles")
      .select(
        "id, email, nombre, apellidos, telefono, dni, fecha_nacimiento, sexo, contacto_emergencia_nombre, contacto_emergencia_telefono, rol, idioma, creado_en, foto_path, sin_correos, perfil_servicios(servicio)",
      )
      .eq("id", id)
      .maybeSingle(),
    // Se pone al día lo que haya caducado o se haya agotado antes de leer sus bonos.
    admin.rpc("refrescar_bonos", { p_user: id }),
    admin.auth.admin.getUserById(id),
    supabase.rpc("asistencia_usuario", { p_user: id }),
    supabase.from("notas_usuario").select("texto").eq("user_id", id).maybeSingle(),
    admin.from("profiles").select("avisos_reserva, avisos_recordatorio, avisos_bono, avisos_novedades, avisar_cumple, avisos_cancelacion, avisos_bono_clases, avisos_inactividad, avisos_cumpleanos").eq("id", id).maybeSingle(),
    // Cuántos textos legales ha aceptado (el listado completo está en su propia pantalla).
    admin.from("consentimientos").select("tipo, version, aceptado_en").eq("user_id", id).order("aceptado_en", { ascending: false }),
    supabase.from("intentos_examen").select("id, aciertos, total, creado_en").eq("user_id", id).order("creado_en", { ascending: false }).limit(50),
    // Todas sus reservas, para el calendario (cada clase con el color de su tipo).
    admin
      .from("reservas")
      .select("id, estado, asistencia, bono_id, sesiones_clase(empieza_en, estado, tipos_clase(nombre, color, servicio))")
      .eq("user_id", id)
      .in("estado", ["reservada", "cancelada"])
      .limit(2000),
    // Datos para los asistentes de «Cambiar tarifa y fechas» y «Quitar tarifa».
    admin.from("tipos_bono").select("id, nombre, servicio, clases, validez_dias").eq("activo", true).order("servicio").order("orden"),
    admin.from("reservas").select("bono_id, sesiones_clase!inner(empieza_en)").eq("user_id", id).eq("estado", "reservada").gt("sesiones_clase.empieza_en", ahora),
  ]);
  if (!p) notFound();

  // Una administradora tiene Perfil y Accesos; si además es alumna, también las pestañas de una alumna (tarifa, reservas, logros y acciones).
  const esAdmin = p.rol === "admin";
  const esAlumna = !esAdmin || !!accesos?.tambien_alumno;
  const pestanas: readonly { id: string; texto: string }[] = !esAdmin ? PESTANAS : esAlumna ? [...PESTANAS, PESTANA_ACCESOS] : [PESTANAS[3], PESTANA_ACCESOS];
  const pestana: Pestana = pestanas.some((x) => x.id === pedida) ? (pedida as Pestana) : (pestanas[0].id as Pestana);

  // Los bonos se leen cuando ya se han puesto al día.
  const { data: bonosDatos } = await supabase
    .from("bonos")
    .select(
      "id, servicio, estado, tipo_bono_id, clases_total, clases_restantes, activo_desde, caduca_en, creado_en, sin_caducidad, tipos_bono(nombre), pagos(importe_centimos, estado, metodo, descuento_centimos)",
    )
    .eq("user_id", id)
    .order("creado_en", { ascending: false });
  const asistencia = asistenciaDatos as Asistencia;
  const bonos = (bonosDatos ?? []) as unknown as Bono[];
  // Motivo con el que se dio cada bono de clases sueltas (está en su alta del historial).
  const idsSueltos = bonos.filter((b) => esSuelto(b.tipos_bono?.nombre)).map((b) => b.id);
  const { data: altasSueltos } = idsSueltos.length
    ? await admin.from("movimientos_bono").select("bono_id, nota").eq("tipo", "alta").in("bono_id", idsSueltos)
    : { data: [] as { bono_id: string; nota: string | null }[] };
  const motivoDe = new Map((altasSueltos ?? []).map((m) => [m.bono_id as string, String(m.nota ?? "").replace(/^Regalo([ ]*[:·][ ]*|$)/, "").trim()]));

  const aceptaciones = (aceptacionesDatos ?? []) as { tipo: string; version: string; aceptado_en: string }[];

  const intentos = (intentosDatos ?? []) as Intento[];

  const eventos: EventoCalendario[] = ((todasDatos ?? []) as unknown as ReservaCalendario[])
    .filter((r) => r.sesiones_clase)
    .map((r) => {
      const s = r.sesiones_clase!;
      const nombreTipo = s.tipos_clase?.nombre ?? "Clase";
      return {
        dia: claveDia(s.empieza_en),
        hora: textoHora(s.empieza_en),
        nombre: nombreTipo,
        color: colorDeTipo(s.tipos_clase?.color, nombreTipo),
        estado: r.estado === "cancelada" || s.estado === "cancelada" ? "cancelada" : r.estado,
        asistencia: r.asistencia,
      };
    });

  const hoy = claveDia(ahora);
  const servicios = [
    ...new Set([
      ...(p.perfil_servicios as { servicio: string }[]).map((s) => s.servicio),
      ...bonos.filter((b) => b.estado === "activo" || b.estado === "en_cola").map((b) => b.servicio),
    ]),
  ];
  const presencial = servicios.includes("grupal") || servicios.includes("individual") || servicios.includes("taller") || asistencia.total_clases > 0;
  const online = servicios.includes("online");
  // Su rutina para el botón «Editar rutina»: la publicada, o si no hay, la última que tenga.
  const { data: rutinasPersona } = online
    ? await admin.from("rutinas").select("id, estado, actualizado_en").eq("user_id", id).order("actualizado_en", { ascending: false })
    : { data: [] };
  const rutinaDe = ((rutinasPersona ?? []) as { id: string; estado: string }[]).find((r) => r.estado === "publicada") ?? ((rutinasPersona ?? []) as { id: string }[])[0];
  const nombre = [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";

  let foto: string | null = null;
  if (p.foto_path) {
    const { data: firmada } = await admin.storage.from("avatares").createSignedUrl(p.foto_path, 3600);
    foto = firmada?.signedUrl ?? null;
  }

  const tarifasOpciones: TarifaOpcion[] = ((tarifasDatos ?? []) as { id: string; nombre: string; servicio: string; clases: number; validez_dias: number }[]).map((t) => ({
    id: t.id,
    nombre: t.nombre,
    servicio: t.servicio,
    clases: t.clases,
    validez: t.validez_dias,
  }));
  const futurasPorBono = new Map<string, number>();
  for (const r of (futurasDatos ?? []) as { bono_id: string | null }[]) {
    if (r.bono_id) futurasPorBono.set(r.bono_id, (futurasPorBono.get(r.bono_id) ?? 0) + 1);
  }
  const paraAsistente = (b: Bono): BonoAsistente => ({
    id: b.id,
    nombre: nombreVisible(b.tipos_bono?.nombre) || "Tarifa",
    tipoId: b.tipo_bono_id,
    servicio: b.servicio,
    estado: b.estado,
    clasesTotal: b.clases_total,
    clasesRestantes: b.clases_restantes,
    validez: tarifasOpciones.find((t) => t.id === b.tipo_bono_id)?.validez ?? 30,
    desde: b.activo_desde ? claveDia(b.activo_desde) : null,
    hasta: b.caduca_en ? claveDia(b.caduca_en) : null,
    combo: bonos.some((o) => o.id !== b.id && o.tipo_bono_id === b.tipo_bono_id && o.creado_en === b.creado_en),
    cobrado: b.pagos.filter((x) => x.estado === "pagado").reduce((n, x) => n + x.importe_centimos, 0),
    pendiente: b.pagos.filter((x) => x.estado === "pendiente").reduce((n, x) => n + x.importe_centimos, 0),
    reservasFuturas: futurasPorBono.get(b.id) ?? 0,
    enEspera: bonos.filter((o) => o.id !== b.id && o.estado === "en_cola" && o.servicio === b.servicio).length,
  });

  // Servicios que tiene ahora (en marcha o en espera) y el texto de cada uno.
  const contratados = bonos.filter((b) => b.estado === "activo" || b.estado === "en_cola");
  // Los caducados y agotados también se pueden corregir (tarifa y fechas); si quedan en fecha, vuelven a estar activos.
  const terminados = bonos.filter((b) => b.estado === "caducado" || b.estado === "agotado");
  const detalleBono = (b: Bono) =>
    [
      b.servicio === "online" ? "Plan online" : `${b.clases_restantes} de ${b.clases_total} clases`,
      b.activo_desde ? `del ${fechaCorta(b.activo_desde)}${b.caduca_en ? ` al ${fechaCorta(b.caduca_en)}` : ""}` : b.caduca_en ? `hasta el ${fechaCorta(b.caduca_en)}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const maxMes = Math.max(1, ...asistencia.por_mes.map((m) => m.clases));

  // Tarifa actual, lo que está en espera y si hay algo sin pagar.
  const activos = bonos.filter((b) => b.estado === "activo");
  const enEspera = bonos.filter((b) => b.estado === "en_cola");
  // Bonos con todas las clases gastadas pero todavía dentro de sus fechas: la tarifa sigue vigente.
  const vigentesSinClases = bonos.filter((b) => b.estado === "agotado" && b.caduca_en && b.caduca_en > ahora);
  const sinPagar = [...activos, ...enEspera].some((b) => b.pagos.some((x) => x.estado === "pendiente"));

  // Los periodos (compras de tarifa) con sus fechas, para la pestaña «Actual» y los filtros de «Reservas».
  const nombreDeBono = new Map(bonos.map((b) => [b.id, nombreVisible(b.tipos_bono?.nombre) || "Tarifa"]));
  const compras = new Map<string, Bono[]>();
  for (const b of bonos) {
    if (b.estado === "anulado") continue;
    const clave = `${b.tipo_bono_id}|${b.creado_en}`;
    compras.set(clave, [...(compras.get(clave) ?? []), b]);
  }
  const periodos: Periodo[] = [...compras.entries()].map(([clave, bs]) => {
    const desdes = bs.map((b) => b.activo_desde).filter((x): x is string => !!x);
    const hastas = bs.map((b) => b.caduca_en).filter((x): x is string => !!x);
    return {
      id: clave,
      nombre: nombreVisible(bs[0].tipos_bono?.nombre) || "Tarifa",
      suelto: esSuelto(bs[0].tipos_bono?.nombre),
      motivo: motivoDe.get(bs[0].id) || null,
      sinCaducidad: bs.every((b) => b.sin_caducidad),
      dado: claveDia(bs[0].creado_en),
      // «Actual» si algún bono está activo o si su tarifa sigue vigente aunque ya no queden clases.
      estado: bs.some((b) => b.estado === "activo" || (b.estado === "agotado" && b.caduca_en && b.caduca_en > ahora)) ? "activo" : bs.some((b) => b.estado === "en_cola") ? "en_cola" : "finalizado",
      desde: desdes.length ? claveDia(desdes.sort()[0]) : null,
      hasta: hastas.length ? claveDia(hastas.sort().reverse()[0]) : null,
      pagado: bs.some((b) => b.pagos.some((x) => x.estado === "pagado")),
      pendiente: bs.some((b) => b.pagos.some((x) => x.estado === "pendiente")),
      bonos: bs.map((b) => ({ id: b.id, servicio: b.servicio, estado: b.estado, total: b.clases_total, restantes: b.clases_restantes, desde: b.activo_desde ? claveDia(b.activo_desde) : null, hasta: b.caduca_en ? claveDia(b.caduca_en) : null })),
    };
  });
  const reservasLista: ReservaFila[] = ((todasDatos ?? []) as unknown as ReservaCalendario[])
    .filter((r) => r.sesiones_clase)
    .map((r) => {
      const s = r.sesiones_clase!;
      const nombreTipo = s.tipos_clase?.nombre ?? "Clase";
      return {
        id: r.id,
        dia: claveDia(s.empieza_en),
        hora: textoHora(s.empieza_en),
        nombre: nombreTipo,
        color: colorDeTipo(s.tipos_clase?.color, nombreTipo),
        servicio: s.tipos_clase?.servicio ?? "grupal",
        estado: r.estado === "cancelada" || s.estado === "cancelada" ? "cancelada" : r.estado,
        asistencia: r.asistencia,
        bonoId: r.bono_id,
        tarifa: r.bono_id ? (nombreDeBono.get(r.bono_id) ?? "—") : "—",
      };
    });
  const { data: tiposDatos } = await admin.from("tipos_clase").select("nombre, color, color_texto, servicio").eq("activo", true).order("orden").order("nombre");
  const tiposClase: TipoClaseChip[] = ((tiposDatos ?? []) as { nombre: string; color: string | null; color_texto: string | null; servicio: string }[]).map((x) => ({
    nombre: x.nombre,
    color: colorDeTipo(x.color, x.nombre),
    colorTexto: x.color_texto ?? "#FFFFFF",
    servicio: x.servicio,
  }));
  const ahoraMadrid = `${claveDia(ahora)}T${textoHora(ahora)}`;

  const mes = mesPedido && /^\d{4}-\d{2}$/.test(mesPedido) ? mesPedido : hoy.slice(0, 7);
  const aFicha = (pest: Pestana, extra = "") => `/admin/usuarios/${id}?pestana=${pest}${extra}`;

  const panelActual = <PanelActual periodos={periodos} reservas={reservasLista} tipos={tiposClase} userId={id} hoy={hoy} />;

  const panelReservas = (
        <>
          <section className={styles.tarjeta}>
            <h2>Reservas</h2>
            <div className={estilos.mesNavegar}>
              <Link href={aFicha("reservas", `&mes=${sumarMeses(mes, -1)}`)} scroll={false} aria-label="Mes anterior">
                ‹ Anterior
              </Link>
              <Link href={aFicha("reservas")} scroll={false} className={estilos.hoyEnlace}>
                Este mes
              </Link>
              <Link href={aFicha("reservas", `&mes=${sumarMeses(mes, 1)}`)} scroll={false} aria-label="Mes siguiente">
                Siguiente ›
              </Link>
            </div>
            <CalendarioReservas meses={[mes]} eventos={eventos} userId={id} hoy={hoy} />
          </section>

          <HistorialReservas reservas={reservasLista} periodos={periodos} ahora={ahoraMadrid} />

        </>
  );

  const panelLogros = (
        <>
          {presencial ? (
            <section className={styles.tarjeta}>
              <h2>Clases</h2>
              <div className={estilos.cifras}>
                <div className={estilos.cifra}>
                  <strong>{asistencia.clases_mes}</strong>
                  <span className={styles.ayuda}>clases este mes</span>
                </div>
                <div className={estilos.cifra}>
                  <strong>{asistencia.dias_sin_venir === null ? "—" : asistencia.dias_sin_venir}</strong>
                  <span className={styles.ayuda}>días sin venir</span>
                </div>
                <div className={estilos.cifra}>
                  <strong>{asistencia.racha_semanas}</strong>
                  <span className={styles.ayuda}>{asistencia.racha_semanas === 1 ? "semana seguida" : "semanas seguidas"} viniendo</span>
                </div>
                <div className={estilos.cifra}>
                  <strong>{asistencia.total_clases}</strong>
                  <span className={styles.ayuda}>clases en total</span>
                </div>
              </div>
              <div className={estilos.barras} aria-label="Clases por mes">
                {asistencia.por_mes.map((m) => (
                  <div key={m.mes} className={estilos.barraMes}>
                    <span>{m.clases}</span>
                    <div className={estilos.barraRelleno} style={{ height: `${(m.clases / maxMes) * 60}px` }} />
                    <span>{MESES[Number(m.mes.slice(5)) - 1]}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          {presencial && (
            <section className={styles.tarjeta}>
              <Logros userId={p.id} admin />
            </section>
          )}
          {!presencial && !online && (
            <section className={styles.tarjeta}>
              <h2>Logros</h2>
              <p className={styles.ayuda}>Todavía no hay datos de clases ni de entrenos.</p>
            </section>
          )}
          {online && (
            <>
              <section className={styles.tarjeta}>
                <h2>Progreso online</h2>
                <Progreso userId={p.id} admin />
              </section>
              <section className={styles.tarjeta}>
                <h2>Avances por sesión</h2>
                <AvancesSesion userId={p.id} />
              </section>
            </>
          )}
        </>
  );

  const panelPerfil = (
        <>
          <section className={styles.tarjeta}>
            <h2>Datos</h2>
            <dl className={estilos.datosLista}>
              <div>
                <dt>Registrada</dt>
                <dd>{fechaCorta(p.creado_en)}</dd>
              </div>
              <div>
                <dt>Última conexión</dt>
                <dd>{usuarioAuth?.user?.last_sign_in_at ? fechaCorta(usuarioAuth.user.last_sign_in_at) : "Nunca"}</dd>
              </div>
              <div>
                <dt>DNI / NIE</dt>
                <dd>{p.dni ?? "—"}</dd>
              </div>
              <div>
                <dt>Fecha de nacimiento</dt>
                <dd>{p.fecha_nacimiento ? fechaCorta(`${p.fecha_nacimiento}T12:00:00Z`) : "—"}</dd>
              </div>
              <div>
                <dt>Sexo</dt>
                <dd>{p.sexo === "mujer" ? "Mujer" : p.sexo === "hombre" ? "Hombre" : p.sexo === "otro" ? "Otro" : "Sin indicar"}</dd>
              </div>
              <div>
                <dt>Contacto de emergencia</dt>
                <dd>{p.contacto_emergencia_nombre ? `${p.contacto_emergencia_nombre} · ${p.contacto_emergencia_telefono ?? ""}` : "—"}</dd>
              </div>
              <div>
                <dt>Idioma</dt>
                <dd>{p.idioma === "en" ? "Inglés" : "Español"}</dd>
              </div>
            </dl>
          </section>

          {esAlumna && (
          <>
          <Link href={`/admin/usuarios/${p.id}/textos-legales`} className={estilos.tarjetaEnlace}>
            <span>
              <strong>Textos legales</strong>
              <small>
                {aceptaciones.length === 0 ? "Todavía no ha aceptado ninguno" : `${aceptaciones.length} aceptados · el último, el ${fechaCorta(aceptaciones[0].aceptado_en)}`}
              </small>
            </span>
            <span aria-hidden="true">›</span>
          </Link>

          <section className={styles.tarjeta}>
            <h2>Medidas</h2>
            <Medidas userId={p.id} soloLectura />
          </section>

          <section className={styles.tarjeta}>
            <h2>Tests de Aprende</h2>
            <HistorialExamen intentos={intentos} t={{ ...textosAprende.es, sinIntentos: "Todavía no ha hecho ningún examen." }} idioma="es" />
          </section>
          </>
          )}

          <section className={styles.tarjeta}>
            <h2>Notas privadas</h2>
            <Notas userId={p.id} texto={nota?.texto ?? ""} />
          </section>

        </>
  );

  const panelAcciones = (
        <>
          <section className={styles.tarjeta}>
            <h2>Acciones</h2>
            <nav className={estilos.acciones} aria-label="Acciones">
              <details className={estilos.accionDespliega}>
                <summary>Editar servicios contratados</summary>
                <div className={estilos.serviciosContratados}>
                  <AnadirSinCobrar userId={p.id} tarifas={tarifasOpciones} hoy={hoy} />
                  {contratados.length === 0 && terminados.length === 0 && <p className={styles.ayuda}>Ahora mismo no tiene ningún servicio contratado.</p>}
                  {contratados.length === 0 && terminados.length > 0 && <p className={styles.ayuda}>No tiene ninguna tarifa activa. Aquí abajo puedes corregir las que han caducado o se han agotado.</p>}
                  {contratados.map((b) => (
                    <article key={b.id} className={estilos.histCard}>
                      <div className={estilos.histCabecera}>
                        <div>
                          <strong>{nombreVisible(b.tipos_bono?.nombre)}</strong>
                          <div className={styles.ayuda}>{detalleBono(b)}</div>
                        </div>
                        <span className={styles.etiquetaSuave}>{ESTADOS_BONO[b.estado] ?? b.estado}</span>
                      </div>
                      {b.estado === "activo" && b.caduca_en && <AlargarCortesia userId={p.id} bonoId={b.id} hasta={claveDia(b.caduca_en)} />}
                      <TarifaAsistentes userId={p.id} bono={paraAsistente(b)} tarifas={tarifasOpciones} />
                      <EditorBono bonoId={b.id} anulado={false} sinAnular />
                    </article>
                  ))}
                  {terminados.map((b) => (
                    <article key={b.id} className={estilos.histCard}>
                      <div className={estilos.histCabecera}>
                        <div>
                          <strong>{nombreVisible(b.tipos_bono?.nombre)}</strong>
                          <div className={styles.ayuda}>{detalleBono(b)}</div>
                        </div>
                        <span className={styles.etiquetaSuave}>{ESTADOS_BONO[b.estado] ?? b.estado}</span>
                      </div>
                      <TarifaAsistentes userId={p.id} bono={paraAsistente(b)} tarifas={tarifasOpciones} />
                    </article>
                  ))}
                  <EditorPersona
                    persona={{
                      id: p.id,
                      email: p.email ?? "",
                      rol: p.rol,
                      servicios: (p.perfil_servicios as { servicio: string }[]).map((s) => s.servicio),
                    }}
                  />
                </div>
              </details>
              <Link href={`/admin/usuarios/${id}/pagos`}>Marcar un pago</Link>
              <Link href={`/admin/usuarios/${id}/pagos?pestana=historial`}>Historial de pagos</Link>
              {presencial && <Link href={`/admin/reservas/como/${id}`}>Reservar clases en su nombre</Link>}
              {online && <Link href={rutinaDe ? `/admin/rutinas/${rutinaDe.id}` : "/admin/rutinas"}>{rutinaDe ? "Editar rutina" : "Crear su rutina"}</Link>}
              {online && rutinaDe && <Link href={`/rutina/ver?como=${p.id}`}>Ver su rutina como alumno/a</Link>}
              <Link href={`/admin/usuarios/${p.id}/textos-legales`}>Textos legales</Link>
            </nav>
          </section>

          <section className={styles.tarjeta}>
            <h2>Historial de servicios y pagos</h2>
            {bonos.length === 0 && <p className={styles.ayuda}>Todavía no ha contratado ningún servicio.</p>}
            {bonos.map((b) => {
              const pago = b.pagos[0];
              return (
                <article key={b.id} className={estilos.histCard}>
                  <div className={estilos.histCabecera}>
                    <div>
                      <strong>{nombreVisible(b.tipos_bono?.nombre)}</strong>
                      <div className={styles.ayuda}>{detalleBono(b)}</div>
                      {pago && (
                        <div className={styles.ayuda}>
                          {euros(pago.importe_centimos)}
                          {pago.descuento_centimos > 0 && ` (descuento −${euros(pago.descuento_centimos)})`} · {METODOS[pago.metodo] ?? pago.metodo} · {pago.estado === "pagado" ? "cobrado" : pago.estado === "pendiente" ? "pendiente de cobro" : "anulado"}
                        </div>
                      )}
                    </div>
                    <span className={styles.etiquetaSuave}>{ESTADOS_BONO[b.estado] ?? b.estado}</span>
                  </div>
                </article>
              );
            })}
          </section>

          <section className={styles.tarjeta}>
            <h2>Correos</h2>
            <CorreosPersona
              userId={p.id}
              inicial={{
                sinCorreos: !!(p as { sin_correos?: boolean }).sin_correos,
                avisos_reserva: avisosPersona?.avisos_reserva ?? true,
                avisos_recordatorio: avisosPersona?.avisos_recordatorio ?? true,
                avisos_bono: avisosPersona?.avisos_bono ?? true,
                avisos_cancelacion: avisosPersona?.avisos_cancelacion ?? true,
                avisos_bono_clases: avisosPersona?.avisos_bono_clases ?? true,
                avisos_inactividad: avisosPersona?.avisos_inactividad ?? true,
                avisos_cumpleanos: avisosPersona?.avisos_cumpleanos ?? true,
              }}
            />
          </section>

          {!esAdmin && (
            <section className={styles.tarjeta}>
              <h2>Accesos</h2>
              <AccesosUsuario
                userId={p.id}
                nombre={nombre}
                rolInicial={p.rol}
                esCoachInicial={!!accesos?.es_coach}
              tambienAlumno={!!accesos?.tambien_alumno}
              fueAlumno={!!accesos?.fue_alumno}
                excluidosIniciales={(accesos?.excluidos_admin as string[] | null) ?? []}
                esMiCuenta={yo.id === p.id}
              />
            </section>
          )}
        </>
  );

  const panelAccesos = (
    <section className={styles.tarjeta}>
      <h2>Accesos</h2>
      <AccesosUsuario
        userId={p.id}
        nombre={nombre}
        rolInicial={p.rol}
        esCoachInicial={!!accesos?.es_coach}
        tambienAlumno={!!accesos?.tambien_alumno}
        fueAlumno={!!accesos?.fue_alumno}
        excluidosIniciales={(accesos?.excluidos_admin as string[] | null) ?? []}
        esMiCuenta={yo.id === p.id}
      />
    </section>
  );

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>{nombre}</h1>
        <Link href="/admin/usuarios" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar nombre={nombre} url={foto} tamano={72} />
          <div style={{ minWidth: 0 }}>
            <strong style={{ fontSize: "1.15rem" }}>{nombre}</strong>
            <div className={estilos.etiquetas} style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0" }}>
              <span className={styles.etiquetaSuave}>{ROLES[p.rol] ?? p.rol}</span>
              {servicios.map((s) => (
                <span key={s} className={styles.etiquetaSuave}>
                  {SERVICIOS[s] ?? s}
                </span>
              ))}
              {esAlumna && (
                <span className={activos.length > 0 || vigentesSinClases.length > 0 ? estilos.activa : estilos.sinTarifa}>
                  {activos.length > 0 ? "Tarifa activa" : vigentesSinClases.length > 0 ? "Vigente · sin clases" : "Sin tarifa"}
                </span>
              )}
              {esAlumna && sinPagar && <span className={estilos.sinPagar}>Sin pagar</span>}
            </div>
            <div className={styles.ayuda} style={{ overflowWrap: "anywhere" }}>
              {p.email}
            </div>
            {p.telefono && <div className={styles.ayuda}>{p.telefono}</div>}
          </div>
        </div>
        <div className={estilos.contactos}>
          {p.telefono && (
            <a href={`https://wa.me/${paraWhatsapp(p.telefono)}`} target="_blank" rel="noopener noreferrer" className={estilos.contacto}>
              WhatsApp
            </a>
          )}
          {p.email && (
            <a href={`mailto:${p.email}`} className={estilos.contacto}>
              Correo
            </a>
          )}
          {p.telefono && (
            <a href={`tel:${p.telefono.replace(/\s/g, "")}`} className={estilos.contacto}>
              Llamar
            </a>
          )}
        </div>
      </section>

      <PestanasFicha
        key={pestana}
        id={id}
        inicial={pestana}
        pestanas={pestanas}
        paneles={{ actual: panelActual, reservas: panelReservas, logros: panelLogros, perfil: panelPerfil, acciones: panelAcciones, accesos: panelAccesos }}
      />





    </main>
  );
}
