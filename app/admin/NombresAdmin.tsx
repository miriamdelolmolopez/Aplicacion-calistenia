"use client";

import { createContext, useContext } from "react";

const Contexto = createContext<Record<string, string>>({});

// Reparte por toda la zona de Administración los nombres que se han cambiado a las tarjetas.
export function ProveedorNombres({ nombres, children }: { nombres: Record<string, string>; children: React.ReactNode }) {
  return <Contexto.Provider value={nombres}>{children}</Contexto.Provider>;
}

export const useNombresAdmin = () => useContext(Contexto);
