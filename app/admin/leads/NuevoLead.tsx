"use client";

import { useActionState } from "react";
import styles from "../admin.module.css";
import { useEnvio } from "../useEnvio";
import estilos from "./leads.module.css";
import { crearLead } from "./acciones";
import SelectorEtiquetas from "./SelectorEtiquetas";
import SelectorTipo from "./SelectorTipo";
import type { ItemColor } from "./tipos";

// Formulario para crear un lead a mano.
export default function NuevoLead({ etiquetas, tipos, destinos, alCerrar }: { etiquetas: ItemColor[]; tipos: ItemColor[]; destinos: string[]; alCerrar: () => void }) {
  const [estado, accion, pendiente] = useActionState(crearLead, {});
  const { ref, alEnviar } = useEnvio(accion, estado, true);

  return (
    <section className={`${styles.tarjeta} ${estilos.panelNuevo}`}>
      <h2>Crear lead</h2>
      <form ref={ref} onSubmit={alEnviar} className={estilos.formulario}>
        <div className={styles.campo}>
          <label htmlFor="nl-nombre">Nombre *</label>
          <input id="nl-nombre" name="nombre" required maxLength={80} />
        </div>
        <div className={styles.campo}>
          <label htmlFor="nl-apellidos">Apellidos</label>
          <input id="nl-apellidos" name="apellidos" maxLength={120} />
        </div>
        <div className={styles.campo}>
          <label htmlFor="nl-telefono">Teléfono</label>
          <input id="nl-telefono" name="telefono" type="tel" maxLength={30} />
        </div>
        <div className={styles.campo}>
          <label htmlFor="nl-email">Email *</label>
          <input id="nl-email" name="email" type="email" required maxLength={200} />
        </div>
        <SelectorTipo id="nl-tipo" tipos={tipos} inicial={null} />
        <div className={styles.campo}>
          <label htmlFor="nl-destino">Origen</label>
          <input id="nl-destino" name="destino" defaultValue="Manual" maxLength={120} list="nl-destinos" />
          <datalist id="nl-destinos">
            {destinos.filter((d) => d !== "Manual").map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div className={styles.campo}>
          <label htmlFor="nl-pais">País</label>
          <input id="nl-pais" name="pais" maxLength={60} />
        </div>
        <div className={styles.campo}>
          <label htmlFor="nl-idioma">Idioma *</label>
          <select id="nl-idioma" name="idioma" defaultValue="es">
            <option value="es">Español (ES)</option>
            <option value="en">English (EN)</option>
          </select>
        </div>
        <div className={`${styles.campo} ${estilos.ancho2}`}>
          <span className={estilos.etiquetaCampo}>Etiquetas</span>
          <SelectorEtiquetas etiquetas={etiquetas} iniciales={[]} />
        </div>
        <div className={`${styles.campo} ${estilos.ancho2}`}>
          <label htmlFor="nl-notas">Notas del lead</label>
          <input id="nl-notas" name="notas" maxLength={4000} />
        </div>
        {estado.error && <p className={`${styles.error} ${estilos.ancho}`}>{estado.error}</p>}
        {estado.mensaje && <p className={`${styles.aviso} ${estilos.ancho}`}>{estado.mensaje}</p>}
        <div className={`${estilos.acciones} ${estilos.ancho}`}>
          <button type="submit" className={styles.boton} disabled={pendiente}>
            {pendiente ? "Creando…" : "Crear lead"}
          </button>
          <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={alCerrar}>
            Cerrar
          </button>
        </div>
      </form>
    </section>
  );
}
