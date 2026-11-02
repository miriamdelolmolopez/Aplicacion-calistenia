import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { claveDia } from "@/lib/fechas";
import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";
import ListaTalleres, { type TallerFila } from "./ListaTalleres";

export const metadata = { title: "Talleres · Administración" };

type Fila = {
  id: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  modalidad: "presencial" | "online";
  ubicacion: string | null;
  enlace: string | null;
  tipos_clase: { nombre: string; duracion_min: number; servicio: string };
  reservas: { estado: string }[];
};

export default async function Talleres() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sesiones_clase")
    .select("id, empieza_en, plazas, estado, modalidad, ubicacion, enlace, tipos_clase!inner(nombre, duracion_min, servicio), reservas(estado)")
    .eq("tipos_clase.servicio", "taller")
    .order("empieza_en");

  const ahora = new Date().getTime();
  const filas: TallerFila[] = ((data ?? []) as unknown as Fila[]).map((s) => ({
    id: s.id,
    nombre: s.tipos_clase.nombre,
    empieza_en: s.empieza_en,
    dia: claveDia(s.empieza_en),
    duracion_min: s.tipos_clase.duracion_min,
    plazas: s.plazas,
    apuntados: s.reservas.filter((r) => r.estado === "reservada").length,
    cancelado: s.estado === "cancelada",
    pasado: new Date(s.empieza_en).getTime() <= ahora,
    modalidad: s.modalidad,
    ubicacion: s.ubicacion,
    enlace: s.enlace,
  }));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Talleres</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <p className={styles.ayuda}>
          Aquí creas los talleres y workshops, para gente externa o para tus alumnos/as. Para que alguien pueda apuntarse, dale de alta con el servicio
          «Talleres» y una tarifa de taller (o asígnale la tarifa sin cobrar, y marcas el pago cuando lo reciba). Se apuntan desde su calendario de reservas.
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            Falta ejecutar el archivo 064 en Supabase para poder usar los talleres.
          </p>
        ) : (
          <ListaTalleres proximos={filas.filter((t) => !t.pasado)} pasados={filas.filter((t) => t.pasado).reverse()} hoy={claveDia(new Date(ahora).toISOString())} />
        )}
      </section>
    </main>
  );
}
