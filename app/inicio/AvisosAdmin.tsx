"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { obtenerFotos } from "../perfil/acciones";
import Avatar from "../Avatar";
import Icono from "../Icono";
import etq from "../etiquetas.module.css";
import { elegirDiasAvisoInicio, obtenerAvisosInicio, type AvisosInicio } from "./accionesAdmin";
import estilos from "./inicio.module.css";

const DIAS_CUMPLES = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30];
const DIAS_BONOS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60];
const VISIBLES = 4;

const cuandoCorto = (n: number) => (n <= 0 ? "hoy" : n === 1 ? "mañana" : `en ${n} días`);

// «Atención»: lo que pide una mirada hoy (cumpleaños y tarifas que se acaban) en una sola tarjeta, sin listas largas.
export default function AvisosAdmin() {
  const [datos, setDatos] = useState<AvisosInicio | null>(null);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [todas, setTodas] = useState(false);

  const cargar = () => obtenerAvisosInicio().then(setDatos).catch(() => {});
  useEffect(() => {
    cargar();
  }, []);
  useEffect(() => {
    if (!datos || datos.cumples.length === 0) return;
    obtenerFotos(datos.cumples.map((c) => c.id)).then(setFotos).catch(() => {});
  }, [datos]);

  if (!datos) return null;

  async function elegir(que: "cumples" | "bonos", dias: number) {
    await elegirDiasAvisoInicio(que, dias);
    await cargar();
  }

  const dia = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
  const opciones = (base: number[], actual: number) => [...new Set([...base, actual])].sort((a, b) => a - b);
  const etiquetaCaduca = (f: number) => (f <= 0 ? etq.rojo : f <= 3 ? etq.ambar : etq.gris);
  const vistas = todas ? datos.caducan : datos.caducan.slice(0, VISIBLES);
  const nada = datos.cumples.length === 0 && datos.caducan.length === 0;

  return (
    <section className={estilos.atencion} aria-label="Atención">
      <h2 className={estilos.resumenSeccion} style={{ margin: 0 }}>Atención</h2>

      {nada && (
        <p className={estilos.atencionVacio}>
          Todo al día: nadie cumple años ni se le acaba la tarifa en los próximos días.
        </p>
      )}

      {datos.cumples.length > 0 && (
        <div className={estilos.atencionBloque}>
          <h3 className={estilos.atencionTitulo}>
            <span className={`${estilos.atencionChip} ${estilos.chipRosa}`}><Icono nombre="regalo" tamano={15} /></span>
            Cumpleaños
          </h3>
          <ul className={estilos.cumpleFila}>
            {datos.cumples.map((c) => (
              <li key={c.id} className={estilos.cumplePersona}>
                <span className={estilos.cumpleAnillo}>
                  <Avatar nombre={c.nombre} url={fotos[c.id]} tamano={48} />
                </span>
                <strong>{c.nombre.split(" ")[0]}</strong>
                <small>
                  {cuandoCorto(c.faltan)}
                  {c.edad > 0 ? ` · ${c.edad}` : ""}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}

      {datos.caducan.length > 0 && (
        <div className={estilos.atencionBloque}>
          <h3 className={estilos.atencionTitulo}>
            <span className={`${estilos.atencionChip} ${estilos.chipAmbar}`}><Icono nombre="relojArena" tamano={15} /></span>
            Tarifas que se acaban
            <span className={`${etq.etq} ${etq.ambar}`} style={{ marginLeft: "auto" }}>{datos.caducan.length}</span>
          </h3>
          <ul className={estilos.caducaLista}>
            {vistas.map((b, i) => (
              <li key={`${b.userId}-${i}`}>
                <Link href={`/admin/usuarios/${b.userId}`} className={estilos.caducaFila}>
                  <Avatar nombre={b.nombre} url={null} tamano={32} />
                  <span className={estilos.caducaTexto}>
                    <strong>{b.nombre}</strong>
                    <small>{b.tarifa}</small>
                  </span>
                  <span className={`${etq.etq} ${etiquetaCaduca(b.faltan)}`}>{cuandoCorto(b.faltan)}</span>
                </Link>
              </li>
            ))}
          </ul>
          {datos.caducan.length > VISIBLES && (
            <button type="button" className={estilos.verMas} onClick={() => setTodas(!todas)}>
              {todas ? "Ver menos" : `Ver las ${datos.caducan.length}`}
            </button>
          )}
        </div>
      )}

      <details className={estilos.ajusteAvisos}>
        <summary>Ajustar avisos</summary>
        <label>
          Cumpleaños con
          <select value={datos.antelacionCumples} onChange={(e) => elegir("cumples", Number(e.target.value))}>
            {opciones(DIAS_CUMPLES, datos.antelacionCumples).map((n) => (
              <option key={n} value={n}>
                {n === 0 ? "el mismo día" : `${dia(n)} de antelación`}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tarifas con
          <select value={datos.diasBonos} onChange={(e) => elegir("bonos", Number(e.target.value))}>
            {opciones(DIAS_BONOS, datos.diasBonos).map((n) => (
              <option key={n} value={n}>
                {dia(n)} de antelación
              </option>
            ))}
          </select>
        </label>
      </details>
    </section>
  );
}
