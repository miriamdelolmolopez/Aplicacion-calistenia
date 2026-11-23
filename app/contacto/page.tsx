"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { useIdioma } from "../useIdioma";
import { SERVICIOS_INTERES } from "@/lib/leads";
import { emailValido } from "@/lib/validaciones";

// Formulario público: quien está interesado/a deja sus datos y aparece como «lead» en el panel.
export default function Contacto() {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [servicio, setServicio] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [web, setWeb] = useState(""); // campo trampa
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!nombre.trim() || !emailValido(email)) return setError(en ? "Please enter your name and a valid email." : "Escribe tu nombre y un correo válido.");
    if (!acepta) return setError(en ? "You need to accept the privacy policy." : "Tienes que aceptar la política de privacidad.");
    setCargando(true);
    try {
      const r = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, telefono, servicio, mensaje, web, acepta }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) throw new Error();
      setEnviado(true);
    } catch {
      setError(en ? "We couldn’t send it. Please try again." : "No se ha podido enviar. Inténtalo de nuevo.");
    }
    setCargando(false);
  }

  return (
    <main className={styles.pagina}>
      <div className={styles.fondoEntrar} aria-hidden="true" />
      <BarraSuperior izquierda={{ href: "/", texto: "volver" }} />
      <div className={styles.cabecera}>
        <h1>{enviado ? (en ? "Thank you!" : "¡Gracias!") : en ? "Tell us about you" : "Cuéntanos qué buscas"}</h1>
        <p>
          {enviado
            ? en
              ? "We have your details and we will get in touch soon."
              : "Hemos recibido tus datos y te escribiremos pronto."
            : en
              ? "Leave your details and we will contact you."
              : "Deja tus datos y te contactaremos."}
        </p>
      </div>

      {!enviado && (
        <form className={styles.tarjeta} onSubmit={enviar} noValidate>
          <div className={styles.campo}>
            <label htmlFor="c-nombre">{en ? "Name" : "Nombre"}</label>
            <input id="c-nombre" autoComplete="name" maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="c-email">{en ? "Email" : "Correo electrónico"}</label>
            <input id="c-email" type="email" autoComplete="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="c-tel">{en ? "Phone (optional)" : "Teléfono (opcional)"}</label>
            <input id="c-tel" type="tel" autoComplete="tel" maxLength={40} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>
          <div className={styles.campo}>
            <label htmlFor="c-serv">{en ? "What are you interested in?" : "¿Qué te interesa?"}</label>
            <select id="c-serv" value={servicio} onChange={(e) => setServicio(e.target.value)}>
              <option value="">{en ? "Choose…" : "Elige…"}</option>
              {SERVICIOS_INTERES.map((s) => (
                <option key={s.clave} value={s.clave}>
                  {s.texto}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="c-msg">{en ? "Message (optional)" : "Mensaje (opcional)"}</label>
            <textarea id="c-msg" rows={4} maxLength={2000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} />
          </div>
          <div className={styles.trampa} aria-hidden="true">
            <label htmlFor="c-web">Web</label>
            <input id="c-web" tabIndex={-1} autoComplete="off" value={web} onChange={(e) => setWeb(e.target.value)} />
          </div>
          <label className={styles.casilla}>
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} />
            <span>
              {en ? "I have read and accept the " : "He leído y acepto la "}
              <Link href="/legal/privacidad" target="_blank">
                {en ? "privacy policy" : "política de privacidad"}
              </Link>
              .
            </span>
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button className={styles.boton} type="submit" disabled={cargando}>
            {cargando ? (en ? "Sending…" : "Enviando…") : en ? "Send" : "Enviar"}
          </button>
        </form>
      )}
    </main>
  );
}
