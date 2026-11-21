import PestanasPagina from "../PestanasPagina";

// El perfil es la primera pestaña de Ajustes (solo la administradora ve la barra).
export default function PerfilLayout({ children }: LayoutProps<"/perfil">) {
  return (
    <>
      <PestanasPagina />
      {children}
    </>
  );
}
