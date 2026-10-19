"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Icono, { type NombreIcono } from "./Icono";
import MenuLateral from "./MenuLateral";
import estilos from "./navegacion.module.css";
import { textos } from "./textos";
import { useIdioma } from "./useIdioma";
import { RUTAS, seccionesDe, useMiPerfil, type MiPerfil } from "./useMiPerfil";

type Pestana = { href: string; icono: NombreIcono; texto: string };

// Pantallas donde se ve la barra. En el entreno no (hace falta toda la pantalla)
// ni en la vista de imprimir.
const CON_BARRA = ["/inicio", "/clases", "/rutina", "/progreso", "/perfil", "/ajustes", "/pagos", "/saber-mas", "/aprende", "/academia", "/admin"];

function pestanasDe(perfil: MiPerfil, t: (typeof textos)["es"]): Pestana[] {
  if (perfil.rol === "admin") {
    return [
      { href: "/admin", icono: "admin", texto: "Panel" },
      { href: "/admin/usuarios", icono: "usuarios", texto: "Usuarios" },
      { href: "/admin/clases", icono: "reservar", texto: "Clases" },
      { href: "/admin/bonos", icono: "pagos", texto: "Bonos" },
      { href: RUTAS.perfil, icono: "perfil", texto: t.perfilTitulo },
    ];
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

  const pestanas = pestanasDe(perfilActual, t);

  return (
    <>
      <nav className={estilos.barra} aria-label={t.barraNavegacion}>
        {pestanas.map((p) => {
          const activa =
            p.href === "/admin"
              ? ruta === "/admin"
              : ruta === p.href ||
                ruta.startsWith(p.href + "/") ||
                // El progreso y el entreno cuelgan de «Entrenamiento» para quien tiene online.
                (p.href === "/rutina" && (ruta.startsWith("/progreso") || ruta.startsWith("/entreno")));
          return (
            <Link key={p.href} href={p.href} className={`${estilos.pestana} ${activa ? estilos.activa : ""}`}>
              <span className={estilos.icono}>
                <Icono nombre={p.icono} tamano={22} />
              </span>
              {p.texto}
            </Link>
          );
        })}
        <button type="button" className={`${estilos.pestana} ${menu ? estilos.activa : ""}`} onClick={() => setMenu(true)}>
          <span className={estilos.icono}>
            <Icono nombre="mas" tamano={22} />
          </span>
          {t.tabMas}
        </button>
      </nav>
      <MenuLateral perfil={perfilActual}abierto={menu} onCerrar={cerrar} />
    </>
  );
}
