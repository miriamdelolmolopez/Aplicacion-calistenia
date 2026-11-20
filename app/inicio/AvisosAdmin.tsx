"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { obtenerFotos } from "../perfil/acciones";
import Icono from "../Icono";
import { elegirDiasAvisoInicio, obtenerAvisosInicio, type AvisosInicio } from "./accionesAdmin";
import estilos from "./inicio.module.css";

const DIAS_CUMPLES = [0, 1, 2, 3, 5, 7, 10, 14, 21, 30];
const DIAS_BONOS = [1, 2, 3, 5, 7, 10, 14, 21, 30, 45, 60];
const VISIBLES = 5;

const cuandoCorto = (n: number) => (n <= 0 ? "hoy" : n === 1 ? "mañana" : `en ${n} días`);

// Dos letras: la primera del nombre y la primera del apellido.
function iniciales(nombre: string): string {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return "?";
  return ((p[0][0] ?? "") + (p.length > 1 ? (p[1][0] ?? "") : (p[0][1] ?? ""))).toUpperCase();
}

// Círculo con la foto de perfil o, si no tiene, con sus iniciales.
function Circulo({ nombre, url, tamano }: { nombre: string; url?: string | null; tamano: number }) {
  return url ? (
    <span className={estilos.circulo} style={{ width: tamano, height: tamano, backgroundImage: `url("${url}")` }} role="img" aria-label={nombre} />
  ) : (
    <span className={`${estilos.circulo} ${estilos.circuloIniciales}`} style={{ width: tamano, height: tamano, fontSize: tamano * 0.36 }} aria-label={nombre}>
      {iniciales(nombre)}
    </span>
  );
}

// Dos tarjetas en el Inicio de la administradora: cumpleaños (círculos con foto) y bonos que caducan pronto (con barra).
export default function AvisosAdmin() {
  const [datos, setDatos] = useState<AvisosInicio | null>(null);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [elegida, setElegida] = useState<string | null>(null);
  const [todas, setTodas] = useState(false);

  const cargar = () => obtenerAvisosInicio().then(setDatos).catch(() => {});
  useEffect(() => {
    cargar();
  }, []);
  useEffect(() => {
    if (!datos) return;
    const ids = [...new Set([...datos.cumples.map((c) => c.id), ...datos.caducan.map((b) => b.userId)])];
    if (ids.length) obtenerFotos(ids).then(setFotos).catch(() => {});
  }, [datos]);

  if (!datos) return null;

  async function elegir(que: "cumples" | "bonos", dias: number) {
    await elegirDiasAvisoInicio(que, dias);
    await cargar();
  }

  const dia = (n: number) => `${n} ${n === 1 ? "día" : "días"}`;
  const opciones = (base: number[], actual: number) => [...new Set([...base, actual])].sort((a, b) => a - b);
  const vistas = todas ? datos.caducan : datos.caducan.slice(0, VISIBLES);
  const sel = datos.cumples.find((c) => c.id === elegida);

  const ajuste = (que: "cumples" | "bonos") => (
    <details className={estilos.ajusteAvisos}>
      <summary>Ajustar aviso</summary>
      <label>
        Avisarme con
        <select value={que === "cumples" ? datos.antelacionCumples : datos.diasBonos} onChange={(e) => elegir(que, Number(e.target.value))}>
          {que === "cumples"
            ? opciones(DIAS_CUMPLES, datos.antelacionCumples).map((n) => (
                <option key={n} value={n}>{n === 0 ? "el mismo día" : `${dia(n)} de antelación`}</option>
              ))
            : opciones(DIAS_BONOS, datos.diasBonos).map((n) => (
                <option key={n} value={n}>{dia(n)} de antelación</option>
              ))}
        </select>
      </label>
    </details>
  );

  return (
    <>
      {(
        <section className={estilos.atencion} aria-label="Cumpleaños">
          <h2 className={estilos.atencionTitulo}>
            <span className={`${estilos.atencionChip} ${estilos.chipRosa}`}><Icono nombre="regalo" tamano={15} /></span>
            Cumpleaños
            <span className={estilos.atencionCuenta}>{datos.cumples.length}</span>
          </h2>
          {datos.cumples.length === 0 && (
            <p className={estilos.cumpleDetalle}>
              {datos.antelacionCumples === 0 ? "Hoy no cumple años nadie." : `Nadie cumple años en los próximos ${dia(datos.antelacionCumples)}.`}
            </p>
          )}
          <ul className={estilos.cumpleFila}>
            {datos.cumples.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className={`${estilos.cumpleBoton} ${elegida === c.id ? estilos.cumpleElegido : ""}`}
                  onClick={() => setElegida(elegida === c.id ? null : c.id)}
                  aria-pressed={elegida === c.id}
                  aria-label={c.nombre}
                  title={c.nombre}
                >
                  <span className={estilos.cumpleAnillo}>
                    <Circulo nombre={c.nombre} url={fotos[c.id]} tamano={40} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {datos.cumples.length > 0 && (
          <p className={estilos.cumpleDetalle} aria-live="polite">
            {sel ? (
              <>
                <strong>{sel.nombre}</strong> · {cuandoCorto(sel.faltan)}
                {sel.edad > 0 ? ` · cumple ${sel.edad} años` : ""}
              </>
            ) : (
              "Pulsa un círculo para ver el nombre"
            )}
          </p>
          )}
          {ajuste("cumples")}
        </section>
      )}

      {datos.caducan.length > 0 && (
        <section className={estilos.atencion} aria-label="Bonos que caducan pronto">
          <h2 className={estilos.atencionTitulo}>
            <span className={`${estilos.atencionChip} ${estilos.chipAmbar}`}><Icono nombre="relojArena" tamano={15} /></span>
            Bonos que caducan pronto
            <span className={estilos.atencionCuenta}>{datos.caducan.length}</span>
          </h2>
          <ul className={estilos.caducaLista}>
            {vistas.map((b, i) => {
              const f = Math.max(0, b.faltan);
              const resto = Math.min(1, f / Math.max(datos.diasBonos, 1));
              const tono = f <= 1 ? "#ef5f8b" : f <= 3 ? "#f5a524" : "#2fb57a";
              return (
                <li key={`${b.userId}-${i}`}>
                  <Link href={`/admin/usuarios/${b.userId}`} className={estilos.caducaFila}>
                    <Circulo nombre={b.nombre} url={fotos[b.userId]} tamano={38} />
                    <span className={estilos.caducaTexto}>
                      <strong>{b.nombre}</strong>
                      <small>{b.tarifa}</small>
                      <span className={estilos.barra} aria-hidden="true">
                        <i style={{ width: `${Math.max(8, Math.round(resto * 100))}%`, background: tono }} />
                      </span>
                    </span>
                    <span className={estilos.caducaCuando} style={{ color: tono }}>{cuandoCorto(b.faltan)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {datos.caducan.length > VISIBLES && (
            <button type="button" className={estilos.verMas} onClick={() => setTodas(!todas)}>
              {todas ? "Ver menos" : `Ver los ${datos.caducan.length}`}
            </button>
          )}
          {ajuste("bonos")}
        </section>
      )}

    </>
  );
}
