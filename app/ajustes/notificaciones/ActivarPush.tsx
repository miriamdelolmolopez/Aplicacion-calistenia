"use client";

import { useEffect, useState } from "react";
import styles from "../../formularios.module.css";
import { guardarSuscripcionPush, quitarSuscripcionPush } from "../../notificaciones/acciones";
import { useIdioma } from "../../useIdioma";

type Estado = "cargando" | "no_soportado" | "sin_configurar" | "bloqueado" | "inactivo" | "activo";

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function aBytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = "=".repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(crudo, (c) => c.charCodeAt(0));
}

// Activa o desactiva las notificaciones en este móvil u ordenador (aparecen como cualquier otra notificación del teléfono).
export default function ActivarPush() {
  const [idioma] = useIdioma();
  const en = idioma === "en";
  const [estado, setEstado] = useState<Estado>("cargando");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      Promise.resolve().then(() => setEstado("no_soportado"));
      return;
    }
    if (!CLAVE_PUBLICA) {
      Promise.resolve().then(() => setEstado("sin_configurar"));
      return;
    }
    navigator.serviceWorker
      .getRegistration("/sw.js")
      .then((reg) => reg?.pushManager.getSubscription())
      .then((sub) => setEstado(sub ? "activo" : Notification.permission === "denied" ? "bloqueado" : "inactivo"))
      .catch(() => setEstado("inactivo"));
  }, []);

  async function activar() {
    setError("");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") {
        setEstado("bloqueado");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aBytes(CLAVE_PUBLICA) }));
      const j = sub.toJSON();
      const r = await guardarSuscripcionPush({ endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? "", auth: j.keys?.auth ?? "" });
      if (!r.ok) throw new Error("guardar");
      setEstado("activo");
    } catch {
      setError(en ? "Could not turn them on. Try again." : "No se han podido activar. Inténtalo de nuevo.");
    }
  }

  async function desactivar() {
    setError("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await quitarSuscripcionPush(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("inactivo");
    } catch {
      setError(en ? "Could not turn them off. Try again." : "No se han podido desactivar. Inténtalo de nuevo.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <strong>{en ? "Notifications on this device" : "Notificaciones en este dispositivo"}</strong>
      {estado === "cargando" && <small className={styles.ayuda}>…</small>}
      {estado === "no_soportado" && (
        <small className={styles.ayuda}>
          {en ? "This browser does not support them. On iPhone, add the app to your home screen first (Share → Add to Home Screen)." : "Este navegador no las admite. En iPhone, primero añade la app a la pantalla de inicio (Compartir → Añadir a pantalla de inicio)."}
        </small>
      )}
      {estado === "sin_configurar" && <small className={styles.ayuda}>{en ? "Phone notifications will be available soon." : "Las notificaciones en el móvil estarán disponibles muy pronto."}</small>}
      {estado === "bloqueado" && (
        <small className={styles.ayuda}>
          {en ? "They are blocked. Allow notifications for this app in your phone or browser settings, then come back." : "Están bloqueadas. Permite las notificaciones de esta app en los ajustes del móvil o del navegador y vuelve aquí."}
        </small>
      )}
      {estado === "inactivo" && (
        <button type="button" className={styles.boton} onClick={activar}>
          {en ? "Turn on notifications" : "Activar notificaciones"}
        </button>
      )}
      {estado === "activo" && (
        <>
          <small className={styles.ayuda}>{en ? "Active on this device." : "Activadas en este dispositivo."}</small>
          <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={desactivar}>
            {en ? "Turn off on this device" : "Desactivar en este dispositivo"}
          </button>
        </>
      )}
      {error && (
        <small className={styles.error} role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
