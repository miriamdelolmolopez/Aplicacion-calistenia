import Link from "next/link";
import estilos from "./usuarios.module.css";

// Selector pequeño «Actuales | Antiguos» que va arriba de las listas de Clientes e Invitados.
export default function SelectorEstado({ base, vista }: { base: string; vista: "actuales" | "antiguos" }) {
  return (
    <div className={estilos.selectorEstado} role="group" aria-label="Estado">
      <Link href={base} className={`${estilos.opcionEstado} ${vista === "actuales" ? estilos.opcionEstadoActiva : ""}`} aria-current={vista === "actuales" ? "true" : undefined}>
        Actuales
      </Link>
      <Link href={`${base}?vista=antiguos`} className={`${estilos.opcionEstado} ${vista === "antiguos" ? estilos.opcionEstadoActiva : ""}`} aria-current={vista === "antiguos" ? "true" : undefined}>
        Antiguos
      </Link>
    </div>
  );
}
