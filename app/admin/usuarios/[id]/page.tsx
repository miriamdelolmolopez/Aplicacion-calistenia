import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { fechaCorta, textoDia, textoHora } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { nombresFormas } from "@/lib/formasPago";
import { createAdminClient } from "@/lib/supabase/admin";
import Avatar from "../../../Avatar";
import Medidas from "../../../perfil/Medidas";
import Progreso from "../../../progreso/Progreso";
import EditorPersona from "../../EditorPersona";
import styles from "../../admin.module.css";
import estilos from "../usuarios.module.css";
import AvancesSesion from "./AvancesSesion";
import EliminarUsuario from "./EliminarUsuario";
import HistorialExamen, { type Intento } from "../../../aprende/examen/HistorialExamen";
import { textosAprende } from "../../../aprende/textosAprende";
import { EditorBono } from "../../bonos/Controles";
import { ClasesHechas, InicioBono } from "./ClasesHechas";
import Notas from "./Notas";

export const metadata = { title: "Ficha de usuario · Administración" };

const ROLES: Record<string, string> = { alumno: "Alumna", invitado: "Invitada" };
const SERVICIOS: Record<string, string> = { grupal: "Grupal", individual: "Individual", online: "Online" };
const ESTADOS_BONO: Record<string, string> = {
  activo: "Activo",
  en_cola: "En espera",
  agotado: "Agotado",
  caducado: "Caducado",
  anulado: "Anulado",
};

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
  clases_total: number;
  clases_restantes: number;
  caduca_en: string | null;
  creado_en: string;
  tipos_bono: { nombre: string } | null;
  pagos: { importe_centimos: number; estado: string; metodo: string; descuento_centimos: number }[];
};

