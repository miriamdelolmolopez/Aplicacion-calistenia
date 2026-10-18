"use client";

import { useEffect, useRef, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import MapaCorporal from "../../MapaCorporal";
import styles from "../../formularios.module.css";
import { textos } from "../../textos";
import { useIdioma } from "../../useIdioma";
import estilos from "./entreno.module.css";

export type DatosResumen = {
  series_hechas: number;
  series_total: number;
  ejercicios: number;
  intensidades: Record<string, number>;
};

const ANCHO = 1080;
const ALTO = 1350;

function duracionTexto(seg: number): string {
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.round(seg % 60);
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${s} s`;
  return `${s} s`;
}

function cargarImagen(origen: string): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = rechazar;
    img.src = origen;
  });
}

// Dibuja la foto (si hay) con el resumen encima y devuelve la imagen como PNG.
async function crearImagen(opciones: {
  foto: string | null;
  sesion: string;
  tiempo: string;
  series: string;
  svgs: SVGSVGElement[];
}): Promise<Blob> {
  const lienzo = document.createElement("canvas");
  lienzo.width = ANCHO;
  lienzo.height = ALTO;
  const c = lienzo.getContext("2d")!;

  c.fillStyle = "#2b2b2a";
  c.fillRect(0, 0, ANCHO, ALTO);

  if (opciones.foto) {
    const foto = await cargarImagen(opciones.foto);
    const escala = Math.max(ANCHO / foto.width, ALTO / foto.height);
    const w = foto.width * escala;
    const h = foto.height * escala;
    c.drawImage(foto, (ANCHO - w) / 2, (ALTO - h) / 2, w, h);
  }

  // Franja inferior con el resumen.
  const alturaFranja = 520;
  const degradado = c.createLinearGradient(0, ALTO - alturaFranja - 120, 0, ALTO);
  degradado.addColorStop(0, "rgba(43,43,42,0)");
  degradado.addColorStop(0.35, "rgba(43,43,42,0.85)");
  degradado.addColorStop(1, "rgba(43,43,42,0.95)");
  c.fillStyle = degradado;
  c.fillRect(0, ALTO - alturaFranja - 120, ANCHO, alturaFranja + 120);

  c.fillStyle = "#f4efe6";
  c.textBaseline = "alphabetic";
  c.font = "600 64px Montserrat, Arial, sans-serif";
  c.fillText(opciones.sesion.slice(0, 26), 60, ALTO - 360);
  c.font = "500 44px Montserrat, Arial, sans-serif";
  c.fillText(opciones.tiempo, 60, ALTO - 285);
  c.fillText(opciones.series, 60, ALTO - 225);

  // Mapa del cuerpo: se pasa el dibujo (SVG) a imagen.
  let x = ANCHO - 60;
  for (const svg of [...opciones.svgs].reverse()) {
    const copia = svg.cloneNode(true) as SVGSVGElement;
    const caja = svg.viewBox.baseVal;
    const prop = caja && caja.width > 0 ? caja.height / caja.width : 2;
    const h = 400;
    const w = h / prop;
    copia.setAttribute("width", String(w));
    copia.setAttribute("height", String(h));
    copia.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const texto = new XMLSerializer().serializeToString(copia);
    const img = await cargarImagen(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(texto)}`);
    x -= w;
    c.drawImage(img, x, ALTO - 60 - h, w, h);
    x -= 20;
  }

  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("sin imagen"))), "image/png"),
  );
}

