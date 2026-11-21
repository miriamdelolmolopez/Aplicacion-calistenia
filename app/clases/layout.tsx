import PestanasPagina from "../PestanasPagina";

// Arriba de Reservar clase y Mis reservas salen sus dos pestañas.
export default function ClasesLayout({ children }: LayoutProps<"/clases">) {
  return (
    <>
      <PestanasPagina />
      {children}
    </>
  );
}
