import MenuLateral from "../MenuLateral";

// Todas las pantallas de Administración llevan arriba el botón del menú (las tres rayitas).
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <style>{`@media print { .menu-admin { display: none !important; } }`}</style>
      <div className="menu-admin" style={{ maxWidth: 720, margin: "0 auto", padding: "12px 20px 0" }}>
        <MenuLateral />
      </div>
      {children}
    </>
  );
}
