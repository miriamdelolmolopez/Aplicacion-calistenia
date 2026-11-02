"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { prepararFoto } from "./admin/fotos/prepararFoto";
import estilos from "./avisoFoto.module.css";
import { subirFoto } from "./perfil/acciones";
import { createClient } from "@/lib/supabase/client";

const CLAVE = "avisoFoto"; // «nunca», o la hora (en milisegundos) hasta la que no se vuelve a enseñar
const DIAS_MAS_TARDE = 3;

const TEXTO = {
  es: {
    titulo: "Ponte una foto de perfil",
    texto: "Así Miriam y tus compañeros/as de clase te reconocen. Solo la ven las personas de tus clases.",
    subir: "Subir foto",
    subiendo: "Subiendo…",
    luego: "Más tarde",
    nunca: "No volver a mostrar",
    error: "No se ha podido subir la foto. Prueba con otra.",
  },
  en: {
    titulo: "Add a profile photo",
    texto: "So Miriam and your classmates can recognise you. Only people in your classes can see it.",
    subir: "Upload photo",
    subiendo: "Uploading…",
    luego: "Later",
    nunca: "Don't show again",
    error: "The photo couldn't be uploaded. Try another one.",
  },
};

// Cuando alguien entra sin foto de perfil, se le propone ponerla, dejarlo para más tarde o no volver a verlo.
export default function AvisoFoto() {
  const ruta = usePathname();
  const [mostrar, setMostrar] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(false);
  const [idioma, setIdioma] = useState<"es" | "en">("es");
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vigente = true;
    (async () => {
      try {
        const guardado = localStorage.getItem(CLAVE);
        if (guardado === "nunca" || (guardado && Date.now() < Number(guardado))) return;
      } catch {
        // Sin almacenamiento, se enseña igual.
      }
      const supabase = createClient();
      const { data: sesion } = await supabase.auth.getSession();
      if (!sesion.session) return;
      const { data: perfil } = await supabase.from("profiles").select("foto_path, datos_completos, idioma").eq("id", sesion.session.user.id).maybeSingle();
      // Solo cuando ya ha rellenado sus datos, para no apilar avisos al empezar.
      if (vigente && perfil && !perfil.foto_path && perfil.datos_completos) {
        setIdioma(perfil.idioma === "en" ? "en" : "es");
        setMostrar(true);
      }
    })();
    return () => {
      vigente = false;
    };
  }, [ruta]);

  if (!mostrar) return null;
  const tx = TEXTO[idioma];

  function recordar(valor: string) {
    try {
      localStorage.setItem(CLAVE, valor);
    } catch {
      // No pasa nada: volverá a salir.
    }
    setMostrar(false);
  }

  async function elegir(archivo: File) {
    setError(false);
    setSubiendo(true);
    try {
      const f = new FormData();
      f.append("foto", new File([await prepararFoto(archivo)], "foto.jpg", { type: "image/jpeg" }));
      const r = await subirFoto(f);
      if (!r.ok) throw new Error("foto");
      window.location.reload(); // para que se vea la foto nueva en todas partes
    } catch {
      setError(true);
      setSubiendo(false);
    }
  }

  return (
    <div className={estilos.capa} role="dialog" aria-modal="true" aria-label={tx.titulo}>
      <div className={estilos.panel}>
        <h2>{tx.titulo}</h2>
        <p>{tx.texto}</p>
        {error && (
          <p className={estilos.error} role="alert">
            {tx.error}
          </p>
        )}
        <input ref={entrada} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && elegir(e.target.files[0])} />
        <button type="button" className={estilos.principal} disabled={subiendo} onClick={() => entrada.current?.click()}>
          {subiendo ? tx.subiendo : tx.subir}
        </button>
        <div className={estilos.secundarios}>
          <button type="button" disabled={subiendo} onClick={() => recordar(String(Date.now() + DIAS_MAS_TARDE * 86400000))}>
            {tx.luego}
          </button>
          <button type="button" disabled={subiendo} onClick={() => recordar("nunca")}>
            {tx.nunca}
          </button>
        </div>
      </div>
    </div>
  );
}
