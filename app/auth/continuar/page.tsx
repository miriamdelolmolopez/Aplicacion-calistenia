import { Suspense } from "react";
import Continuar from "./Continuar";

// Pantalla intermedia de los enlaces de correo: el enlace solo se gasta al pulsar el botón, no cuando el buzón lo abre para comprobarlo.
export default function Pagina() {
  return (
    <Suspense>
      <Continuar />
    </Suspense>
  );
}
