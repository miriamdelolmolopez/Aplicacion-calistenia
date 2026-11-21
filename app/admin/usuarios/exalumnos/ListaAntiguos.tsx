"use client";

import { useState } from "react";
import { fechaCorta } from "@/lib/fechas";
import Buscador from "../../comunes/Buscador";
import PanelFiltros from "../../../PanelFiltros";
import styles from "../../admin.module.css";
import estilos from "../usuarios.module.css";
import etq from "../../../etiquetas.module.css";
import AccionesPersona from "./AccionesPersona";
import { TEXTO_TIPO } from "./tipos";

export type PersonaAntigua = { id: string; nombre: string | null; correo: string | null; dni: string | null; telefono: string | null; origen: string; tipos: string[]; bloquea_prueba: boolean; nota: string | null; creado_en: string };

// Personas antiguas (exalumnos/as o invitados/as que ya no están). Con buscador y filtro por tipo.
export default function ListaAntiguos({ personas, tiposDelGrupo, textoVacio }: { personas: PersonaAntigua[]; tiposDelGrupo: string[]; textoVacio: string }) {
  const [busqueda, setBusqueda] = useState("");
  const [tipo, setTipo] = useState("");
  const q = busqueda.trim().toLowerCase();
  const filas = personas.filter((p) => {
    if (tipo && !p.tipos.includes(tipo)) return false;
    if (!q) return true;
    return [p.nombre, p.correo, p.dni, p.telefono].some((x) => (x ?? "").toLowerCase().includes(q));
  });

  return (
    <>
      <PanelFiltros activos={tipo ? 1 : 0} buscador={<Buscador valor={busqueda} alCambiar={setBusqueda} placeholder="Buscar por nombre, correo, DNI o teléfono" />}>
        <div className={styles.campo}>
          <label htmlFor="f-tipo-antiguo">Tipo</label>
          <select id="f-tipo-antiguo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">Todos</option>
            {tiposDelGrupo.map((t) => (
              <option key={t} value={t}>
                {TEXTO_TIPO[t] ?? t}
              </option>
            ))}
          </select>
        </div>
      </PanelFiltros>
      <p className={styles.ayuda}>
        {filas.length} {filas.length === 1 ? "persona" : "personas"}
      </p>
      {filas.length === 0 && <p className={styles.ayuda}>{textoVacio}</p>}
      <ul className={styles.lista}>
        {filas.map((f) => (
          <li key={f.id} className={estilos.filaAntigua}>
            <span>
              <strong>{f.nombre ?? "Sin nombre"}</strong> <span className={`${etq.etq} ${etq.gris}`}>Antiguo/a</span>
              <br />
              <span className={styles.ayuda}>
                {f.tipos.map((x) => TEXTO_TIPO[x] ?? x).join(" + ")} · {[f.correo, f.dni, f.telefono].filter(Boolean).join(" · ") || "—"} ·{" "}
                {f.origen === "manual" ? "añadida a mano" : "reservó su clase de prueba"} · {fechaCorta(f.creado_en)}
                {f.nota ? ` · ${f.nota}` : ""}
                {f.bloquea_prueba ? " · sin clase de prueba gratis" : " · puede hacer su prueba"}
              </span>
            </span>
            <AccionesPersona id={f.id} bloquea={f.bloquea_prueba} />
          </li>
        ))}
      </ul>
    </>
  );
}
