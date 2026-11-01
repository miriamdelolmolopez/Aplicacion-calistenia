import estilos from "./biblioteca.module.css";
import { DIFICULTADES } from "@/lib/trabajoEjercicio";

// Medidor de dificultad: tres barras, las que toquen rellenas.
export default function Medidor({ dificultad, idioma }: { dificultad: string | null; idioma: "es" | "en" }) {
  const d = DIFICULTADES.find((x) => x.valor === dificultad);
  if (!d) return null;
  return (
    <span className={estilos.medidor} title={d[idioma]}>
      {[1, 2, 3].map((n) => (
        <span key={n} className={n <= d.nivel ? estilos.barraLlena : estilos.barra} />
      ))}
      <small>{d[idioma]}</small>
    </span>
  );
}
