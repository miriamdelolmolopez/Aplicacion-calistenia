"use client";

import Link from "next/link";
import { useState } from "react";
import { lunesDe, sumarDias } from "@/lib/fechas";
import estilos from "./resumen.module.css";

export type ClaseDia = { hora: string; nombre: string; color: string };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function dosCifras(n: number): string {
  return String(n).padStart(2, "0");
}

// Resumen de un mes en cuadrículas: cada día muestra las clases que hay publicadas. Al pulsar un día se abre su semana en el Horario.
export default function ResumenMes({
  hoy,
  clases,
}: {
  hoy: string;
  clases: Record<string, ClaseDia[]>;
}) {
  const [año0, mes0] = hoy.split("-").map(Number);
  const [año, setAño] = useState(año0);
  const [mes, setMes] = useState(mes0 - 1);

  function mover(delta: number) {
    const total = año * 12 + mes + delta;
    setAño(Math.floor(total / 12));
    setMes(((total % 12) + 12) % 12);
  }

  const primero = `${año}-${dosCifras(mes + 1)}-01`;
  const ultimo = sumarDias(`${mes === 11 ? año + 1 : año}-${dosCifras(mes === 11 ? 1 : mes + 2)}-01`, -1);
  const dias: string[] = [];
  for (let d = lunesDe(primero); d <= ultimo || dias.length % 7 !== 0; d = sumarDias(d, 1)) dias.push(d);

  const totalMes = dias
    .filter((d) => Number(d.slice(5, 7)) - 1 === mes)
    .reduce((n, d) => n + (clases[d]?.length ?? 0), 0);

  return (
    <div className={estilos.resumen}>
      <div className={estilos.cabecera}>
        <button type="button" onClick={() => mover(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <strong>
          {MESES[mes]} {año}
        </strong>
        <button type="button" onClick={() => mover(1)} aria-label="Mes siguiente">
          ›
        </button>
      </div>
      <p className={estilos.total}>{totalMes === 0 ? "No hay clases publicadas este mes." : `${totalMes} clases publicadas este mes.`}</p>
      <div className={estilos.desliza}>
        <div className={estilos.cuadricula}>
          {DIAS.map((d) => (
            <span key={d} className={estilos.cabeceraDia}>
              {d}
            </span>
          ))}
          {dias.map((dia) => {
            const lista = clases[dia] ?? [];
            const fuera = Number(dia.slice(5, 7)) - 1 !== mes;
            return (
              <Link
                key={dia}
                href={`/admin/horario?semana=${lunesDe(dia)}`}
                className={`${estilos.dia} ${fuera ? estilos.fuera : ""} ${dia === hoy ? estilos.hoy : ""}`}
              >
                <span className={estilos.numero}>{Number(dia.slice(8, 10))}</span>
                {lista.slice(0, 3).map((c, i) => (
                  <span key={i} className={estilos.chip} style={{ borderLeftColor: c.color }}>
                    {c.hora} {c.nombre}
                  </span>
                ))}
                {lista.length > 3 && <span className={estilos.mas}>+{lista.length - 3} más</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
