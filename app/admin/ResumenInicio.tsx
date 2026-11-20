import { claveDia } from "@/lib/fechas";
import { euros } from "@/lib/formato";
import { rangoDe } from "@/lib/periodos";
import { createClient } from "@/lib/supabase/server";
import styles from "./admin.module.css";
import g from "./informes/informes.module.css";
import { Cambio, LineaMensual, TarjetaCifra } from "./informes/GraficosPagos";

type Resumen = {
  personas: { activas: number; alumnas: number; invitadas: number };
  altas_mensuales: { mes: string; altas: number }[];
  ingresos: {
    total_periodo: number;
    total_periodo_anterior: number;
    pendiente_cobro: number;
    pagos_periodo: number;
    mensual: { mes: string; total: number; ano_anterior: number }[];
  };
  conversion: { pruebas: number; convertidas: number };
};

// Resumen del mes para el Inicio de Administración: cifras con su subida o bajada y dos gráficos.
export default async function ResumenInicio() {
  const supabase = await createClient();
  const hoy = claveDia(new Date().toISOString());
  const rango = rangoDe("mes", hoy);
  const { data } = await supabase.rpc("estadisticas", { p_desde: rango.desde, p_hasta: rango.hasta });
  const r = data as Resumen | null;
  if (!r) return null;

  const altas = r.altas_mensuales ?? [];
  const altasMes = altas.at(-1)?.altas ?? 0;
  const altasAntes = altas.at(-2)?.altas ?? 0;

  return (
    <section className={styles.tarjeta}>
      <h2>Resumen de este mes</h2>
      <div className={g.tarjetas}>
        <TarjetaCifra
          titulo="Cobrado este mes"
          valor={euros(r.ingresos.total_periodo)}
          color="#0aa8c0"
          notas={
            <>
              <span>{r.ingresos.pagos_periodo} pagos</span>
              <Cambio actual={r.ingresos.total_periodo} antes={r.ingresos.total_periodo_anterior} etiqueta="vs mes anterior" />
            </>
          }
        />
        <TarjetaCifra
          titulo="Alumnos/as activos/as"
          valor={String(r.personas.activas)}
          color="#6d5efc"
          notas={<span>{r.personas.alumnas} alumnos/as · {r.personas.invitadas} invitados/as</span>}
        />
        <TarjetaCifra
          titulo="Altas nuevas"
          valor={String(altasMes)}
          color="#2fb57a"
          notas={<Cambio actual={altasMes} antes={altasAntes} etiqueta="vs mes anterior" />}
        />
        <TarjetaCifra
          titulo="Pendiente de cobro"
          valor={euros(r.ingresos.pendiente_cobro)}
          color="#f5a524"
          notas={<span>{r.conversion.pruebas} pruebas · {r.conversion.convertidas} se apuntaron</span>}
        />
      </div>
      <div className={g.rejilla2}>
        <div className={g.bloque}>
          <h3>Ingresos mes a mes</h3>
          <LineaMensual datos={(r.ingresos.mensual ?? []).map((m) => ({ mes: m.mes, total: m.total, anterior: m.ano_anterior }))} />
        </div>
        <div className={g.bloque}>
          <h3>Altas mes a mes</h3>
          <LineaMensual formato={String} entero datos={altas.map((m) => ({ mes: m.mes, total: m.altas }))} />
        </div>
      </div>
    </section>
  );
}
