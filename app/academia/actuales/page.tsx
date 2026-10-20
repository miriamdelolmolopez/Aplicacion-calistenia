"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import PanelFiltros from "../../PanelFiltros";
import styles from "../../formularios.module.css";
import { useIdioma } from "../../useIdioma";
import estilos from "../academia.module.css";
import { DetalleCurso, TarjetaCurso } from "../TarjetaCurso";
import { textosAcademia } from "../textosAcademia";
import { COLUMNAS_CURSO, NIVELES, type Curso } from "@/lib/cursos";
import { createClient } from "@/lib/supabase/client";

type Orden = "fecha" | "popularidad" | "valoracion" | "precio_asc" | "precio_desc";

export default function CursosActuales() {
  const [idioma] = useIdioma();
  const t = textosAcademia[idioma];
  const [cursos, setCursos] = useState<Curso[] | null>(null);
  const [categoria, setCategoria] = useState("");
  const [precio, setPrecio] = useState<"todos" | "gratis" | "pago">("todos");
  const [nivel, setNivel] = useState("");
  const [orden, setOrden] = useState<Orden>("fecha");
  const [abierto, setAbierto] = useState<Curso | null>(null);

  useEffect(() => {
    createClient()
      .from("cursos")
      .select(COLUMNAS_CURSO)
      .eq("estado", "activo")
      .then(({ data }) => setCursos((data ?? []) as Curso[]));
  }, []);

  const categorias = [...new Set((cursos ?? []).map((c) => c.categoria).filter((c): c is string => !!c))].sort((a, b) =>
    a.localeCompare(b, idioma),
  );

  const visibles = (cursos ?? [])
    .filter((c) => !categoria || c.categoria === categoria)
    .filter((c) => precio === "todos" || (precio === "gratis" ? c.precio_centimos === 0 : c.precio_centimos > 0))
    .filter((c) => !nivel || c.nivel === nivel)
    .sort((a, b) => {
      if (orden === "popularidad") return b.popularidad - a.popularidad;
      if (orden === "valoracion") return (b.valoracion ?? -1) - (a.valoracion ?? -1);
      if (orden === "precio_asc") return a.precio_centimos - b.precio_centimos;
      if (orden === "precio_desc") return b.precio_centimos - a.precio_centimos;
      return b.creado_en.localeCompare(a.creado_en);
    });

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/academia", texto: "volver" }} />
      <h1 className={estilos.titulo}>{t.actuales}</h1>

      {cursos === null && <p className={styles.aviso}>{t.cargando}</p>}
      {cursos !== null && cursos.length === 0 && <p className={styles.aviso}>{t.sinCursos}</p>}

      {cursos !== null && cursos.length > 0 && (
        <>
          <PanelFiltros
            etiqueta={idioma === "en" ? "Filters" : "Filtros"}
            activos={(categoria ? 1 : 0) + (precio !== "todos" ? 1 : 0) + (nivel ? 1 : 0) + (orden !== "fecha" ? 1 : 0)}
          >
          <div className={estilos.filtrosPlano}>
            <label>
              {t.categoria}
              <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                <option value="">{t.todasCategorias}</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.precio}
              <select value={precio} onChange={(e) => setPrecio(e.target.value as "todos" | "gratis" | "pago")}>
                <option value="todos">{t.todosPrecios}</option>
                <option value="gratis">{t.gratis}</option>
                <option value="pago">{t.dePago}</option>
              </select>
            </label>
            <label>
              {t.nivel}
              <select value={nivel} onChange={(e) => setNivel(e.target.value)}>
                <option value="">{t.todosNiveles}</option>
                {NIVELES.map((n) => (
                  <option key={n.valor} value={n.valor}>
                    {n[idioma]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t.ordenar}
              <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
                <option value="fecha">{t.ordenFecha}</option>
                <option value="popularidad">{t.ordenPopularidad}</option>
                <option value="valoracion">{t.ordenValoracion}</option>
                <option value="precio_asc">{t.ordenPrecioAsc}</option>
                <option value="precio_desc">{t.ordenPrecioDesc}</option>
              </select>
            </label>
          </div>
          </PanelFiltros>

          {visibles.length === 0 && <p className={styles.aviso}>{t.sinResultados}</p>}
          <ul className={estilos.lista}>
            {visibles.map((c) => (
              <li key={c.id}>
                <TarjetaCurso curso={c} idioma={idioma} alPulsar={() => setAbierto(c)} />
              </li>
            ))}
          </ul>
        </>
      )}

      {abierto && <DetalleCurso curso={abierto} idioma={idioma} alCerrar={() => setAbierto(null)} />}
    </main>
  );
}
