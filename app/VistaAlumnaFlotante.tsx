"use client";

import { usePathname } from "next/navigation";
import { useIdioma } from "./useIdioma";
import { cambiarVistaAlumna, useMiPerfil } from "./useMiPerfil";

// Mientras una administradora ve la app como alumno/a, en cualquier pantalla sale un botón fijo para volver a donde estaba.
// En Inicio y Perfil ya hay un aviso propio.
export default function VistaAlumnaFlotante() {
  const perfil = useMiPerfil();
  const ruta = usePathname();
  const [idioma] = useIdioma();
  if (typeof perfil !== "object" || perfil === null) return null;
  if (perfil.rolReal !== "admin" || perfil.rol === "admin") return null;
  if (ruta === "/inicio" || ruta.startsWith("/perfil")) return null;
  return (
    <button
      type="button"
      onClick={() => cambiarVistaAlumna(false)}
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        zIndex: 95,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minHeight: 40,
        padding: "0 14px",
        font: "inherit",
        fontSize: "0.8rem",
        fontWeight: 700,
        color: "#ffffff",
        background: "#1f2023",
        border: "1px solid rgba(255,255,255,0.4)",
        borderRadius: 999,
        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
        cursor: "pointer",
      }}
    >
      <span aria-hidden="true">👁</span> {idioma === "en" ? "Viewing as student · Back" : "Viendo como alumno/a · Volver"}
    </button>
  );
}
