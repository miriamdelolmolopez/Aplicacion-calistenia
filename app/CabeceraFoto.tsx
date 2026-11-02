import styles from "./cabeceraFoto.module.css";

// Título de pantalla (sin foto).
export default function CabeceraFoto({ titulo, subtitulo }: { titulo: string; subtitulo?: string }) {
  return (
    <section className={styles.cabecera}>
      <h1>{titulo}</h1>
      {subtitulo && <p>{subtitulo}</p>}
    </section>
  );
}
