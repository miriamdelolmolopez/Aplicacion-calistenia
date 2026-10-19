"use client";

import { useEffect, useState, type FormEvent } from "react";
import GraficaLinea from "../GraficaLinea";
import styles from "../formularios.module.css";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import estilos from "./perfil.module.css";
import { fechaCorta } from "@/lib/fechas";
import { calcularImc, categoriaImc, edadDe } from "@/lib/imc";
import { createClient } from "@/lib/supabase/client";

type Campo = "peso_kg" | "altura_cm" | "cintura_cm" | "cadera_cm" | "pecho_cm" | "brazo_cm" | "muslo_cm";

type Fila = { id: string; fecha: string } & Record<Campo, number | null>;

const CAMPOS: { campo: Campo; etiqueta: ClaveTexto; unidad: string }[] = [
  { campo: "peso_kg", etiqueta: "pesoKg", unidad: "kg" },
  { campo: "altura_cm", etiqueta: "alturaCm", unidad: "cm" },
  { campo: "cintura_cm", etiqueta: "cinturaCm", unidad: "cm" },
  { campo: "cadera_cm", etiqueta: "caderaCm", unidad: "cm" },
  { campo: "pecho_cm", etiqueta: "pechoCm", unidad: "cm" },
  { campo: "brazo_cm", etiqueta: "brazoCm", unidad: "cm" },
  { campo: "muslo_cm", etiqueta: "musloCm", unidad: "cm" },
];

// Las alumnas solo apuntan el peso; la administradora ve también lo que ya hubiera guardado de otras medidas.
const CAMPOS_FORM = CAMPOS.filter((c) => c.campo === "peso_kg");

type Datos = { filas: Fila[]; nacimiento: string | null };

async function cargar(userId?: string): Promise<Datos> {
  const supabase = createClient();
  let consulta = supabase
    .from("medidas")
    .select("id, fecha, peso_kg, altura_cm, cintura_cm, cadera_cm, pecho_cm, brazo_cm, muslo_cm")
    .order("fecha", { ascending: true });
  let perfil = supabase.from("profiles").select("fecha_nacimiento");
  if (userId) {
    consulta = consulta.eq("user_id", userId);
    perfil = perfil.eq("id", userId);
  } else {
    const { data: sesion } = await supabase.auth.getUser();
    if (sesion.user) perfil = perfil.eq("id", sesion.user.id);
  }
  const [{ data }, { data: p }] = await Promise.all([consulta, perfil.maybeSingle()]);
  const filas = ((data ?? []) as unknown as Fila[]).map((f) => {
    const limpia = { ...f } as Fila;
    for (const { campo } of CAMPOS) limpia[campo] = f[campo] === null ? null : Number(f[campo]);
    return limpia;
  });
  return { filas, nacimiento: p?.fecha_nacimiento ?? null };
}

const hoyIso = () => new Date().toISOString().slice(0, 10);

