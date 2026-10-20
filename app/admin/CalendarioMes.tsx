"use client";

import { useState } from "react";
import { lunesDe, sumarDias } from "@/lib/fechas";
import estilos from "./calendario.module.css";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const DIAS = ["LU", "MA", "MI", "JU", "VI", "SÁ", "DO"];

function dosCifras(n: number): string {
  return String(n).padStart(2, "0");
}

// Calendario de un mes (de lunes a domingo).
//  modo «semana»: al pulsar un día o la flecha de una fila se elige esa semana entera.
//  modo «dias»: se marcan y desmarcan días sueltos (la flecha de una fila marca o quita la semana).
export default function CalendarioMes({
  modo,
  hoy,
  mesInicial,
  semana,
  seleccionados = [],
  marcados = {},
  alElegirSemana,
  alCambiarDias,
}: {
  modo: "semana" | "dias";
  hoy: string; // AAAA-MM-DD
  mesInicial: string; // AAAA-MM
  semana?: string; // lunes de la semana elegida
  seleccionados?: string[];
  marcados?: Record<string, number>; // días con clases (cuántas)
  alElegirSemana?: (lunes: string) => void;
  alCambiarDias?: (dias: string[]) => void;
}) {
  const [año0, mes0] = mesInicial.split("-").map(Number);
  const [año, setAño] = useState(año0);
  const [mes, setMes] = useState(mes0 - 1); // 0..11

  function moverMes(delta: number) {
    const total = año * 12 + mes + delta;
    setAño(Math.floor(total / 12));
    setMes(((total % 12) + 12) % 12);
  }

  const primero = `${año}-${dosCifras(mes + 1)}-01`;
  const ultimo = sumarDias(`${mes === 11 ? año + 1 : año}-${dosCifras(mes === 11 ? 1 : mes + 2)}-01`, -1);
  const filas: string[][] = [];
  for (let lunes = lunesDe(primero); lunes <= ultimo; lunes = sumarDias(lunes, 7)) {
    filas.push(Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i)));
  }

  function alternarFila(dias: string[]) {
    if (modo === "semana") return alElegirSemana?.(dias[0]);
    const todos = dias.every((d) => seleccionados.includes(d));
    alCambiarDias?.(todos ? seleccionados.filter((d) => !dias.includes(d)) : [...new Set([...seleccionados, ...dias])]);
  }

  function pulsarDia(dia: string) {
    if (modo === "semana") return alElegirSemana?.(lunesDe(dia));
    alCambiarDias?.(seleccionados.includes(dia) ? seleccionados.filter((d) => d !== dia) : [...seleccionados, dia]);
  }

  const años = Array.from({ length: 6 }, (_, i) => año0 - 1 + i);

  return (
    <div className={estilos.calendario}>
      <div className={estilos.cabecera}>
        <button type="button" className={estilos.flecha} aria-label="Mes anterior" onClick={() => moverMes(-1)}>
          ‹
        </button>
        <select aria-label="Mes" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
          {MESES.map((m, i) => (
            <option key={m} value={i}>
              {m}
            </option>
          ))}
        </select>
        <select aria-label="Año" value={año} onChange={(e) => setAño(Number(e.target.value))}>
          {(años.includes(año) ? años : [...años, año].sort()).map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button type="button" className={estilos.flecha} aria-label="Mes siguiente" onClick={() => moverMes(1)}>
          ›
        </button>
      </div>

      <div className={estilos.cuadricula} role="grid">
        <span />
        {DIAS.map((d) => (
          <span key={d} className={estilos.cabeceraDia}>
            {d}
          </span>
        ))}
        {filas.map((dias) => {
          const filaElegida = modo === "semana" ? dias[0] === semana : dias.every((d) => seleccionados.includes(d));
          return [
            <button
              key={`f-${dias[0]}`}
              type="button"
              className={`${estilos.flechaFila} ${filaElegida ? estilos.flechaActiva : ""}`}
              aria-label={`Elegir la semana del ${dias[0]}`}
              onClick={() => alternarFila(dias)}
            >
              ▶
            </button>,
            ...dias.map((dia) => {
              const elegido = modo === "semana" ? dias[0] === semana : seleccionados.includes(dia);
              const fuera = Number(dia.slice(5, 7)) - 1 !== mes;
              const n = marcados[dia] ?? 0;
              return (
                <button
                  key={dia}
                  type="button"
                  className={`${estilos.dia} ${elegido ? estilos.elegido : ""} ${fuera ? estilos.fuera : ""} ${dia === hoy ? estilos.hoy : ""}`}
                  aria-pressed={elegido}
                  title={n > 0 ? `${n} ${n === 1 ? "clase" : "clases"}` : undefined}
                  onClick={() => pulsarDia(dia)}
                >
                  {Number(dia.slice(8, 10))}
                  {n > 0 && <span className={estilos.punto} aria-hidden="true" />}
                </button>
              );
            }),
          ];
        })}
      </div>
    </div>
  );
}
