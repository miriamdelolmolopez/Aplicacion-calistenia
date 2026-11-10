"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import { guardarPreferenciaApp, obtenerPreferenciasApp } from "../../notificaciones/acciones";
import ActivarPush from "./ActivarPush";
import Cargando from "../../Cargando";
import styles from "../../formularios.module.css";
import estilos from "../../perfil/perfil.module.css";
import { useIdioma } from "../../useIdioma";
import { usePreferencias, type Clave } from "../usePreferencias";

// Cada tipo de aviso sale una sola vez. Al lado van sus canales: correo (✉) y app/móvil (🔔).
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

function Icono({ tipo }: { tipo: "correo" | "campana" }) {
  const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  return tipo === "correo" ? (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  ) : (
    <svg {...base}>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8" />
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
    </svg>
  );
}

// Círculo con un icono: azul si está activado, gris si no. Se pulsa para cambiarlo.
function Canal({ icono, nombre, activo, fijo, alCambiar }: { icono: "correo" | "campana"; nombre: string; activo: boolean; fijo?: boolean; alCambiar?: () => void }) {
  return (
    <button
      type="button"
      onClick={fijo ? undefined : alCambiar}
      disabled={fijo}
      aria-pressed={activo}
      aria-label={`${nombre}: ${activo ? "on" : "off"}`}
      title={nombre}
      style={{
        width: 42,
        height: 42,
        flex: "none",
        borderRadius: "50%",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: fijo ? "default" : "pointer",
        border: `2px solid ${activo ? "#0aa8c0" : "var(--linea)"}`,
        background: activo ? "#0aa8c0" : "#e4e2dc",
        color: activo ? "#fff" : "#8a8984",
        opacity: fijo ? 0.9 : 1,
      }}
    >
      <Icono tipo={icono} />
    </button>
  );
}

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

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/ajustes", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 8px", fontSize: "2rem" }}>{en ? "Notifications" : "Notificaciones"}</h1>
      <p className={styles.ayuda}>
        {en
          ? "Choose how you want to receive each notice. ✉ is email and 🔔 is the app and your phone. Blue is on, grey is off. Press to change."
          : "Elige cómo quieres recibir cada aviso. ✉ es el correo y 🔔 es la app y el móvil. Azul es activado y gris desactivado. Pulsa para cambiarlo."}
      </p>
      {!pref || !app ? (
        <Cargando />
      ) : (
        <>
          <section className={`${styles.tarjeta} ${estilos.seccion}`}>
            <ActivarPush />
            {avisos.map((o) => (
              <div key={o.es[0]} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                <span>
                  <strong>
                    {o[en ? "en" : "es"][0]}
                    {o.obligatorio ? ` · ${en ? "required" : "obligatorio"}` : ""}
                  </strong>
                  <br />
                  <small>{o[en ? "en" : "es"][1]}</small>
                </span>
                <span style={{ display: "flex", gap: 8 }}>
                  {(o.correo || o.obligatorio) && (
                    <Canal
                      icono="correo"
                      nombre={en ? "Email" : "Correo"}
                      activo={o.obligatorio ? true : pref[o.correo!]}
                      fijo={o.obligatorio}
                      alCambiar={() => o.correo && cambiar(o.correo, !pref[o.correo])}
                    />
                  )}
                  {o.app && (
                    <Canal
                      icono="campana"
                      nombre={en ? "App and phone" : "App y móvil"}
                      activo={app[o.app] !== false}
                      alCambiar={() => cambiarApp(o.app!, app[o.app!] === false)}
                    />
                  )}
                </span>
              </div>
            ))}
          </section>
        </>
      )}
    </main>
  );
}
