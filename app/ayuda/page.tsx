"use client";

import { useState } from "react";
import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
import styles from "../formularios.module.css";
import { useIdioma } from "../useIdioma";
import estilos from "./ayuda.module.css";

type Pregunta = { s: string; p: string; r: string };

// Las carpetas en que se agrupan las preguntas.
const SECCIONES: { id: string; es: string; en: string }[] = [
  { id: "presenciales", es: "Clases presenciales", en: "In-person classes" },
  { id: "bonos", es: "Bonos y pagos", en: "Passes and payments" },
  { id: "online", es: "Entrenamiento online", en: "Online coaching" },
  { id: "cuenta", es: "Mi cuenta", en: "My account" },
  { id: "app", es: "La app", en: "The app" },
];

const PREGUNTAS: Record<"es" | "en", Pregunta[]> = {
  es: [
    {
      s: "presenciales",
      p: "¿Cómo reservo una clase?",
      r: "Entra en «Reservar», elige el día y pulsa «Reservar» en la clase que quieras. Necesitas un bono activo con clases disponibles. Si es tu primera vez, tienes una clase de prueba gratis (solo grupales).",
    },
    {
      s: "presenciales",
      p: "¿Cómo cancelo una reserva?",
      r: "En «Reservar» o en «Mis reservas», pulsa «Cancelar» en la clase. Si cancelas con tiempo, la clase vuelve a tu bono. Si es demasiado tarde (grupales: menos de 2 horas antes; individuales: menos de 12 horas antes), la clase cuenta como dada. La app te avisa antes de confirmar.",
    },
    {
      s: "presenciales",
      p: "¿Qué es la lista de espera?",
      r: "Si una clase está llena, puedes apuntarte a la lista de espera. Si alguien cancela, la plaza pasa a la primera persona de la lista y te avisamos por correo.",
    },
    {
      s: "presenciales",
      p: "¿Cómo funciona la clase de prueba gratis?",
      r: "Es una única clase grupal gratuita para quien nunca ha venido. Reserva desde «Reservar» con tu cuenta nueva. Para seguir entrenando, Miriam te activará un bono.",
    },
    {
      s: "bonos",
      p: "¿Cuándo caduca mi bono y cuántas clases me quedan?",
      r: "Lo ves en «Inicio», en la tarjeta «Tu bono», con las clases restantes y la fecha de caducidad. También te avisamos por correo cuando esté a punto de caducar.",
    },
    {
      s: "bonos",
      p: "¿Cómo pago?",
      r: "Se paga por adelantado en efectivo o por Bizum (los entrenamientos online también por transferencia). Cuando Miriam recibe el pago, activa tu bono y ya puedes reservar. Tus pagos están en «Pagos».",
    },
    {
      s: "online",
      p: "¿Cómo hago un entrenamiento online?",
      r: "Entra en «Entreno», elige la sesión de tu rutina y pulsa «Empezar». Ve marcando las series según las haces y, al terminar, pulsa «Finalizar». Tu progreso se guarda solo.",
    },
    {
      s: "online",
      p: "¿Qué es el RPE?",
      r: "Es el esfuerzo que has sentido en una serie, de 1 (muy fácil) a 10 (máximo). Es opcional: apúntalo si quieres que Miriam sepa cómo te ha ido.",
    },
    {
      s: "cuenta",
      p: "¿Cómo cambio mi contraseña?",
      r: "En «Perfil», pulsa «Cambiar contraseña». Te pedimos la actual y la nueva dos veces. Si no recuerdas la actual, en la pantalla de entrar pulsa «¿Has olvidado tu contraseña?».",
    },
    {
      s: "cuenta",
      p: "¿Cómo cambio mis datos?",
      r: "En «Perfil» → «Mis datos». El DNI solo lo puede cambiar Miriam: escríbele por WhatsApp.",
    },
    {
      s: "app",
      p: "¿Cómo instalo la app en mi móvil?",
      r: "iPhone: abre la app en Safari, pulsa el botón de compartir y elige «Añadir a pantalla de inicio». Android: abre la app en Chrome, pulsa el menú de tres puntos y elige «Instalar aplicación» o «Añadir a pantalla de inicio».",
    },
    {
      s: "app",
      p: "No me llegan los correos",
      r: "Mira en la carpeta de spam o correo no deseado y marca el mensaje como seguro. Los correos salen de una dirección de miriamdelolmo.com. Si sigue sin llegar, escribe a Miriam.",
    },
    {
      s: "cuenta",
      p: "¿Cómo retiro mi autorización de imagen o borro mi cuenta?",
      r: "En «Ajustes»: puedes quitar la autorización de uso de tu imagen en cualquier momento y pedir el borrado de tu cuenta. Miriam lo gestionará.",
    },
  ],
  en: [
    {
      s: "presenciales",
      p: "How do I book a class?",
      r: "Go to “Book”, pick the day and tap “Book” on the class you want. You need an active pass with classes left. If it is your first time, you get one free trial class (group classes only).",
    },
    {
      s: "presenciales",
      p: "How do I cancel a booking?",
      r: "In “Book” or “My bookings”, tap “Cancel” on the class. If you cancel in time, the class goes back to your pass. If it is too late (group classes: less than 2 hours before; private sessions: less than 12 hours before), the class counts as taken. The app warns you before you confirm.",
    },
    {
      s: "presenciales",
      p: "What is the waiting list?",
      r: "If a class is full you can join the waiting list. If someone cancels, the place goes to the first person on the list and we let you know by email.",
    },
    {
      s: "presenciales",
      p: "How does the free trial class work?",
      r: "It is one free group class for people who have never attended. Book it from “Book” with your new account. To keep training, Miriam will activate a pass for you.",
    },
    {
      s: "bonos",
      p: "When does my pass expire and how many classes are left?",
      r: "You can see it on “Home”, in the “Your pass” card, with the classes left and the expiry date. We also email you when it is about to expire.",
    },
    {
      s: "bonos",
      p: "How do I pay?",
      r: "Payment is in advance, in cash or by Bizum (online coaching can also be paid by bank transfer). When Miriam receives the payment she activates your pass and you can book. Your payments are under “Payments”.",
    },
    {
      s: "online",
      p: "How do I do an online workout?",
      r: "Go to “Training”, choose a session from your routine and tap “Start”. Tick the sets as you do them and tap “Finish” at the end. Your progress is saved automatically.",
    },
    {
      s: "online",
      p: "What is RPE?",
      r: "It is how hard a set felt, from 1 (very easy) to 10 (maximum effort). It is optional: add it if you want Miriam to know how it went.",
    },
    {
      s: "cuenta",
      p: "How do I change my password?",
      r: "In “Profile”, tap “Change password”. We ask for your current one and the new one twice. If you do not remember it, tap “Forgot your password?” on the login screen.",
    },
    {
      s: "cuenta",
      p: "How do I change my details?",
      r: "In “Profile” → “My details”. Only Miriam can change your ID number: message her on WhatsApp.",
    },
    {
      s: "app",
      p: "How do I install the app on my phone?",
      r: "iPhone: open the app in Safari, tap the share button and choose “Add to Home Screen”. Android: open the app in Chrome, tap the three-dot menu and choose “Install app” or “Add to Home screen”.",
    },
    {
      s: "app",
      p: "I am not receiving emails",
      r: "Check your spam or junk folder and mark the message as safe. Emails come from a miriamdelolmo.com address. If they still do not arrive, message Miriam.",
    },
    {
      s: "cuenta",
      p: "How do I withdraw my image authorisation or delete my account?",
      r: "In “Settings”: you can withdraw the authorisation to use your image at any time and request the deletion of your account. Miriam will take care of it.",
    },
  ],
};

