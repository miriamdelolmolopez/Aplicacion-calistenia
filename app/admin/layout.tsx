// El menú de Administración está en la barra de abajo (NavegacionInferior, en el layout raíz).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <>{children}</>;
}
