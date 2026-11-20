"use client";

import { useState } from "react";
import { NOMBRES_DIAS } from "@/lib/diaInicioSemana";
import { createClient } from "@/lib/supabase/client";
import styles from "../formularios.module.css";
import estilos from "./entrenamiento.module.css";

// «Mi semana de entreno empieza el…»: cada persona online elige el día en que empieza su semana (por defecto, lunes).
export default function DiaInicioSemana({ valor, en, soloLectura, alCambiar }: { valor: number; en: boolean; soloLectura: boolean; alCambiar: () => void }) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(false);
  const nombres = NOMBRES_DIAS[en ? "en" : "es"];

  async function cambiar(nuevo: number) {
    setGuardando(true);
    setError(false);
    const supabase = createClient();
    const { data: sesion } = await supabase.auth.getUser();
    const { error: fallo } = await supabase.from("profiles").update({ dia_inicio_semana: nuevo }).eq("id", sesion.user?.id ?? "");
    setGuardando(false);
    if (fallo) return setError(true);
    alCambiar();
  }

  return (
    <section className={estilos.resumen} style={{ marginTop: 14 }}>
      <div className={estilos.resumenCuerpo}>
        <h2 style={{ fontSize: "1.05rem" }}>{en ? "My training week" : "Mi semana de entreno"}</h2>
        <label htmlFor="dia-inicio-semana" className={styles.ayuda}>
          {en ? "My week starts on" : "Mi semana empieza el"}
        </label>
        <select id="dia-inicio-semana" value={valor} disabled={soloLectura || guardando} onChange={(e) => cambiar(Number(e.target.value))}>
          {nombres.map((n, i) => (
            <option key={n} value={i}>
              {n}
            </option>
          ))}
        </select>
        <p className={styles.ayuda} style={{ margin: 0 }}>
          {en ? "Your weekly workout count and streak start counting from this day." : "Tus entrenos de la semana y tu racha se cuentan desde este día."}
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {en ? "Couldn't save it. Try again in a moment." : "No se ha podido guardar. Inténtalo de nuevo en un momento."}
          </p>
        )}
      </div>
    </section>
  );
}
