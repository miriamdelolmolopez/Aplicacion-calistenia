"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Icono, { type NombreIcono } from "./Icono";
import { CLAVE_TEXTO } from "./MenuLateral";
import { useMenuAdmin } from "./useMenuAdmin";
import estilos from "./escritorio.module.css";
import { textos, type ClaveTexto } from "./textos";
import { useIdioma } from "./useIdioma";
import { RUTAS, seccionesDe, type MiPerfil, olvidarVistaAlumna } from "./useMiPerfil";
import { createClient } from "@/lib/supabase/client";

type Opcion = { href: string; icono: NombreIcono; texto: string };

// Menú fijo a la izquierda en pantallas grandes (en el móvil se usa la barra de abajo).
export default function MenuEscritorio({ perfil }: { perfil: MiPerfil }) {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const ruta = usePathname();
  const router = useRouter();
  const esAdmin = perfil.rol === "admin";
  const { visibles: visiblesAdmin } = useMenuAdmin();

  const opciones: Opcion[] = esAdmin
    ? visiblesAdmin.filter((o) => o.href !== RUTAS.ayuda)
    : seccionesDe(perfil)
        .filter((s) => s !== "ajustes" && s !== "ayuda")
        .map((s) => ({ href: RUTAS[s], icono: s as NombreIcono, texto: t[CLAVE_TEXTO[s]] }));

  // Solo se marca la opción más específica: «Mis reservas» cuelga de «Reservar clases», pero no deben marcarse las dos.
  const coincide = (href: string) => {
    if (href === "/admin") return ruta === "/admin";
    if (href === "/inicio") return ruta === "/inicio";
    return ruta === href || ruta.startsWith(href + "/");
  };
  const mejor = [...opciones.map((o) => o.href), RUTAS.ayuda, RUTAS.ajustes].filter(coincide).sort((a, b) => b.length - a.length)[0];
  const activa = (href: string) => href === mejor;

  async function salir() {
    olvidarVistaAlumna();
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <aside className={estilos.menu} aria-label={t.menuAbrir}>
      <div className={estilos.cabecera}>
        <Image src="/logos/caliscoach.png" alt="CalisCoach" width={44} height={44} style={{ borderRadius: 10 }} />
        <div>
          <strong>{perfil.nombre || "CalisCoach"}</strong>
          <span>{t[`rol_${perfil.rol}` as ClaveTexto]}</span>
        </div>
      </div>

      <ul className={estilos.lista}>
        {opciones.map((o) => (
          <li key={o.href}>
            <Link href={o.href} className={`${estilos.enlace} ${activa(o.href) ? estilos.activo : ""}`}>
              <Icono nombre={o.icono} />
              {o.texto}
            </Link>
          </li>
        ))}
      </ul>

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
