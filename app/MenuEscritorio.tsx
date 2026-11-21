"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment } from "react";
import Icono, { type NombreIcono } from "./Icono";
import { CLAVE_TEXTO } from "./MenuLateral";
import { MENU_ADMIN, destinoDe, itemDeRuta } from "./gruposAdmin";
import { useAjustesMenuAdmin } from "./useMenuAdmin";
import estilos from "./escritorio.module.css";
import { textos, type ClaveTexto } from "./textos";
import { useIdioma } from "./useIdioma";
import { RUTAS, seccionesDe, type MiPerfil, olvidarVistaAlumna } from "./useMiPerfil";
import { createClient } from "@/lib/supabase/client";
import { seccionDeRuta } from "@/lib/seccionesAdmin";

type Opcion = { href: string; icono: NombreIcono; texto: string };

// Menú fijo a la izquierda en pantallas grandes (en el móvil se usa la barra de abajo).
// La administradora tiene un menú de un solo nivel con títulos de grupo muy sutiles; las opciones de cada sección salen como pestañas arriba de la pantalla.
export default function MenuEscritorio({ perfil }: { perfil: MiPerfil }) {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const ruta = usePathname();
  const router = useRouter();
  const esAdmin = perfil.rol === "admin";
  const { excluidas } = useAjustesMenuAdmin();

  const opcionesAlumna: Opcion[] = esAdmin
    ? []
    : seccionesDe(perfil)
        .filter((s) => s !== "ajustes" && s !== "ayuda")
        .map((s) => ({ href: RUTAS[s], icono: s as NombreIcono, texto: t[CLAVE_TEXTO[s]] }));

  const coincide = (href: string) => (href === "/inicio" ? ruta === "/inicio" : ruta === href || ruta.startsWith(href + "/"));
  const mejor = opcionesAlumna.map((o) => o.href).filter(coincide).sort((a, b) => b.length - a.length)[0];

  async function salir() {
    olvidarVistaAlumna();
    await createClient().auth.signOut();
    router.push("/");
  }

  const enlaceAlumna = (o: Opcion) => (
    <li key={o.href}>
      <Link href={o.href} className={`${estilos.enlace} ${o.href === mejor ? estilos.activo : ""}`}>
        <Icono nombre={o.icono} />
        {o.texto}
      </Link>
    </li>
  );

  const itemActual = esAdmin ? itemDeRuta(ruta)?.clave : null;

  // Menú de la administradora: Inicio y los grupos con sus opciones. Lo que todavía no existe sale apagado con «Pronto».
  const menuAdmin = (
    <div className={estilos.grupos}>
      {MENU_ADMIN.map((g, n) => {
        // Se esconden las opciones cuyas pantallas están todas excluidas para esta administradora.
        const items = g.items.filter((i) => {
          const hrefs = [i.href, ...(i.pestanas ?? []).map((p) => p.href)].filter((h): h is string => !!h);
          return hrefs.length === 0 || hrefs.some((h) => !excluidas.includes(seccionDeRuta(h) ?? ""));
        });
        if (items.length === 0) return null;
        return (
          <Fragment key={g.titulo ?? n}>
            {g.titulo && <h2 className={estilos.tituloGrupoMenu}>{g.titulo}</h2>}
            <ul className={estilos.lista}>
              {items.map((i) => {
                const destino = destinoDe(i);
                const nombre = i.texto;
                return (
                  <li key={i.clave}>
                    {destino ? (
                      <Link href={destino} className={`${estilos.enlace} ${itemActual === i.clave ? estilos.activo : ""}`}>
                        <Icono nombre={i.icono} />
                        <span className={estilos.textoEnlace}>{nombre}</span>
                      </Link>
                    ) : (
                      <span className={`${estilos.enlace} ${estilos.pronto}`} aria-disabled="true">
                        <Icono nombre={i.icono} />
                        <span className={estilos.textoEnlace}>{i.texto}</span>
                        <small className={estilos.etiquetaPronto}>Pronto</small>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Fragment>
        );
      })}
    </div>
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

      {esAdmin ? menuAdmin : <ul className={estilos.lista}>{opcionesAlumna.map(enlaceAlumna)}</ul>}

      {!esAdmin && (
        <div className={estilos.pie}>
          <Link href={RUTAS.ayuda} className={`${estilos.enlace} ${coincide(RUTAS.ayuda) ? estilos.activo : ""}`}>
            <Icono nombre="ayuda" />
            {t.navAyuda}
          </Link>
          <Link href={RUTAS.ajustes} className={`${estilos.enlace} ${coincide(RUTAS.ajustes) ? estilos.activo : ""}`}>
            <Icono nombre="ajustes" />
            {t.navAjustes}
          </Link>
          <button type="button" className={estilos.enlace} onClick={salir}>
            <Icono nombre="salir" />
            {t.salir}
          </button>
        </div>
      )}
    </aside>
  );
}
