import { seccionesExcluidas } from "@/lib/admin";
import GuardaSecciones from "./GuardaSecciones";

// El menú de Administración está en la barra de abajo (NavegacionInferior, en el layout raíz).
// Aquí se esconde lo que cada administradora tiene excluido.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const excluidas = await seccionesExcluidas();
  return <GuardaSecciones excluidas={excluidas}>{children}</GuardaSecciones>;
}
