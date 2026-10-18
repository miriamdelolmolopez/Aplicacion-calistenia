import Link from "next/link";
import estilos from "./entrenamiento.module.css";

// Las dos pestañas de Entrenamiento: Mis rutinas | Progreso.
export default function PestanasEntreno({
  activa,
  rutinas,
  progreso,
}: {
  activa: "rutinas" | "progreso";
  rutinas: string;
  progreso: string;
}) {
  return (
    <div className={estilos.pestanas} role="tablist">
      <Link href="/rutina" role="tab" aria-selected={activa === "rutinas"} className={activa === "rutinas" ? estilos.pestanaActiva : ""}>
        {rutinas}
      </Link>
      <Link href="/progreso" role="tab" aria-selected={activa === "progreso"} className={activa === "progreso" ? estilos.pestanaActiva : ""}>
        {progreso}
      </Link>
    </div>
  );
}
