import { redirect } from "next/navigation";

// «Altas y roles» ya no existe: las altas se hacen desde Usuarios (botón «+ Nuevo usuario»).
export default function Personas() {
  redirect("/admin/usuarios");
}
