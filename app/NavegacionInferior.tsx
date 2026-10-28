"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Icono, { type NombreIcono } from "./Icono";
import MenuEscritorio from "./MenuEscritorio";
import MenuLateral from "./MenuLateral";
import estilos from "./navegacion.module.css";
import { textos } from "./textos";
import { useIdioma } from "./useIdioma";
import { useMenuAdmin } from "./useMenuAdmin";
import { RUTAS, seccionesDe, useMiPerfil, type MiPerfil } from "./useMiPerfil";

type Pestana = { href: string; icono: NombreIcono; texto: string };

// Pantallas donde se ve la barra. En el entreno no (hace falta toda la pantalla)
// ni en la vista de imprimir.
const CON_BARRA = ["/inicio", "/clases", "/rutina", "/progreso", "/perfil", "/ajustes", "/pagos", "/saber-mas", "/aprende", "/ayuda", "/academia", "/admin"];

function pestanasDe(perfil: MiPerfil, t: (typeof textos)["es"], elegidasAdmin: Pestana[]): Pestana[] {
  if (perfil.rol === "admin") {
    // La administradora elige qué opciones salen y en qué orden (Ajustes); Inicio va siempre en el centro.
    return [{ href: RUTAS.inicio, icono: "inicio", texto: t.navInicio }, ...elegidasAdmin];
  }
  const ver = seccionesDe(perfil);
  const lista: Pestana[] = [{ href: RUTAS.inicio, icono: "inicio", texto: t.navInicio }];
  if (ver.includes("reservar")) lista.push({ href: RUTAS.reservar, icono: "reservar", texto: t.tabReservas });
  if (ver.includes("rutina")) lista.push({ href: RUTAS.rutina, icono: "rutina", texto: t.tabEntreno });
  if (ver.includes("progreso")) lista.push({ href: RUTAS.progreso, icono: "progreso", texto: t.progresoCorto });
  lista.push({ href: RUTAS.perfil, icono: "perfil", texto: t.perfilTitulo });
  return lista;
}

// Barra de abajo con las pantallas principales y «Más», que abre el menú lateral.
export default function NavegacionInferior() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const ruta = usePathname();
  const visible = CON_BARRA.some((p) => ruta === p || ruta.startsWith(p + "/")) && !ruta.endsWith("/imprimir");
  const perfil = useMiPerfil(ruta);
  const { barra: barraAdmin } = useMenuAdmin();
  const [menu, setMenu] = useState(false);
  const cerrar = useCallback(() => setMenu(false), []);

  const conSesion = typeof perfil === "object" && perfil !== null ? perfil : null;
  const mostrar = visible && conSesion !== null;

  useEffect(() => {
    document.body.classList.toggle("con-barra", mostrar);
    return () => document.body.classList.remove("con-barra");
  }, [mostrar]);

  if (!mostrar || !conSesion) return null;
  const perfilActual = conSesion;

  const pestanas = pestanasDe(
    perfilActual,
    t,
    barraAdmin.map((o) => ({ href: o.href, icono: o.icono, texto: o.texto })),
  );

  // Inicio va la primera de la barra, luego el resto y «Más» al final.
  const inicio = pestanas.find((p) => p.href === RUTAS.inicio);
  const otras = pestanas.filter((p) => p !== inicio);

  const esActiva = (href: string) =>
    href === "/admin"
      ? ruta === "/admin"
      : ruta === href ||
        ruta.startsWith(href + "/") ||
        // El progreso y el entreno cuelgan de «Entrenamiento» para quien tiene online.
        (href === "/rutina" && (ruta.startsWith("/progreso") || ruta.startsWith("/entreno")));

  const pestana = (p: Pestana) => (
    <Link key={p.href} href={p.href} className={`${estilos.pestana} ${esActiva(p.href) ? estilos.activa : ""}`}>
      <span className={estilos.icono}>
        <Icono nombre={p.icono} tamano={22} />
      </span>
      <span className={estilos.texto}>{p.texto}</span>
    </Link>
  );

  return (
    <>
      <nav className={estilos.barra} style={{ "--columnas": otras.length + (inicio ? 1 : 0) + 1 } as React.CSSProperties} aria-label={t.barraNavegacion}>
        {inicio && pestana(inicio)}
        {otras.map(pestana)}
          <button type="button" className={`${estilos.pestana} ${menu ? estilos.activa : ""}`} onClick={() => setMenu(true)}>
            <span className={estilos.icono}>
              <Icono nombre="mas" tamano={22} />
            </span>
            <span className={estilos.texto}>{t.tabMas}</span>
          </button>
      </nav>
      <MenuLateral perfil={perfilActual} abierto={menu} onCerrar={cerrar} />
      <MenuEscritorio perfil={perfilActual} />
    </>
  );
}
