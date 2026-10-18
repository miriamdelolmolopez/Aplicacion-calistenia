import { redirect } from "next/navigation";

// La ficha de cada persona ahora está en Usuarios (se mantiene esta dirección por si hay enlaces antiguos).
export default async function FichaAntigua({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/usuarios/${id}`);
}
