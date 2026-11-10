"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { textoCuando } from "@/lib/cumpleanosTexto";
import clay from "../ui/clay.module.css";
import { elegirDiasAvisoInicio, obtenerAvisosInicio, type AvisosInicio } from "./accionesAdmin";

const DIAS_CUMPLES = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30];
const DIAS_BONOS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60];

// Cumpleaños y tarifas a punto de caducar, en el Inicio de la administradora: lista desplegable y días de antelación a elegir.
export default function AvisosAdmin() {
  const [datos, setDatos] = useState<AvisosInicio | null>(null);

  const cargar = () => obtenerAvisosInicio().then(setDatos).catch(() => {});
  useEffect(() => {
    cargar();
  }, []);

  if (!datos) return null;

  async function elegir(que: "cumples" | "bonos", dias: number) {
    await elegirDiasAvisoInicio(que, dias);
    await cargar();
  }

  const dia = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
  const opciones = (base: number[], actual: number) => [...new Set([...base, actual])].sort((a, b) => a - b);

  return (
    <>
      <div className={clay.consejoEnvoltura}>
        <span className={clay.insignia} aria-hidden="true">🎂</span>
        <section className={clay.consejo}>
          <p className={clay.consejoTexto}>
            <strong>Cumpleaños</strong>
          </p>
          {datos.cumples.length === 0 ? (
            <p style={{ margin: "4px 0" }}>{datos.antelacionCumples === 0 ? "Hoy no cumple años nadie." : `No cumple años nadie en los próximos ${dia(datos.antelacionCumples)}.`}</p>
          ) : (
            <details open>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {datos.cumples.length} {datos.cumples.length === 1 ? "persona" : "personas"}
              </summary>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {datos.cumples.map((c) => (
                  <li key={c.id}>
                    <strong>{c.nombre}</strong> · {textoCuando(c)}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: "0.9rem" }}>
            Avisarme con
            <select value={datos.antelacionCumples} onChange={(e) => elegir("cumples", Number(e.target.value))}>
              {opciones(DIAS_CUMPLES, datos.antelacionCumples).map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "el mismo día" : `${dia(n)} de antelación`}
                </option>
              ))}
            </select>
          </label>
        </section>
      </div>

      <div className={clay.consejoEnvoltura}>
        <span className={clay.insignia} aria-hidden="true">⏳</span>
        <section className={clay.consejo}>
          <p className={clay.consejoTexto}>
            <strong>Tarifas a punto de caducar</strong>
          </p>
          {datos.caducan.length === 0 ? (
            <p style={{ margin: "4px 0" }}>A nadie se le acaba la tarifa en los próximos {dia(datos.diasBonos)}.</p>
          ) : (
            <details open>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>
                {datos.caducan.length} {datos.caducan.length === 1 ? "persona" : "personas"}
              </summary>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                {datos.caducan.map((b, i) => (
                  <li key={`${b.userId}-${i}`}>
                    <Link href={`/admin/usuarios/${b.userId}`}>
                      <strong>{b.nombre}</strong>
                    </Link>{" "}
                    · {b.tarifa} · caduca {b.cuando}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, fontSize: "0.9rem" }}>
            Avisarme con
            <select value={datos.diasBonos} onChange={(e) => elegir("bonos", Number(e.target.value))}>
              {opciones(DIAS_BONOS, datos.diasBonos).map((n) => (
                <option key={n} value={n}>
                  {dia(n)} de antelación
                </option>
              ))}
            </select>
          </label>
        </section>
      </div>
    </>
  );
}
