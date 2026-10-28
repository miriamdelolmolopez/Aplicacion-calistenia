"use client";

import Icono from "../../Icono";
import estilos from "./comunes.module.css";

export default function Buscador({ valor, alCambiar, placeholder = "Buscar…" }: { valor: string; alCambiar: (v: string) => void; placeholder?: string }) {
  return (
    <label className={estilos.buscar}>
      <Icono nombre="lupa" tamano={18} />
      <input type="search" value={valor} onChange={(e) => alCambiar(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );
}
