"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import BarraSuperior from "../../BarraSuperior";
import styles from "../../formularios.module.css";
import { textos, type ClaveTexto } from "../../textos";
import { useIdioma } from "../../useIdioma";
import Medidas from "../Medidas";
import estilos from "../perfil.module.css";
import { createClient } from "@/lib/supabase/client";
import { fechaNacimientoValida, telefonoValido } from "@/lib/validaciones";

type Datos = {
  id: string;
  email: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  dni: string;
  fecha: string;
  sexo: string;
  emNombre: string;
  emTelefono: string;
};

async function cargar(): Promise<Datos | null> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select(
      "id, email, nombre, apellidos, telefono, dni, fecha_nacimiento, sexo, contacto_emergencia_nombre, contacto_emergencia_telefono",
    )
    .eq("id", sesion.user.id)
    .maybeSingle();
  if (!p) return null;
  return {
    id: p.id,
    email: p.email ?? "",
    nombre: p.nombre ?? "",
    apellidos: p.apellidos ?? "",
    telefono: p.telefono ?? "",
    dni: p.dni ?? "",
    fecha: p.fecha_nacimiento ?? "",
    sexo: p.sexo ?? "",
    emNombre: p.contacto_emergencia_nombre ?? "",
    emTelefono: p.contacto_emergencia_telefono ?? "",
  };
}

export default function MisDatos() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [datos, setDatos] = useState<Datos | null>(null);
  const [valores, setValores] = useState({ nombre: "", apellidos: "", telefono: "", fecha: "", sexo: "", emNombre: "", emTelefono: "" });
  const [mensaje, setMensaje] = useState<{ ok: boolean; clave: ClaveTexto } | null>(null);

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
      <Link href="/perfil" className={estilos.volver}>
        ← {t.volver}
      </Link>
      <div className={styles.cabecera}>
        <h1>{t.misDatos}</h1>
      </div>

      <form className={`${styles.tarjeta} ${estilos.seccion}`} onSubmit={guardarDatos} noValidate>
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
    </main>
  );
}
