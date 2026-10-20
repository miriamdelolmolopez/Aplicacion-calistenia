import Portada from "./Portada";
import { obtenerFotosApp } from "./fotos/acciones";

// La foto propia de la portada se lee en el servidor, para que llegue ya en la primera carga.
// Se renueva sola cada 5 minutos y al cambiarla desde Administración.
export const revalidate = 300;

export default async function Inicio() {
  const fotos = await obtenerFotosApp().catch(() => null);
  return <Portada propia={fotos?.portada ?? null} />;
}
