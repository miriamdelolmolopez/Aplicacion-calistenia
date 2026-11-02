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

// Lo que recibe la administradora: no tiene reservas ni bono propios, así que sus avisos son otros.
const OPCIONES_ADMIN: { clave: Clave; es: [string, string]; en: [string, string] }[] = [
  { clave: "admin_avisa_reserva", es: ["Alguien reserva una clase", "Un correo cada vez que una persona se apunta a una clase."], en: ["Someone books a class", "An email each time a person signs up for a class."] },
  { clave: "admin_avisa_cancelacion", es: ["Alguien cancela una reserva", "Un correo cada vez que una persona cancela su reserva, y si la clase se le devuelve o no."], en: ["Someone cancels a booking", "An email each time a person cancels, and whether the class is returned to them."] },
  { clave: "admin_avisa_minimo", es: ["Una clase no llega al mínimo", "Un correo cuando, 24 horas antes, una clase tiene menos personas que el mínimo."], en: ["A class is below the minimum", "An email when, 24 hours before, a class has fewer people than the minimum."] },
  { clave: "admin_avisa_regalos", es: ["Videollamada de cumpleaños pendiente", "Cuando alguien que cumple años tiene de regalo una videollamada."], en: ["Birthday video call pending", "When someone whose birthday it is gets a video call as a gift."] },
  { clave: "admin_avisa_borrado", es: ["Petición de borrado de cuenta", "Cuando una persona pide que se borre su cuenta."], en: ["Account deletion request", "When a person asks for their account to be deleted."] },
];

export default function Notificaciones() {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const { pref, cambiar } = usePreferencias();
  const esAdmin = pref?.rol === "admin";
  const opciones = esAdmin ? OPCIONES_ADMIN : OPCIONES;

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/ajustes", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 8px", fontSize: "2rem" }}>{en ? "Notifications" : "Notificaciones"}</h1>
      <p className={styles.ayuda}>{en ? "Choose which emails you want to receive." : "Elige qué correos quieres recibir."}</p>
      {!pref ? (
        <Cargando />
      ) : (
        <section className={`${styles.tarjeta} ${estilos.seccion}`}>
          {opciones.map((o) => (
            <label key={o.clave} className={estilos.interruptor}>
              <input type="checkbox" checked={pref[o.clave]} onChange={(e) => cambiar(o.clave, e.target.checked)} />
              <span>
                <strong>{o[idioma][0]}</strong>
                <br />
                <small>{o[idioma][1]}</small>
              </span>
            </label>
          ))}
          {!esAdmin && (
            <p className={styles.ayuda}>
              {en ? "Important notices (a spot opened up or a class cancelled) are always sent." : "Los avisos importantes (plaza liberada y clase cancelada) se envían siempre."}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
