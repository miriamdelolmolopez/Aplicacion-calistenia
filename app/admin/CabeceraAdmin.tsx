"use client";

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./admin.module.css";
import { useNombresAdmin } from "./NombresAdmin";
import { guardarNombreAdmin } from "./acciones";
import { olvidarNombresMenu } from "../useMenuAdmin";
import { MENU_ADMIN, PESTANAS_AJUSTES } from "../gruposAdmin";

// Cabecera de cada pantalla de Administración: el título y el botón de volver, sin foto.
// En las pantallas a las que se llega desde una tarjeta, el título lleva un lápiz gris para cambiarle el nombre.
// Direcciones que son una pestaña o una opción principal del menú: en ellas no hay a dónde «volver».
const RAIZ = new Set<string>([
  ...MENU_ADMIN.flatMap((g) => g.items.flatMap((i) => [i.href, ...(i.pestanas ?? []).map((p) => p.href)])),
  ...PESTANAS_AJUSTES.map((p) => p.href),
].filter((h): h is string => !!h));

export default function CabeceraAdmin({ children }: { children: ReactNode }) {
  const ruta = usePathname();
  const esRaiz = RAIZ.has(ruta);
  const router = useRouter();
  const nombres = useNombresAdmin();
  const editable = false as boolean; // los nombres ya no se cambian: son los del menú y las pestañas
  const cabecera = useRef<HTMLElement>(null);
  const [original, setOriginal] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [pendiente, empezar] = useTransition();

  useEffect(() => {
    if (!editable) return;
    // El título original es el h1 que viene de fuera (hijo directo de la cabecera), no el que se pinta aquí dentro: si no, el título sale vacío.
    const t = cabecera.current?.querySelector(":scope > h1")?.textContent ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOriginal(t);
  }, [editable, ruta]);

  if (!editable) return <header className={styles.barra} data-raiz={esRaiz ? "" : undefined}>{children}</header>;

  const nombre = nombres[ruta] ?? original ?? "";

  function guardar() {
    empezar(async () => {
      const r = await guardarNombreAdmin(ruta, texto);
      if (r.error) {
        setError(r.error);
        return;
      }
      setError("");
      setEditando(false);
      olvidarNombresMenu();
      router.refresh();
    });
  }

  return (
    <header ref={cabecera} className={`${styles.barra} ${styles.barraEditable}`} data-raiz={esRaiz ? "" : undefined}>
      <div className={styles.tituloEditable}>
        {editando ? (
          <>
            <input
              autoFocus
              value={texto}
              maxLength={60}
              aria-label="Nombre de la tarjeta"
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") guardar();
                if (e.key === "Escape") setEditando(false);
              }}
              className={styles.entradaTitulo}
              placeholder={original ?? ""}
            />
            <button type="button" className={styles.boton} onClick={guardar} disabled={pendiente}>
              Guardar
            </button>
            <button type="button" className={styles.botonSecundario} onClick={() => setEditando(false)}>
              Cancelar
            </button>
            {error && <span role="alert">{error}</span>}
          </>
        ) : (
          <>
            <h1>{nombre}</h1>
            <button
              type="button"
              className={styles.lapiz}
              aria-label="Cambiar el nombre"
              title="Cambiar el nombre (déjalo vacío para volver al original)"
              onClick={() => {
                setTexto(nombres[ruta] ?? "");
                setError("");
                setEditando(true);
              }}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
          </>
        )}
      </div>
      {children}
    </header>
  );
}
