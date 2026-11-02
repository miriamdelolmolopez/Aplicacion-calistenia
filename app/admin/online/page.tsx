import { requireAdmin, seccionesExcluidas } from "@/lib/admin";
import { sinExcluidas } from "@/lib/seccionesAdmin";
import Hub from "../Hub";

export const metadata = { title: "Entrenamientos online 1:1 · Administración" };

export default async function Online() {
  await requireAdmin();
  const excluidas = await seccionesExcluidas();
  return (
    <Hub
      titulo="Entrenamientos online 1:1"
      azulejos={sinExcluidas([
        { href: "/admin/ejercicios", titulo: "Biblioteca", foto: "calistenia" },
        { href: "/admin/rutinas", titulo: "Rutinas", foto: "online" },
        { href: "/admin/plantillas-online", titulo: "Plantillas online", foto: "progreso" },
      ], excluidas)}
    />
  );
}
