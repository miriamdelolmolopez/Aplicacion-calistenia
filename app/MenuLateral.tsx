"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icono from "./Icono";
import estilos from "./menu.module.css";
import { textos, type ClaveTexto } from "./textos";
import { useIdioma } from "./useIdioma";
import { RUTAS, seccionesDe, useMiPerfil, type Seccion } from "./useMiPerfil";
import { createClient } from "@/lib/supabase/client";

const CLAVE_TEXTO: Record<Seccion, ClaveTexto> = {
  inicio: "navInicio",
  reservar: "navReservar",
  rutina: "miRutina",
  progreso: "miProgreso",
  cuenta: "navCuenta",
  admin: "panelAdmin",
};

// Botón de las tres rayitas y panel lateral con las opciones de cada persona.
// Solo aparece si ha iniciado sesión.
export default function MenuLateral() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();
  const perfil = useMiPerfil();
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierto]);

  if (!perfil || perfil === "anonimo") return null;

  async function salir() {
    await createClient().auth.signOut();
    setAbierto(false);
    router.push("/");
  }

  return (
    <>
      <button type="button" className={estilos.boton} aria-label={t.menuAbrir} onClick={() => setAbierto(true)}>
        <Icono nombre="menu" />
      </button>

      {abierto && (
        <div className={estilos.capa} onClick={() => setAbierto(false)}>
          <nav className={estilos.panel} aria-label={t.menuAbrir} onClick={(e) => e.stopPropagation()}>
            <div className={estilos.cabecera}>
              <Image src="/logos/logo_olive.png" alt="" width={48} height={43} />
              <div>
                <strong>{perfil.nombre || "Miriam del Olmo"}</strong>
                <span>{t[`rol_${perfil.rol}` as ClaveTexto]}</span>
              </div>
              <button type="button" className={estilos.cerrar} aria-label={t.menuCerrar} onClick={() => setAbierto(false)}>
                <Icono nombre="cerrar" />
              </button>
            </div>

            <ul className={estilos.lista}>
              {seccionesDe(perfil).map((s) => (
                <li key={s}>
                  <Link href={RUTAS[s]} className={estilos.enlace} onClick={() => setAbierto(false)}>
                    <Icono nombre={s} />
                    {t[CLAVE_TEXTO[s]]}
                  </Link>
                </li>
              ))}
            </ul>

            <button type="button" className={`${estilos.enlace} ${estilos.salir}`} onClick={salir}>
              <Icono nombre="salir" />
              {t.salir}
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
