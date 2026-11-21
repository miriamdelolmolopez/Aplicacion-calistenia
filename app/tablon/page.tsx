import { redirect } from "next/navigation";

// El tablón de anuncios se quita de la app de los alumnos/as: irá integrado en Comunidad cuando exista.
export default function Tablon() {
  redirect("/inicio");
}
