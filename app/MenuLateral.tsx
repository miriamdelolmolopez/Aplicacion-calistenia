"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Icono from "./Icono";
import estilos from "./menu.module.css";
import { textos, type ClaveTexto } from "./textos";
import { useIdioma } from "./useIdioma";
import { MENU_ADMIN, destinoDe, type ItemMenu } from "./gruposAdmin";
import { RUTAS, seccionesDe, type MiPerfil, type Seccion, olvidarVistaAlumna } from "./useMiPerfil";
import { createClient } from "@/lib/supabase/client";

export const CLAVE_TEXTO: Record<Seccion, ClaveTexto> = {
  inicio: "navInicio",
  reservar: "navReservar",
  reservas: "misReservasTitulo",
  rutina: "entrenamientoTitulo",
  biblioteca: "navBiblioteca",
  progreso: "miProgreso",
  pagos: "navPagos",
  tablon: "navTablon",
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
  const [abierto2, setAbierto2] = useState<ItemMenu | null>(null);
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

  const cerrarTodo = () => {
    setAbierto2(null);
    onCerrar();
  };

  return (
    <div className={estilos.capa} onClick={cerrarTodo}>
      <nav className={estilos.panel} aria-label={t.menuAbrir} onClick={(e) => e.stopPropagation()}>
        <div className={estilos.cabecera}>
          <Image src="/logos/icono-anilla.png" alt="CalisCoach" width={48} height={48} style={{ borderRadius: 11 }} />
          <div>
            <strong>{perfil.nombre || "CalisCoach"}</strong>
            <span>{t[`rol_${perfil.rol}` as ClaveTexto]}</span>
          </div>
          <button type="button" className={estilos.cerrar} aria-label={t.menuCerrar} onClick={onCerrar}>
            <Icono nombre="cerrar" />
          </button>
        </div>

        {esAdmin && abierto2 && (
          <>
            <button type="button" className={estilos.volver} onClick={() => setAbierto2(null)}>
              ‹ Volver
            </button>
            <h2 className={estilos.tituloSeccion}>{abierto2.texto}</h2>
            <ul className={estilos.lista}>
              {(abierto2.pestanas ?? []).map((p) => (
                <li key={p.texto}>
                  {p.href ? (
                    <Link href={p.href} className={estilos.enlace} onClick={cerrarTodo}>
                      {p.icono && <Icono nombre={p.icono} />}
                      {p.texto}
                    </Link>
                  ) : (
                    <span className={`${estilos.enlace} ${estilos.pronto}`} aria-disabled="true">
                      {p.icono && <Icono nombre={p.icono} />}
                      {p.texto}
                      <small className={estilos.etiquetaPronto}>Pronto</small>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {esAdmin &&
          !abierto2 &&
          MENU_ADMIN.map((g, n) => (
            <div key={g.titulo ?? n}>
              {g.titulo && <h2 className={estilos.tituloSeccion}>{g.titulo}</h2>}
              <ul className={estilos.lista}>
                {g.items.map((i) => {
                  const destino = destinoDe(i);
                  const conPestanas = (i.pestanas?.length ?? 0) > 1;
                  return (
                    <li key={i.clave}>
                      {!destino ? (
                        <span className={`${estilos.enlace} ${estilos.pronto}`} aria-disabled="true">
                          <Icono nombre={i.icono} />
                          {i.texto}
                          <small className={estilos.etiquetaPronto}>Pronto</small>
                        </span>
                      ) : conPestanas ? (
                        <button type="button" className={estilos.enlace} onClick={() => setAbierto2(i)} aria-label={`${i.texto}: ver opciones`}>
                          <Icono nombre={i.icono} />
                          {i.texto}
                          <span className={estilos.flecha} aria-hidden="true">
                            ›
                          </span>
                        </button>
                      ) : (
                        <Link href={destino} className={estilos.enlace} onClick={cerrarTodo}>
                          <Icono nombre={i.icono} />
                          {i.texto}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

        <ul className={estilos.lista}>
          {!esAdmin &&
            seccionesDe(perfil)
            .filter((s) => s !== "ajustes" && s !== "ayuda")
            .map((s) => (
              <li key={s}>
                <Link href={RUTAS[s]} className={estilos.enlace} onClick={onCerrar}>
                  <Icono nombre={s} />
                  {t[CLAVE_TEXTO[s]]}
                </Link>
              </li>
            ))}
        </ul>

        <Link href={RUTAS.ayuda} className={estilos.enlace} onClick={onCerrar}>
          <Icono nombre="ayuda" />
          {t.navAyuda}
        </Link>

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
