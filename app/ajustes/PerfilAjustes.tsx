"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "../Avatar";
import Cargando from "../Cargando";
import { obtenerFotos, pedirBorradoCuenta, quitarFoto, subirFoto } from "../perfil/acciones";
import { IDIOMAS, textos, type Idioma } from "../textos";
import { useIdioma } from "../useIdioma";
import { useTema } from "../useTema";
import { createClient } from "@/lib/supabase/client";
import { guardarPreferenciaCuenta, obtenerPreferenciasCuenta, type PreferenciasCuenta } from "./acciones";
import estilos from "./ajustesTarjetas.module.css";
import Interruptor from "./Interruptor";
import ContenidoAvisos from "./notificaciones/ContenidoAvisos";
import { usePreferencias } from "./usePreferencias";

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

const botonPequeno = { border: "1px solid var(--linea-fuerte)", borderRadius: "var(--radio-s)" } as const;

// Pantalla de Ajustes en tarjetas (estilo HubFit). La administradora ve la pestaña «Perfil»; el alumno/a ve, además, sus
// notificaciones, su privacidad y la opción de pedir el borrado de su cuenta en esta misma pantalla.
export default function PerfilAjustes({ alumno = false }: { alumno?: boolean }) {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];
  const en = idioma === "en";
  const x = (es: string, ingles: string) => (en ? ingles : es);
  const [tema, cambiarTema] = useTema();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [pref, setPref] = useState<PreferenciasCuenta | null>(null);
  const [prefDisponible, setPrefDisponible] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const entrada = useRef<HTMLInputElement>(null);
  const { pref: privacidad, cambiar, cambiarImagen, setPref: setPrivacidad } = usePreferencias();

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

  async function pedirBorrado() {
    setError(false);
    const r = await pedirBorradoCuenta();
    setConfirmando(false);
    if (!r.ok) return setError(true);
    setPrivacidad((p) => (p ? { ...p, borradoPedido: true } : p));
  }

  const nombrePais = (codigo: string) => {
    try {
      return new Intl.DisplayNames([idioma], { type: "region" }).of(codigo) ?? codigo;
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
        <h2 className={estilos.titulo}>{x("Información personal", "Personal information")}</h2>
        <p className={estilos.ayuda}>{x("Cómo te ven las demás personas en la aplicación.", "How other people see you in the app.")}</p>
        <div className={estilos.tarjeta}>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("Foto de perfil", "Profile photo")}</span>
            <span className={estilos.valor}>
              <Avatar nombre={[datos.nombre, datos.apellidos].filter(Boolean).join(" ") || "·"} url={datos.foto} tamano={40} />
              <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && elegirFoto(e.target.files[0])} />
              <button type="button" className={estilos.segmento} style={botonPequeno} disabled={subiendo} onClick={() => entrada.current?.click()}>
                {subiendo ? x("Subiendo…", "Uploading…") : x("Cambiar", "Change")}
              </button>
              {datos.foto && (
                <button
                  type="button"
                  className={estilos.segmento}
                  style={botonPequeno}
                  onClick={async () => {
                    await quitarFoto();
                    await cargar();
                  }}
                >
                  {x("Quitar", "Remove")}
                </button>
              )}
            </span>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("Correo electrónico", "Email")}</span>
            <span className={estilos.valor}>
              {datos.email}
              <span className={estilos.aviso} style={{ padding: "2px 8px", borderRadius: 999 }}>
                {x("Cambiarlo: próximamente", "Change it: coming soon")}
              </span>
            </span>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("Nombre", "First name")}</span>
            <input className={estilos.campo} defaultValue={datos.nombre} maxLength={60} aria-label={x("Nombre", "First name")} onBlur={(e) => guardarNombre("nombre", e.target.value)} />
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("Apellidos", "Last name")}</span>
            <input className={estilos.campo} defaultValue={datos.apellidos} maxLength={80} aria-label={x("Apellidos", "Last name")} onBlur={(e) => guardarNombre("apellidos", e.target.value)} />
          </div>
        </div>
      </section>

      <section className={estilos.grupo}>
        <h2 className={estilos.titulo}>{x("Preferencias", "Preferences")}</h2>
        <p className={estilos.ayuda}>{x("Tu idioma, zona horaria, país y unidades de medida.", "Your language, time zone, country and units.")}</p>
        {!prefDisponible && (
          <p className={estilos.aviso}>
            {x(
              "Estas preferencias todavía no se pueden guardar (falta un paso de configuración en la base de datos). Mientras tanto se usa Europa/Madrid, España, kg y cm.",
              "These preferences can't be saved yet (a database setup step is missing). Meanwhile Europe/Madrid, Spain, kg and cm are used.",
            )}
          </p>
        )}
        <div className={estilos.tarjeta}>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("Idioma", "Language")}</span>
            <select className={estilos.campo} value={idioma} onChange={(e) => cambiarIdioma(e.target.value as Idioma)}>
              {IDIOMAS.map((i) => (
                <option key={i.codigo} value={i.codigo}>
                  {i.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("Zona horaria", "Time zone")}</span>
            <select className={estilos.campo} value={pref.zona_horaria} disabled={!prefDisponible} onChange={(e) => cambiarPref("zona_horaria", e.target.value)}>
              {zonas.map((z) => (
                <option key={z} value={z}>
                  {etiquetaZona(z)}
                </option>
              ))}
            </select>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("País", "Country")}</span>
            <select className={estilos.campo} value={pref.pais} disabled={!prefDisponible} onChange={(e) => cambiarPref("pais", e.target.value)}>
              {(PAISES.includes(pref.pais) ? PAISES : [pref.pais, ...PAISES]).map((p) => (
                <option key={p} value={p}>
                  {nombrePais(p)}
                </option>
              ))}
            </select>
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("Unidad de peso", "Weight unit")}</span>
            {segmentos(pref.unidad_peso, [{ v: "kg", t: x("Kilogramos (kg)", "Kilograms (kg)") }, { v: "lb", t: x("Libras (lb)", "Pounds (lb)") }], (v) => prefDisponible && cambiarPref("unidad_peso", v))}
          </div>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("Unidad de longitud", "Length unit")}</span>
            {segmentos(pref.unidad_longitud, [{ v: "cm", t: x("Centímetros (cm)", "Centimetres (cm)") }, { v: "in", t: x("Pulgadas (in)", "Inches (in)") }], (v) => prefDisponible && cambiarPref("unidad_longitud", v))}
          </div>
        </div>
      </section>

      <section className={estilos.grupo}>
        <h2 className={estilos.titulo}>{x("Contraseña", "Password")}</h2>
        <p className={estilos.ayuda}>{x("Actualiza la contraseña de tu cuenta.", "Update your account password.")}</p>
        <div className={estilos.tarjeta}>
          <div className={estilos.fila}>
            <span className={estilos.valor} aria-hidden="true">
              ••••••••
            </span>
            <Link href="/perfil/contrasena" className={estilos.enlace}>
              {x("Cambiar la contraseña", "Change password")}
            </Link>
          </div>
        </div>
      </section>

      <section className={estilos.grupo}>
        <h2 className={estilos.titulo}>{x("Apariencia", "Appearance")}</h2>
        <p className={estilos.ayuda}>{x("Modo claro u oscuro.", "Light or dark mode.")}</p>
        <div className={estilos.tarjeta}>
          <div className={estilos.fila}>
            <span className={estilos.etiqueta}>{x("Tema", "Theme")}</span>
            {segmentos(tema, [{ v: "claro", t: `☀️ ${x("Claro", "Light")}` }, { v: "oscuro", t: `🌙 ${x("Oscuro", "Dark")}` }], cambiarTema)}
          </div>
        </div>
      </section>

      {alumno && (
        <>
          <ContenidoAvisos incrustado />

          <section className={estilos.grupo}>
            <h2 className={estilos.titulo}>{t.privacidadTitulo}</h2>
            <p className={estilos.ayuda}>{x("Qué ven de ti las demás personas y qué puede hacer la academia con tu imagen.", "What other people see about you and what the academy may do with your image.")}</p>
            {!privacidad ? (
              <Cargando />
            ) : (
              <div className={estilos.tarjeta}>
                <div className={estilos.fila}>
                  <span className={estilos.etiqueta}>{t.mostrarFoto}</span>
                  <Interruptor nombre={t.mostrarFoto} activo={privacidad.mostrar_foto} alCambiar={() => cambiar("mostrar_foto", !privacidad.mostrar_foto)} />
                </div>
                <div className={estilos.fila}>
                  <span className={estilos.etiqueta}>{t.mostrarApellido}</span>
                  <Interruptor nombre={t.mostrarApellido} activo={privacidad.mostrar_apellido} alCambiar={() => cambiar("mostrar_apellido", !privacidad.mostrar_apellido)} />
                </div>
                <div className={estilos.fila}>
                  <span className={estilos.etiqueta}>{t.avisarCumple}</span>
                  <Interruptor nombre={t.avisarCumple} activo={privacidad.avisar_cumple} alCambiar={() => cambiar("avisar_cumple", !privacidad.avisar_cumple)} />
                </div>
                <div className={estilos.fila}>
                  <span className={estilos.etiqueta}>
                    {x(
                      "Autorizo el uso de fotos y vídeos en los que aparezca en redes sociales y canales profesionales",
                      "I authorise the use of photos and videos in which I appear on social media and professional channels",
                    )}
                    <span className={estilos.descripcion}>{t.privacidadNota}</span>
                  </span>
                  <Interruptor nombre={x("Autorización de imagen", "Image authorisation")} activo={privacidad.imagen} alCambiar={() => cambiarImagen(!privacidad.imagen)} />
                </div>
              </div>
            )}
          </section>

          <section className={estilos.grupo}>
            <h2 className={estilos.titulo}>{x("Textos legales", "Legal texts")}</h2>
            <div className={estilos.tarjeta}>
              <div className={estilos.fila}>
                <span className={estilos.etiqueta}>{x("Mis textos legales", "My legal texts")}</span>
                <Link href="/ajustes/textos-legales" className={estilos.enlace}>
                  {x("Ver", "View")}
                </Link>
              </div>
              <div className={estilos.fila}>
                <span className={estilos.etiqueta}>{x("Términos y condiciones", "Terms and conditions")}</span>
                <Link href="/legal/terminos" className={estilos.enlace}>
                  {x("Ver", "View")}
                </Link>
              </div>
              <div className={estilos.fila}>
                <span className={estilos.etiqueta}>{x("Política de privacidad", "Privacy policy")}</span>
                <Link href="/legal/privacidad" className={estilos.enlace}>
                  {x("Ver", "View")}
                </Link>
              </div>
              <div className={estilos.fila}>
                <span className={estilos.etiqueta}>{x("Aviso legal", "Legal notice")}</span>
                <Link href="/legal/aviso-legal" className={estilos.enlace}>
                  {x("Ver", "View")}
                </Link>
              </div>
              <div className={estilos.fila}>
                <span className={estilos.etiqueta}>Cookies</span>
                <Link href="/legal/cookies" className={estilos.enlace}>
                  {x("Ver", "View")}
                </Link>
              </div>
            </div>
          </section>

          <section className={estilos.grupo}>
            <h2 className={estilos.titulo} style={{ color: "#b3261e" }}>
              {t.borrarCuentaTitulo}
            </h2>
            <p className={estilos.ayuda}>{t.borrarCuentaTexto}</p>
            {privacidad?.borradoPedido ? (
              <p className={estilos.aviso}>{t.borradoPendiente}</p>
            ) : (
              <div className={estilos.tarjeta} style={{ borderColor: "#f3c9c6" }}>
                <div className={estilos.fila}>
                  <span className={estilos.etiqueta}>{confirmando ? t.confirmarBorrado : t.borrarCuentaTitulo}</span>
                  {confirmando ? (
                    <span className={estilos.valor}>
                      <button type="button" className={estilos.segmento} style={{ ...botonPequeno, color: "#b3261e", borderColor: "#e8a6a2" }} onClick={pedirBorrado}>
                        {t.pedirBorrado}
                      </button>
                      <button type="button" className={estilos.segmento} style={botonPequeno} onClick={() => setConfirmando(false)}>
                        {t.noDescartar}
                      </button>
                    </span>
                  ) : (
                    <button type="button" className={estilos.segmento} style={{ ...botonPequeno, color: "#b3261e", borderColor: "#e8a6a2" }} onClick={() => setConfirmando(true)}>
                      {t.pedirBorrado}
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {error && <p className={estilos.aviso}>{x("No se ha podido guardar el último cambio. Inténtalo otra vez.", "The last change could not be saved. Please try again.")}</p>}
    </div>
  );
}
