"use client";

import Nuevo from "../comunes/Nuevo";
import { FormularioRegistrar } from "./Controles";

type Props = Parameters<typeof FormularioRegistrar>[0];

// Botón «+ Registrar pago» resaltado: al pulsarlo se abre la pantalla con todo el formulario.
export default function RegistrarPago(props: Omit<Props, "alTerminar">) {
  return <Nuevo etiqueta="Registrar pago" titulo="Registrar un pago" render={(cerrar) => <FormularioRegistrar {...props} alTerminar={cerrar} />} />;
}
