import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { colorDeTipo } from "@/lib/colores";
import { claveDia, instanteMadrid, sumarDias, textoDia, textoHora } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import Avatar from "../../../../Avatar";
import styles from "../../../admin.module.css";
import estilos from "../../reservas.module.css";
import TiraSemana from "../../TiraSemana";
import ClasesComo, { type ClaseComo } from "./ClasesComo";

export const metadata = { title: "Reservar en nombre de una persona · Administración" };

type Fila = {
  id: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  tipos_clase: { nombre: string; color: string | null } | null;
  reservas: { id: string; estado: string; user_id: string }[];
};

export default async function ReservarComo({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ dia?: string }>;
}) {
  await requireAdmin();
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

  const [{ data: sesiones }, { data: bonos }, firmada] = await Promise.all([
    admin
      .from("sesiones_clase")
      .select("id, empieza_en, plazas, estado, tipos_clase(nombre, color), reservas(id, estado, user_id)")
      .gte("empieza_en", desde)
      .lt("empieza_en", hasta)
      .order("empieza_en"),
    admin.from("bonos").select("tipos_bono(nombre)").eq("user_id", userId).eq("estado", "activo"),
    perfil.foto_path ? admin.storage.from("avatares").createSignedUrl(perfil.foto_path, 3600) : Promise.resolve({ data: null }),
  ]);
  const foto = firmada.data?.signedUrl ?? null;
  const tarifas = ((bonos ?? []) as unknown as { tipos_bono: { nombre: string } | null }[])
    .map((b) => b.tipos_bono?.nombre)
    .filter((n): n is string => !!n);

  const clases: ClaseComo[] = ((sesiones ?? []) as unknown as Fila[]).map((s) => {
    const mia = s.reservas.find((r) => r.user_id === userId && (r.estado === "reservada" || r.estado === "cancelada_tarde"));
    return {
      id: s.id,
      hora: textoHora(s.empieza_en),
      nombre: s.tipos_clase?.nombre ?? "",
      color: colorDeTipo(s.tipos_clase?.color, s.tipos_clase?.nombre ?? ""),
      plazas: s.plazas,
      ocupadas: s.reservas.filter((r) => r.estado === "reservada").length,
      cancelada: s.estado === "cancelada",
      reserva: mia ? { id: mia.id, estado: mia.estado as "reservada" | "cancelada_tarde" } : null,
    };
  });

  const ruta = `/admin/reservas/como/${userId}`;

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Reservar como {perfil.nombre ?? "la alumna"}</h1>
        <Link href={`/admin/reservas?dia=${dia}`} className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <div className={estilos.cabeceraPersona}>
        <Avatar nombre={nombre} url={foto} tamano={72} />
        <div>
          <strong>{nombre}</strong>
          <div>Tarifa: {tarifas.length > 0 ? tarifas.join(" + ") : "sin bono activo"}</div>
          <Link href={`/admin/usuarios/${userId}`} className={styles.enlaceBarra}>
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

      <ClasesComo userId={userId} clases={clases} />
    </main>
  );
}
