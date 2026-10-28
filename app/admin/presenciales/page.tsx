import { requireAdmin } from "@/lib/admin";
import Hub from "../Hub";

export const metadata = { title: "Clases presenciales · Administración" };

export default async function Presenciales() {
  await requireAdmin();
  return (
    <Hub
      titulo="Clases presenciales"
      azulejos={[
        { href: "/admin/reservas", titulo: "Reservar clases", foto: "calistenia" },
        { href: "/admin/horario", titulo: "Horarios presenciales", foto: "inicio" },
        { href: "/admin/horarios", titulo: "Plantillas presenciales", foto: "pino" },
        { href: "/admin/clases", titulo: "Tipos de clase", foto: "personal" },
      ]}
    />
  );
}
