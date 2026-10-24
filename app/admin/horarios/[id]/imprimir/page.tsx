import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import styles from "../../../admin.module.css";
import { BotonImprimir } from "../../Controles";

export const metadata = { title: "Imprimir horario · Administración" };

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Item = { id: string; dia_semana: number; hora: string; plazas: number | null; tipos_clase: { nombre: string; plazas_max: number } | null };

// Vista limpia para imprimir o guardar como PDF (desde el botón o con Ctrl+P).
export default async function ImprimirHorario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("plantillas_horario")
    .select("id, nombre, plantilla_clases(id, dia_semana, hora, plazas, tipos_clase(nombre, plazas_max))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const items = (data.plantilla_clases as unknown as Item[]).sort((a, b) => a.hora.localeCompare(b.hora));

  return (
    <main className={styles.pagina}>
      <style>{`
        .hoja { max-width: 900px; margin: 0 auto; }
        .hoja h1 { margin: 0 0 4px; }
        .hoja table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 16px; }
        .hoja th, .hoja td { border: 1px solid #bbb; padding: 8px; vertical-align: top; text-align: left; font-size: 0.9rem; }
        .hoja th { background: #ececee; }
        .hoja td div { margin-bottom: 8px; }
        .hoja td small { color: #555; }
        @media print {
          .no-imprimir { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>
      <div className="no-imprimir" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <Link href="/admin/horarios" className={styles.enlaceBarra}>
          ← Volver
        </Link>
        <BotonImprimir />
      </div>
      <div className="hoja">
        <h1>Miriam del Olmo · {data.nombre}</h1>
        <p>Horario semanal</p>
        <table>
          <thead>
            <tr>
              {DIAS.map((d) => (
                <th key={d}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {DIAS.map((d, i) => (
                <td key={d}>
                  {items
                    .filter((c) => c.dia_semana === i + 1)
                    .map((c) => (
                      <div key={c.id}>
                        <strong>{c.hora.slice(0, 5)}</strong>
                        <br />
                        {c.tipos_clase?.nombre}
                        <br />
                        <small>{c.plazas ?? c.tipos_clase?.plazas_max} plazas</small>
                      </div>
                    ))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  );
}
