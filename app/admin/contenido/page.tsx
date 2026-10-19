import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import BotonFoto from "../fotos/BotonFoto";
import Frases, { type Frase } from "../frases/Frases";
import styles from "../admin.module.css";

export const metadata = { title: "Fotos y frases · Administración" };

export default async function Contenido() {
  const { supabase } = await requireAdmin();

  const { data: fotosApp } = await supabase.from("fotos_app").select("clave, url");
  const { data: frasesDatos } = await supabase
    .from("frases_inicio")
    .select("id, texto_es, texto_en, activa")
    .order("creada_en");
  const fotoApp = (clave: string) => fotosApp?.find((f) => f.clave === clave)?.url ?? null;

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Fotos y frases</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <h2>Fotos de la app</h2>
        <p className={styles.ayuda}>Las fotos de cada clase, rutina y ejercicio se cambian en su pantalla.</p>
        <strong>Portada</strong>
        <BotonFoto destino="portada" actual={fotoApp("portada")} />
        <strong>Saludo de Inicio</strong>
        <BotonFoto destino="inicio" actual={fotoApp("inicio")} />
      </section>

      <Frases frases={(frasesDatos ?? []) as Frase[]} />
    </main>
  );
}
