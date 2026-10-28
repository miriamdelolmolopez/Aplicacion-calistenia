import { requireAdmin } from "@/lib/admin";
import Hub from "../Hub";

export const metadata = { title: "Entrenamientos online 1:1 · Administración" };

export default async function Online() {
  await requireAdmin();
  return (
    <Hub
      titulo="Entrenamientos online 1:1"
      azulejos={[
        { href: "/admin/ejercicios", titulo: "Biblioteca", foto: "calistenia" },
        { href: "/admin/rutinas", titulo: "Rutinas", foto: "online" },
        { href: "/admin/plantillas-online", titulo: "Plantillas online", foto: "progreso" },
      ]}
    />
  );
}
