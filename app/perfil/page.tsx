"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import Avatar from "../Avatar";
import BarraSuperior from "../BarraSuperior";
import { obtenerMisBonos, type MiBono } from "../cuenta/acciones";
import styles from "../formularios.module.css";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import Medidas from "./Medidas";
import estilos from "./perfil.module.css";
import { obtenerFotos, quitarFoto, subirFoto } from "./acciones";
import { fechaCorta } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";
import { fechaNacimientoValida, telefonoValido } from "@/lib/validaciones";

type Datos = {
  id: string;
  email: string;
  rol: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  dni: string;
  fecha: string;
  sexo: string;
  emNombre: string;
  emTelefono: string;
  foto: string | null;
  bonos: MiBono[];
};

async function cargar(): Promise<Datos | null> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select(
      "id, email, rol, nombre, apellidos, telefono, dni, fecha_nacimiento, sexo, contacto_emergencia_nombre, contacto_emergencia_telefono",
    )
    .eq("id", sesion.user.id)
    .maybeSingle();
  if (!p) return null;
  const fotos = await obtenerFotos([p.id]);
  return {
    id: p.id,
    email: p.email ?? "",
    rol: p.rol,
    nombre: p.nombre ?? "",
    apellidos: p.apellidos ?? "",
    telefono: p.telefono ?? "",
    dni: p.dni ?? "",
    fecha: p.fecha_nacimiento ?? "",
    sexo: p.sexo ?? "",
    emNombre: p.contacto_emergencia_nombre ?? "",
    emTelefono: p.contacto_emergencia_telefono ?? "",
    foto: fotos[p.id] ?? null,
    bonos: await obtenerMisBonos(),
  };
}

// Reduce la foto en el propio móvil: recorte cuadrado de 512 px, unos 50 KB.
async function prepararFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const lado = Math.min(imagen.width, imagen.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = 512;
  lienzo.height = 512;
  lienzo
    .getContext("2d")!
    .drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("sin imagen"))), "image/jpeg", 0.85),
  );
}

