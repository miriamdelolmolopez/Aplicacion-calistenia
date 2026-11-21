"use client";

import BarraSuperior from "../BarraSuperior";
import Cargando from "../Cargando";
import { textos } from "../textos";
import { useIdioma } from "../useIdioma";
import { useMiPerfil } from "../useMiPerfil";
import PerfilAjustes from "./PerfilAjustes";

// Ajustes: una sola pantalla con tarjetas. La administradora la ve como la pestaña «Perfil» (con las demás pestañas arriba);
// el alumno/a la ve con su perfil, notificaciones, privacidad y la opción de pedir el borrado de su cuenta.
export default function Ajustes() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const mi = useMiPerfil();

  if (typeof mi !== "object" || mi === null) {
    return (
      <main style={{ padding: 20 }}>
        <Cargando />
      </main>
    );
  }

  if (mi.rolReal === "admin") return <PerfilAjustes />;

  return (
    <main style={{ width: "100%", maxWidth: 680, margin: "0 auto", padding: "16px 16px 0" }}>
      <BarraSuperior izquierda={{ href: "/perfil", texto: "volver" }} />
      <h1 style={{ margin: "8px 0 0" }}>{t.ajustesTitulo}</h1>
      <PerfilAjustes alumno />
    </main>
  );
}
