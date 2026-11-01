import estilos from "./cargando.module.css";

// Indicador de carga discreto: tres puntos que laten, sin texto.
export default function Cargando() {
  return (
    <div className={estilos.puntos} role="status" aria-label="…">
      <span />
      <span />
      <span />
    </div>
  );
}
