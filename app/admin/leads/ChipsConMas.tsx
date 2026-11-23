import Chip from "./Chip";
import estilos from "./leads.module.css";
import type { ItemColor } from "./tipos";

// Las etiquetas de un lead: las 3 primeras y, si hay más, un círculo con «+N» (al pasar por encima salen los nombres de las demás).
export default function ChipsConMas({ items, max = 3 }: { items: ItemColor[]; max?: number }) {
  const vistas = items.slice(0, max);
  const resto = items.slice(max);
  return (
    <div className={estilos.chips}>
      {vistas.map((e) => (
        <Chip key={e.id} item={e} />
      ))}
      {resto.length > 0 && (
        <span className={estilos.circuloMas} title={resto.map((e) => e.nombre).join(", ")} aria-label={`${resto.length} etiquetas más: ${resto.map((e) => e.nombre).join(", ")}`}>
          +{resto.length}
        </span>
      )}
    </div>
  );
}
