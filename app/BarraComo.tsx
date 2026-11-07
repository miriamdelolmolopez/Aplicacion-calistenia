"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ElegirAlumno from "./admin/ver/ElegirAlumno";
import { useComo } from "./rutina/useComo";
import { createClient } from "@/lib/supabase/client";

const SECCIONES = [
  { ruta: "/clases/mis-reservas", texto: "Reservas" },
  { ruta: "/pagos", texto: "Pagos" },
  { ruta: "/rutina/ver", texto: "Rutina" },
  { ruta: "/progreso", texto: "Progreso" },
];

// Barra fija cuando Miriam mira una pantalla como la vería un/a alumno/a concreto/a (con «?como=…»): solo lectura.
export default function BarraComo() {
  const como = useComo();
  const router = useRouter();
  const actual = usePathname();
  const [nombre, setNombre] = useState("");
  const [eligiendo, setEligiendo] = useState(false);

  useEffect(() => {
    if (!como) return;
    createClient()
      .from("profiles")
      .select("nombre, apellidos, email")
      .eq("id", como)
      .maybeSingle()
      .then(({ data }) => setNombre([data?.nombre, data?.apellidos].filter(Boolean).join(" ") || data?.email || ""));
  }, [como]);

  if (!como) return null;
  const enlace = {
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: "0.8rem",
    fontWeight: 700,
    textDecoration: "none",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.4)",
  } as const;
  return (
    <>
      <div
        style={{ position: "sticky", top: 0, zIndex: 95, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, padding: "8px 12px", background: "#1f2023", color: "#fff", borderRadius: 12, margin: "0 0 10px" }}
      >
        <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>👁 Viendo como {nombre || "…"} · solo lectura</span>
        {SECCIONES.map((s) => (
          <Link key={s.ruta} href={`${s.ruta}?como=${como}`} style={{ ...enlace, background: actual.startsWith(s.ruta) ? "rgba(255,255,255,0.25)" : "transparent" }}>
            {s.texto}
          </Link>
        ))}
        <button type="button" onClick={() => setEligiendo(true)} style={{ ...enlace, background: "transparent", font: "inherit", fontSize: "0.8rem", cursor: "pointer" }}>
          Cambiar alumno/a
        </button>
        <Link href={`/admin/usuarios/${como}`} style={{ ...enlace, background: "transparent" }}>
          Salir
        </Link>
      </div>
      <ElegirAlumno
        abierto={eligiendo}
        alCerrar={() => setEligiendo(false)}
        alElegir={(id) => {
          setEligiendo(false);
          router.push(`${actual || "/clases/mis-reservas"}?como=${id}`);
        }}
      />
    </>
  );
}
