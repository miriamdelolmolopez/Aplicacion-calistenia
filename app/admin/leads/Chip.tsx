import estilos from "./leads.module.css";
import { colorDe, type ItemColor } from "./tipos";

// Una etiqueta o un tipo de lead, con su color.
export default function Chip({ item }: { item: Pick<ItemColor, "nombre" | "color"> }) {
  const c = colorDe(item.color);
  return (
    <span className={estilos.chip} style={{ color: c.fg, borderColor: c.fg }}>
      {item.nombre}
    </span>
  );
}