export default function Perfil() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [datos, setDatos] = useState<Datos | null>(null);
  const [valores, setValores] = useState({ nombre: "", apellidos: "", telefono: "", fecha: "", sexo: "", emNombre: "", emTelefono: "" });
  const [mensaje, setMensaje] = useState<{ ok: boolean; clave: ClaveTexto } | null>(null);
  const [foto, setFoto] = useState<"quieta" | "subiendo">("quieta");
  const [errorFoto, setErrorFoto] = useState(false);
  const [clave, setClave] = useState("");
  const [mensajeClave, setMensajeClave] = useState<{ ok: boolean; clave: ClaveTexto } | null>(null);

  useEffect(() => {
    cargar().then((d) => {
      setDatos(d);
      if (d) {
        setValores({
          nombre: d.nombre,
          apellidos: d.apellidos,
          telefono: d.telefono,
          fecha: d.fecha,
          sexo: d.sexo,
          emNombre: d.emNombre,
          emTelefono: d.emTelefono,
        });
      }
    });
  }, []);

  if (!datos) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior />
        <p className={styles.aviso}>{t.cargando}</p>
      </main>
    );
  }

  const nombreCompleto = [datos.nombre, datos.apellidos].filter(Boolean).join(" ");

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setErrorFoto(false);
    setFoto("subiendo");
    try {
      const f = new FormData();
      f.append("foto", new File([await prepararFoto(archivo)], "foto.jpg", { type: "image/jpeg" }));
      const r = await subirFoto(f);
      if (!r.ok) setErrorFoto(true);
    } catch {
      setErrorFoto(true);
    }
    setDatos(await cargar());
    setFoto("quieta");
  }

  async function sinFoto() {
    await quitarFoto();
    setDatos(await cargar());
  }

  async function guardarDatos(e: FormEvent) {
    e.preventDefault();
    setMensaje(null);
    if (
      !valores.nombre.trim() ||
      !valores.apellidos.trim() ||
      !valores.emNombre.trim() ||
      !telefonoValido(valores.telefono) ||
      !telefonoValido(valores.emTelefono) ||
      !fechaNacimientoValida(valores.fecha)
    ) {
      return setMensaje({ ok: false, clave: "errorCampo" });
    }
    const { error } = await createClient()
      .from("profiles")
      .update({
        nombre: valores.nombre.trim(),
        apellidos: valores.apellidos.trim(),
        telefono: valores.telefono.trim(),
        fecha_nacimiento: valores.fecha,
        sexo: valores.sexo === "" ? null : valores.sexo,
        contacto_emergencia_nombre: valores.emNombre.trim(),
        contacto_emergencia_telefono: valores.emTelefono.trim(),
      })
      .eq("id", datos!.id);
    if (error) return setMensaje({ ok: false, clave: "errorGeneral" });
    setMensaje({ ok: true, clave: "cambiosGuardados" });
    setDatos(await cargar());
  }

  async function cambiarClave(e: FormEvent) {
    e.preventDefault();
    setMensajeClave(null);
    if (clave.length < 8) return setMensajeClave({ ok: false, clave: "errorContrasenaCorta" });
    const { error } = await createClient().auth.updateUser({ password: clave });
    if (error) return setMensajeClave({ ok: false, clave: "errorGeneral" });
    setClave("");
    setMensajeClave({ ok: true, clave: "contrasenaCambiada" });
  }

  const campo = (id: keyof typeof valores, etiqueta: ClaveTexto, tipo = "text") => (
    <div className={styles.campo}>
      <label htmlFor={id}>{t[etiqueta]}</label>
      <input
        id={id}
        type={tipo}
        value={valores[id]}
        onChange={(e) => setValores((v) => ({ ...v, [id]: e.target.value }))}
      />
    </div>
  );

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <div className={styles.cabecera}>
        <h1>{t.perfilTitulo}</h1>
      </div>

      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <div className={estilos.cabeceraPerfil}>
          <Avatar nombre={nombreCompleto} url={datos.foto} tamano={88} />
          <div>
            <strong>{nombreCompleto || datos.email}</strong>
            <div className={styles.ayuda}>{datos.email}</div>
            <div className={estilos.accionesFoto}>
              <label className={styles.botonSecundario}>
                {foto === "subiendo" ? t.subiendoFoto : datos.foto ? t.cambiarFoto : t.ponerFoto}
                <input type="file" accept="image/*" hidden disabled={foto === "subiendo"} onChange={elegirFoto} />
              </label>
              {datos.foto && (
                <button type="button" className={styles.botonSecundario} onClick={sinFoto}>
                  {t.quitarFoto}
                </button>
              )}
            </div>
          </div>
        </div>
        {errorFoto && <p className={styles.error}>{t.errorFoto}</p>}
      </section>

      <form className={`${styles.tarjeta} ${estilos.seccion}`} onSubmit={guardarDatos} noValidate>
        <h2>{t.misDatos}</h2>
        {campo("nombre", "nombre")}
        {campo("apellidos", "apellidos")}
        {campo("telefono", "telefono", "tel")}
        {campo("fecha", "fechaNacimiento", "date")}
        <div className={styles.campo}>
          <label htmlFor="sexo">{t.sexoLabel}</label>
          <select
            id="sexo"
            value={valores.sexo}
            onChange={(e) => setValores((v) => ({ ...v, sexo: e.target.value }))}
          >
            <option value="">{t.sexoNoIndicar}</option>
            <option value="mujer">{t.sexoMujer}</option>
            <option value="hombre">{t.sexoHombre}</option>
            <option value="otro">{t.sexoOtro}</option>
          </select>
        </div>
        <div className={styles.campo}>
          <label htmlFor="dni">{t.dni}</label>
          <input id="dni" value={datos.dni} disabled readOnly />
          <p className={styles.ayuda}>{t.dniSoloMiriam}</p>
        </div>
        <fieldset className={styles.grupo}>
          <legend>{t.emergenciaTitulo}</legend>
          {campo("emNombre", "emergenciaNombre")}
          {campo("emTelefono", "emergenciaTelefono", "tel")}
        </fieldset>
        {mensaje && (
          <p className={mensaje.ok ? styles.aviso : styles.error} role="alert">
            {t[mensaje.clave]}
          </p>
        )}
        <button type="submit" className={styles.boton}>
          {t.guardarCambios}
        </button>
      </form>

      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <h2>{t.medidasTitulo}</h2>
        <Medidas />
      </section>

      {(datos.rol === "alumno" || datos.bonos.length > 0) && (
        <section className={`${styles.tarjeta} ${estilos.seccion}`}>
          <h2>{t.miBono}</h2>
          {datos.bonos.length === 0 && <p className={styles.ayuda}>{t.sinBono}</p>}
          {datos.bonos.map((b) => (
            <div key={b.id} className={styles.aviso}>
              <strong>
                {b.estado === "en_cola" ? `${t.siguienteBono}: ` : ""}
                {b.nombre}
              </strong>
              {b.servicio === "online" ? (
                <div>
                  {t.planOnline}
                  {b.estado === "activo"
                    ? b.caducaEn && ` · ${t.caducaEl} ${fechaCorta(b.caducaEn, idioma)}`
                    : ` · ${t.enEspera}`}
                </div>
              ) : (
                <div>
                  {b.clasesRestantes} {t.clasesDeTotal} {b.clasesTotal} {t.clasesRestantes}
                  {b.estado === "activo"
                    ? b.caducaEn && ` · ${t.caducaEl} ${fechaCorta(b.caducaEn, idioma)}`
                    : ` · ${t.enEspera}`}
                </div>
              )}
              {b.pagoPendiente && <div>{t.pagoPendiente}</div>}
            </div>
          ))}
          <Link href="/pagos" className={styles.botonSecundario}>
            {t.navPagos}
          </Link>
        </section>
      )}

      <form className={`${styles.tarjeta} ${estilos.seccion}`} onSubmit={cambiarClave} noValidate>
        <h2>{t.cambiarContrasena}</h2>
        <div className={styles.campo}>
          <label htmlFor="clave-nueva">{t.contrasenaNueva}</label>
          <input
            id="clave-nueva"
            type="password"
            autoComplete="new-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </div>
        {mensajeClave && (
          <p className={mensajeClave.ok ? styles.aviso : styles.error} role="alert">
            {t[mensajeClave.clave]}
          </p>
        )}
        <button type="submit" className={styles.botonSecundario}>
          {t.cambiarContrasena}
        </button>
      </form>
    </main>
  );
}