export default function Medidas({ userId, soloLectura = false }: { userId?: string; soloLectura?: boolean }) {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [datos, setDatos] = useState<Datos | null>(null);
  const [campoGrafica, setCampoGrafica] = useState<Campo>("peso_kg");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    cargar(userId).then(setDatos);
  }, [userId]);

  if (!datos) return <p className={styles.ayuda}>{t.cargando}</p>;
  const { filas, nacimiento } = datos;

  // Valor más reciente de cada medida (el peso y la altura pueden estar en días distintos).
  const ultimo = (campo: Campo) => [...filas].reverse().find((f) => f[campo] !== null)?.[campo] ?? null;
  const peso = ultimo("peso_kg");
  const altura = ultimo("altura_cm");
  const imc = peso !== null && altura !== null ? calcularImc(peso, altura) : null;
  const esMenor = nacimiento ? edadDe(nacimiento) < 18 : false;

  const visibles = soloLectura ? CAMPOS : CAMPOS_FORM;
  const puntos = filas
    .filter((f) => f[campoGrafica] !== null)
    .map((f) => ({ fecha: f.fecha, valor: f[campoGrafica] as number }));
  const unidad = CAMPOS.find((c) => c.campo === campoGrafica)?.unidad ?? "";

  async function guardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensaje(null);
    const formulario = e.currentTarget;
    const f = new FormData(formulario);
    const valores: Record<string, number | string | null> = { fecha: String(f.get("fecha") || hoyIso()) };
    let alguno = false;
    for (const { campo } of CAMPOS) {
      const texto = String(f.get(campo) ?? "").replace(",", ".").trim();
      const n = texto === "" ? null : Number(texto);
      if (n !== null && !Number.isFinite(n)) return setMensaje({ ok: false, texto: t.errorMedidas });
      valores[campo] = n;
      if (n !== null) alguno = true;
    }
    if (!alguno) return setMensaje({ ok: false, texto: t.errorMedidas });

    const supabase = createClient();
    const { data: sesion } = await supabase.auth.getUser();
    if (!sesion.user) return;
    setGuardando(true);

    // Si ya hay una entrada ese día, se completa sin borrar lo que ya tenía.
    const previa = filas.find((x) => x.fecha === valores.fecha);
    const fila: Record<string, number | string | null> = { user_id: sesion.user.id, fecha: valores.fecha as string };
    for (const { campo } of CAMPOS) fila[campo] = valores[campo] ?? previa?.[campo] ?? null;

    const { error } = await supabase.from("medidas").upsert(fila, { onConflict: "user_id,fecha" });
    setGuardando(false);
    if (error) return setMensaje({ ok: false, texto: t.errorMedidas });
    setMensaje({ ok: true, texto: t.medidasGuardadas });
    formulario.reset();
    setDatos(await cargar(userId));
  }

  async function borrar(id: string) {
    if (!confirm(t.confirmaBorrarMedida)) return;
    await createClient().from("medidas").delete().eq("id", id);
    setDatos(await cargar(userId));
  }

  return (
    <div className={estilos.bloque}>
      {/* La calculadora de IMC ahora está en Perfil > Calculadoras; aquí solo la ve la administradora. */}
      {soloLectura && <div className={estilos.imc}>
        <strong>{t.imcTitulo}</strong>
        {imc === null ? (
          <p className={styles.ayuda}>{t.imcFalta}</p>
        ) : (
          <>
            <p className={estilos.imcValor}>{String(imc).replace(".", idioma === "es" ? "," : ".")}</p>
            <p className={styles.ayuda}>
              {esMenor ? t.imcMenor : t[`imc_${categoriaImc(imc)}` as ClaveTexto]}
            </p>
            <p className={styles.ayuda}>{t.imcNota}</p>
          </>
        )}
      </div>}

      {!soloLectura && (
        <form onSubmit={guardar} className={estilos.formMedidas}>
          <p className={styles.ayuda}>{t.medidasAyuda}</p>
          <div className={styles.campo}>
            <label htmlFor="fecha-medida">{t.fechaLabel}</label>
            <input id="fecha-medida" name="fecha" type="date" defaultValue={hoyIso()} max={hoyIso()} />
          </div>
          <div className={estilos.rejillaMedidas}>
            {CAMPOS_FORM.map(({ campo, etiqueta }) => (
              <div key={campo} className={styles.campo}>
                <label htmlFor={campo}>{t[etiqueta]}</label>
                <input id={campo} name={campo} inputMode="decimal" />
              </div>
            ))}
          </div>
          {mensaje && (
            <p className={mensaje.ok ? styles.aviso : styles.error} role="alert">
              {mensaje.texto}
            </p>
          )}
          <button type="submit" className={styles.boton} disabled={guardando}>
            {guardando ? t.guardandoLabel : t.guardarMedidas}
          </button>
        </form>
      )}

      {filas.length === 0 ? (
        <p className={styles.ayuda}>{t.sinMedidas}</p>
      ) : (
        <>
          {visibles.length > 1 && (
            <div className={estilos.selectorMedida}>
              <label>
                {t.medidaLabel}
                <select value={campoGrafica} onChange={(e) => setCampoGrafica(e.target.value as Campo)}>
                  {visibles.filter((c) => filas.some((f) => f[c.campo] !== null)).map((c) => (
                    <option key={c.campo} value={c.campo}>
                      {t[c.etiqueta]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <GraficaLinea puntos={puntos} unidad={unidad} idioma={idioma} />

          <details className={estilos.historial}>
            <summary>{t.historialMedidas}</summary>
            <ul>
              {[...filas].reverse().map((f) => (
                <li key={f.id}>
                  <span>
                    <strong>{fechaCorta(f.fecha, idioma)}</strong>{" "}
                    {visibles.filter((c) => f[c.campo] !== null)
                      .map((c) => `${f[c.campo]} ${c.unidad}`)
                      .join(" · ")}
                  </span>
                  {!soloLectura && (
                    <button type="button" onClick={() => borrar(f.id)} aria-label={t.borrarEntrada}>
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        </>
      )}
    </div>
  );
}
