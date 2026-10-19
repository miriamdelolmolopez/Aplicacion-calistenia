"use client";

import { startTransition, useEffect, useRef } from "react";
import type { Estado } from "./acciones";

// Envía el formulario sin que React borre lo escrito si hay un error; al crear algo nuevo con éxito, sí lo vacía.
export function useEnvio(
  accion: (datos: FormData) => void,
  estado: Estado,
  nuevo: boolean,
): { ref: React.RefObject<HTMLFormElement | null>; alEnviar: (e: React.FormEvent<HTMLFormElement>) => void } {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (nuevo && estado.mensaje) ref.current?.reset();
  }, [nuevo, estado]);
  return {
    ref,
    alEnviar: (e) => {
      e.preventDefault();
      const datos = new FormData(e.currentTarget);
      startTransition(() => accion(datos));
    },
  };
}
