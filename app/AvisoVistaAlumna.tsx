"use client";

import { useIdioma } from "./useIdioma";
import { cambiarVistaAlumna, type MiPerfil } from "./useMiPerfil";
import estilos from "./vistaAlumna.module.css";

// Solo aparece cuando una administradora está viendo la app como alumna.
export default function AvisoVistaAlumna({ perfil }: { perfil: MiPerfil }) {
  const [idioma] = useIdioma();
  if (perfil.rolReal !== "admin" || perfil.rol === "admin") return null;
  return (
    <div className={estilos.aviso} role="status">
      <span>{idioma === "en" ? "You are viewing the app as a student." : "Estás viendo la app como alumna."}</span>
      <button type="button" className={estilos.volver} onClick={() => cambiarVistaAlumna(false)}>
        {idioma === "en" ? "Back to admin view" : "Volver a vista de administradora"}
      </button>
    </div>
  );
}
