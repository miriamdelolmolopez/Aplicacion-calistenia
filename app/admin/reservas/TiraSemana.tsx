import Link from "next/link";
import { lunesDe, sumarDias } from "@/lib/fechas";
import estilos from "./reservas.module.css";

const LETRAS = ["L", "M", "X", "J", "V", "S", "D"];

// Tira de la semana (L M X J V S D) para elegir un día; las flechas cambian de semana.
export default function TiraSemana({ dia, hoy, ruta }: { dia: string; hoy: string; ruta: string }) {
  const lunes = lunesDe(dia);
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const enlace = (d: string) => `${ruta}?dia=${d}`;
  return (
    <nav className={estilos.tira} aria-label="Elegir día">
      <Link href={enlace(sumarDias(dia, -7))} className={estilos.flechaTira} aria-label="Semana anterior">
        ‹
      </Link>
      {dias.map((d, i) => (
        <Link
          key={d}
          href={enlace(d)}
          className={`${estilos.diaTira} ${d === dia ? estilos.diaElegido : ""} ${d === hoy ? estilos.diaHoy : ""}`}
          aria-current={d === dia ? "date" : undefined}
        >
          <small>{LETRAS[i]}</small>
          {Number(d.slice(8, 10))}
        </Link>
      ))}
      <Link href={enlace(sumarDias(dia, 7))} className={estilos.flechaTira} aria-label="Semana siguiente">
        ›
      </Link>
    </nav>
  );
}
