"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import styles from "../../admin.module.css";
import { congelarAlumno, descongelarAlumno } from "./congelar";

export type DatosCongelado = { desde: string | null; hasta: string | null; motivo: string | null };

const fecha = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso));

// Congelar a un alumno/a (lesión, viaje…): se escribe el motivo y, si se quiere, hasta cuándo.
export default function CongelarAlumno({ userId, congelado }: { userId: string; congelado: DatosCongelado | null }) {
  const router = useRouter();
  const [motivo, setMotivo] = useState(congelado?.motivo ?? "");
  const [hasta, setHasta] = useState(congelado?.hasta ?? "");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [pendiente, empezar] = useTransition();

  function guardar() {
    setError("");
    setMensaje("");
    empezar(async () => {
      const r = await congelarAlumno(userId, motivo, hasta || null);
      if (r.error) return setError(r.error);
      setMensaje(congelado ? "Cambios guardados." : "Congelado/a.");
      router.refresh();
    });
  }

  function descongelar() {
    setError("");
    empezar(async () => {
      const r = await descongelarAlumno(userId);
      if (r.error) return setError(r.error);
      setConfirmando(false);
      setMotivo("");
      setHasta("");
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "8px 0" }}>
      {congelado ? (
        <p style={{ margin: 0 }}>
          ❄ Congelado/a desde el <strong>{congelado.desde ? fecha(congelado.desde) : "—"}</strong>
          {congelado.hasta ? (
            <>
              {" "}
              hasta el <strong>{fecha(congelado.hasta)}</strong> (ese día se descongela solo y te llega un aviso).
            </>
          ) : (
            ". Se queda así hasta que lo descongeles tú."
          )}
        </p>
      ) : (
        <p className={styles.ayuda} style={{ margin: 0 }}>
          Mientras esté congelado/a no cuenta como alumno/a activo/a. No se toca su tarifa: cuando se descongele te llegará un aviso para que decidas (nueva fecha de fin, clases…).
        </p>
      )}
      <div className={styles.campo}>
        <label htmlFor="cong-motivo">Motivo</label>
        <textarea id="cong-motivo" rows={3} maxLength={500} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por ejemplo: lesión de hombro" />
      </div>
      <div className={styles.campo}>
        <label htmlFor="cong-hasta">Hasta cuándo (opcional)</label>
        <input id="cong-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} style={{ maxWidth: 200 }} />
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {mensaje && (
        <p className={styles.ayuda} role="status" style={{ margin: 0 }}>
          {mensaje}
        </p>
      )}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className={styles.boton} disabled={pendiente} onClick={guardar}>
          {congelado ? "Guardar cambios" : "Congelar"}
        </button>
        {congelado &&
          (confirmando ? (
            <>
              <span>¿Descongelar ya?</span>
              <button type="button" className={styles.boton} disabled={pendiente} onClick={descongelar}>
                Sí, descongelar
              </button>
              <button type="button" onClick={() => setConfirmando(false)} style={{ cursor: "pointer", font: "inherit", background: "none", border: 0, textDecoration: "underline" }}>
                Cancelar
              </button>
            </>
          ) : (
            <button type="button" disabled={pendiente} onClick={() => setConfirmando(true)} style={{ cursor: "pointer", font: "inherit", padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.2)", background: "#fff" }}>
              Descongelar ahora
            </button>
          ))}
      </div>
    </div>
  );
}
