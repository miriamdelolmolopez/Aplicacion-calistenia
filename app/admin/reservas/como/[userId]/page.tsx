import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { colorDeTipo } from "@/lib/colores";
import { claveDia, instanteMadrid, sumarDias, textoDia, textoHora } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import Avatar from "../../../../Avatar";
import FotoAmpliable from "../../../../FotoAmpliable";
import styles from "../../../admin.module.css";
import estilos from "../../reservas.module.css";
import TiraSemana from "../../TiraSemana";
import ClasesComo, { type ClaseComo } from "./ClasesComo";
import CabeceraAdmin from "../../../CabeceraAdmin";

export const metadata = { title: "Reservar en nombre de una persona · Administración" };

type Fila = {
  id: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  tipos_clase: { nombre: string; color: string | null; servicio: string } | null;
  reservas: { id: string; estado: string; user_id: string; asistencia: "asistio" | "no_asistio" | null; profiles: { nombre: string | null; apellidos: string | null; email: string | null; foto_path: string | null } | null }[];
};

export default async function ReservarComo({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ dia?: string }>;
}) {
  await requireAdmin("reservas");
  const { userId } = await params;
  const { dia: diaPedido } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(userId)) notFound();

  const admin = createAdminClient();
  const { data: perfil } = await admin
    .from("profiles")
    .select("nombre, apellidos, email, rol, foto_path")
    .eq("id", userId)
    .maybeSingle();
  if (!perfil || perfil.rol === "admin") notFound();
  const nombre = [perfil.nombre, perfil.apellidos].filter(Boolean).join(" ") || perfil.email || "(sin nombre)";

  const hoy = claveDia(new Date().toISOString());
  const dia = diaPedido && /^\d{4}-\d{2}-\d{2}$/.test(diaPedido) ? diaPedido : hoy;
  const desde = instanteMadrid(dia, "00:00")?.toISOString() ?? new Date().toISOString();
  const hasta = instanteMadrid(sumarDias(dia, 1), "00:00")?.toISOString() ?? desde;

  const [{ data: sesiones }, { data: bonos }, firmada, { data: serviciosPerfil }, { data: bonosServicio }] = await Promise.all([
    admin
      .from("sesiones_clase")
      .select("id, tipo_id, empieza_en, plazas, estado, tipos_clase(nombre, color, servicio), reservas(id, estado, user_id, asistencia, profiles(nombre, apellidos, email, foto_path))")
      .gte("empieza_en", desde)
      .lt("empieza_en", hasta)
      .order("empieza_en"),
    admin.from("bonos").select("tipos_bono(nombre)").eq("user_id", userId).eq("estado", "activo"),
    perfil.foto_path ? admin.storage.from("avatares").createSignedUrl(perfil.foto_path, 3600) : Promise.resolve({ data: null }),
    admin.from("perfil_servicios").select("servicio").eq("user_id", userId),
    admin.from("bonos").select("servicio").eq("user_id", userId).in("estado", ["activo", "en_cola"]),
  ]);

  // Solo se puede reservar lo que la persona tiene contratado (igual que ve ella el calendario).
  const servicios = new Set([...(serviciosPerfil ?? []), ...(bonosServicio ?? [])].map((x) => x.servicio as string));
  const incluidoPara = (servicio: string) =>
    perfil.rol === "alumno" ? servicios.has(servicio) || (servicios.size === 0 && servicio === "grupal") : servicio === "grupal" || servicios.has(servicio);

  // Fotos de quienes están apuntados este día.
  const rutasFoto = [...new Set(((sesiones ?? []) as unknown as Fila[]).flatMap((s) => s.reservas.map((r) => r.profiles?.foto_path).filter((p): p is string => !!p)))];
  const { data: firmadas } = rutasFoto.length ? await admin.storage.from("avatares").createSignedUrls(rutasFoto, 3600) : { data: [] };
  const fotoDe = (ruta: string | null | undefined) => (ruta ? (firmadas ?? []).find((x) => x.path === ruta)?.signedUrl ?? null : null);
  const foto = firmada.data?.signedUrl ?? null;
  const tarifas = ((bonos ?? []) as unknown as { tipos_bono: { nombre: string } | null }[])
    .map((b) => b.tipos_bono?.nombre)
    .filter((n): n is string => !!n);

  const clases: ClaseComo[] = ((sesiones ?? []) as unknown as Fila[]).map((s) => {
    const mia = s.reservas.find((r) => r.user_id === userId && (r.estado === "reservada" || r.estado === "cancelada_tarde"));
    return {
      id: s.id,
      pasada: new Date(s.empieza_en).getTime() <= new Date().getTime(),
      hora: textoHora(s.empieza_en),
      nombre: s.tipos_clase?.nombre ?? "",
      color: colorDeTipo(s.tipos_clase?.color, s.tipos_clase?.nombre ?? ""),
      plazas: s.plazas,
      ocupadas: s.reservas.filter((r) => r.estado === "reservada").length,
      cancelada: s.estado === "cancelada",
      reserva: mia ? { id: mia.id, estado: mia.estado as "reservada" | "cancelada_tarde" } : null,
      incluido: incluidoPara(s.tipos_clase?.servicio ?? "grupal"),
      apuntados: s.reservas
        .filter((r) => r.estado === "reservada" || r.estado === "cancelada_tarde")
        .map((r) => ({
          reservaId: r.id,
          userId: r.user_id,
          estado: r.estado as "reservada" | "cancelada_tarde",
          asistencia: r.asistencia,
          nombre: [r.profiles?.nombre, r.profiles?.apellidos].filter(Boolean).join(" ") || r.profiles?.email || "Sin nombre",
          foto: fotoDe(r.profiles?.foto_path),
        })),
    };
  });

  const ruta = `/admin/reservas/como/${userId}`;

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Reservar como {perfil.nombre ?? "el/la alumno/a"}</h1>
        <Link href={`/admin/reservas?dia=${dia}`} className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <div className={estilos.cabeceraPersona}>
        <FotoAmpliable nombre={nombre} url={foto} tamano={72} />
        <div>
          <strong>{nombre}</strong>
          <div>Tarifa: {tarifas.length > 0 ? tarifas.join(" + ") : "sin bono activo"}</div>
          <Link href={`/admin/usuarios/${userId}`} className={styles.enlaceTexto}>
            Ver su perfil
          </Link>
        </div>
      </div>

      <div className={estilos.reservandoPor}>
        <Avatar nombre={nombre} url={foto} tamano={32} />
        <span>
          RESERVANDO POR <strong>{perfil.nombre ?? nombre}</strong>. Lo que hagas aquí cuenta como si lo hiciera ella.
        </span>
      </div>

      <TiraSemana dia={dia} hoy={hoy} ruta={ruta} />
      <p className={styles.ayuda} style={{ margin: "0 0 12px" }}>
        {dia === hoy ? "Hoy" : textoDia(desde)}
      </p>

      <ClasesComo userId={userId} clases={clases} dia={dia} />
    </main>
  );
}
