"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "../admin.module.css";
import estilos from "./leads.module.css";
import { alternarConexion, crearConexion, eliminarConexion, regenerarConexion } from "./accionesConexiones";

export type Conexion = { id: string; nombre: string; ultimos4: string; activo: boolean; recibidos: number; ultimo_uso: string | null };

const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "nunca");

// Panel para conectar formularios externos (Tally, la landing, Zapier…) con los leads.
export default function ConectarFormularios({ conexiones, alCerrar }: { conexiones: Conexion[]; alCerrar?: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [direccion, setDireccion] = useState<{ nombre: string; url: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendiente, empezar] = useTransition();

  function crear() {
    setError("");
    empezar(async () => {
      const r = await crearConexion(nombre);
      if (!r.ok || !r.direccion) {
        setError(r.error ?? "No se ha podido crear.");
        return;
      }
      setDireccion({ nombre: nombre.trim(), url: r.direccion });
      setNombre("");
      setCopiado(false);
      router.refresh();
    });
  }

  function regenerar(c: Conexion) {
    if (!window.confirm(`Se creará una dirección nueva para «${c.nombre}» y la anterior dejará de funcionar. ¿Continuar?`)) return;
    setError("");
    empezar(async () => {
      const r = await regenerarConexion(c.id);
      if (!r.ok || !r.direccion) {
        setError(r.error ?? "No se ha podido regenerar.");
        return;
      }
      setDireccion({ nombre: c.nombre, url: r.direccion });
      setCopiado(false);
      router.refresh();
    });
  }

  function alternar(c: Conexion) {
    empezar(async () => {
      const r = await alternarConexion(c.id, !c.activo);
      if (!r.ok) setError(r.error ?? "No se ha podido cambiar.");
      router.refresh();
    });
  }

  function eliminar(c: Conexion) {
    if (!window.confirm(`¿Eliminar la conexión «${c.nombre}»? Los leads que ya llegaron se quedan.`)) return;
    empezar(async () => {
      const r = await eliminarConexion(c.id);
      if (!r.ok) setError(r.error ?? "No se ha podido eliminar.");
      router.refresh();
    });
  }

  async function copiar(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <section className={`${styles.tarjeta} ${estilos.panelNuevo}`}>
      <h2>Conectar formularios</h2>
      <p className={styles.ayuda}>
        Cada conexión te da una dirección secreta. Pégala en tu herramienta de formularios (Tally, tu landing, Zapier…) y cada persona que rellene el formulario aparecerá como un lead nuevo, con el nombre de la conexión como «origen».
      </p>

      <div className={estilos.nuevaNota}>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre de la conexión (ej. Landing Online)" maxLength={120} aria-label="Nombre de la conexión" />
        <button type="button" className={styles.boton} onClick={crear} disabled={pendiente || !nombre.trim()}>
          Crear conexión
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}

      {direccion && (
        <div className={estilos.direccionNueva}>
          <strong>Dirección de «{direccion.nombre}»</strong>
          <p className={styles.ayuda}>Cópiala ahora: por seguridad no se vuelve a enseñar entera. Si la pierdes, regenera una nueva.</p>
          <code className={estilos.enlace}>{direccion.url}</code>
          <div className={estilos.acciones}>
            <button type="button" className={styles.boton} onClick={() => copiar(direccion.url)}>
              {copiado ? "Copiada ✓" : "Copiar dirección"}
            </button>
          </div>
          <details>
            <summary>Cómo usarla</summary>
            <ul className={estilos.pasos}>
              <li>
                <strong>Tally:</strong> en tu formulario ve a Integrations → Webhooks, pega la dirección y activa. Las preguntas «Nombre», «Apellidos», «Email» y «Teléfono» se reconocen solas; el resto se guarda como información del lead.
              </li>
              <li>
                <strong>Formulario propio en tu landing:</strong> haz que el formulario envíe (method POST) a esa dirección con campos llamados <code>nombre</code>, <code>apellidos</code>, <code>email</code> y <code>telefono</code>. Cualquier otro campo se guarda como información. Si añades un campo oculto <code>_redirect</code> con la dirección de tu página de «gracias», la persona vuelve allí al enviar.
              </li>
              <li>
                <strong>Zapier, Make u otras:</strong> envía una petición POST con los datos en JSON a esa dirección.
              </li>
            </ul>
          </details>
        </div>
      )}

      <ul className={estilos.listaConexiones}>
        {conexiones.length === 0 && <li className={estilos.vacioFiltro}>Todavía no tienes conexiones.</li>}
        {conexiones.map((c) => (
          <li key={c.id}>
            <div>
              <strong>{c.nombre}</strong>
              <small>
                {" "}
                · termina en …{c.ultimos4} · {c.recibidos} {c.recibidos === 1 ? "lead" : "leads"} · último: {fecha(c.ultimo_uso)}
              </small>
              {!c.activo && <span className={estilos.proximamente}>Desactivada</span>}
            </div>
            <div className={estilos.acciones}>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => alternar(c)} disabled={pendiente}>
                {c.activo ? "Desactivar" : "Activar"}
              </button>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => regenerar(c)} disabled={pendiente}>
                Regenerar
              </button>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => eliminar(c)} disabled={pendiente}>
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
      {alCerrar && (
        <div className={estilos.acciones}>
          <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={alCerrar}>
            Cerrar
          </button>
        </div>
      )}
    </section>
  );
}
