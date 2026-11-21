"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icono from "./Icono";
import { PESTANAS_AJUSTES, esDePestana, itemDeRuta, type Pestana } from "./gruposAdmin";
import { sinExcluidas } from "@/lib/seccionesAdmin";
import { useMiPerfil } from "./useMiPerfil";
import estilos from "./pestanasPagina.module.css";

// Pantallas de «Ajustes» (se abren desde el menú de tu foto): ahí sale la barra de pestañas de Ajustes en vez de la de una opción del menú.
const DE_AJUSTES = ["/ajustes", "/perfil", "/admin/contenido", "/admin/legal", "/admin/registro"];
const esDeAjustes = (ruta: string) => DE_AJUSTES.some((p) => ruta === p || ruta.startsWith(p + "/"));

// Barra de pestañas arriba de la pantalla (como en HubFit): cambia entre las opciones de una misma sección sin abrir otro menú.
// Solo la ve la administradora. Las pestañas que todavía no existen salen apagadas con «Pronto».
export default function PestanasPagina({ excluidas = [] }: { excluidas?: string[] }) {
  const ruta = usePathname();
  const perfil = useMiPerfil(ruta);
  const esAdmin = typeof perfil === "object" && perfil !== null && perfil.rolReal === "admin";
  if (!esAdmin) return null;

  let pestanas: Pestana[] = [];
  let titulo = "";
  if (esDeAjustes(ruta)) {
    pestanas = PESTANAS_AJUSTES;
    titulo = "Ajustes";
  } else {
    const item = itemDeRuta(ruta);
    if (item?.pestanas) {
      pestanas = item.pestanas;
      titulo = item.texto;
    }
  }
  if (pestanas.length < 2) return null;

  const visibles = sinExcluidas(pestanas, excluidas);
  const activa = visibles.find((p) => esDePestana(ruta, p));

  return (
    <nav className={estilos.barra} aria-label={titulo}>
      <ul className={estilos.lista}>
        {visibles.map((p) =>
          p.href ? (
            <li key={p.texto}>
              <Link href={p.href} className={`${estilos.pestana} ${p === activa ? estilos.activa : ""}`} aria-current={p === activa ? "page" : undefined}>
                {p.icono && <Icono nombre={p.icono} tamano={16} />}
                {p.texto}
              </Link>
            </li>
          ) : (
            <li key={p.texto}>
              <span className={`${estilos.pestana} ${estilos.pronto}`} aria-disabled="true">
                {p.icono && <Icono nombre={p.icono} tamano={16} />}
                {p.texto}
                <small className={estilos.etiqueta}>Pronto</small>
              </span>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
