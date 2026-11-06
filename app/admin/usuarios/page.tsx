import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import ListaUsuarios, { type Usuario } from "./ListaUsuarios";
import { formasActivas } from "@/lib/formasPago";
import NuevoUsuario, { type DescuentoOpcion, type TarifaOpcion } from "./NuevoUsuario";
import CabeceraAdmin from "../CabeceraAdmin";
import { claveDia, textoHora } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { esSuelto, nombreVisible } from "@/lib/regalos";

export const metadata = { title: "Usuarios · Administración" };

type Fila = Omit<Usuario, "tarifa_sin_clases" | "sueltas" | "foto" | "tarifas" | "tarifa_desde" | "tarifa_hasta" | "pendiente_cobro" | "clases_usadas" | "clases_total" | "online_usados" | "online_total"> & { foto_path: string | null };

export default async function Usuarios({ searchParams }: { searchParams: Promise<{ nuevo?: string; archivadas?: string }> }) {
  const { nuevo, archivadas } = await searchParams;
  const verArchivadas = archivadas === "1";
  const { supabase } = await requireAdmin("usuarios");

  const { data } = await supabase.rpc("resumen_usuarios");
  // Las administradoras no salen en el resumen: se piden aparte para poner su tarjeta. Los datos nuevos (coach, también alumna)
  // se piden en otra consulta, para que la pantalla funcione aunque falte ejecutar el archivo 067 en Supabase.
  const { data: administradoras } = await createAdminClient().from("profiles").select("id, nombre, apellidos, email, foto_path, creado_en").eq("rol", "admin").order("nombre");
  const { data: tiposDatos } = await createAdminClient().from("profiles").select("id, es_coach, tambien_alumno, fue_alumno");
  const tipos = new Map(((tiposDatos ?? []) as { id: string; es_coach: boolean | null; tambien_alumno?: boolean | null; fue_alumno?: boolean | null }[]).map((t) => [t.id, t]));
  const etiquetasDe = (id: string, rol: string): string[] => {
    const t = tipos.get(id);
    const e: string[] = [];
    if (rol === "admin") e.push("Administradora");
    if (rol === "alumno" || (rol === "admin" && t?.tambien_alumno)) e.push("Alumno/a");
    else if (rol === "invitado") e.push("Invitado/a");
    else if (rol === "exalumno" || (rol !== "archivado" && t?.fue_alumno)) e.push("Exalumno/a");
    if (t?.es_coach || rol === "coach") e.push("Coach");
    return e;
  };
  // Las personas archivadas no salen en la lista normal; con «Ver archivadas» salen solo ellas.
  const todas = (data ?? []) as Fila[];
  const hayArchivadas = todas.some((f) => f.rol === "archivado");
  const conexiones = new Map<string, string | null>();
  if (!verArchivadas) {
    for (const a of administradoras ?? []) {
      const { data: cuenta } = await createAdminClient().auth.admin.getUserById(a.id);
      conexiones.set(a.id, cuenta.user?.last_sign_in_at ?? null);
    }
  }
  const filasAdmin: Fila[] = verArchivadas
    ? []
    : (administradoras ?? []).map((a) => ({
        id: a.id,
        email: a.email,
        nombre: a.nombre,
        apellidos: a.apellidos,
        rol: "admin",
        foto_path: a.foto_path,
        creado_en: a.creado_en,
        ultima_conexion: conexiones.get(a.id) ?? null,
        servicios: [],
        clases_restantes: null,
        bono_caduca: null,
        plan_online_hasta: null,
        proxima_clase: null,
        ultima_clase: null,
        clases_mes: 0,
        entrenos_mes: 0,
        ultimo_entreno: null,
      }));
  const filas = [...filasAdmin, ...todas.filter((f) => (f.rol === "archivado") === verArchivadas)];

  // Fotos (privadas): enlaces temporales solo para esta pantalla.
  const rutas = filas.map((f) => f.foto_path).filter((r): r is string => !!r);
  const { data: firmadas } = rutas.length
    ? await createAdminClient().storage.from("avatares").createSignedUrls(rutas, 3600)
    : { data: [] };

  // Antes de mostrar las tarifas se pone al día lo que ya ha caducado o se ha agotado.
  await createAdminClient().rpc("refrescar_bonos");

  // Tarifa (bono) activa de cada persona, para filtrar y mostrar.
  const { data: bonosActivos } = await createAdminClient()
    .from("bonos")
    .select("user_id, servicio, estado, clases_total, clases_restantes, activo_desde, caduca_en, tipos_bono(nombre)")
    .in("estado", ["activo", "agotado", "en_cola"]);
  const sueltasDe = new Map<string, number>(); // clases sueltas (regalos) que le quedan, aparte de la tarifa
  const tarifasDe = new Map<string, string[]>();
  const periodoDe = new Map<string, { desde: string | null; hasta: string | null }>();
  const clasesDe = new Map<string, { usadas: number; total: number }>();
  const onlineDe = new Map<string, { usados: number; total: number }>();
  const conClasesDe = new Set<string>(); // personas con algún bono al que todavía le quedan clases
  const ahoraMs = new Date().getTime();
  for (const b of (bonosActivos ?? []) as unknown as { user_id: string; servicio: string; estado: string; clases_total: number; clases_restantes: number; activo_desde: string | null; caduca_en: string | null; tipos_bono: { nombre: string } | null }[]) {
    // Las clases sueltas van aparte de la tarifa: se cuentan solas y no entran en sus clases usadas/total.
    if (esSuelto(b.tipos_bono?.nombre)) {
      if (b.estado !== "agotado" && b.clases_restantes > 0) {
        sueltasDe.set(b.user_id, (sueltasDe.get(b.user_id) ?? 0) + b.clases_restantes);
        if (b.estado === "activo") conClasesDe.add(b.user_id);
        const nombre = nombreVisible(b.tipos_bono?.nombre);
        if (!(tarifasDe.get(b.user_id) ?? []).includes(nombre)) tarifasDe.set(b.user_id, [...(tarifasDe.get(b.user_id) ?? []), nombre]);
      }
      continue;
    }
    if (b.estado === "en_cola") continue;
    // Un bono agotado que todavía está dentro de su fecha cuenta para las clases que lleva, pero no es una tarifa activa.
    if (b.estado === "agotado" && !(b.caduca_en && new Date(b.caduca_en).getTime() > ahoraMs)) continue;
    if (b.servicio === "online") {
      // Plan online: días que lleva del total (desde que empezó hasta que acaba).
      if (b.activo_desde && b.caduca_en) {
        const total = Math.max(1, Math.round((new Date(b.caduca_en).getTime() - new Date(b.activo_desde).getTime()) / 86400000));
        const usados = Math.min(total, Math.max(0, Math.floor((ahoraMs - new Date(b.activo_desde).getTime()) / 86400000)));
        const antes = onlineDe.get(b.user_id) ?? { usados: 0, total: 0 };
        onlineDe.set(b.user_id, { usados: antes.usados + usados, total: antes.total + total });
      }
    } else {
      const antes = clasesDe.get(b.user_id) ?? { usadas: 0, total: 0 };
      clasesDe.set(b.user_id, { usadas: antes.usadas + (b.clases_total - b.clases_restantes), total: antes.total + b.clases_total });
    }
    // Una tarifa con todas las clases gastadas pero todavía dentro de sus fechas sigue vigente: cuenta como tarifa de la persona.
    if (!b.tipos_bono) continue;
    if (b.estado === "activo") conClasesDe.add(b.user_id);
    if (!(tarifasDe.get(b.user_id) ?? []).includes(b.tipos_bono.nombre)) tarifasDe.set(b.user_id, [...(tarifasDe.get(b.user_id) ?? []), b.tipos_bono.nombre]);
    const actual = periodoDe.get(b.user_id) ?? { desde: null, hasta: null };
    periodoDe.set(b.user_id, {
      desde: b.activo_desde && (!actual.desde || b.activo_desde < actual.desde) ? b.activo_desde : actual.desde,
      hasta: b.caduca_en && (!actual.hasta || b.caduca_en > actual.hasta) ? b.caduca_en : actual.hasta,
    });
  }

  // Lo que cada persona tiene pendiente de pagar.
  const { data: pendientesDatos } = await createAdminClient().from("pagos").select("user_id, importe_centimos").eq("estado", "pendiente");
  const pendienteDe = new Map<string, number>();
  for (const x of (pendientesDatos ?? []) as { user_id: string | null; importe_centimos: number }[]) {
    if (x.user_id) pendienteDe.set(x.user_id, (pendienteDe.get(x.user_id) ?? 0) + x.importe_centimos);
  }

  const [{ data: tarifasDatos }, { data: descuentosDatos }] = await Promise.all([
    createAdminClient()
      .from("tipos_bono")
      .select("id, nombre, servicio, precio_centimos, validez_dias")
      .eq("activo", true)
      .order("servicio")
      .order("precio_centimos"),
    createAdminClient().from("descuentos").select("id, nombre, tipo, valor, caduca_en, usos_max, pagos(estado)").eq("activo", true).order("nombre"),
  ]);
  const tarifas = (tarifasDatos ?? []) as TarifaOpcion[];

  // Para el alta con tarifa: hoy, la hora de ahora y los descuentos que se pueden elegir (activos, sin caducar y con usos libres).
  const ahoraIso = new Date().toISOString();
  const hoy = claveDia(ahoraIso);
  const ahora = textoHora(ahoraIso);
  const descuentos: DescuentoOpcion[] = ((descuentosDatos ?? []) as unknown as { id: string; nombre: string; tipo: string; valor: number; caduca_en: string | null; usos_max: number | null; pagos: { estado: string }[] }[])
    .filter((d) => (d.caduca_en === null || d.caduca_en >= hoy) && (d.usos_max === null || d.pagos.filter((x) => x.estado !== "anulado").length < d.usos_max))
    .map((d) => ({ id: d.id, tipo: d.tipo, valor: d.valor, texto: `${d.nombre} · ${d.tipo === "porcentaje" ? `${d.valor} %` : euros(d.valor)}` }));

  const usuarios: Usuario[] = filas.map(({ foto_path, ...resto }) => ({
    ...resto,
    etiquetas: etiquetasDe(resto.id, resto.rol),
    sueltas: sueltasDe.get(resto.id) ?? 0,
    tarifa_sin_clases: (tarifasDe.get(resto.id) ?? []).length > 0 && !conClasesDe.has(resto.id),
    clases_usadas: clasesDe.get(resto.id)?.usadas ?? 0,
    clases_total: clasesDe.get(resto.id)?.total ?? 0,
    online_usados: onlineDe.get(resto.id)?.usados ?? 0,
    online_total: onlineDe.get(resto.id)?.total ?? 0,
    tarifas: tarifasDe.get(resto.id) ?? [],
    tarifa_desde: periodoDe.get(resto.id)?.desde ?? null,
    tarifa_hasta: periodoDe.get(resto.id)?.hasta ?? null,
    pendiente_cobro: pendienteDe.get(resto.id) ?? 0,
    foto: foto_path ? (firmadas?.find((f) => f.path === foto_path)?.signedUrl ?? null) : null,
  }));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Usuarios</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>
      <NuevoUsuario tarifas={tarifas} descuentos={descuentos} hoy={hoy} ahora={ahora} formas={await formasActivas()} abiertoInicial={nuevo === "1"} />
      <p style={{ margin: "0 0 12px" }}>
        {verArchivadas ? (
          <Link href="/admin/usuarios" className={styles.enlaceBarra}>
            ← Volver a las personas activas
          </Link>
        ) : (
          hayArchivadas && (
            <Link href="/admin/usuarios?archivadas=1" className={styles.enlaceBarra}>
              Ver personas archivadas
            </Link>
          )
        )}
      </p>
      <ListaUsuarios usuarios={usuarios} />
    </main>
  );
}
