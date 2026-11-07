"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import { guardarPreferenciaApp, obtenerPreferenciasApp } from "../../notificaciones/acciones";
import ActivarPush from "./ActivarPush";
import DiasEntreno from "./DiasEntreno";
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

// Los mismos avisos, pero dentro de la app y en el móvil (campana y notificaciones del teléfono). Se activan o desactivan aparte del correo.
type OpcionApp = { clave: string; es: [string, string]; en: [string, string] };
const APP_ALUMNA: OpcionApp[] = [
  { clave: "reserva", es: ["Confirmación de reserva", "Cada vez que reservas una clase."], en: ["Booking confirmation", "Each time you book a class."] },
  { clave: "cancelacion", es: ["Cancelación de reserva", "Cada vez que cancelas una reserva."], en: ["Booking cancellation", "Each time you cancel a booking."] },
  { clave: "recordatorio", es: ["Recordatorio de clase", "El día antes de tu clase."], en: ["Class reminder", "The day before your class."] },
  { clave: "entreno_dia", es: ["Hoy toca entrenamiento", "Los días de entreno online que hayas elegido."], en: ["Today is a training day", "On the online training days you have chosen."] },
  { clave: "bono", es: ["Tu tarifa está a punto de caducar", "Unos días antes de que caduque."], en: ["Your pass is about to expire", "A few days before it expires."] },
  { clave: "bono_clases", es: ["Se te acaban las clases", "Cuando se te agotan las clases de tu tarifa."], en: ["You are running out of classes", "When you use up the classes in your pass."] },
  { clave: "inactividad", es: ["Llevas tiempo sin venir", "Un mensaje si pasa mucho tiempo sin que vengas."], en: ["You have been away for a while", "A message if you have not come in a long time."] },
  { clave: "cumpleanos", es: ["Felicitación de cumpleaños", "El día de tu cumpleaños."], en: ["Birthday greeting", "On your birthday."] },
  { clave: "mensaje", es: ["Mensajes de Miriam", "Por ejemplo, después de tu clase de prueba."], en: ["Messages from Miriam", "For example, after your trial class."] },
  { clave: "anuncio", es: ["Anuncios del tablón", "Cuando Miriam publica un anuncio nuevo."], en: ["Notice board", "When Miriam posts a new notice."] },
];
const APP_ADMIN: OpcionApp[] = [
  { clave: "admin_reserva", es: ["Alguien reserva una clase", "Cada vez que una persona se apunta a una clase."], en: ["Someone books a class", "Each time a person signs up for a class."] },
  { clave: "admin_cancelacion", es: ["Alguien cancela una reserva", "Cada vez que una persona cancela su reserva."], en: ["Someone cancels a booking", "Each time a person cancels."] },
  { clave: "admin_minimo", es: ["Una clase no llega al mínimo", "24 horas antes, si hay menos personas que el mínimo."], en: ["A class is below the minimum", "24 hours before, if fewer people than the minimum."] },
  { clave: "admin_regalos", es: ["Cumpleaños", "Cada día que alguien cumple años."], en: ["Birthdays", "Each day someone has a birthday."] },
  { clave: "admin_borrado", es: ["Petición de borrado de cuenta", "Cuando una persona pide que se borre su cuenta."], en: ["Account deletion request", "When a person asks for their account to be deleted."] },
  { clave: "admin_tarea", es: ["Tareas de tus automatizaciones", "Cuando una automatización te deja una tarea (por ejemplo, escribir a alguien)."], en: ["Tasks from your automations", "When an automation leaves you a task (for example, writing to someone)."] },
];

function AvisosApp({ esAdmin, en }: { esAdmin: boolean; en: boolean }) {
  const [prefs, setPrefs] = useState<Record<string, boolean> | null>(null);
  const idioma = en ? "en" : "es";
  const lista = esAdmin ? APP_ADMIN : APP_ALUMNA;

  useEffect(() => {
    let vigente = true;
    obtenerPreferenciasApp().then((p) => vigente && setPrefs(p));
    return () => {
      vigente = false;
    };
  }, []);

  async function cambiarApp(clave: string, valor: boolean) {
    setPrefs((p) => ({ ...(p ?? {}), [clave]: valor }));
    await guardarPreferenciaApp(clave, valor);
  }

  if (!prefs) return null;
  return (
    <section className={`${styles.tarjeta} ${estilos.seccion}`}>
      <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{en ? "In the app and on your phone" : "En la app y en el móvil"}</h2>
      <p className={styles.ayuda}>{en ? "The same notices, as notifications in the app (bell) and on your phone. They do not depend on email." : "Los mismos avisos, como notificaciones dentro de la app (campana) y en el móvil. No dependen del correo."}</p>
      <ActivarPush />
      {lista.map((o) => (
        <label key={o.clave} className={estilos.interruptor}>
          <input type="checkbox" checked={prefs[o.clave] !== false} onChange={(e) => cambiarApp(o.clave, e.target.checked)} />
          <span>
            <strong>{o[idioma][0]}</strong>
            <br />
            <small>{o[idioma][1]}</small>
          </span>
        </label>
      ))}
    </section>
  );
}

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
      {pref && <AvisosApp esAdmin={esAdmin} en={en} />}
      {pref && !esAdmin && <DiasEntreno en={en} />}
    </main>
  );
}
