"use client";

import { useEffect, useState } from "react";
import { guardarDiasEntreno, obtenerDiasEntreno } from "../../notificaciones/acciones";
import styles from "../../formularios.module.css";
import estilos from "../../perfil/perfil.module.css";

const DIAS = {
  es: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

// Solo para quien tiene entrenamiento online: elige (si quiere) qué días entrena y la app le avisa por la mañana.
export default function DiasEntreno({ en }: { en: boolean }) {
  const [estado, setEstado] = useState<{ dias: number[]; online: boolean } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let vigente = true;
    obtenerDiasEntreno().then((e) => vigente && setEstado(e));
    return () => {
      vigente = false;
    };
  }, []);

  if (!estado || !estado.online) return null;
  const nombres = DIAS[en ? "en" : "es"];

  async function alternar(dia: number) {
    if (!estado) return;
    const antes = estado.dias;
    const nuevos = antes.includes(dia) ? antes.filter((d) => d !== dia) : [...antes, dia].sort();
    setEstado({ ...estado, dias: nuevos });
    setError(false);
    const r = await guardarDiasEntreno(nuevos);
    if (!r.ok) {
      setEstado({ ...estado, dias: antes });
      setError(true);
    }
  }

  return (
    <section className={`${styles.tarjeta} ${estilos.seccion}`}>
      <h2 style={{ margin: 0, fontSize: "1.2rem" }}>{en ? "Your training days" : "Tus días de entrenamiento"}</h2>
      <p className={styles.ayuda}>
        {en
          ? "Optional. Choose the days you want to train and we will send you a notice that morning: “Hello, today is a training day”."
          : "Opcional. Elige los días que quieres entrenar y te avisamos esa mañana: «Hola, hoy toca entrenamiento»."}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {nombres.map((nombre, i) => {
          const marcado = estado.dias.includes(i + 1);
          return (
            <button
              key={nombre}
              type="button"
              onClick={() => alternar(i + 1)}
              aria-pressed={marcado}
              style={{
                minHeight: 40,
                padding: "0 14px",
                borderRadius: 999,
                font: "inherit",
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid var(--linea)",
                background: marcado ? "var(--oliva)" : "var(--blanco)",
                color: marcado ? "var(--blanco)" : "var(--carbon)",
              }}
            >
              {nombre}
            </button>
          );
        })}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {en ? "Could not save. Try again." : "No se ha podido guardar. Inténtalo de nuevo."}
        </p>
      )}
    </section>
  );
}
