"use client";

import { useEffect, useState } from "react";
import { TarjetaCifra } from "../admin/informes/GraficosPagos";
import { useIdioma } from "../useIdioma";
import { claveDia, lunesDe, sumarDias } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";
import estilos from "./logros.module.css";

const ENTRENOS_META = [1, 10, 25, 50, 100];
const RACHA_META = [4, 8];

type Datos = { total: number; mes: number; rachaActual: number; mejorRacha: number };

// Logros del entrenamiento online: entrenos terminados y semanas seguidas entrenando.
function calcular(fechas: string[], hoy: string): Datos {
  const dias = fechas.map((f) => claveDia(f));
  const semanas = new Set(dias.map((d) => lunesDe(d)));
  let rachaActual = 0;
  const lunesHoy = lunesDe(hoy);
  for (let i = 0; i < 520; i++) {
    if (semanas.has(sumarDias(lunesHoy, -7 * i))) rachaActual++;
    else if (i > 0) break;
  }
  let mejorRacha = 0;
  let corrida = 0;
  let previa: string | null = null;
  for (const s of [...semanas].sort()) {
    corrida = previa && sumarDias(previa, 7) === s ? corrida + 1 : 1;
    previa = s;
    mejorRacha = Math.max(mejorRacha, corrida);
  }
  return { total: dias.length, mes: dias.filter((d) => d.slice(0, 7) === hoy.slice(0, 7)).length, rachaActual, mejorRacha };
}

export default function LogrosOnline({ userId, admin = false }: { userId?: string; admin?: boolean }) {
  const [idioma] = useIdioma();
  const es = idioma === "es";
  const [datos, setDatos] = useState<Datos | null>(null);

  useEffect(() => {
    let vivo = true;
    (async () => {
      let consulta = createClient().from("entrenos").select("terminado_en").eq("estado", "terminado").not("terminado_en", "is", null).limit(3000);
      if (userId) consulta = consulta.eq("user_id", userId);
      const { data } = await consulta;
      const fechas = ((data ?? []) as { terminado_en: string }[]).map((e) => e.terminado_en);
      if (vivo) setDatos(calcular(fechas, claveDia(new Date().toISOString())));
    })();
    return () => {
      vivo = false;
    };
  }, [userId]);

  if (datos === null) return null;
  const medallas = [
    ...ENTRENOS_META.map((meta) => ({ id: `e-${meta}`, racha: false, meta, valor: datos.total })),
    ...RACHA_META.map((meta) => ({ id: `r-${meta}`, racha: true, meta, valor: datos.mejorRacha })),
  ];

  return (
    <section className={estilos.seccion} aria-label={es ? "Logros online" : "Online achievements"}>
      <h2 className={estilos.titulo}>{es ? "Logros online" : "Online achievements"}</h2>
      {datos.total === 0 ? (
        <p className={estilos.ayuda}>
          {es ? (admin ? "Todavía no ha terminado ningún entreno." : "Cuando termines tu primer entreno, aquí verás tus logros.") : admin ? "She has not finished any workout yet." : "Once you finish your first workout, your achievements will show up here."}
        </p>
      ) : (
        <>
          <div className={estilos.tarjetas}>
            <TarjetaCifra titulo={es ? "Entrenos este mes" : "Workouts this month"} valor={String(datos.mes)} color="#0aa8c0" notas={<span>&nbsp;</span>} />
            <TarjetaCifra
              titulo={es ? "Racha" : "Streak"}
              valor={String(datos.rachaActual)}
              color="#6d5efc"
              notas={
                <>
                  <span>{es ? "semanas seguidas entrenando" : "weeks in a row training"}</span>
                  <span>{es ? `Mejor racha: ${datos.mejorRacha}` : `Best streak: ${datos.mejorRacha}`}</span>
                </>
              }
            />
            <TarjetaCifra titulo={es ? "Entrenos en total" : "Workouts in total"} valor={String(datos.total)} color="#2fb57a" notas={<span>&nbsp;</span>} />
          </div>

          <h3 className={estilos.subtitulo}>{es ? "Medallas online" : "Online medals"}</h3>
          <ul className={estilos.medallas}>
            {medallas.map((m) => {
              const lograda = m.valor >= m.meta;
              return (
                <li key={m.id} className={`${estilos.medalla} ${lograda ? "" : estilos.bloqueada}`}>
                  <span className={estilos.icono} aria-hidden="true">
                    {m.racha ? "🔥" : m.meta}
                  </span>
                  <strong>
                    {m.racha
                      ? es
                        ? `Racha de ${m.meta} semanas`
                        : `${m.meta}-week streak`
                      : m.meta === 1
                        ? es
                          ? "Primer entreno"
                          : "First workout"
                        : es
                          ? `${m.meta} entrenos`
                          : `${m.meta} workouts`}
                  </strong>
                  <small>
                    {lograda
                      ? es
                        ? "¡Conseguida!"
                        : "Earned!"
                      : es
                        ? `Faltan ${m.meta - m.valor}`
                        : `${m.meta - m.valor} to go`}
                  </small>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