type Reserva = {
  id: string;
  sesiones_clase: { empieza_en: string; estado: string; tipos_clase: { nombre: string } | null };
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export default async function FichaUsuario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const admin = createAdminClient();
  const METODOS = await nombresFormas();

  const { data: p } = await supabase
    .from("profiles")
    .select(
      "id, email, nombre, apellidos, telefono, dni, fecha_nacimiento, sexo, contacto_emergencia_nombre, contacto_emergencia_telefono, rol, idioma, creado_en, foto_path, perfil_servicios(servicio)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!p || p.rol === "admin") notFound();

  // Se pone al día lo que haya caducado o se haya agotado antes de leer sus bonos.
  await admin.rpc("refrescar_bonos", { p_user: id });

  const [{ data: usuarioAuth }, { data: asistenciaDatos }, { data: bonosDatos }, { data: nota }] = await Promise.all([
    admin.auth.admin.getUserById(id),
    supabase.rpc("asistencia_usuario", { p_user: id }),
    supabase
      .from("bonos")
      .select(
        "id, servicio, estado, clases_total, clases_restantes, caduca_en, creado_en, tipos_bono(nombre), pagos(importe_centimos, estado, metodo, descuento_centimos)",
      )
      .eq("user_id", id)
      .order("creado_en", { ascending: false }),
    supabase.from("notas_usuario").select("texto").eq("user_id", id).maybeSingle(),
  ]);
  const { data: intentosDatos } = await supabase
    .from("intentos_examen")
    .select("id, aciertos, total, creado_en")
    .eq("user_id", id)
    .order("creado_en", { ascending: false })
    .limit(50);
  const intentos = (intentosDatos ?? []) as Intento[];
  const { data: tiposClaseDatos } = await admin.from("tipos_clase").select("id, nombre").eq("activo", true).order("nombre");
  const tiposClase = (tiposClaseDatos ?? []) as { id: string; nombre: string }[];
  const asistencia = asistenciaDatos as Asistencia;
  const bonos = (bonosDatos ?? []) as unknown as Bono[];

  // Textos legales que esta persona aceptó, con el texto exacto de la versión que firmó.
  const [{ data: aceptacionesDatos }, { data: textosLegalesDatos }] = await Promise.all([
    admin.from("consentimientos").select("tipo, version, aceptado_en, concedido").eq("user_id", id).order("aceptado_en", { ascending: false }),
    admin.from("textos_legales").select("documento, version, contenido"),
  ]);
  const aceptaciones = (aceptacionesDatos ?? []) as { tipo: string; version: string; aceptado_en: string; concedido: boolean | null }[];
  const textoLegal = new Map(((textosLegalesDatos ?? []) as { documento: string; version: string; contenido: string }[]).map((t) => [`${t.documento}|${t.version}`, t.contenido]));
  const TITULO_ACEPTACION: Record<string, string> = {
    terminos: "Términos y condiciones",
    privacidad: "Política de privacidad",
    imagen: "Uso de la imagen (fotos y vídeos)",
    "aviso-legal": "Aviso legal",
    cookies: "Política de cookies",
  };

  const ahora = new Date().toISOString();
  const { data: proximasDatos } = await supabase
    .from("reservas")
    .select("id, sesiones_clase!inner(empieza_en, estado, tipos_clase(nombre))")
    .eq("user_id", id)
    .eq("estado", "reservada")
    .eq("sesiones_clase.estado", "programada")
    .gt("sesiones_clase.empieza_en", ahora);
  const proximas = ((proximasDatos ?? []) as unknown as Reserva[]).sort((a, b) =>
    a.sesiones_clase.empieza_en.localeCompare(b.sesiones_clase.empieza_en),
  );

  const { data: pasadasDatos } = await supabase
    .from("reservas")
    .select("id, sesiones_clase!inner(empieza_en, estado, tipos_clase(nombre))")
    .eq("user_id", id)
    .eq("estado", "reservada")
    .eq("sesiones_clase.estado", "programada")
    .lte("sesiones_clase.empieza_en", ahora);
  const pasadas = ((pasadasDatos ?? []) as unknown as Reserva[])
    .sort((a, b) => b.sesiones_clase.empieza_en.localeCompare(a.sesiones_clase.empieza_en))
    .slice(0, 20);

  const servicios = [
    ...new Set([
      ...(p.perfil_servicios as { servicio: string }[]).map((s) => s.servicio),
      ...bonos.filter((b) => b.estado === "activo" || b.estado === "en_cola").map((b) => b.servicio),
    ]),
  ];
  const presencial = servicios.includes("grupal") || servicios.includes("individual") || asistencia.total_clases > 0;
  const online = servicios.includes("online");
  const nombre = [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";

  let foto: string | null = null;
  if (p.foto_path) {
    const { data: firmada } = await admin.storage.from("avatares").createSignedUrl(p.foto_path, 3600);
    foto = firmada?.signedUrl ?? null;
  }

  const maxMes = Math.max(1, ...asistencia.por_mes.map((m) => m.clases));

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>{nombre}</h1>
        <Link href="/admin/usuarios" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <Avatar nombre={nombre} url={foto} tamano={72} />
          <div>
            <strong style={{ fontSize: "1.15rem" }}>{nombre}</strong>
            <div className={estilos.etiquetas} style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "4px 0" }}>
              <span className={styles.etiquetaSuave}>{ROLES[p.rol] ?? p.rol}</span>
              {servicios.map((s) => (
                <span key={s} className={styles.etiquetaSuave}>
                  {SERVICIOS[s] ?? s}
                </span>
              ))}
            </div>
            <div className={styles.ayuda}>{p.email}</div>
            {p.telefono && <div className={styles.ayuda}>{p.telefono}</div>}
          </div>
        </div>
      </section>

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
            <dd>
              {p.contacto_emergencia_nombre
                ? `${p.contacto_emergencia_nombre} · ${p.contacto_emergencia_telefono ?? ""}`
                : "—"}
            </dd>
          </div>
          <div>
            <dt>Idioma</dt>
            <dd>{p.idioma === "en" ? "Inglés" : "Español"}</dd>
          </div>
        </dl>
        <details className={styles.detalles}>
          <summary>Cambiar tipo de cuenta y servicios</summary>
          <EditorPersona
            persona={{
              id: p.id,
              email: p.email ?? "",
              rol: p.rol,
              servicios: (p.perfil_servicios as { servicio: string }[]).map((s) => s.servicio),
            }}
          />
        </details>
      </section>

      {presencial && (
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

          <h3 style={{ margin: "8px 0 0" }}>Próximas reservas</h3>
          {proximas.length === 0 && <p className={styles.ayuda}>No tiene ninguna clase reservada.</p>}
          <ul className={styles.lista}>
            {proximas.map((r) => (
              <li key={r.id}>
                {textoDia(r.sesiones_clase.empieza_en)} · {textoHora(r.sesiones_clase.empieza_en)} ·{" "}
                {r.sesiones_clase.tipos_clase?.nombre}
              </li>
            ))}
          </ul>

          <details className={styles.detalles}>
            <summary>Historial de clases (últimas {pasadas.length})</summary>
            <ul className={styles.lista}>
              {pasadas.map((r) => (
                <li key={r.id}>
                  {fechaCorta(r.sesiones_clase.empieza_en)} · {textoHora(r.sesiones_clase.empieza_en)} ·{" "}
                  {r.sesiones_clase.tipos_clase?.nombre}
                </li>
              ))}
              {pasadas.length === 0 && <li className={styles.ayuda}>Todavía no ha venido a ninguna.</li>}
            </ul>
          </details>
          <p className={styles.ayuda}>
            «Ha venido» significa que tenía la clase reservada, no la canceló y la clase ya ha pasado.
          </p>
        </section>
      )}

      <section className={styles.tarjeta}>
        <h2>Bonos y pagos</h2>
        {bonos.length === 0 && <p className={styles.ayuda}>Todavía no tiene ningún bono.</p>}
        <ul className={styles.lista}>
          {bonos.map((b) => {
            const pago = b.pagos[0];
            return (
              <li key={b.id} className={styles.persona}>
                <div className={styles.personaCabecera}>
                  <div>
                    <strong>{b.tipos_bono?.nombre}</strong>
                    <div className={styles.ayuda}>
                      {b.servicio === "online" ? "Plan online" : `${b.clases_restantes} de ${b.clases_total} clases`}
                      {b.caduca_en && ` · caduca ${fechaCorta(b.caduca_en)}`}
                    </div>
                    {pago && (
                      <div className={styles.ayuda}>
                        {euros(pago.importe_centimos)}
                        {pago.descuento_centimos > 0 && ` (descuento −${euros(pago.descuento_centimos)})`} ·{" "}
                        {METODOS[pago.metodo] ?? pago.metodo} ·{" "}
                        {pago.estado === "pagado" ? "cobrado" : pago.estado === "pendiente" ? "PENDIENTE DE COBRO" : "anulado"}
                      </div>
                    )}
                  </div>
                  <span className={styles.etiquetaSuave}>{ESTADOS_BONO[b.estado] ?? b.estado}</span>
                </div>
                {(b.estado === "activo" || b.estado === "en_cola") && (
                  <>
                    <details>
                      <summary className={styles.ayuda}>Cambiar fecha de inicio</summary>
                      <InicioBono userId={p.id} bonoId={b.id} />
                    </details>
                    <EditorBono bonoId={b.id} anulado={false} />
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <Link href="/admin/bonos" className={`${styles.boton} ${styles.botonSecundario}`}>
          Registrar o cambiar bonos
        </Link>
        {presencial && (
          <details>
            <summary className={styles.ayuda}>Clases que ya hizo antes de entrar en la app</summary>
            <ClasesHechas userId={p.id} tipos={tiposClase} />
          </details>
        )}
      </section>

      <section className={styles.tarjeta}>
        <h2>Textos legales que aceptó ({aceptaciones.length})</h2>
        {aceptaciones.length === 0 && <p className={styles.ayuda}>Todavía no ha aceptado ningún texto legal.</p>}
        {aceptaciones.length > 0 && (
          <>
            <a href={`/admin/usuarios/${p.id}/aceptaciones`} download className={styles.boton}>
              Descargar PDF de lo último que aceptó
            </a>
            <p className={styles.ayuda}>Incluye la última versión que aceptó de cada documento, con su texto completo y el día y la hora.</p>
          </>
        )}
        {aceptaciones.map((a) => {
          const texto = textoLegal.get(`${a.tipo}|${a.version}`);
          const cuando = new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(a.aceptado_en));
          return (
            <details key={`${a.tipo}-${a.version}-${a.aceptado_en}`} className={styles.detalles}>
              <summary>
                {TITULO_ACEPTACION[a.tipo] ?? a.tipo} · versión {a.version}
                {a.tipo === "imagen" && a.concedido === false ? " · NO lo autorizó" : ""} · {cuando}
              </summary>
              {texto ? (
                <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.8rem" }}>{texto}</pre>
              ) : (
                <p className={styles.ayuda}>No se ha guardado el texto de esta versión, solo que la aceptó el {cuando}.</p>
              )}
            </details>
          );
        })}
      </section>

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

      <section className={styles.tarjeta}>
        <h2>Medidas</h2>
        <Medidas userId={p.id} soloLectura />
      </section>

      <section className={styles.tarjeta}>
        <h2>Tests de Aprende</h2>
        <HistorialExamen intentos={intentos} t={{ ...textosAprende.es, sinIntentos: "Todavía no ha hecho ningún examen." }} idioma="es" />
      </section>

      <section className={styles.tarjeta}>
        <h2>Notas privadas</h2>
        <Notas userId={p.id} texto={nota?.texto ?? ""} />
      </section>

      {p.rol !== "admin" && (
        <section className={styles.tarjeta}>
          <h2>Eliminar usuario</h2>
          <EliminarUsuario userId={p.id} nombre={nombre} />
        </section>
      )}
    </main>
  );
}
