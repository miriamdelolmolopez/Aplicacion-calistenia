"use client";

import { useState } from "react";
import { cancelarClase } from "../admin/clases/acciones";
import styles from "../admin/admin.module.css";

// Para la administradora: cancela una clase entera, devuelve su clase a toda la gente apuntada y, si quiere, alarga sus bonos.
export default function CancelarClaseAdmin({
  sesionId,
  personas,
  alTerminar,
  sinBoton,
  etiqueta = "Cancelar la clase",
}: {
  sesionId: string;
  personas: number;
  alTerminar: () => void;
  sinBoton?: boolean; // el formulario ya sale abierto y el botón lo pone quien lo usa
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(!!sinBoton);
  const [trabajando, setTrabajando] = useState(false);
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTrabajando(true);
    const r = await cancelarClase({}, new FormData(e.currentTarget));
    setTrabajando(false);
    setMensaje({ texto: r.error ?? r.mensaje ?? "", error: !!r.error });
    if (!r.error) alTerminar();
  }

  return (
    <div style={sinBoton ? undefined : { marginTop: 10 }}>
      {!sinBoton && (
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} aria-expanded={abierto} onClick={() => setAbierto((a) => !a)}>
          {abierto ? "Cerrar" : etiqueta}
        </button>
      )}
      {abierto && (
        <form onSubmit={enviar} className={styles.formularioInterno}>
          <input type="hidden" name="sesionId" value={sesionId} />
          <p className={styles.ayuda}>
            Se devolverá su clase a {personas === 1 ? "la persona apuntada" : `las ${personas} personas apuntadas`} y se les avisará por correo.
          </p>
          <div className={styles.campo}>
            <label htmlFor={`cc-motivo-${sesionId}`}>Motivo (opcional)</label>
            <input id={`cc-motivo-${sesionId}`} name="motivo" maxLength={200} />
          </div>
          <div className={styles.campo}>
            <label htmlFor={`cc-dias-${sesionId}`}>¿Cuántos días alargas su bono?</label>
            <input id={`cc-dias-${sesionId}`} name="dias" type="number" min={0} max={60} defaultValue={0} />
            <span className={styles.ayuda}>0 = no alargar. Por lluvia, tu política es 7 días.</span>
          </div>
          <button className={styles.boton} type="submit" disabled={trabajando}>
            {trabajando ? "Cancelando…" : "Cancelar y devolver las clases"}
          </button>
        </form>
      )}
      {mensaje && (
        <p className={mensaje.error ? styles.error : styles.aviso} role={mensaje.error ? "alert" : "status"}>
          {mensaje.texto}
        </p>
      )}
    </div>
  );
}
