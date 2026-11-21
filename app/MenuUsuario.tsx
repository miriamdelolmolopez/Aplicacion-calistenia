"use client";

import Icono from "./Icono";
import ElegirAlumno from "./admin/ver/ElegirAlumno";
import { empezarVerComo } from "./admin/VerComoAlumno";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import estilos from "./MenuUsuario.module.css";
import { obtenerFotos } from "./perfil/acciones";
import { IDIOMAS, type Idioma } from "./textos";
import { useIdioma } from "./useIdioma";
import { olvidarVistaAlumna, useMiPerfil } from "./useMiPerfil";
import { createClient } from "@/lib/supabase/client";
import { useTema } from "./useTema";

// Pantallas donde no se muestra (el entreno ocupa toda la pantalla y la vista de imprimir va sin adornos).
const SIN_MENU = ["/entreno"];


// Tu foto, siempre arriba a la derecha. Al pulsarla: cambiar de idioma y de tema (claro u oscuro).
export default function MenuUsuario() {
  const ruta = usePathname();
  const router = useRouter();
  const perfil = useMiPerfil(ruta);
  const [idioma, cambiarIdioma] = useIdioma();
  const [tema, cambiarTema] = useTema();
  const [foto, setFoto] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [eligiendo, setEligiendo] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  const conSesion = typeof perfil === "object" && perfil !== null ? perfil : null;
  const id = conSesion?.id ?? null;

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    obtenerFotos([id])
      .then((m) => vigente && setFoto(m[id] ?? null))
      .catch(() => {});
    return () => {
      vigente = false;
    };
  }, [id]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  if (!conSesion || SIN_MENU.some((p) => ruta === p || ruta.startsWith(p + "/")) || ruta.endsWith("/imprimir")) return null;

  const en = idioma === "en";
  const esAdmin = conSesion.rolReal === "admin";

  async function salir() {
    setAbierto(false);
    olvidarVistaAlumna();
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <div className={estilos.contenedor} ref={caja}>
      <button type="button" className={estilos.avatar} aria-haspopup="menu" aria-expanded={abierto} aria-label={en ? "Your menu" : "Tu menú"} onClick={() => setAbierto((a) => !a)}>
        <Avatar nombre={conSesion.nombre || "·"} url={foto} tamano={40} />
      </button>
      {abierto && (
        <div className={estilos.menu} role="menu">
          <div className={estilos.nombre}>{conSesion.nombre}</div>

          {esAdmin ? (
            <>
              <span className={`${estilos.opcion} ${estilos.pronto}`} role="menuitem" aria-disabled="true">
                <span><Icono nombre="documento" tamano={16} /> {en ? "Billing and plans" : "Facturación y planes"}</span>
                <small className={estilos.etiqueta}>Pronto</small>
              </span>
              <span className={`${estilos.opcion} ${estilos.pronto}`} role="menuitem" aria-disabled="true">
                <span><Icono nombre="regalo" tamano={16} /> {en ? "Refer and earn" : "Recomienda y gana"}</span>
                <small className={estilos.etiqueta}>Pronto</small>
              </span>
              <span className={`${estilos.opcion} ${estilos.pronto}`} role="menuitem" aria-disabled="true">
                <span><Icono nombre="externo" tamano={16} /> {en ? "Download the app" : "Descargar la app"}</span>
                <small className={estilos.etiqueta}>Pronto</small>
              </span>
            </>
          ) : (
            <Link href="/perfil" className={estilos.opcion} role="menuitem" onClick={() => setAbierto(false)}>
              <span><Icono nombre="perfil" tamano={16} /> {en ? "View profile" : "Ver perfil"}</span>
            </Link>
          )}

          <div className={estilos.titulo}><Icono nombre="globo" tamano={16} /> {en ? "Language" : "Idioma"}</div>
          {IDIOMAS.map((i) => (
            <button
              key={i.codigo}
              type="button"
              role="menuitemradio"
              aria-checked={idioma === i.codigo}
              className={`${estilos.opcion} ${idioma === i.codigo ? estilos.activa : ""}`}
              onClick={() => cambiarIdioma(i.codigo as Idioma)}
            >
              <span>
                {i.codigo.toUpperCase()} · {i.nombre}
              </span>
              {idioma === i.codigo && <span className={estilos.marca}>✓</span>}
            </button>
          ))}

          <button type="button" role="menuitem" className={estilos.opcion} onClick={() => cambiarTema(tema === "oscuro" ? "claro" : "oscuro")}>
            <span>
              <span aria-hidden="true">{tema === "oscuro" ? "🌙" : "☀️"}</span> {tema === "oscuro" ? (en ? "Dark theme" : "Tema oscuro") : (en ? "Light theme" : "Tema claro")}
            </span>
          </button>

          {esAdmin && (
            <>
              <Link href="/ajustes" className={estilos.opcion} role="menuitem" onClick={() => setAbierto(false)}>
                <span><Icono nombre="ajustes" tamano={16} /> {en ? "Settings" : "Ajustes"}</span>
              </Link>
              <button type="button" role="menuitem" className={estilos.opcion} onClick={() => { setAbierto(false); setEligiendo(true); }}>
                <span><Icono nombre="ojo" tamano={16} /> {en ? "View as a student" : "Ver como alumno/a"}</span>
              </button>
            </>
          )}

          <button type="button" role="menuitem" className={`${estilos.opcion} ${estilos.salir}`} onClick={salir}>
            <span><Icono nombre="salir" tamano={16} /> {en ? "Log out" : "Cerrar sesión"}</span>
          </button>
        </div>
      )}
      {esAdmin && <ElegirAlumno abierto={eligiendo} alCerrar={() => setEligiendo(false)} alElegir={empezarVerComo} />}
    </div>
  );
}