export default function Resumen({
  nombreSesion,
  nombreRutina,
  duracionSeg,
  resumen,
  alVolver,
}: {
  nombreSesion: string;
  nombreRutina: string;
  duracionSeg: number;
  resumen: DatosResumen | null;
  alVolver: () => void;
}) {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [foto, setFoto] = useState<string | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const mapa = useRef<HTMLDivElement>(null);

  const tiempo = `${t.duracionTotal}: ${duracionTexto(duracionSeg)}`;
  const series = `${resumen?.series_hechas ?? 0} ${t.seriesLabel} · ${resumen?.ejercicios ?? 0} ${t.ejerciciosHechos}`;

  const generar = () =>
    crearImagen({
      foto,
      sesion: nombreSesion,
      tiempo,
      series,
      svgs: Array.from(mapa.current?.querySelectorAll("svg") ?? []) as SVGSVGElement[],
    });

  // Vista previa de la imagen final, cada vez que cambia la foto.
  useEffect(() => {
    let vigente = true;
    let url: string | null = null;
    generar()
      .then((b) => {
        url = URL.createObjectURL(b);
        if (vigente) setVista(url);
      })
      .catch(() => {});
    return () => {
      vigente = false;
      if (url) URL.revokeObjectURL(url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foto, idioma]);

  // Libera la foto elegida al cambiarla o al salir (nunca se sube a ningún sitio).
  useEffect(() => {
    return () => {
      if (foto) URL.revokeObjectURL(foto);
    };
  }, [foto]);

  function elegir(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (archivo) setFoto(URL.createObjectURL(archivo));
  }

  async function compartir() {
    setOcupado(true);
    try {
      const blob = await generar();
      const archivo = new File([blob], "entreno.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [archivo] })) {
        await navigator.share({ files: [archivo], title: nombreSesion });
      } else {
        descargar(blob);
      }
    } catch {
      // Si cancela el menú de compartir no es un error.
    }
    setOcupado(false);
  }

  function descargar(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "entreno.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/rutina", texto: "volver" }} />
      <div className={styles.cabecera}>
        <h1>{t.resumenTitulo}</h1>
        <p>
          {nombreRutina} · {nombreSesion}
        </p>
      </div>

      <section className={styles.tarjeta} style={{ marginBottom: 16 }}>
        <div className={estilos.resumenNumeros}>
          <div className={estilos.numero}>
            <strong>{duracionTexto(duracionSeg)}</strong>
            {t.duracionTotal}
          </div>
          <div className={estilos.numero}>
            <strong>{resumen?.series_hechas ?? 0}</strong>
            {t.seriesLabel}
          </div>
          <div className={estilos.numero}>
            <strong>{resumen?.ejercicios ?? 0}</strong>
            {t.ejerciciosHechos}
          </div>
        </div>
        <div ref={mapa}>
          <MapaCorporal
            intensidades={resumen?.intensidades ?? {}}
            etiquetas={{ frente: t.frente, espalda: t.espalda }}
          />
        </div>
      </section>

      <section className={styles.tarjeta} style={{ marginBottom: 16 }}>
        <div className={estilos.pie}>
          <label className={styles.botonSecundario} style={{ cursor: "pointer" }}>
            {t.hacerFoto}
            <input type="file" accept="image/*" capture="environment" hidden onChange={elegir} />
          </label>
          <label className={styles.botonSecundario} style={{ cursor: "pointer" }}>
            {t.elegirFoto}
            <input type="file" accept="image/*" hidden onChange={elegir} />
          </label>
          {foto && (
            <button type="button" className={styles.botonSecundario} onClick={() => setFoto(null)}>
              {t.sinFoto}
            </button>
          )}
        </div>
        <p className={styles.ayuda}>{t.fotoPrivada}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {vista ? <img src={vista} alt="" className={estilos.vistaPrevia} /> : <p className={styles.ayuda}>{t.generandoImagen}</p>}
        <div className={estilos.pie}>
          <button type="button" className={styles.boton} disabled={ocupado} onClick={compartir}>
            {t.compartir}
          </button>
          <button
            type="button"
            className={styles.botonSecundario}
            disabled={ocupado}
            onClick={async () => descargar(await generar())}
          >
            {t.descargarImagen}
          </button>
        </div>
      </section>

      <button type="button" className={styles.botonSecundario} onClick={alVolver}>
        {t.volverRutina}
      </button>
    </main>
  );
}
