"use client";

import { useState } from "react";
import styles from "../admin.module.css";
import Buscador from "../comunes/Buscador";
import comunes from "../comunes/comunes.module.css";

export type FilaFactura = {
  id: string;
  numero: string;
  rectificativa: boolean;
  anio: number;
  emitidaEn: string;
  persona: string;
  centimos: number;
  enlace: string;
};

const euros = (c: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(c / 100);
const dia = (iso: string) => new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Lista de facturas con buscador y filtros por año y por tipo (normales / rectificativas).
export default function ListaFacturas({ filas }: { filas: FilaFactura[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [anio, setAnio] = useState("todos");
  const [tipo, setTipo] = useState("todas");

  const anios = [...new Set(filas.map((f) => f.anio))].sort((a, b) => b - a);
  const q = normal(busqueda.trim());
  const visibles = filas
    .filter((f) => anio === "todos" || String(f.anio) === anio)
    .filter((f) => tipo === "todas" || (tipo === "rectificativas" ? f.rectificativa : !f.rectificativa))
    .filter((f) => !q || normal(`${f.numero} ${f.persona}`).includes(q));

  return (
    <>
      <section className={styles.tarjeta}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          <div className={styles.campo} style={{ flex: "1 1 220px" }}>
            <Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Número o nombre…" />
          </div>
          <div className={styles.campo} style={{ flex: "1 1 140px" }}>
            <label htmlFor="fa-anio">Año</label>
            <select id="fa-anio" value={anio} onChange={(e) => setAnio(e.target.value)}>
              <option value="todos">Todos</option>
              {anios.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.campo} style={{ flex: "1 1 160px" }}>
            <label htmlFor="fa-tipo">Tipo</label>
            <select id="fa-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="normales">Normales (FS)</option>
              <option value="rectificativas">Rectificativas (FSR)</option>
            </select>
          </div>
        </div>
        <p className={styles.ayuda} style={{ margin: 0 }}>
          {visibles.length} de {filas.length}
        </p>
      </section>

      {filas.length === 0 && <p className={comunes.sinResultados}>Todavía no hay facturas: se crean solas al cobrar un pago.</p>}
      {filas.length > 0 && visibles.length === 0 && <p className={comunes.sinResultados}>Ninguna factura coincide con lo que has buscado.</p>}

      {visibles.map((f) => (
        <section key={f.id} className={styles.tarjeta}>
          <div className={styles.personaCabecera}>
            <div>
              <strong>{f.numero}</strong>
              {f.rectificativa && <span className={styles.etiquetaSuave} style={{ marginLeft: 8 }}>Rectificativa</span>}
              <div className={styles.ayuda}>
                {f.persona} · {dia(f.emitidaEn)} · {euros(f.centimos)}
              </div>
            </div>
            <a href={f.enlace} download className={`${styles.boton} ${styles.botonSecundario}`}>
              Descargar PDF
            </a>
          </div>
        </section>
      ))}
    </>
  );
}
