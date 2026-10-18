import styles from "./cabeceraFoto.module.css";
import { fondoFoto, type FotoNombre } from "@/lib/fotos";

// Título de pantalla sobre una foto grande (con degradado de color si la foto no está).
export default function CabeceraFoto({
  foto,
  titulo,
  subtitulo,
  propia,
}: {
  foto: FotoNombre;
  titulo: string;
  subtitulo?: string;
  propia?: string | null;
}) {
  return (
    <section className={styles.cabecera} style={{ backgroundImage: fondoFoto(foto, propia) }}>
      <h1>{titulo}</h1>
      {subtitulo && <p>{subtitulo}</p>}
    </section>
  );
}
