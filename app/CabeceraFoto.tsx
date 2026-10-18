import styles from "./cabeceraFoto.module.css";
import { fondoFoto, type FotoNombre } from "@/lib/fotos";

// Título de pantalla sobre una foto grande (con degradado de color si la foto no está).
export default function CabeceraFoto({
  foto,
  titulo,
  subtitulo,
}: {
  foto: FotoNombre;
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <section className={styles.cabecera} style={{ backgroundImage: fondoFoto(foto) }}>
      <h1>{titulo}</h1>
      {subtitulo && <p>{subtitulo}</p>}
    </section>
  );
}
