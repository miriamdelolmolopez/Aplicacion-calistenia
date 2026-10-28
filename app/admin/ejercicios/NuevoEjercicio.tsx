"use client";

import Nuevo from "../comunes/Nuevo";
import { FormularioEjercicio, type Material } from "./Controles";

// Botón «+ Nuevo» resaltado: abre la pantalla donde se rellena todo el ejercicio.
export default function NuevoEjercicio({ materiales }: { materiales: Material[] }) {
  return <Nuevo etiqueta="Nuevo" titulo="Nuevo ejercicio" render={(cerrar) => <FormularioEjercicio materiales={materiales} alTerminar={cerrar} />} />;
}
