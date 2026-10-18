"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import {
  dniNieValido,
  fechaNacimientoValida,
  normalizarDni,
  telefonoValido,
} from "@/lib/validaciones";
import { createClient } from "@/lib/supabase/client";

// Versión de los textos legales que acepta la persona (se cambiará al tener los definitivos).
const VERSION_LEGAL = "borrador-2026-10";

type Campo =
  | "nombre"
  | "apellidos"
  | "telefono"
  | "dni"
  | "fecha"
  | "emNombre"
  | "emTelefono"
  | "privacidad"
  | "terminos";

const VACIO = {
  nombre: "",
  apellidos: "",
  telefono: "",
  dni: "",
  fecha: "",
  emNombre: "",
  emTelefono: "",
};

export default function Datos() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();

  const [valores, setValores] = useState(VACIO);
  const [privacidad, setPrivacidad] = useState(false);
  const [terminos, setTerminos] = useState(false);
  const [yaAceptado, setYaAceptado] = useState(false);
  const [errores, setErrores] = useState<Partial<Record<Campo, ClaveTexto>>>({});
  const [errorGeneral, setErrorGeneral] = useState<ClaveTexto | "">("");
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  // Carga lo que la persona ya haya rellenado.
  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data: sesion } = await supabase.auth.getUser();
      if (!sesion.user) return;

      const { data: perfil } = await supabase
        .from("profiles")
        .select(
          "nombre, apellidos, telefono, dni, fecha_nacimiento, contacto_emergencia_nombre, contacto_emergencia_telefono",
        )
        .eq("id", sesion.user.id)
        .maybeSingle();

      const { data: consentimientos } = await supabase
        .from("consentimientos")
        .select("tipo")
        .eq("user_id", sesion.user.id);

      if (perfil) {
        setValores({
          nombre: perfil.nombre ?? "",
          apellidos: perfil.apellidos ?? "",
          telefono: perfil.telefono ?? "",
          dni: perfil.dni ?? "",
          fecha: perfil.fecha_nacimiento ?? "",
          emNombre: perfil.contacto_emergencia_nombre ?? "",
          emTelefono: perfil.contacto_emergencia_telefono ?? "",
        });
      }
      const tipos = new Set((consentimientos ?? []).map((c) => c.tipo));
      setYaAceptado(tipos.has("privacidad") && tipos.has("terminos"));
      setListo(true);
    }
    cargar();
  }, []);

  function cambiar(campo: keyof typeof VACIO, valor: string) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErrorGeneral("");

    const nuevos: Partial<Record<Campo, ClaveTexto>> = {};
    if (!valores.nombre.trim()) nuevos.nombre = "errorCampo";
    if (!valores.apellidos.trim()) nuevos.apellidos = "errorCampo";
    if (!telefonoValido(valores.telefono)) nuevos.telefono = "errorTelefono";
    if (!dniNieValido(valores.dni)) nuevos.dni = "errorDni";
    if (!fechaNacimientoValida(valores.fecha)) nuevos.fecha = "errorFecha";
    if (!valores.emNombre.trim()) nuevos.emNombre = "errorCampo";
    if (!telefonoValido(valores.emTelefono)) nuevos.emTelefono = "errorTelefono";
    if (!yaAceptado && !privacidad) nuevos.privacidad = "errorAceptar";
    if (!yaAceptado && !terminos) nuevos.terminos = "errorAceptar";
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;

    setCargando(true);
    const supabase = createClient();
    const { data: sesion } = await supabase.auth.getUser();
    if (!sesion.user) {
      setCargando(false);
      return router.push("/entrar");
    }

    const { error: fallo } = await supabase
      .from("profiles")
      .update({
        nombre: valores.nombre.trim(),
        apellidos: valores.apellidos.trim(),
        telefono: valores.telefono.trim(),
        dni: normalizarDni(valores.dni),
        fecha_nacimiento: valores.fecha,
        contacto_emergencia_nombre: valores.emNombre.trim(),
        contacto_emergencia_telefono: valores.emTelefono.trim(),
        idioma,
      })
      .eq("id", sesion.user.id);

    if (fallo) {
      setCargando(false);
      return setErrorGeneral(fallo.code === "23505" ? "errorDniRepetido" : "errorGeneral");
    }

    if (!yaAceptado) {
      const { error: falloConsentimiento } = await supabase
        .from("consentimientos")
        .insert([
          { user_id: sesion.user.id, tipo: "privacidad", version: VERSION_LEGAL },
          { user_id: sesion.user.id, tipo: "terminos", version: VERSION_LEGAL },
        ]);
      if (falloConsentimiento) {
        setCargando(false);
        return setErrorGeneral("errorGeneral");
      }
    }

    router.push("/inicio");
  }

  function campoTexto(
    id: keyof typeof VACIO,
    etiqueta: ClaveTexto,
    opciones: { tipo?: string; autoComplete?: string } = {},
  ) {
    const error = errores[id as Campo];
    return (
      <div className={styles.campo}>
        <label htmlFor={id}>{t[etiqueta]}</label>
        <input
          id={id}
          type={opciones.tipo ?? "text"}
          autoComplete={opciones.autoComplete}
          value={valores[id]}
          onChange={(e) => cambiar(id, e.target.value)}
          aria-invalid={error ? true : undefined}
        />
        {error && (
          <p className={styles.error} role="alert">
            {t[error]}
          </p>
        )}
      </div>
    );
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <div className={styles.cabecera}>
        <h1>{t.datosTitulo}</h1>
        <p>{t.datosIntro}</p>
      </div>

      <form className={styles.tarjeta} onSubmit={enviar} noValidate>
        {campoTexto("nombre", "nombre", { autoComplete: "given-name" })}
        {campoTexto("apellidos", "apellidos", { autoComplete: "family-name" })}
        {campoTexto("telefono", "telefono", { tipo: "tel", autoComplete: "tel" })}
        {campoTexto("dni", "dni")}
        {campoTexto("fecha", "fechaNacimiento", {
          tipo: "date",
          autoComplete: "bday",
        })}

        <fieldset className={styles.grupo}>
          <legend>{t.emergenciaTitulo}</legend>
          {campoTexto("emNombre", "emergenciaNombre")}
          {campoTexto("emTelefono", "emergenciaTelefono", { tipo: "tel" })}
        </fieldset>

        {listo && !yaAceptado && (
          <fieldset className={styles.grupo}>
            <label className={styles.casilla}>
              <input
                type="checkbox"
                checked={privacidad}
                onChange={(e) => setPrivacidad(e.target.checked)}
              />
              <span>
                {t.aceptoPrivacidad} (
                <Link href="/legal/privacidad" target="_blank">
                  {t.verPrivacidad}
                </Link>
                )
              </span>
            </label>
            {errores.privacidad && (
              <p className={styles.error} role="alert">
                {t[errores.privacidad]}
              </p>
            )}
            <label className={styles.casilla}>
              <input
                type="checkbox"
                checked={terminos}
                onChange={(e) => setTerminos(e.target.checked)}
              />
              <span>
                {t.aceptoTerminos} (
                <Link href="/legal/terminos" target="_blank">
                  {t.verTerminos}
                </Link>
                )
              </span>
            </label>
            {errores.terminos && (
              <p className={styles.error} role="alert">
                {t[errores.terminos]}
              </p>
            )}
          </fieldset>
        )}

        {errorGeneral && (
          <p className={styles.error} role="alert">
            {t[errorGeneral]}
          </p>
        )}
        <button className={styles.boton} type="submit" disabled={cargando || !listo}>
          {cargando ? t.cargando : t.guardar}
        </button>
      </form>
    </main>
  );
}
