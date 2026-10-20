"use client";

import { useRouter } from "next/navigation";
import styles from "./formularios.module.css";

// Enlace «← Volver» subrayado que vuelve a la pantalla anterior (o a la dirección indicada si se abrió directamente).
export default function VolverAtras({ texto = "Volver", alternativa = "/" }: { texto?: string; alternativa?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={styles.enlaceBarra}
      style={{ background: "none", border: 0, font: "inherit", fontWeight: 600, cursor: "pointer" }}
      onClick={() => (window.history.length > 1 ? router.back() : router.push(alternativa))}
    >
      ← {texto}
    </button>
  );
}
