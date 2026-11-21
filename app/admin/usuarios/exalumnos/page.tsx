import { redirect } from "next/navigation";

// «Exalumnos e invitados antiguos» ya no es una pantalla aparte: está dentro de Clientes e Invitados (selector Actuales | Antiguos).
export default function Exalumnos() {
  redirect("/admin/usuarios?vista=antiguos");
}
