"use client";

import { useEffect } from "react";

// La app instalada en el móvil puede quedarse abierta días con una versión vieja. Cuando se vuelve a ella, se comprueba si hay
// una versión nueva y, si la hay, se recarga (salvo en medio de un entreno, para no perder lo que se está anotando).
const MI_VERSION = process.env.NEXT_PUBLIC_BUILD ?? "dev";

export default function ActualizadorApp() {
  useEffect(() => {
    if (MI_VERSION === "dev") return;
    let comprobando = false;
    async function comprobar() {
      if (document.visibilityState !== "visible" || comprobando) return;
      if (location.pathname.startsWith("/entreno/") || location.pathname.startsWith("/rutina/sesion/")) return;
      comprobando = true;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        const { build } = (await r.json()) as { build?: string };
        if (build && build !== "dev" && build !== MI_VERSION) location.reload();
      } catch {
        // Sin conexión: se vuelve a probar la próxima vez.
      } finally {
        comprobando = false;
      }
    }
    document.addEventListener("visibilitychange", comprobar);
    window.addEventListener("focus", comprobar);
    comprobar();
    return () => {
      document.removeEventListener("visibilitychange", comprobar);
      window.removeEventListener("focus", comprobar);
    };
  }, []);
  return null;
}
