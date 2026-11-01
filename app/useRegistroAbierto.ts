"use client";

import { useEffect, useState } from "react";

// ¿Se puede crear una cuenta ahora mismo? Mientras se comprueba, o si el registro está cerrado, no se enseña el botón.
export function useRegistroAbierto(): boolean {
  const [abierto, setAbierto] = useState(false);
  useEffect(() => {
    fetch("/api/registro/estado")
      .then((r) => r.json())
      .then((d) => setAbierto(d.abierto === true))
      .catch(() => setAbierto(false));
  }, []);
  return abierto;
}
