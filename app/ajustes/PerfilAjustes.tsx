"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "../Avatar";
import Cargando from "../Cargando";
import { obtenerFotos, quitarFoto, subirFoto } from "../perfil/acciones";
import { IDIOMAS, type Idioma } from "../textos";
import { useIdioma } from "../useIdioma";
import { useTema } from "../useTema";
import { createClient } from "@/lib/supabase/client";
import { guardarPreferenciaCuenta, obtenerPreferenciasCuenta, type PreferenciasCuenta } from "./acciones";
import estilos from "./ajustesTarjetas.module.css";

// Reduce la foto en el propio navegador: recorte cuadrado de 512 px.
async function prepararFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const lado = Math.min(imagen.width, imagen.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = 512;
  lienzo.height = 512;
  lienzo.getContext("2d")!.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("sin imagen"))), "image/jpeg", 0.85));
}

const PAISES = ["ES", "PT", "FR", "IT", "DE", "GB", "IE", "NL", "BE", "CH", "US", "CA", "MX", "AR", "CO", "CL", "PE", "UY", "EC", "VE"];

// Diferencia horaria actual de una zona, para mostrarla como «(GMT +01:00) Europe/Madrid».
function etiquetaZona(zona: string): string {
  try {
    const partes = new Intl.DateTimeFormat("en", { timeZone: zona, timeZoneName: "longOffset" }).formatToParts(new Date());
    const off = partes.find((p) => p.type === "timeZoneName")?.value.replace("GMT", "") || "+00:00";
    return `(GMT ${off === "" ? "+00:00" : off}) ${zona}`;
  } catch {
    return zona;
  }
}

type Datos = { id: string; nombre: string; apellidos: string; email: string; foto: string | null };

