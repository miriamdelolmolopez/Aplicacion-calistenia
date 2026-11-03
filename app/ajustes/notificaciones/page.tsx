"use client";

import BarraSuperior from "../../BarraSuperior";
import Cargando from "../../Cargando";
import styles from "../../formularios.module.css";
import estilos from "../../perfil/perfil.module.css";
import { useIdioma } from "../../useIdioma";
import { usePreferencias, type Clave } from "../usePreferencias";

// Cada tipo de correo tiene su propio interruptor.
const OPCIONES: { clave: Clave; es: [string, string]; en: [string, string] }[] = [
  { clave: "avisos_reserva", es: ["Confirmación de reserva", "Un correo cada vez que reservas una clase."], en: ["Booking confirmation", "An email each time you book a class."] },
  { clave: "avisos_cancelacion", es: ["Cancelación de reserva", "Un correo cada vez que cancelas una reserva, diciéndote si se te devuelve la clase."], en: ["Booking cancellation", "An email each time you cancel a booking, telling you whether the class is returned to you."] },
  { clave: "avisos_recordatorio", es: ["Recordatorio de clase", "Un aviso el día antes de tu clase."], en: ["Class reminder", "A notice the day before your class."] },
  { clave: "avisos_bono", es: ["Tu tarifa está a punto de caducar", "Un aviso unos días antes de que caduque."], en: ["Your pass is about to expire", "A notice a few days before it expires."] },
  { clave: "avisos_bono_clases", es: ["Se te acaban las clases", "Un aviso cuando se te agotan las clases de tu tarifa."], en: ["You are running out of classes", "A notice when you use up the classes in your pass."] },
  { clave: "avisos_inactividad", es: ["Llevas tiempo sin venir", "Un mensaje de Miriam si pasa mucho tiempo sin que vengas."], en: ["You have been away for a while", "A message from Miriam if you have not come in a long time."] },
  { clave: "avisos_cumpleanos", es: ["Felicitación de cumpleaños", "Un correo el día de tu cumpleaños, con un regalo."], en: ["Birthday greeting", "An email on your birthday, with a gift."] },
];

// Estos se mandan siempre: son importantes y no se pueden desactivar.
const OBLIGATORIAS: { es: [string, string]; en: [string, string] }[] = [
  { es: ["Clase cancelada", "Si Miriam cancela una clase en la que estás apuntado/a."], en: ["Class cancelled", "If Miriam cancels a class you are signed up for."] },
  { es: ["Plaza liberada", "Cuando se libera una plaza en una clase en la que estás en lista de espera."], en: ["Spot opened up", "When a spot opens in a class you are on the waiting list for."] },
  { es: ["Aniversario", "Cuando cumples un tiempo con nosotras."], en: ["Anniversary", "When you reach a milestone with us."] },
];

// Lo que recibe la administradora: no tiene reservas ni bono propios, así que sus avisos son otros.
const OPCIONES_ADMIN: { clave: Clave; es: [string, string]; en: [string, string] }[] = [
  { clave: "admin_avisa_reserva", es: ["Alguien reserva una clase", "Un correo cada vez que una persona se apunta a una clase."], en: ["Someone books a class", "An email each time a person signs up for a class."] },
  { clave: "admin_avisa_cancelacion", es: ["Alguien cancela una reserva", "Un correo cada vez que una persona cancela su reserva, y si la clase se le devuelve o no."], en: ["Someone cancels a booking", "An email each time a person cancels, and whether the class is returned to them."] },
  { clave: "admin_avisa_minimo", es: ["Una clase no llega al mínimo", "Un correo cuando, 24 horas antes, una clase tiene menos personas que el mínimo."], en: ["A class is below the minimum", "An email when, 24 hours before, a class has fewer people than the minimum."] },
  { clave: "admin_avisa_regalos", es: ["Cumpleaños", "Un correo cada día que alguien cumple años: quién es, cuántos cumple y qué se le regala."], en: ["Birthdays", "An email each day someone has a birthday: who it is, how old they turn and what gift they get."] },
  { clave: "admin_avisa_borrado", es: ["Petición de borrado de cuenta", "Cuando una persona pide que se borre su cuenta."], en: ["Account deletion request", "When a person asks for their account to be deleted."] },
];

export default function Notificaciones() {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const { pref, cambiar, cambiarVarios } = usePreferencias();
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
          {!esAdmin && (
            <label className={estilos.interruptor}>
              <input
                type="checkbox"
                checked={OPCIONES.every((o) => pref[o.clave])}
                onChange={(e) =>
                  cambiarVarios(
                    OPCIONES.map((o) => o.clave),
                    e.target.checked,
                  )
                }
              />
              <span>
                <strong>{en ? "All optional emails" : "Todos los correos opcionales"}</strong>
                <br />
                <small>{en ? "Turn all the optional emails below on or off at once." : "Activa o desactiva de una vez todos los correos opcionales de abajo."}</small>
              </span>
            </label>
          )}
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
            <>
              <p className={styles.ayuda} style={{ marginTop: 8 }}>
                {en ? "Always sent (they cannot be turned off):" : "Se envían siempre (no se pueden desactivar):"}
              </p>
              {OBLIGATORIAS.map((o) => (
                <label key={o.es[0]} className={estilos.interruptor}>
                  <input type="checkbox" checked disabled readOnly />
                  <span>
                    <strong>
                      {o[idioma][0]} · {en ? "required" : "obligatorio"}
                    </strong>
                    <br />
                    <small>{o[idioma][1]}</small>
                  </span>
                </label>
              ))}
            </>
          )}
        </section>
      )}
    </main>
  );
}
