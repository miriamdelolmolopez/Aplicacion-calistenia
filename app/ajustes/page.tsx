"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { pedirBorradoCuenta } from "../perfil/acciones";
import estilos from "../perfil/perfil.module.css";
import { textos } from "../textos";
import { IDIOMAS, type Idioma } from "../textos";
import { useIdioma } from "../useIdioma";
import { createClient } from "@/lib/supabase/client";

type Preferencias = {
  id: string;
  avisos_reserva: boolean;
  avisos_bono: boolean;
  mostrar_foto: boolean;
  avisar_cumple: boolean;
  borradoPedido: boolean;
};

type Clave = "avisos_reserva" | "avisos_bono" | "mostrar_foto" | "avisar_cumple";

async function cargar(): Promise<Preferencias | null> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return null;
  const [{ data: p }, { data: s }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, avisos_reserva, avisos_bono, mostrar_foto, avisar_cumple")
      .eq("id", sesion.user.id)
      .maybeSingle(),
    supabase.from("solicitudes_borrado").select("id").eq("atendida", false).limit(1),
  ]);
  return p ? { ...(p as Omit<Preferencias, "borradoPedido">), borradoPedido: (s ?? []).length > 0 } : null;
}

export default function Ajustes() {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];
  const [pref, setPref] = useState<Preferencias | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    cargar().then(setPref);
  }, []);

  if (!pref) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior />
        <p className={styles.aviso}>{t.cargando}</p>
      </main>
    );
  }

  async function cambiar(clave: Clave, valor: boolean) {
    setPref((p) => (p ? { ...p, [clave]: valor } : p));
    const { error: fallo } = await createClient().from("profiles").update({ [clave]: valor }).eq("id", pref!.id);
    if (fallo) setPref((p) => (p ? { ...p, [clave]: !valor } : p));
  }

  async function pedirBorrado() {
    setError(false);
    const r = await pedirBorradoCuenta();
    setConfirmando(false);
    if (!r.ok) return setError(true);
    setPref((p) => (p ? { ...p, borradoPedido: true } : p));
  }

  const interruptor = (clave: Clave, texto: string) => (
    <label className={estilos.interruptor}>
      <input type="checkbox" checked={pref[clave]} onChange={(e) => cambiar(clave, e.target.checked)} />
      <span>{texto}</span>
    </label>
  );

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <div className={styles.cabecera}>
        <h1>{t.ajustesTitulo}</h1>
      </div>

      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <h2>{t.idioma}</h2>
        <select value={idioma} onChange={(e) => cambiarIdioma(e.target.value as Idioma)}>
          {IDIOMAS.map((i) => (
            <option key={i.codigo} value={i.codigo}>
              {i.nombre}
            </option>
          ))}
        </select>
      </section>

      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <h2>{t.avisosTitulo}</h2>
        {interruptor("avisos_reserva", t.avisoReserva)}
        {interruptor("avisos_bono", t.avisoBono)}
        <p className={styles.ayuda}>{t.avisosSiempre}</p>
      </section>

      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <h2>{t.privacidadTitulo}</h2>
        {interruptor("mostrar_foto", t.mostrarFoto)}
        {interruptor("avisar_cumple", t.avisarCumple)}
        <p className={styles.ayuda}>{t.privacidadNota}</p>
      </section>

      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <h2>{t.borrarCuentaTitulo}</h2>
        <p className={styles.ayuda}>{t.borrarCuentaTexto}</p>
        {pref.borradoPedido ? (
          <p className={styles.aviso}>{t.borradoPendiente}</p>
        ) : confirmando ? (
          <>
            <p className={styles.error}>{t.confirmarBorrado}</p>
            <button type="button" className={styles.boton} onClick={pedirBorrado}>
              {t.pedirBorrado}
            </button>
            <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(false)}>
              {t.noDescartar}
            </button>
          </>
        ) : (
          <button type="button" className={styles.botonSecundario} onClick={() => setConfirmando(true)}>
            {t.pedirBorrado}
          </button>
        )}
        {error && <p className={styles.error}>{t.errorGeneral}</p>}
      </section>
    </main>
  );
}
