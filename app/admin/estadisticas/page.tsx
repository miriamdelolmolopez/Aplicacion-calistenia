import { redirect } from "next/navigation";

// Las estadísticas ahora se llaman Informes.
export default async function Estadisticas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const p = await searchParams;
  const q = new URLSearchParams();
  for (const k of ["periodo", "desde", "hasta"]) if (p[k]) q.set(k, p[k]!);
  q.set("vista", "pagos");
  redirect(`/admin/informes?${q.toString()}`);
}
