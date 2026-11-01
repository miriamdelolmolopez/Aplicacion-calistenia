"use client";

import { useState } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import Nuevo from "../comunes/Nuevo";
import { crearAutomatizacion } from "./acciones";
import estilos from "./automatizaciones.module.css";

type Disponible = { clave: string; titulo: string; cuando: string; queHace: string };

function Lista({ disponibles, cerrar }: { disponibles: Disponible[]; cerrar: () => void }) {
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [estado, setEstado] = useState<Estado>({});

  async function anadir(clave: string) {
    setTrabajando(clave);
    setEstado({});
    const r = await crearAutomatizacion(clave);
    setTrabajando(null);
    setEstado(r);
    if (!r.error) setTimeout(cerrar, 900);
  }

  return (
    <div className={styles.tarjeta}>
      {disponibles.length === 0 ? (
        <p className={styles.ayuda}>Ya has añadido todas las plantillas que hay.</p>
      ) : (
        <>
          <p className={styles.ayuda}>Elige una plantilla. Se añade apagada y con un texto de ejemplo que puedes cambiar, y verás a quién le llegaría antes de activarla.</p>
          {disponibles.map((d) => (
            <div key={d.clave} className={estilos.plantilla}>
              <h3>{d.titulo}</h3>
              <p>{d.cuando}</p>
              <p>{d.queHace}</p>
              <button type="button" className={styles.boton} disabled={trabajando !== null} onClick={() => anadir(d.clave)}>
                {trabajando === d.clave ? "Añadiendo…" : "Añadir"}
              </button>
            </div>
          ))}
        </>
      )}
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      {estado.mensaje && (
        <p className={styles.aviso} role="status">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}

export default function NuevaAutomatizacion({ disponibles }: { disponibles: Disponible[] }) {
  return (
    <div>
      <Nuevo etiqueta="Nueva" titulo="Nueva automatización" render={(cerrar) => <Lista disponibles={disponibles} cerrar={cerrar} />} />
    </div>
  );
}