// Ajustes > Perfil de la administradora: foto, nombre, preferencias, contraseña y apariencia, en tarjetas.
export default function PerfilAjustes() {
  const [idioma, cambiarIdioma] = useIdioma();
  const [tema, cambiarTema] = useTema();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [pref, setPref] = useState<PreferenciasCuenta | null>(null);
  const [prefDisponible, setPrefDisponible] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);

  async function cargar() {
    const supabase = createClient();
    const { data: sesion } = await supabase.auth.getUser();
    if (!sesion.user) return;
    const { data: p } = await supabase.from("profiles").select("id, nombre, apellidos, email").eq("id", sesion.user.id).maybeSingle();
    const fotos = await obtenerFotos([sesion.user.id]).catch(() => ({}) as Record<string, string>);
    setDatos({ id: sesion.user.id, nombre: p?.nombre ?? "", apellidos: p?.apellidos ?? "", email: p?.email ?? sesion.user.email ?? "", foto: fotos[sesion.user.id] ?? null });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargar();
    obtenerPreferenciasCuenta().then((r) => {
      setPref(r.valores);
      setPrefDisponible(r.disponible);
    });
  }, []);

  if (!datos || !pref) return <Cargando />;

  async function elegirFoto(archivo: File) {
    setError(false);
    setSubiendo(true);
    try {
      const f = new FormData();
      f.append("foto", new File([await prepararFoto(archivo)], "foto.jpg", { type: "image/jpeg" }));
      const r = await subirFoto(f);
      if (!r.ok) setError(true);
    } catch {
      setError(true);
    }
    await cargar();
    setSubiendo(false);
  }

  async function guardarNombre(campo: "nombre" | "apellidos", valor: string) {
    if (!datos || valor.trim() === datos[campo]) return;
    const limpio = valor.trim();
    setDatos({ ...datos, [campo]: limpio });
    const { error: e } = await createClient().from("profiles").update({ [campo]: limpio }).eq("id", datos.id);
    if (e) setError(true);
  }

  async function cambiarPref<K extends keyof PreferenciasCuenta>(clave: K, valor: PreferenciasCuenta[K]) {
    if (!pref) return;
    const antes = pref;
    setPref({ ...pref, [clave]: valor });
    const r = await guardarPreferenciaCuenta(clave, valor);
    if (!r.ok) {
      setPref(antes);
      setError(true);
    }
  }

  const nombrePais = (codigo: string) => {
    try {
      return new Intl.DisplayNames(["es"], { type: "region" }).of(codigo) ?? codigo;
    } catch {
      return codigo;
    }
  };
  const zonas = Intl.supportedValuesOf("timeZone");

  const segmentos = <T extends string>(valor: T, opciones: { v: T; t: string }[], alElegir: (v: T) => void) => (
    <span className={estilos.segmentos} role="radiogroup">
      {opciones.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={valor === o.v} className={`${estilos.segmento} ${valor === o.v ? estilos.elegido : ""}`} onClick={() => alElegir(o.v)}>
          {o.t}
        </button>
      ))}
    </span>
  );

  return (
    <div className={estilos.pagina}>
      <section className={estilos.grupo}>
        <h2 className={estilos.titulo}>Información personal</h2>
        <p className={estilos.ayuda}>Cómo te ven las demás personas en la aplicación.</p>
        <div className={estilos.tarjeta}>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>Foto de perfil</span>
            <span className={estilos.valor}>
              <Avatar nombre={[datos.nombre, datos.apellidos].filter(Boolean).join(" ") || "·"} url={datos.foto} tamano={40} />
              <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && elegirFoto(e.target.files[0])} />
              <button type="button" className={estilos.segmento} style={{ border: "1px solid var(--linea-fuerte)", borderRadius: "var(--radio-s)" }} disabled={subiendo} onClick={() => entrada.current?.click()}>
                {subiendo ? "Subiendo…" : "Cambiar"}
              </button>
              {datos.foto && (
                <button
                  type="button"
                  className={estilos.segmento}
                  style={{ border: "1px solid var(--linea-fuerte)", borderRadius: "var(--radio-s)" }}
                  onClick={async () => {
                    await quitarFoto();
                    await cargar();
                  }}
                >
                  Quitar
                </button>
              )}
            </span>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>Correo electrónico</span>
            <span className={estilos.valor}>
              {datos.email}
              <span className={estilos.aviso} style={{ padding: "2px 8px", borderRadius: 999 }}>
                Cambiarlo: próximamente
              </span>
            </span>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>Nombre</span>
            <input className={estilos.campo} defaultValue={datos.nombre} maxLength={60} aria-label="Nombre" onBlur={(e) => guardarNombre("nombre", e.target.value)} />
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>Apellidos</span>
            <input className={estilos.campo} defaultValue={datos.apellidos} maxLength={80} aria-label="Apellidos" onBlur={(e) => guardarNombre("apellidos", e.target.value)} />
          </div>
        </div>
      </section>

      <section className={estilos.grupo}>
        <h2 className={estilos.titulo}>Preferencias</h2>
        <p className={estilos.ayuda}>Tu idioma, zona horaria, país y unidades de medida.</p>
        {!prefDisponible && <p className={estilos.aviso}>Estas preferencias todavía no se pueden guardar (falta un paso de configuración en la base de datos). Mientras tanto se usa Europa/Madrid, España, kg y cm.</p>}
        <div className={estilos.tarjeta}>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>Idioma</span>
            <select className={estilos.campo} value={idioma} onChange={(e) => cambiarIdioma(e.target.value as Idioma)}>
              {IDIOMAS.map((i) => (
                <option key={i.codigo} value={i.codigo}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>Zona horaria</span>
            <select className={estilos.campo} value={pref.zona_horaria} disabled={!prefDisponible} onChange={(e) => cambiarPref("zona_horaria", e.target.value)}>
              {zonas.map((z) => (
                <option key={z} value={z}>
                  {etiquetaZona(z)}
                </option>
              ))}
            </select>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>País</span>
            <select className={estilos.campo} value={pref.pais} disabled={!prefDisponible} onChange={(e) => cambiarPref("pais", e.target.value)}>
              {(PAISES.includes(pref.pais) ? PAISES : [pref.pais, ...PAISES]).map((p) => (
                <option key={p} value={p}>
                  {nombrePais(p)}
                </option>
              ))}
            </select>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>Unidad de peso</span>
            {segmentos(pref.unidad_peso, [{ v: "kg", t: "Kilogramos (kg)" }, { v: "lb", t: "Libras (lb)" }], (v) => prefDisponible && cambiarPref("unidad_peso", v))}
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>Unidad de longitud</span>
            {segmentos(pref.unidad_longitud, [{ v: "cm", t: "Centímetros (cm)" }, { v: "in", t: "Pulgadas (in)" }], (v) => prefDisponible && cambiarPref("unidad_longitud", v))}
          </div>
        </div>
      </section>

      <section className={estilos.grupo}>
        <h2 className={estilos.titulo}>Contraseña</h2>
        <p className={estilos.ayuda}>Actualiza la contraseña de tu cuenta.</p>
        <div className={estilos.tarjeta}>
          <div className={estilos.fila}>
            <span className={estilos.valor} aria-hidden="true">
              ••••••••
            </span>
            <Link href="/perfil/contrasena" className={estilos.enlace}>
              Cambiar la contraseña
            </Link>
          </div>
        </div>
      </section>

      <section className={estilos.grupo}>
        <h2 className={estilos.titulo}>Apariencia</h2>
        <p className={estilos.ayuda}>Modo claro u oscuro.</p>
        <div className={estilos.tarjeta}>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>Tema</span>
            {segmentos(tema, [{ v: "claro", t: "☀️ Claro" }, { v: "oscuro", t: "🌙 Oscuro" }], cambiarTema)}
          </div>
        </div>
      </section>

      {error && <p className={estilos.aviso}>No se ha podido guardar el último cambio. Inténtalo otra vez.</p>}
    </div>
  );
}
