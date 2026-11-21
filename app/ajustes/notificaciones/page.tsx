"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import { guardarPreferenciaApp, obtenerPreferenciasApp } from "../../notificaciones/acciones";
import ActivarPush from "./ActivarPush";
import Cargando from "../../Cargando";
import Interruptor from "../Interruptor";
import estilos from "../ajustesTarjetas.module.css";
import { useIdioma } from "../../useIdioma";
import { usePreferencias, type Clave } from "../usePreferencias";

// Cada tipo de aviso sale una sola vez. Al lado van sus canales: correo (sobre) y app/móvil (campana).
// Un canal que no existe para ese aviso no se dibuja. Si el aviso es obligatorio, sus iconos van siempre en azul.
type Aviso = {
  correo?: Clave;
  app?: string;
  obligatorio?: boolean;
  es: [string, string];
  en: [string, string];
};

const AVISOS_ALUMNA: Aviso[] = [
  { correo: "avisos_reserva", app: "reserva", es: ["Confirmación de reserva", "Cada vez que reservas una clase."], en: ["Booking confirmation", "Each time you book a class."] },
  { correo: "avisos_cancelacion", app: "cancelacion", es: ["Cancelación de reserva", "Cada vez que cancelas una reserva, diciéndote si se te devuelve la clase."], en: ["Booking cancellation", "Each time you cancel a booking, telling you whether the class is returned to you."] },
  { correo: "avisos_recordatorio", app: "recordatorio", es: ["Recordatorio de clase", "El día antes de tu clase."], en: ["Class reminder", "The day before your class."] },
  { app: "entreno_dia", es: ["Hoy toca entrenamiento", "Los días de entreno online que hayas elegido en la sección Entrenamiento."], en: ["Today is a training day", "On the online training days you chose in the Training section."] },
  { correo: "avisos_bono", app: "bono", es: ["Tu tarifa está a punto de caducar", "Unos días antes de que caduque."], en: ["Your pass is about to expire", "A few days before it expires."] },
  { correo: "avisos_bono_clases", app: "bono_clases", es: ["Se te acaban las clases", "Cuando se te agotan las clases de tu tarifa."], en: ["You are running out of classes", "When you use up the classes in your pass."] },
  { correo: "avisos_inactividad", app: "inactividad", es: ["Llevas tiempo sin venir", "Un mensaje de Miriam si pasa mucho tiempo sin que vengas."], en: ["You have been away for a while", "A message from Miriam if you have not come in a long time."] },
  { correo: "avisos_cumpleanos", app: "cumpleanos", es: ["Felicitación de cumpleaños", "El día de tu cumpleaños, con un regalo."], en: ["Birthday greeting", "On your birthday, with a gift."] },
  { app: "mensaje", es: ["Mensajes de Miriam", "Por ejemplo, después de tu clase de prueba."], en: ["Messages from Miriam", "For example, after your trial class."] },
  { app: "anuncio", es: ["Anuncios del tablón", "Cuando Miriam publica un anuncio nuevo."], en: ["Notice board", "When Miriam posts a new notice."] },
  { obligatorio: true, es: ["Clase cancelada", "Si Miriam cancela una clase en la que estás apuntado/a."], en: ["Class cancelled", "If Miriam cancels a class you are signed up for."] },
  { obligatorio: true, es: ["Plaza liberada", "Cuando se libera una plaza en una clase en la que estás en lista de espera."], en: ["Spot opened up", "When a spot opens in a class you are on the waiting list for."] },
  { obligatorio: true, es: ["Aniversario", "Cuando cumples un tiempo con nosotras."], en: ["Anniversary", "When you reach a milestone with us."] },
];

