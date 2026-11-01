"use client";

import BarraSuperior from "../../BarraSuperior";
import Cargando from "../../Cargando";
import styles from "../../formularios.module.css";
import estilos from "../../perfil/perfil.module.css";
import { useIdioma } from "../../useIdioma";
import { usePreferencias, type Clave } from "../usePreferencias";

const OPCIONES: { clave: Clave; es: [string, string]; en: [string, string] }[] = [
  { clave: "avisos_reserva", es: ["Confirmación de reservas", "Un correo cada vez que reservas o cancelas una clase."], en: ["Booking confirmations", "An email each time you book or cancel a class."] },
  { clave: "avisos_recordatorio", es: ["Recordatorio de clase", "Un aviso el día antes de tu clase."], en: ["Class reminder", "A notice the day before your class."] },
  { clave: "avisos_bono", es: ["Tu bono", "Cuando está a punto de caducar o se te acaban las clases."], en: ["Your pass", "When it is about to expire or you run out of classes."] },
  { clave: "avisos_novedades", es: ["Mensajes de Miriam", "Cuando llevas tiempo sin venir, aniversarios y novedades."], en: ["Messages from Miriam", "When you have been away for a while, anniversaries and news."] },
];

export default function Notificaciones() {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const { pref, cambiar } = usePreferencias();

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/ajustes", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 8px", fontSize: "2rem" }}>{en ? "Notifications" : "Notificaciones"}</h1>
      <p className={styles.ayuda}>{en ? "Choose which emails you want to receive." : "Elige qué correos quieres recibir."}</p>
      {!pref ? (
        <Cargando />
      ) : (
        <section className={`${styles.tarjeta} ${estilos.seccion}`}>
          {OPCIONES.map((o) => (
            <label key={o.clave} className={estilos.interruptor}>
              <input type="checkbox" checked={pref[o.clave]} onChange={(e) => cambiar(o.clave, e.target.checked)} />
              <span>
                <strong>{o[idioma][0]}</strong>
                <br />
                <small>{o[idioma][1]}</small>
              </span>
            </label>
          ))}
          <p className={styles.ayuda}>
            {en ? "Important notices (a spot opened up or a class cancelled) are always sent." : "Los avisos importantes (plaza liberada y clase cancelada) se envían siempre."}
          </p>
        </section>
      )}
    </main>
  );
}
