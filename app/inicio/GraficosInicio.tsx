"use client";

import { useEffect, useState } from "react";
import { claveDia } from "@/lib/fechas";
import { rangoDe } from "@/lib/periodos";
import { createClient } from "@/lib/supabase/client";
import { LineaMensual } from "../admin/informes/GraficosPagos";
import estilos from "./inicio.module.css";

type Datos = {
  altas_mensuales: { mes: string; altas: number }[];
  ingresos: { mensual: { mes: string; total: number; ano_anterior: number }[] };
};

// Dos gráficos de evolución (ingresos y altas, últimos 12 meses) para el Inicio de la administradora.
export default function GraficosInicio() {
  const [d, setD] = useState<Datos | null>(null);

  useEffect(() => {
    const r = rangoDe("mes", claveDia(new Date().toISOString()));
    createClient()
      .rpc("estadisticas", { p_desde: r.desde, p_hasta: r.hasta })
      .then(({ data }) => setD((data as Datos | null) ?? null));
  }, []);

  if (!d) return null;
  return (
    <>
      <h2 className={estilos.resumenSeccion}>Evolución</h2>
      <div className={estilos.graficos}>
        <div className={estilos.graficoTarjeta}>
          <h3>Ingresos mes a mes</h3>
          <LineaMensual datos={(d.ingresos.mensual ?? []).map((m) => ({ mes: m.mes, total: m.total, anterior: m.ano_anterior }))} />
        </div>
        <div className={estilos.graficoTarjeta}>
          <h3>Altas mes a mes</h3>
          <LineaMensual formato={String} entero datos={(d.altas_mensuales ?? []).map((m) => ({ mes: m.mes, total: m.altas }))} />
        </div>
      </div>
    </>
  );
}
