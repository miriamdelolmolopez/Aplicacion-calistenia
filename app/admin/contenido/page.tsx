import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import GaleriaFotos from "../fotos/GaleriaFotos";
import Frases, { type Frase } from "../frases/Frases";
import styles from "../admin.module.css";
import CabeceraAdmin from "../CabeceraAdmin";

export const metadata = { title: "Fotos y frases · Administración" };

export default async function Contenido() {
  const { supabase } = await requireAdmin("contenido");

  const { data: fotosApp } = await supabase.from("fotos_app").select("clave, url");
  const { data: frasesDatos } = await supabase
    .from("frases_inicio")
    .select("id, texto_es, texto_en, activa")
    .order("creada_en");
  const fotosDe = (base: string) => (fotosApp ?? []).filter((f) => f.clave === base || f.clave.startsWith(`${base}:`)).sort((a, b) => a.clave.localeCompare(b.clave));

  return (
    <main className={styles.pagina}>
      <CabeceraAdmin>
        <h1>Fotos y frases</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Volver
        </Link>
      </CabeceraAdmin>

      <section className={styles.tarjeta}>
        <h2>Fotos de la app</h2>
        <p className={styles.ayuda}>Las fotos de cada clase, rutina y ejercicio se cambian en su pantalla. En Portada y en el saludo de Inicio puedes poner varias: sale una al azar cada vez.</p>
        <strong>Portada</strong>
        <GaleriaFotos destino="portada" fotos={fotosDe("portada")} />
        <strong>Saludo de Inicio</strong>
        <GaleriaFotos destino="inicio" fotos={fotosDe("inicio")} />
      </section>

      <Frases frases={(frasesDatos ?? []) as Frase[]} />
    </main>
  );
}
