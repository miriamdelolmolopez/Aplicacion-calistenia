"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BarraSuperior from "../../BarraSuperior";
import { useIdioma } from "../../useIdioma";
import estilos from "../perfil.module.css";
import { textosPerfil } from "../textosPerfil";
import { calcularImc, categoriaImc, edadDe } from "@/lib/imc";
import { createClient } from "@/lib/supabase/client";

type Tipo = "imc" | "geb" | "agua";

const numero = (v: string) => {
  const n = Number(v.replace(",", ".").trim());
  return v.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

export default function Calculadoras() {
  const [idioma] = useIdioma();
  const t = textosPerfil[idioma];
  const [tipo, setTipo] = useState<Tipo>("imc");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [edad, setEdad] = useState("");
  const [genero, setGenero] = useState<"mujer" | "hombre">("mujer");

  // Rellena lo que ya sabemos de la persona (su última medida, edad y género).
  useEffect(() => {
    async function precargar() {
      const supabase = createClient();
      const { data: sesion } = await supabase.auth.getUser();
      if (!sesion.user) return;
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from("profiles").select("sexo, fecha_nacimiento").eq("id", sesion.user.id).maybeSingle(),
        supabase.from("medidas").select("peso_kg, altura_cm").eq("user_id", sesion.user.id).order("fecha", { ascending: false }),
      ]);
      const ultimo = (c: "peso_kg" | "altura_cm") => (m ?? []).find((f) => f[c] !== null)?.[c];
      const pesoPrevio = ultimo("peso_kg");
      const alturaPrevia = ultimo("altura_cm");
      if (pesoPrevio != null) setPeso(String(Number(pesoPrevio)));
      if (alturaPrevia != null) setAltura(String(Number(alturaPrevia)));
      if (p?.fecha_nacimiento) setEdad(String(edadDe(p.fecha_nacimiento)));
      if (p?.sexo === "hombre" || p?.sexo === "mujer") setGenero(p.sexo);
    }
    precargar();
  }, []);

  const coma = (n: number, dec = 1) => n.toFixed(dec).replace(".", idioma === "es" ? "," : ".");
  const p = numero(peso);
  const a = numero(altura);
  const e = numero(edad);

  let formula = "";
  let resultado: string | null = null;
  let extra = "";

  if (tipo === "imc") {
    if (p && a) {
      const imc = calcularImc(p, a);
      formula = `${coma(p, 1)} ÷ (${coma(a / 100, 2)})² = ${coma(imc)}`;
      resultado = coma(imc);
      extra = { bajo: t.imcBajo, normal: t.imcNormal, sobrepeso: t.imcSobrepeso, obesidad: t.imcObesidad }[categoriaImc(imc)];
    }
  } else if (tipo === "geb") {
    if (p && a && e) {
      const ajuste = genero === "hombre" ? 5 : -161;
      const geb = 10 * p + 6.25 * a - 5 * e + ajuste;
      formula = `10 × ${coma(p)} + 6,25 × ${coma(a)} − 5 × ${coma(e, 0)} ${ajuste >= 0 ? "+" : "−"} ${Math.abs(ajuste)} = ${Math.round(geb)}`;
      if (idioma === "en") formula = formula.replace("6,25", "6.25");
      resultado = `${Math.round(geb)} ${t.kcalDia}`;
    }
  } else if (p) {
    const ml = p * 35;
    formula = `${coma(p)} × 35 = ${Math.round(ml)} ml`;
    resultado = `${coma(ml / 1000, 2)} ${t.litrosDia}`;
  }

  const campo = (id: string, etiqueta: string, valor: string, cambiar: (v: string) => void) => (
    <div className={estilos.campoCalc}>
      <label htmlFor={id}>{etiqueta}</label>
      <input id={id} inputMode="decimal" value={valor} onChange={(ev) => cambiar(ev.target.value)} />
    </div>
  );

  const titulo = { imc: t.calcImc, geb: t.calcGeb, agua: t.calcAgua }[tipo];
  const explica = { imc: t.imcExplica, geb: t.gebExplica, agua: t.aguaExplica }[tipo];

  return (
    <main className={estilos.perfilPagina}>
      <BarraSuperior />
      <Link href="/perfil" className={estilos.volver}>
        ← {t.titulo}
      </Link>
      <h1 className={estilos.perfilTitulo}>{t.calcTitulo}</h1>

      <div className={estilos.campoCalc}>
        <label htmlFor="tipo-calculo">{t.calcElegir}</label>
        <select id="tipo-calculo" value={tipo} onChange={(ev) => setTipo(ev.target.value as Tipo)}>
          <option value="imc">{t.calcImc}</option>
          <option value="geb">{t.calcGeb}</option>
          <option value="agua">{t.calcAgua}</option>
        </select>
      </div>

      <section className={estilos.calcTarjeta}>
        <h2>{titulo}</h2>
        <p>{explica}</p>

        <div className={estilos.formulaCaja}>
          <strong>{t.formula}</strong>
          {tipo === "imc" && <code>{t.imcFormula}</code>}
          {tipo === "geb" && (
            <>
              <code>{t.gebFormulaMujer}</code>
              <code>{t.gebFormulaHombre}</code>
            </>
          )}
          {tipo === "agua" && <code>{t.aguaFormula}</code>}
        </div>

        {tipo === "geb" && (
          <div className={estilos.campoCalc}>
            <label htmlFor="genero">{t.genero}</label>
            <select id="genero" value={genero} onChange={(ev) => setGenero(ev.target.value as "mujer" | "hombre")}>
              <option value="mujer">{t.mujer}</option>
              <option value="hombre">{t.hombre}</option>
            </select>
          </div>
        )}
        <div className={estilos.rejillaCalc}>
          {campo("calc-peso", t.pesoKg, peso, setPeso)}
          {tipo !== "agua" && campo("calc-altura", t.alturaCm, altura, setAltura)}
          {tipo === "geb" && campo("calc-edad", t.edad, edad, setEdad)}
        </div>

        <div className={estilos.resultadoCaja} aria-live="polite">
          {resultado ? (
            <>
              <strong>{t.resultado}</strong>
              <span className={estilos.resultadoValor}>{resultado}</span>
              {extra && <span>{extra}</span>}
              <code>{formula}</code>
            </>
          ) : (
            <span>{t.rellena}</span>
          )}
        </div>
        <small>{t.nota}</small>
      </section>
    </main>
  );
}
