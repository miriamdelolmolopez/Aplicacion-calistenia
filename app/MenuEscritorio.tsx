"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import Icono, { type NombreIcono } from "./Icono";
import { CLAVE_TEXTO } from "./MenuLateral";
import { GRUPOS_ADMIN, grupoDeRuta } from "./gruposAdmin";
import { useAjustesMenuAdmin } from "./useMenuAdmin";
import estilos from "./escritorio.module.css";
import { textos, type ClaveTexto } from "./textos";
import { useIdioma } from "./useIdioma";
import { RUTAS, seccionesDe, type MiPerfil, olvidarVistaAlumna } from "./useMiPerfil";
import { createClient } from "@/lib/supabase/client";
import { sinExcluidas } from "@/lib/seccionesAdmin";

type Opcion = { href: string; icono: NombreIcono; texto: string };

const Flecha = ({ izquierda = false }: { izquierda?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={izquierda ? "m15 6-6 6 6 6" : "m9 6 6 6-6 6"} />
  </svg>
);

// Menú fijo a la izquierda en pantallas grandes (en el móvil se usa la barra de abajo).
// La administradora tiene un menú de dos niveles: primero los grupos y, al pulsar uno, sus opciones en el mismo sitio con un botón «Volver».
export default function MenuEscritorio({ perfil }: { perfil: MiPerfil }) {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const ruta = usePathname();
  const router = useRouter();
  const esAdmin = perfil.rol === "admin";
  const { excluidas, nombres } = useAjustesMenuAdmin();

  // Lo que se ha pulsado a mano (Volver o un grupo) solo vale en esta pantalla; al cambiar de pantalla el menú se abre en el grupo al que pertenece.
  const [manual, setManual] = useState<{ ruta: string; clave: string | null } | null>(null);
  const claveAbierta = manual && manual.ruta === ruta ? manual.clave : (grupoDeRuta(ruta)?.clave ?? null);
  const grupoAbierto = esAdmin ? (GRUPOS_ADMIN.find((g) => g.clave === claveAbierta) ?? null) : null;

  const opcionesAlumna: Opcion[] = esAdmin
    ? []
    : seccionesDe(perfil)
        .filter((s) => s !== "ajustes" && s !== "ayuda")
        .map((s) => ({ href: RUTAS[s], icono: s as NombreIcono, texto: t[CLAVE_TEXTO[s]] }));

  const nombre = (href: string, defecto: string) => nombres[href] ?? defecto;

  // Solo se marca la opción más específica: «Mis reservas» cuelga de «Reservar clases», pero no deben marcarse las dos.
  const coincide = (href: string) => {
    if (href === "/admin") return ruta === "/admin";
    if (href === "/inicio") return ruta === "/inicio";
    return ruta === href || ruta.startsWith(href + "/");
  };
  const conocidos = esAdmin
    ? ["/inicio", "/admin", "/clases", "/perfil", ...GRUPOS_ADMIN.flatMap((g) => [...g.opciones, ...(g.menu ?? [])].map((o) => o.href ?? ""))]
    : opcionesAlumna.map((o) => o.href);
  const mejor = [...conocidos, RUTAS.ayuda, RUTAS.ajustes].filter((h) => h && coincide(h)).sort((a, b) => b.length - a.length)[0];
  const activa = (href: string) => href === mejor;

  async function salir() {
    olvidarVistaAlumna();
    await createClient().auth.signOut();
    router.push("/");
  }

  const enlace = (o: Opcion) => (
    <li key={o.href}>
      <Link href={o.href} className={`${estilos.enlace} ${activa(o.href) ? estilos.activo : ""}`}>
        <Icono nombre={o.icono} />
        {o.texto}
      </Link>
    </li>
  );

  // Menú de la administradora, nivel 1: Inicio, Panel, los grupos y dos accesos fijos.
  const nivelUno = (
    <ul className={estilos.lista}>
      {enlace({ href: "/inicio", icono: "inicio", texto: nombre("/inicio", "Inicio") })}
      {enlace({ href: "/admin", icono: "admin", texto: nombre("/admin", "Panel") })}
      {GRUPOS_ADMIN.map((g) => ({ ...g, opciones: sinExcluidas(g.opciones, excluidas) }))
        .filter((g) => g.opciones.length > 0)
        .map((g) => {
          const dentro = grupoDeRuta(ruta)?.clave === g.clave;
          return (
            <li key={g.clave}>
              <button type="button" className={`${estilos.enlace} ${dentro ? estilos.activo : ""}`} onClick={() => setManual({ ruta, clave: g.clave })} aria-label={`${g.titulo}: ver opciones`}>
                <Icono nombre={g.icono} />
                <span className={estilos.textoEnlace}>{g.titulo}</span>
                <Flecha />
              </button>
            </li>
          );
        })}
      {enlace({ href: "/clases", icono: "reservar", texto: nombre("/clases", "Reservar clases") })}
      {enlace({ href: "/perfil", icono: "perfil", texto: nombre("/perfil", "Perfil") })}
    </ul>
  );

  // Nivel 2: las opciones del grupo, con el botón «Volver» arriba.
  const nivelDos = grupoAbierto && (
    <>
      <button type="button" className={estilos.volver} onClick={() => setManual({ ruta, clave: null })}>
        <Flecha izquierda />
        Volver
      </button>
      <h2 className={estilos.tituloGrupo}>{grupoAbierto.titulo}</h2>
      <ul className={estilos.lista}>
        {sinExcluidas(grupoAbierto.menu ?? grupoAbierto.opciones, excluidas)
          .filter((o) => o.href || o.proximamente)
          .map((o, i, todas) => (
            <Fragment key={o.href ?? o.texto}>
              {o.sub && o.sub !== todas[i - 1]?.sub && <li className={estilos.subtitulo}>{o.sub}</li>}
              {o.proximamente || !o.href ? (
                <li>
                  <span className={`${estilos.enlace} ${estilos.pronto}`} aria-disabled="true">
                    <Icono nombre={o.icono} />
                    <span className={estilos.textoEnlace}>{o.texto}</span>
                    <small className={estilos.etiquetaPronto}>Pronto</small>
                  </span>
                </li>
              ) : (
                enlace({ href: o.href, icono: o.icono, texto: nombre(o.href, o.texto) })
              )}
            </Fragment>
          ))}
      </ul>
    </>
  );

  return (
    <aside className={estilos.menu} aria-label={t.menuAbrir}>
      <div className={estilos.cabecera}>
        <Image src="/logos/icono-anilla.png" alt="CalisCoach" width={44} height={44} style={{ borderRadius: 10 }} />
        <div>
          <strong>{perfil.nombre || "CalisCoach"}</strong>
          <span>{t[`rol_${perfil.rol}` as ClaveTexto]}</span>
        </div>
      </div>

      {esAdmin ? (
        grupoAbierto ? (
          nivelDos
        ) : (
          nivelUno
        )
      ) : (
        <ul className={estilos.lista}>{opcionesAlumna.map(enlace)}</ul>
      )}

      <div className={estilos.pie}>
        <Link href={RUTAS.ayuda} className={`${estilos.enlace} ${activa(RUTAS.ayuda) ? estilos.activo : ""}`}>
          <Icono nombre="ayuda" />
          {t.navAyuda}
        </Link>
        <Link href={RUTAS.ajustes} className={`${estilos.enlace} ${activa(RUTAS.ajustes) ? estilos.activo : ""}`}>
          <Icono nombre="ajustes" />
          {t.navAjustes}
        </Link>
        <button type="button" className={estilos.enlace} onClick={salir}>
          <Icono nombre="salir" />
          {t.salir}
        </button>
      </div>
    </aside>
  );
}