export default function Ayuda() {
  const [idioma] = useIdioma();
  const preguntas = PREGUNTAS[idioma];
  // Solo una carpeta y una pregunta abiertas a la vez.
  const [carpeta, setCarpeta] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<string | null>(null);

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />
      <CabeceraFoto foto="inicio" titulo={idioma === "en" ? "Help" : "Ayuda"} />
      <p className={styles.ayuda}>
        {idioma === "en" ? "Frequently asked questions. Tap one to see the answer." : "Preguntas frecuentes. Pulsa una para ver la respuesta."}
      </p>
      <div className={estilos.lista}>
        {SECCIONES.map((sec) => {
          const items = preguntas.filter((q) => q.s === sec.id);
          if (items.length === 0) return null;
          const abiertaCarpeta = carpeta === sec.id;
          return (
            <section key={sec.id} className={estilos.carpeta}>
              <button
                type="button"
                className={estilos.carpetaCab}
                aria-expanded={abiertaCarpeta}
                onClick={() => {
                  setCarpeta(abiertaCarpeta ? null : sec.id);
                  setAbierta(null);
                }}
              >
                <svg className={estilos.carpetaIcono} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                </svg>
                <span className={estilos.carpetaNombre}>{sec[idioma]}</span>
                <span className={estilos.contador}>{items.length}</span>
                <span className={`${estilos.flecha} ${abiertaCarpeta ? estilos.flechaAbierta : ""}`} aria-hidden="true">
                  ›
                </span>
              </button>
              {abiertaCarpeta && (
                <div className={estilos.carpetaCuerpo}>
                  {items.map((q) => (
                    <details key={q.p} className={estilos.pregunta} open={abierta === q.p}>
                      <summary
                        onClick={(e) => {
                          e.preventDefault();
                          setAbierta(abierta === q.p ? null : q.p);
                        }}
                      >
                        {q.p}
                      </summary>
                      <p>{q.r}</p>
                    </details>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <section className={estilos.contacto}>
        <h2>{idioma === "en" ? "Still need help?" : "¿Sigues con dudas?"}</h2>
        <p>
          {idioma === "en"
            ? "Message Miriam on WhatsApp, Monday to Friday, 08:00 to 17:00."
            : "Escribe a Miriam por WhatsApp, de lunes a viernes, de 08:00 a 17:00."}
        </p>
        <a className={styles.boton} href="https://wa.me/34644184762" target="_blank" rel="noopener noreferrer">
          WhatsApp
        </a>
      </section>
    </main>
  );
}
