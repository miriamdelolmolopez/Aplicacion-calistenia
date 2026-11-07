"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../admin.module.css";
import { quitarRespuesta, type RespuestaAnuncio } from "./acciones";

const TEXTO = { voy: "Se apunta", no_puedo: "No puede ir", pensar: "Lo está pensando" } as const;

// La lista completa y privada de quién ha contestado a un anuncio, con la opción de quitar a alguien.
export default function ApuntadosAnuncio({ anuncioId, lista, maxPlazas }: { anuncioId: string; lista: RespuestaAnuncio[]; maxPlazas: number | null }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const voy = lista.filter((r) => r.respuesta === "voy").length;

  async function quitar(userId: string) {
    setOcupado(userId);
    await quitarRespuesta(anuncioId, userId);
    setOcupado(null);
    router.refresh();
  }

  return (
    <div style={{ marginTop: 10 }}>
      <strong>
        Apuntados: {voy}
        {maxPlazas ? ` de ${maxPlazas} plazas` : ""}
      </strong>
      {lista.length === 0 ? (
        <p className={styles.ayuda}>Todavía no ha contestado nadie.</p>
      ) : (
        <ul className={styles.lista}>
          {(["voy", "pensar", "no_puedo"] as const).flatMap((tipo) =>
            lista
              .filter((r) => r.respuesta === tipo)
              .map((r) => (
                <li key={r.userId} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <span>
                    {r.nombre} · <span className={styles.ayuda}>{TEXTO[r.respuesta]}</span>
                  </span>
                  <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={ocupado === r.userId} onClick={() => quitar(r.userId)}>
                    Quitar
                  </button>
                </li>
              )),
          )}
        </ul>
      )}
    </div>
  );
}
