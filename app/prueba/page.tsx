import type { Metadata } from "next";
import { codigoValido } from "@/lib/pruebaLink";
import Prueba from "./Prueba";

export const metadata: Metadata = {
  title: "Prueba una clase gratis · CalisCoach",
  robots: { index: false, follow: false },
};

// Link público para quien viene a probar una clase gratis. Solo se ve con el código vigente.
export default async function PaginaPrueba({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  return <Prueba disponible={await codigoValido(c)} codigo={c ?? ""} />;
}
