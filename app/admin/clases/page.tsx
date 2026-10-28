import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import styles from "../admin.module.css";
import BotonFoto from "../fotos/BotonFoto";
import ListaTipos from "./ListaTipos";

export const metadata = { title: "Tipos de clase · Administración" };

type Tipo = {
  id: string;
  nombre: string;
  plazas_max: number;
  minimo_alumnos: number;
  plazas_prueba: number;
  duracion_min: number;
  activo: boolean;
  servicio: string;
  foto_url: string | null;
  color: string | null;
  color_texto: string | null;
  orden: number;
  lista_espera: boolean;
  reserva_dias_max: number | null;
  cancelacion_horas: number | null;
  creditos: number;
  descripcion: string | null;
  descripcion_en: string | null;
};
export default async function AdminClases() {
  const { supabase } = await requireAdmin();

  const { data: tiposDatos } = await supabase
    .from("tipos_clase")
    .select("id, nombre, plazas_max, minimo_alumnos, plazas_prueba, duracion_min, activo, servicio, foto_url, color, color_texto, orden, lista_espera, reserva_dias_max, cancelacion_horas, creditos, descripcion, descripcion_en")
    .order("orden")
    .order("nombre");
  const tipos = (tiposDatos ?? []) as Tipo[];

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Tipos de clase</h1>
        <Link href="/admin/presenciales" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <h2>Tipos de clase</h2>
        <p className={styles.ayuda}>
          Aquí cambias el nombre, las plazas, el mínimo y la duración de cada tipo, o lo desactivas. El
          mínimo es solo un aviso para ti (0 = sin aviso). Los cambios afectan a las clases que crees a
          partir de ahora. Los horarios (plantillas) están en{" "}
          <Link href="/admin/horarios">Plantillas presenciales</Link>.
        </p>
        <ListaTipos
          tipos={tipos}
          fotos={Object.fromEntries(tipos.map((t) => [t.id, <BotonFoto key={t.id} destino="tipo_clase" id={t.id} actual={t.foto_url} />]))}
        />
      </section>
    </main>
  );
}