// Lo que recibe la administradora: no tiene reservas ni bono propios, así que sus avisos son otros.
const AVISOS_ADMIN: Aviso[] = [
  { correo: "admin_avisa_reserva", app: "admin_reserva", es: ["Alguien reserva una clase", "Cada vez que una persona se apunta a una clase."], en: ["Someone books a class", "Each time a person signs up for a class."] },
  { correo: "admin_avisa_cancelacion", app: "admin_cancelacion", es: ["Alguien cancela una reserva", "Cada vez que una persona cancela su reserva, y si la clase se le devuelve o no."], en: ["Someone cancels a booking", "Each time a person cancels, and whether the class is returned to them."] },
  { correo: "admin_avisa_minimo", app: "admin_minimo", es: ["Una clase no llega al mínimo", "24 horas antes, si hay menos personas que el mínimo."], en: ["A class is below the minimum", "24 hours before, if fewer people than the minimum."] },
  { correo: "admin_avisa_regalos", app: "admin_regalos", es: ["Cumpleaños", "Cada día que alguien cumple años: quién es, cuántos cumple y qué se le regala."], en: ["Birthdays", "Each day someone has a birthday: who it is, how old they turn and what gift they get."] },
  { correo: "admin_avisa_caducan", app: "admin_caducan", es: ["Tarifas y bonos a punto de caducar", "Cada día, si a alguien le quedan pocos días de tarifa o bono. Los días los eliges en Administración."], en: ["Plans and passes about to expire", "Each day, if someone has few days left on a plan or pass. You choose the number of days in Administration."] },
  { correo: "admin_avisa_borrado", app: "admin_borrado", es: ["Petición de borrado de cuenta", "Cuando una persona pide que se borre su cuenta."], en: ["Account deletion request", "When a person asks for their account to be deleted."] },
  { app: "admin_tarea", es: ["Tareas de tus automatizaciones", "Cuando una automatización te deja una tarea (por ejemplo, escribir a alguien)."], en: ["Tasks from your automations", "When an automation leaves you a task (for example, writing to someone)."] },
];

export default function Notificaciones() {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const { pref, cambiar } = usePreferencias();
  const [app, setApp] = useState<Record<string, boolean> | null>(null);
  const esAdmin = pref?.rol === "admin";
  const avisos = esAdmin ? AVISOS_ADMIN : AVISOS_ALUMNA;

  useEffect(() => {
    let vigente = true;
    obtenerPreferenciasApp().then((p) => vigente && setApp(p));
    return () => {
      vigente = false;
    };
  }, []);

  async function cambiarApp(clave: string, valor: boolean) {
    setApp((p) => ({ ...(p ?? {}), [clave]: valor }));
    await guardarPreferenciaApp(clave, valor);
  }

  const titulo = esAdmin ? (en ? "Client activity" : "Actividad de tus clientes") : en ? "Your notices" : "Tus avisos";
  const ayuda = esAdmin
    ? en
      ? "Choose how you want to be notified about what your clients do."
      : "Elige cómo quieres recibir avisos sobre lo que hacen tus clientes."
    : en
      ? "Choose how you want to receive each notice."
      : "Elige cómo quieres recibir cada aviso.";

  return (
    <main className={estilos.pagina}>
      {!esAdmin && <BarraSuperior izquierda={{ href: "/ajustes", texto: "volver" }} />}
      {!pref || !app ? (
        <Cargando />
      ) : (
        <>
          <ActivarPush />
          <section className={estilos.grupo}>
            <h2 className={estilos.titulo}>{titulo}</h2>
            <p className={estilos.ayuda}>{ayuda}</p>
            <div className={estilos.tarjeta}>
              <div className={estilos.cabeceraColumnas}>
                <span className={estilos.columna}>{en ? "Email" : "Correo electrónico"}</span>
                <span className={estilos.columna}>{en ? "Push" : "Móvil"}</span>
              </div>
              {avisos.map((o) => (
                <div key={o.es[0]} className={estilos.fila}>
                  <span className={estilos.etiqueta}>
                    {o[en ? "en" : "es"][0]}
                    {o.obligatorio ? ` · ${en ? "required" : "obligatorio"}` : ""}
                    <span className={estilos.descripcion}>{o[en ? "en" : "es"][1]}</span>
                  </span>
                  <span className={estilos.canales}>
                    <span className={estilos.canal}>
                      {o.correo || o.obligatorio ? (
                        <Interruptor
                          nombre={en ? "Email" : "Correo electrónico"}
                          activo={o.obligatorio ? true : pref[o.correo!]}
                          fijo={o.obligatorio}
                          alCambiar={() => o.correo && cambiar(o.correo, !pref[o.correo])}
                        />
                      ) : null}
                    </span>
                    <span className={estilos.canal}>
                      {o.app ? <Interruptor nombre={en ? "Push" : "Móvil"} activo={app[o.app] !== false} alCambiar={() => cambiarApp(o.app!, app[o.app!] === false)} /> : null}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
