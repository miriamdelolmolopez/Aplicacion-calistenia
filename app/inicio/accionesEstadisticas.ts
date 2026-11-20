"use server";

import { requireAdmin } from "@/lib/admin";
import { nombresFormas } from "@/lib/formasPago";
import { informeAtletas } from "@/lib/informes";

export type Estadisticas = {
  i: {
    personas: { total: number; alumnas: number; invitadas: number; activas: number };
    por_servicio: { grupal: number; individual: number; online: number; sin_servicio: number };
    por_sexo: { mujer: number; hombre: number; otro: number; sin_dato: number };
    por_edad: Record<string, number>;
    altas_mensuales: { mes: string; altas: number }[];
    tarifas: { nombre: string; servicio: string; contratadas: number; ingresos: number }[];
    ingresos: {
      total_periodo: number;
      total_periodo_anterior: number;
      total_mismo_periodo_ano_anterior: number;
      descuentos_periodo: number;
      pendiente_cobro: number;
      pagos_periodo: number;
      por_metodo: { metodo: string; total: number }[];
      por_servicio: { servicio: string; total: number }[];
      mensual: { mes: string; total: number; ano_anterior: number }[];
    };
    conversion: { pruebas: number; convertidas: number };
  };
  atletas: {
    nuevos: number;
    perdidas: number;
    pruebas: number;
    totalAusencias: number;
    retencion: { base: number; siguen: number } | null;
    ocupacion: { texto: string; valor: number }[];
  };
  metodos: Record<string, string>;
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Estadísticas del Inicio de la administradora para el periodo elegido (mismos datos que Informes).
export async function obtenerEstadisticas(desde: string, hasta: string): Promise<Estadisticas | null> {
  const { supabase } = await requireAdmin();
  if (!FECHA.test(desde) || !FECHA.test(hasta) || desde > hasta) return null;
  const [{ data }, atletas, metodos] = await Promise.all([
    supabase.rpc("estadisticas", { p_desde: desde, p_hasta: hasta }),
    informeAtletas({ desde, hasta }),
    nombresFormas(),
  ]);
  if (!data) return null;
  return {
    i: data as Estadisticas["i"],
    atletas: {
      nuevos: atletas.nuevos.length,
      perdidas: atletas.perdidas.length,
      pruebas: atletas.pruebas,
      totalAusencias: atletas.totalAusencias,
      retencion: atletas.retencion,
      ocupacion: atletas.ocupacion.map((o) => ({ texto: o.texto, valor: o.valor })),
    },
    metodos: metodos as Record<string, string>,
  };
}
