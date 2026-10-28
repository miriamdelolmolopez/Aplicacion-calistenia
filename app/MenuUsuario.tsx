"use client";

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
import { useTema, type Tema } from "./useTema";

// Pantallas donde no se muestra (el entreno ocupa toda la pantalla y la vista de imprimir va sin adornos).
const SIN_MENU = ["/entreno"];

const EMOJI_IDIOMA: Record<string, string> = { es: "🇪🇸", en: "🇬🇧" };

// Tu foto, siempre arriba a la derecha. Al pulsarla: cambiar de idioma y de tema (claro u oscuro).
export default function MenuUsuario() {
  const ruta = usePathname();
  const router = useRouter();
  const perfil = useMiPerfil(ruta);
  const [idioma, cambiarIdioma] = useIdioma();
  const [tema, cambiarTema] = useTema();
  const [foto, setFoto] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
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

  async function salir() {
    setAbierto(false);
    olvidarVistaAlumna();
    await createClient().auth.signOut();
    router.push("/");
  }

  const temas: { valor: Tema; texto: string; icono: string }[] = [
    { valor: "claro", texto: en ? "Light" : "Claro", icono: "☀️" },
    { valor: "oscuro", texto: en ? "Dark" : "Oscuro", icono: "🌙" },
  ];

  return (
    <div className={estilos.contenedor} ref={caja}>
      <button type="button" className={estilos.avatar} aria-haspopup="menu" aria-expanded={abierto} aria-label={en ? "Your menu" : "Tu menú"} onClick={() => setAbierto((a) => !a)}>
        <Avatar nombre={conSesion.nombre || "·"} url={foto} tamano={40} />
      </button>
      {abierto && (
        <div className={estilos.menu} role="menu">
          <div className={estilos.nombre}>{conSesion.nombre}</div>

          <Link href="/perfil" className={estilos.opcion} role="menuitem" onClick={() => setAbierto(false)}>
            <span>👤 {en ? "View profile" : "Ver perfil"}</span>
          </Link>

          <div className={estilos.titulo}>🌐 {en ? "Language" : "Idioma"}</div>
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
                {EMOJI_IDIOMA[i.codigo] ?? "🌐"} {i.nombre}
              </span>
              {idioma === i.codigo && <span className={estilos.marca}>✓</span>}
            </button>
          ))}

          <div className={estilos.titulo}>🎨 {en ? "Theme" : "Tema"}</div>
          {temas.map((t) => (
            <button
              key={t.valor}
              type="button"
              role="menuitemradio"
              aria-checked={tema === t.valor}
              className={`${estilos.opcion} ${tema === t.valor ? estilos.activa : ""}`}
              onClick={() => cambiarTema(t.valor)}
            >
              <span>
                {t.icono} {t.texto}
              </span>
              {tema === t.valor && <span className={estilos.marca}>✓</span>}
            </button>
          ))}

          <button type="button" role="menuitem" className={`${estilos.opcion} ${estilos.salir}`} onClick={salir}>
            <span>🚪 {en ? "Log out" : "Salir"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
