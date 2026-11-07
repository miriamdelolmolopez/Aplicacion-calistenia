"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import ElegirAlumno from "./admin/ver/ElegirAlumno";
import { cambiarVistaAlumna, olvidarPerfilCargado } from "./useMiPerfil";
import { fijarComo, leerComo, useComo } from "./rutina/useComo";

const VOLVER = "comoVolver";

// Barra fija arriba en todas las pantallas cuando Miriam mira la app como la vería un/a alumno/a concreto/a.
export default function BarraComo() {
  const como = useComo();
  const [nombre, setNombre] = useState("");
  const [eligiendo, setEligiendo] = useState(false);

  // Si la dirección trae «?como=…», se recuerda; si no hay nada elegido, no queda ninguna cookie vieja.
  useEffect(() => {
    const dir = leerComo();
    try {
      if (dir && sessionStorage.getItem("comoId") !== dir) fijarComo(dir);
      if (!dir) document.cookie = "como=; path=/; max-age=0";
    } catch {
      // Sin almacenamiento no hay vista como.
    }
  }, [como]);

  useEffect(() => {
    if (!como) return;
    createClient()
      .from("profiles")
      .select("nombre, apellidos, email")
      .eq("id", como)
      .maybeSingle()
      .then(({ data }) => setNombre([data?.nombre, data?.apellidos].filter(Boolean).join(" ") || data?.email || ""));
  }, [como]);

  // Hace sitio arriba para que la barra no tape nada.
  useEffect(() => {
    document.body.style.paddingTop = como ? "52px" : "";
    return () => {
      document.body.style.paddingTop = "";
    };
  }, [como]);

  if (!como) return null;

  function volver() {
    let destino = "/inicio";
    try {
      destino = sessionStorage.getItem(VOLVER) || "/inicio";
      sessionStorage.removeItem(VOLVER);
    } catch {
      // Se vuelve a Inicio.
    }
    fijarComo(null);
    olvidarPerfilCargado();
    cambiarVistaAlumna(false);
    window.location.href = destino;
  }

  const boton = { padding: "6px 12px", borderRadius: 999, fontSize: "0.8rem", fontWeight: 700, color: "#fff", background: "transparent", border: "1px solid rgba(255,255,255,0.5)", font: "inherit", cursor: "pointer" } as const;
  return (
    <>
      <div
        style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 400, minHeight: 52, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 12px", background: "#1f2023", color: "#fff" }}
      >
        <span style={{ fontSize: "0.82rem", fontWeight: 700, flex: "1 1 160px" }}>👁 Estás viendo como {nombre || "…"} · solo lectura</span>
        <button type="button" onClick={() => setEligiendo(true)} style={boton}>
          Cambiar alumno/a
        </button>
        <button type="button" onClick={volver} style={{ ...boton, background: "#fff", color: "#1f2023" }}>
          Volver a mi vista
        </button>
      </div>
      <ElegirAlumno
        abierto={eligiendo}
        alCerrar={() => setEligiendo(false)}
        alElegir={(id) => {
          setEligiendo(false);
          fijarComo(id);
          olvidarPerfilCargado();
          window.location.href = "/inicio";
        }}
      />
    </>
  );
}
