"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Icono from "./Icono";
import estilos from "./menu.module.css";
import { textos, type ClaveTexto } from "./textos";
import { useIdioma } from "./useIdioma";
import { useMenuAdmin } from "./useMenuAdmin";
import { RUTAS, seccionesDe, type MiPerfil, type Seccion, olvidarVistaAlumna } from "./useMiPerfil";
import { createClient } from "@/lib/supabase/client";

export const CLAVE_TEXTO: Record<Seccion, ClaveTexto> = {
  inicio: "navInicio",
  reservar: "navReservar",
  reservas: "misReservasTitulo",
  rutina: "entrenamientoTitulo",
  progreso: "miProgreso",
  pagos: "navPagos",
  academia: "navAcademia",
  aprende: "navAprende",
  ayuda: "navAyuda",
  perfil: "navCuenta",
  ajustes: "navAjustes",
  admin: "panelAdmin",
};

// Panel lateral con todas las opciones de cada persona. Lo abre el botón «Más»
// de la barra de abajo (NavegacionInferior).
export default function MenuLateral({
  perfil,
  abierto,
  onCerrar,
}: {
  perfil: MiPerfil;
  abierto: boolean;
  onCerrar: () => void;
}) {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();
  const { visibles: visiblesAdmin } = useMenuAdmin();
  const esAdmin = perfil.rol === "admin";

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  async function salir() {
    olvidarVistaAlumna();
    await createClient().auth.signOut();
    onCerrar();
    router.push("/");
  }

  return (
    <div className={estilos.capa} onClick={onCerrar}>
      <nav className={estilos.panel} aria-label={t.menuAbrir} onClick={(e) => e.stopPropagation()}>
        <div className={estilos.cabecera}>
          <Image src="/logos/caliscoach.png" alt="CalisCoach" width={48} height={48} style={{ borderRadius: 11 }} />
          <div>
            <strong>{perfil.nombre || "CalisCoach"}</strong>
            <span>{t[`rol_${perfil.rol}` as ClaveTexto]}</span>
          </div>
          <button type="button" className={estilos.cerrar} aria-label={t.menuCerrar} onClick={onCerrar}>
            <Icono nombre="cerrar" />
          </button>
        </div>

        <ul className={estilos.lista}>
          {esAdmin &&
            visiblesAdmin.map((o) => (
              <li key={o.href}>
                <Link href={o.href} className={estilos.enlace} onClick={onCerrar}>
                  <Icono nombre={o.icono} />
                  {o.texto}
                </Link>
              </li>
            ))}
          {!esAdmin &&
            seccionesDe(perfil)
            .filter((s) => s !== "ajustes")
            .map((s) => (
              <li key={s}>
                <Link href={RUTAS[s]} className={estilos.enlace} onClick={onCerrar}>
                  <Icono nombre={s} />
                  {t[CLAVE_TEXTO[s]]}
                </Link>
              </li>
            ))}
        </ul>

        {esAdmin && (
          <Link href={RUTAS.ayuda} className={estilos.enlace} onClick={onCerrar}>
            <Icono nombre="ayuda" />
            {t.navAyuda}
          </Link>
        )}

        <div className={estilos.pie}>
          <button type="button" className={`${estilos.enlace} ${estilos.salir}`} onClick={salir}>
            <Icono nombre="salir" />
            {t.salir}
          </button>
          <Link
            href={RUTAS.ajustes}
            className={estilos.engranaje}
            aria-label={t.navAjustes}
            title={t.navAjustes}
            onClick={onCerrar}
          >
            <Icono nombre="ajustes" tamano={26} />
          </Link>
        </div>
      </nav>
    </div>
  );
}
