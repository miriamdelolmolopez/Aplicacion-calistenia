import { requireAdmin } from "@/lib/admin";
import Hub from "../Hub";

export const metadata = { title: "Entrenamientos online · Administración" };

export default async function Online() {
  await requireAdmin();
  return (
    <Hub
      titulo="Entrenamientos online"
      azulejos={[
        { href: "/admin/ejercicios", titulo: "Ejercicios", foto: "calistenia" },
        { href: "/admin/rutinas", titulo: "Rutinas", foto: "online" },
      ]}
    />
  );
}
