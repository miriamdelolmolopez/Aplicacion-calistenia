import { redirect } from "next/navigation";

// La pantalla «Saber más» ahora es Aprende.
export default function SaberMas() {
  redirect("/aprende");
}
