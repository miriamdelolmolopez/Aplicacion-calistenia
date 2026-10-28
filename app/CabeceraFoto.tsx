"use client";

import { usePathname } from "next/navigation";
import CamaraCard from "./CamaraCard";
import styles from "./cabeceraFoto.module.css";
import { useFotoCard } from "./useFotosCards";
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
  const clave = `cabecera:${usePathname()}`;
  const cambiada = useFotoCard(clave);
  return (
    <section className={styles.cabecera} style={{ backgroundImage: fondoFoto(foto, cambiada ?? propia) }}>
      <h1>{titulo}</h1>
      {subtitulo && <p>{subtitulo}</p>}
      <CamaraCard clave={clave} />
    </section>
  );
}
