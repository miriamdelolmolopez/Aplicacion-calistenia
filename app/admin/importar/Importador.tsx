"use client";

import { useState } from "react";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import { leerCsv, leerTabla, PLANTILLA_CSV, type FilaLeida } from "@/lib/importar";
import { correosConCuenta, importarLote, type ResultadoFila } from "./acciones";

type Fase = "inicio" | "revisar" | "importando" | "hecho";

// Subida masiva de contactos: se sube un CSV o Excel, se revisa, y se crean las cuentas por tandas.
export default function Importador() {
  const [fase, setFase] = useState<Fase>("inicio");
  const [tipoPorDefecto, setTipoPorDefecto] = useState<"alumno" | "invitado">("alumno");
  const [filas, setFilas] = useState<FilaLeida[]>([]);
  const [error, setError] = useState("");
  const [cuantas, setCuantas] = useState("15");
  const [enviar, setEnviar] = useState(true);
  const [resultados, setResultados] = useState<ResultadoFila[]>([]);
  const [hechas, setHechas] = useState(0);

  const listas = filas.filter((f) => f.problemas.length === 0);
  const conProblemas = filas.length - listas.length;
  const aCrear = Math.min(Math.max(Math.floor(Number(cuantas)) || 0, 0), 50, listas.length);

  async function leer(archivo: File) {
    setError("");
    try {
      let tabla: string[][];
      if (/\.xlsx$/i.test(archivo.name)) {
        const { readSheet } = await import("read-excel-file/browser");
        tabla = ((await readSheet(archivo)) as unknown[][]).map((f) => f.map((c) => (c === null || c === undefined ? "" : String(c))));
      } else if (/\.(csv|txt)$/i.test(archivo.name)) {
        tabla = leerCsv(await archivo.text());
      } else {
        return setError("Sube un archivo CSV o Excel (.xlsx). Si tu Excel es antiguo (.xls), guárdalo como .xlsx o como CSV.");
      }
      const { filas: leidas, error: fallo } = leerTabla(tabla, tipoPorDefecto);
      if (fallo) return setError(fallo);
      // Las que ya tienen cuenta se marcan para no duplicarlas.
      const existentes = new Set(await correosConCuenta(leidas.filter((f) => f.problemas.length === 0).map((f) => f.correo)));
      setFilas(leidas.map((f) => (existentes.has(f.correo) ? { ...f, problemas: [...f.problemas, "Ya tiene cuenta"] } : f)));
      setResultados([]);
      setHechas(0);
      setFase("revisar");
    } catch {
      setError("No he podido leer el archivo. Comprueba que es un CSV o un Excel (.xlsx) y que la primera fila tiene los títulos.");
    }
  }

  async function importar() {
    const lista = listas.slice(0, aCrear);
    setFase("importando");
    setResultados([]);
    setHechas(0);
    for (let i = 0; i < lista.length; i += 5) {
      const lote = lista.slice(i, i + 5);
      const r = await importarLote(
        lote.map(({ correo, nombre, apellidos, telefono, tipo, servicios }) => ({ correo, nombre, apellidos, telefono, tipo, servicios })),
        enviar,
      );
      setResultados((x) => [...x, ...r]);
      setHechas(i + lote.length);
    }
    setFase("hecho");
  }

  function descargarPlantilla() {
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(new Blob(["﻿" + PLANTILLA_CSV], { type: "text/csv;charset=utf-8" }));
    enlace.download = "plantilla-contactos.csv";
    enlace.click();
    URL.revokeObjectURL(enlace.href);
  }

  const creadas = resultados.filter((r) => r.ok).length;
  const falladas = resultados.filter((r) => !r.ok);

  return (
    <section className={styles.tarjeta}>
      {fase === "inicio" && (
        <>
          <p className={styles.ayuda}>
            Sube un archivo con tus contactos (CSV o Excel .xlsx). La primera fila son los títulos: <strong>correo</strong> (obligatorio), nombre, apellidos, teléfono,
            tipo (alumno/a o invitado/a) y servicios (grupal, individual, online, taller; si son varios, sepáralos con «+»).
          </p>
          <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={descargarPlantilla}>
            Descargar plantilla (CSV)
          </button>
          <div className={styles.campo}>
            <label htmlFor="imp-tipo">
              Si en el archivo no pone el tipo, son… <AyudaI texto="Para las filas que no tengan la columna «tipo» o la tengan vacía." />
            </label>
            <select id="imp-tipo" value={tipoPorDefecto} onChange={(e) => setTipoPorDefecto(e.target.value as "alumno" | "invitado")}>
              <option value="alumno">Alumnos/as</option>
              <option value="invitado">Invitados/as</option>
            </select>
          </div>
          <div className={styles.campo}>
            <label htmlFor="imp-archivo">Archivo</label>
            <input id="imp-archivo" type="file" accept=".csv,.txt,.xlsx" onChange={(e) => e.target.files?.[0] && leer(e.target.files[0])} />
          </div>
        </>
      )}

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {fase === "revisar" && (
        <>
          <p className={styles.aviso}>
            {filas.length} filas leídas: <strong>{listas.length} listas</strong>
            {conProblemas > 0 && <> y <strong>{conProblemas} con problemas</strong> (no se importarán)</>}.
          </p>
          <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid var(--linea)", borderRadius: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  {["Fila", "Correo", "Nombre", "Tipo", "Servicios", "Estado"].map((t) => (
                    <th key={t} style={{ textAlign: "left", padding: "6px 8px", position: "sticky", top: 0, background: "var(--blanco)" }}>
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => (
                  <tr key={f.linea} style={{ borderTop: "1px solid var(--linea)" }}>
                    <td style={{ padding: "6px 8px" }}>{f.linea}</td>
                    <td style={{ padding: "6px 8px", overflowWrap: "anywhere" }}>{f.correo}</td>
                    <td style={{ padding: "6px 8px" }}>{[f.nombre, f.apellidos].filter(Boolean).join(" ")}</td>
                    <td style={{ padding: "6px 8px" }}>{f.tipo === "alumno" ? "Alumno/a" : "Invitado/a"}</td>
                    <td style={{ padding: "6px 8px" }}>{f.servicios.join(" + ")}</td>
                    <td style={{ padding: "6px 8px", color: f.problemas.length ? "#b42318" : undefined }}>{f.problemas.length ? f.problemas.join(" · ") : "✓ Lista"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.campo}>
            <label htmlFor="imp-cuantas">
              ¿Cuántas cuentas creo ahora? <AyudaI texto="Para no pasarte del límite de correos al día, crea tandas pequeñas (por ejemplo 15). Lo que quede lo importas otro día volviendo a subir el mismo archivo: las que ya tienen cuenta se saltan solas." />
            </label>
            <input id="imp-cuantas" type="number" min={1} max={50} value={cuantas} onChange={(e) => setCuantas(e.target.value)} />
            <span className={styles.ayuda}>Máximo 50 por vez. Hay {listas.length} listas.</span>
          </div>
          <label className={styles.casilla}>
            <input type="checkbox" checked={enviar} onChange={(e) => setEnviar(e.target.checked)} />
            <span>Enviar la invitación por correo ahora (si no, se crean las cuentas y te doy los enlaces)</span>
          </label>
          <button type="button" className={styles.boton} disabled={aCrear === 0} onClick={importar}>
            Crear {aCrear} {aCrear === 1 ? "cuenta" : "cuentas"}
            {enviar ? " y enviar invitaciones" : ""}
          </button>
          <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setFase("inicio")}>
            Elegir otro archivo
          </button>
        </>
      )}

      {fase === "importando" && (
        <p className={styles.aviso} role="status">
          Creando cuentas… {hechas} de {aCrear}. No cierres esta pantalla.
        </p>
      )}

      {fase === "hecho" && (
        <>
          <p className={styles.aviso} role="status">
            Listo: <strong>{creadas}</strong> {creadas === 1 ? "cuenta creada" : "cuentas creadas"}
            {falladas.length > 0 && <>, {falladas.length} con error</>}.
            {listas.length > aCrear && <> Quedan {listas.length - aCrear} por importar: vuelve a subir el mismo archivo otro día.</>}
          </p>
          {resultados
            .filter((r) => !r.ok || r.enlace)
            .map((r) => (
              <div key={r.correo} className={r.ok ? styles.aviso : styles.error}>
                <strong>{r.correo}</strong>: {r.mensaje}
                {r.enlace && (
                  <div style={{ overflowWrap: "anywhere", fontSize: "0.8rem" }}>
                    Enlace para mandarle por WhatsApp: {r.enlace}
                  </div>
                )}
              </div>
            ))}
          <button type="button" className={styles.boton} onClick={() => setFase("inicio")}>
            Importar otro archivo
          </button>
        </>
      )}
    </section>
  );
}
