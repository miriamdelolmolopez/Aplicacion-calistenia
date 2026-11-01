"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Aviso fijo cuando Miriam mira la rutina de una persona tal y como la ve esa persona.
export default function AvisoComo({ userId }: { userId: string }) {
  const [nombre, setNombre] = useState("");
  useEffect(() => {
    createClient()
      .from("profiles")
      .select("nombre, apellidos, email")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setNombre([data?.nombre, data?.apellidos].filter(Boolean).join(" ") || data?.email || ""));
  }, [userId]);
  return (
    <Link
      href={`/admin/usuarios/${userId}?pestana=acciones`}
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
        fontSize: "0.8rem",
        fontWeight: 700,
        color: "#ffffff",
        textDecoration: "none",
        background: "#1f2023",
        border: "1px solid rgba(255,255,255,0.4)",
        borderRadius: 999,
        boxShadow: "0 6px 18px rgba(0,0,0,0.25)",
      }}
    >
      <span aria-hidden="true">👁</span> Viendo lo de {nombre || "…"} · Volver
    </Link>
  );
}
