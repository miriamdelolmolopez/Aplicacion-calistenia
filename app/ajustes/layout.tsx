import PestanasPagina from "../PestanasPagina";

// Arriba de cada pantalla de Ajustes sale la barra de pestañas (solo para la administradora).
export default function AjustesLayout({ children }: LayoutProps<"/ajustes">) {
  return (
    <>
      <PestanasPagina />
      {children}
    </>
  );
}
