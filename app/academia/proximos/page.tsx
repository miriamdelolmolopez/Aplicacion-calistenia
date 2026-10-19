"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import { useIdioma } from "../../useIdioma";
import estilos from "../academia.module.css";
import { DetalleCurso, TarjetaCurso } from "../TarjetaCurso";
import { textosAcademia } from "../textosAcademia";
import { COLUMNAS_CURSO, type Curso } from "@/lib/cursos";
import { createClient } from "@/lib/supabase/client";

export default function ProximosCursos() {
  const [idioma] = useIdioma();
  const t = textosAcademia[idioma];
  const [cursos, setCursos] = useState<Curso[] | null>(null);
  const [abierto, setAbierto] = useState<Curso | null>(null);

  useEffect(() => {
    createClient()
      .from("cursos")
      .select(COLUMNAS_CURSO)
      .eq("estado", "proximo")
      .then(({ data }) => {
        // Primero los que tienen fecha, de más cercana a más lejana.
        const lista = ((data ?? []) as Curso[]).sort((a, b) => {
          if (a.fecha_prevista && b.fecha_prevista) return a.fecha_prevista.localeCompare(b.fecha_prevista);
          if (a.fecha_prevista) return -1;
          if (b.fecha_prevista) return 1;
          return b.creado_en.localeCompare(a.creado_en);
        });
        setCursos(lista);
      });
  }, []);

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/academia", texto: "volver" }} />
      <h1 className={estilos.titulo}>{t.proximos}</h1>

      {cursos === null && <p className={styles.aviso}>{t.cargando}</p>}
      {cursos !== null && cursos.length === 0 && <p className={styles.aviso}>{t.sinCursos}</p>}

      <ul className={estilos.lista}>
        {(cursos ?? []).map((c) => (
          <li key={c.id}>
            <TarjetaCurso curso={c} idioma={idioma} mostrarFecha alPulsar={() => setAbierto(c)} />
          </li>
        ))}
      </ul>

      {abierto && <DetalleCurso curso={abierto} idioma={idioma} alCerrar={() => setAbierto(null)} />}
    </main>
  );
}
