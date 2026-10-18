"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { claveDia, textoDia, textoHora } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";

type Clase = {
  id: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  tipos_clase: { nombre: string } | null;
};

export default function Clases() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [clases, setClases] = useState<Clase[] | null>(null);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const ahora = new Date();
      const limite = new Date(ahora.getTime() + 14 * 24 * 3600 * 1000);
      const { data } = await supabase
        .from("sesiones_clase")
        .select("id, empieza_en, plazas, estado, tipos_clase(nombre)")
        .gte("empieza_en", ahora.toISOString())
        .lte("empieza_en", limite.toISOString())
        .order("empieza_en");
      setClases((data ?? []) as unknown as Clase[]);
    }
    cargar();
  }, []);

  const porDia = new Map<string, Clase[]>();
  for (const c of clases ?? []) {
    const dia = claveDia(c.empieza_en);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/cuenta", texto: "volver" }} />
      <div className={styles.cabecera}>
        <h1>{t.horarioTitulo}</h1>
        <p>{t.horarioIntro}</p>
      </div>

      {clases === null && <p className={styles.aviso}>{t.cargando}</p>}
      {clases?.length === 0 && <p className={styles.aviso}>{t.sinClases}</p>}

      {[...porDia.entries()].map(([dia, lista]) => (
        <section key={dia} className={styles.tarjeta} style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem" }}>{textoDia(lista[0].empieza_en, idioma)}</h2>
          <ul
            className={styles.lista}
            style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 14 }}
          >
            {lista.map((c) => (
              <li
                key={c.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  alignItems: "center",
                  opacity: c.estado === "cancelada" ? 0.55 : 1,
                  textDecoration: c.estado === "cancelada" ? "line-through" : "none",
                }}
              >
                <div>
                  <strong>
                    {textoHora(c.empieza_en)} · {c.tipos_clase?.nombre}
                  </strong>
                  <div className={styles.ayuda}>
                    {c.plazas} {t.plazasTotales}
                  </div>
                </div>
                {c.estado === "cancelada" && <span className={styles.ayuda}>{t.cancelada}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
