import { seccionesExcluidas } from "@/lib/admin";
import { obtenerNombresAdmin } from "@/lib/nombresAdmin";
import GuardaSecciones from "./GuardaSecciones";
import { ProveedorNombres } from "./NombresAdmin";

// El menú de Administración está en la barra de abajo (NavegacionInferior, en el layout raíz).
// Aquí se esconde lo que cada administradora tiene excluido.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const excluidas = await seccionesExcluidas();
  const nombres = await obtenerNombresAdmin();
  return (
    <ProveedorNombres nombres={nombres}>
      <GuardaSecciones excluidas={excluidas}>{children}</GuardaSecciones>
    </ProveedorNombres>
  );
}
