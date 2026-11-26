"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "../admin.module.css";
import estilos from "./leads.module.css";
import { alternarConexion, crearConexion, editarConexion, eliminarConexion, regenerarConexion } from "./accionesConexiones";
import Chip from "./Chip";
import SelectorOpciones from "./SelectorOpciones";
import type { ItemColor } from "./tipos";

export type Conexion = { id: string; nombre: string; ultimos4: string; activo: boolean; recibidos: number; ultimo_uso: string | null; tipo_id?: string | null; etiqueta_ids?: string[] | null };

const fecha = (iso: string | null) => (iso ? new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso)) : "nunca");

// Panel para conectar formularios externos (Tally, la landing, Zapier…) con los leads.
export default function ConectarFormularios({ conexiones, tipos = [], etiquetas = [], alCerrar }: { conexiones: Conexion[]; tipos?: ItemColor[]; etiquetas?: ItemColor[]; alCerrar?: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [tipoNuevo, setTipoNuevo] = useState<string | null>(null);
  const [etiquetasNuevas, setEtiquetasNuevas] = useState<string[]>([]);
  const [reinicio, setReinicio] = useState(0); // al crear una conexión se vacían los selectores
  const [editando, setEditando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [direccion, setDireccion] = useState<{ nombre: string; url: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [pendiente, empezar] = useTransition();

  function crear() {
    setError("");
    empezar(async () => {
      const r = await crearConexion(nombre, tipoNuevo, etiquetasNuevas);
      if (!r.ok || !r.direccion) {
        setError(r.error ?? "No se ha podido crear.");
        return;
      }
      setDireccion({ nombre: nombre.trim(), url: r.direccion });
      setNombre("");
      setTipoNuevo(null);
      setEtiquetasNuevas([]);
      setReinicio((n) => n + 1);
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
      <div className={estilos.conexionElegir} key={reinicio}>
        <div className={styles.campo}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Tipo de lead</span>
          <SelectorOpciones tabla="tipos" opciones={tipos} multiple={false} valores={[]} alCambiar={(ids) => setTipoNuevo(ids[0] ?? null)} />
        </div>
        <div className={styles.campo}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Etiquetas</span>
          <SelectorOpciones tabla="etiquetas" opciones={etiquetas} multiple valores={[]} alCambiar={setEtiquetasNuevas} vacio="Sin etiquetas" />
        </div>
      </div>
      <p className={styles.ayuda}>Los leads que lleguen por esta conexión se crearán con este tipo y estas etiquetas (opcional).</p>
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
        {conexiones.map((c) => {
          const tipo = tipos.find((t) => t.id === c.tipo_id);
          const suyas = (c.etiqueta_ids ?? []).map((id) => etiquetas.find((e) => e.id === id)).filter((e): e is ItemColor => !!e);
          if (editando === c.id) {
            return (
              <li key={c.id}>
                <EditorConexion conexion={c} tipos={tipos} etiquetas={etiquetas} alTerminar={() => (setEditando(null), router.refresh())} />
              </li>
            );
          }
          return (
          <li key={c.id}>
            <div>
              <strong>{c.nombre}</strong>
              <small>
                {" "}
                · termina en …{c.ultimos4} · {c.recibidos} {c.recibidos === 1 ? "lead" : "leads"} · último: {fecha(c.ultimo_uso)}
              </small>
              {!c.activo && <span className={estilos.proximamente}>Desactivada</span>}
              {(tipo || suyas.length > 0) && (
                <div className={estilos.conexionChips}>
                  {tipo && <Chip item={tipo} />}
                  {suyas.map((e) => (
                    <Chip key={e.id} item={e} />
                  ))}
                </div>
              )}
            </div>
            <div className={estilos.acciones}>
              <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setEditando(c.id)} disabled={pendiente}>
                Editar
              </button>
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
          );
        })}
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

// Edita el nombre, el tipo y las etiquetas de una conexión (su dirección no cambia).
function EditorConexion({ conexion, tipos, etiquetas, alTerminar }: { conexion: Conexion; tipos: ItemColor[]; etiquetas: ItemColor[]; alTerminar: () => void }) {
  const [nombre, setNombre] = useState(conexion.nombre);
  const [tipo, setTipo] = useState<string | null>(conexion.tipo_id ?? null);
  const [suyas, setSuyas] = useState<string[]>(conexion.etiqueta_ids ?? []);
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();

  function guardar() {
    setError("");
    empezar(async () => {
      const r = await editarConexion(conexion.id, nombre, tipo, suyas);
      if (!r.ok) return setError(r.error ?? "No se ha podido guardar.");
      alTerminar();
    });
  }

  return (
    <div className={estilos.conexionEditor}>
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} aria-label="Nombre de la conexión" />
      <div className={estilos.conexionElegir}>
        <div className={styles.campo}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Tipo de lead</span>
          <SelectorOpciones tabla="tipos" opciones={tipos} multiple={false} valores={conexion.tipo_id ? [conexion.tipo_id] : []} alCambiar={(ids) => setTipo(ids[0] ?? null)} />
        </div>
        <div className={styles.campo}>
          <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Etiquetas</span>
          <SelectorOpciones tabla="etiquetas" opciones={etiquetas} multiple valores={conexion.etiqueta_ids ?? []} alCambiar={setSuyas} vacio="Sin etiquetas" />
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={estilos.acciones}>
        <button type="button" className={styles.boton} onClick={guardar} disabled={pendiente || !nombre.trim()}>
          Guardar
        </button>
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={alTerminar} disabled={pendiente}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
