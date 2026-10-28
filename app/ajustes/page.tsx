"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import CabeceraFoto from "../CabeceraFoto";
import styles from "../formularios.module.css";
import { pedirBorradoCuenta } from "../perfil/acciones";
import estilos from "../perfil/perfil.module.css";
import { textos } from "../textos";
import { IDIOMAS, type Idioma } from "../textos";
import { OPCIONES_MENU_ADMIN } from "../opcionesMenuAdmin";
import { useIdioma } from "../useIdioma";
import { useMenuAdmin } from "../useMenuAdmin";
import { useMiPerfil } from "../useMiPerfil";
import { versionesVigentes } from "@/lib/legal";
import { createClient } from "@/lib/supabase/client";

type Preferencias = {
  id: string;
  avisos_reserva: boolean;
  avisos_bono: boolean;
  mostrar_foto: boolean;
  avisar_cumple: boolean;
  imagen: boolean;
  borradoPedido: boolean;
};

type Clave = "avisos_reserva" | "avisos_bono" | "mostrar_foto" | "avisar_cumple";

async function cargar(): Promise<Preferencias | null> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return null;
  const [{ data: p }, { data: s }, { data: im }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, avisos_reserva, avisos_bono, mostrar_foto, avisar_cumple")
      .eq("id", sesion.user.id)
      .maybeSingle(),
    supabase.from("solicitudes_borrado").select("id").eq("atendida", false).limit(1),
    supabase
      .from("consentimientos")
      .select("concedido")
      .eq("user_id", sesion.user.id)
      .eq("tipo", "imagen")
      .order("aceptado_en", { ascending: false })
      .limit(1),
  ]);
  return p
    ? { ...(p as Omit<Preferencias, "borradoPedido" | "imagen">), imagen: im?.[0]?.concedido === true, borradoPedido: (s ?? []).length > 0 }
    : null;
}

export default function Ajustes() {
  const [idioma, cambiarIdioma] = useIdioma();
  const t = textos[idioma];
  const mi = useMiPerfil();
  const menu = useMenuAdmin();
  const [pref, setPref] = useState<Preferencias | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    cargar().then(setPref);
  }, []);

  if (!pref) {
    return (
      <main className={styles.pagina}>
        <BarraSuperior izquierda={{ href: "/perfil", texto: "volver" }} />
        <p className={styles.aviso}>{t.cargando}</p>
      </main>
    );
  }

  async function cambiar(clave: Clave, valor: boolean) {
    setPref((p) => (p ? { ...p, [clave]: valor } : p));
    const { error: fallo } = await createClient().from("profiles").update({ [clave]: valor }).eq("id", pref!.id);
    if (fallo) setPref((p) => (p ? { ...p, [clave]: !valor } : p));
  }

  // La autorización de imagen se guarda como una fila nueva cada vez (queda el historial); vale la más reciente.
  async function cambiarImagen(valor: boolean) {
    setPref((p) => (p ? { ...p, imagen: valor } : p));
    const supabase = createClient();
    const versiones = await versionesVigentes(supabase);
    const { error: fallo } = await supabase
      .from("consentimientos")
      .insert({ user_id: pref!.id, tipo: "imagen", version: versiones.terminos, concedido: valor });
    if (fallo) setPref((p) => (p ? { ...p, imagen: !valor } : p));
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
      <BarraSuperior izquierda={{ href: "/perfil", texto: "volver" }} />
      <CabeceraFoto foto="pino" titulo={t.ajustesTitulo} />

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

      {typeof mi === "object" && mi !== null && mi.rolReal === "admin" && (
        <section className={`${styles.tarjeta} ${estilos.seccion}`}>
          <h2>Barra lateral</h2>
          <p className={styles.ayuda}>
            Elige qué opciones ves en tu barra lateral. Se guarda en este dispositivo: si usas otro, hay que elegirlo ahí también.
          </p>
          {OPCIONES_MENU_ADMIN.map((o) => (
            <label key={o.href} className={estilos.interruptor}>
              <input type="checkbox" checked={menu.estaVisible(o)} disabled={o.fijo} onChange={(e) => menu.poner(o.href, e.target.checked)} />
              <span>
                {o.texto}
                {o.fijo && " (siempre visible)"}
              </span>
            </label>
          ))}
          <button type="button" className={styles.botonSecundario} onClick={menu.restablecer}>
            Volver a lo de siempre
          </button>
        </section>
      )}

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
        <label className={estilos.interruptor}>
          <input type="checkbox" checked={pref.imagen} onChange={(e) => cambiarImagen(e.target.checked)} />
          <span>
            {idioma === "en"
              ? "I authorise the use of photos and videos in which I appear on social media and professional channels"
              : "Autorizo el uso de fotos y vídeos en los que aparezca en redes sociales y canales profesionales"}
          </span>
        </label>
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
      <section className={`${styles.tarjeta} ${estilos.seccion}`}>
        <h2>{idioma === "en" ? "Legal" : "Textos legales"}</h2>
        <p className={styles.ayuda}>
          <Link href="/legal/terminos">{idioma === "en" ? "Terms and conditions" : "Términos y condiciones"}</Link>
          {" · "}
          <Link href="/legal/privacidad">{idioma === "en" ? "Privacy policy" : "Política de privacidad"}</Link>
          {" · "}
          <Link href="/legal/aviso-legal">{idioma === "en" ? "Legal notice" : "Aviso legal"}</Link>
          {" · "}
          <Link href="/legal/cookies">Cookies</Link>
        </p>
      </section>
    </main>
  );
}
