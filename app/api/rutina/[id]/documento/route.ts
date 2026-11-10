import { Document, ExternalHyperlink, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { analizarVideo } from "@/lib/video";
import { createClient } from "@/lib/supabase/server";

type Item = {
  orden: number;
  series: number;
  reps_min: number | null;
  reps_max: number | null;
  segundos_min: number | null;
  segundos_max: number | null;
  peso_kg: number | null;
  distancia_m: number | null;
  descanso_seg: number;
  nota: string | null;
  ejercicios: { nombre: string; video_url: string | null } | null;
};
type Sesion = { orden: number; nombre: string; nota: string | null; rutina_items: Item[] };
type Rutina = { nombre: string; nota: string | null; semanas: number; entrenos_semana: number | null; user_id: string; rutina_sesiones: Sesion[] };

const rango = (min: number | null, max: number | null, unidad: string) => {
  if (min == null && max == null) return "";
  const a = min ?? max;
  return max != null && min != null && max !== min ? `${a}-${max} ${unidad}` : `${a} ${unidad}`;
};

const nombreArchivo = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "rutina";

// Descarga la rutina como documento de Word (se abre también en Google Docs). La puede bajar la alumna dueña de la rutina o la administradora:
// las reglas de acceso de la base de datos deciden quién puede leerla.
export async function GET(_peticion: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return new Response("Necesitas entrar en tu cuenta.", { status: 401 });

  const { data } = await supabase
    .from("rutinas")
    .select(
      "nombre, nota, semanas, entrenos_semana, user_id, rutina_sesiones(orden, nombre, nota, rutina_items(orden, series, reps_min, reps_max, segundos_min, segundos_max, peso_kg, distancia_m, descanso_seg, nota, ejercicios(nombre, video_url)))",
    )
    .eq("id", id)
    .maybeSingle();
  const rutina = data as unknown as Rutina | null;
  if (!rutina) return new Response("No se ha encontrado la rutina.", { status: 404 });

  const { data: perfil } = await supabase.from("profiles").select("nombre, apellidos").eq("id", rutina.user_id).maybeSingle();
  const alumna = [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(" ");

  const parrafos: Paragraph[] = [];
  parrafos.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: rutina.nombre, bold: true })] }));
  const sesiones = [...rutina.rutina_sesiones].sort((a, b) => a.orden - b.orden);
  const lineas = [alumna && `Alumno/a: ${alumna}`, `${rutina.semanas} ${rutina.semanas === 1 ? "semana" : "semanas"} · ${rutina.entrenos_semana ?? sesiones.length} entrenos por semana`].filter(Boolean) as string[];
  for (const l of lineas) parrafos.push(new Paragraph({ children: [new TextRun({ text: l, color: "555555" })] }));
  if (rutina.nota?.trim()) {
    parrafos.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [new TextRun("Notas")] }));
    for (const l of rutina.nota.split(/\n+/)) parrafos.push(new Paragraph({ children: [new TextRun(l)] }));
  }

  sesiones.forEach((s, n) => {
    parrafos.push(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360 }, children: [new TextRun(`Día ${n + 1}: ${s.nombre}`)] }));
    if (s.nota?.trim()) parrafos.push(new Paragraph({ children: [new TextRun({ text: s.nota, italics: true })] }));
    const items = [...s.rutina_items].sort((a, b) => a.orden - b.orden);
    if (items.length === 0) parrafos.push(new Paragraph({ children: [new TextRun("Sin ejercicios.")] }));
    items.forEach((i, k) => {
      const medida = [rango(i.reps_min, i.reps_max, "repeticiones"), rango(i.segundos_min, i.segundos_max, "segundos"), i.peso_kg ? `${i.peso_kg} kg` : "", i.distancia_m ? `${i.distancia_m} m` : ""]
        .filter(Boolean)
        .join(" · ");
      parrafos.push(
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({ text: `${k + 1}. ${i.ejercicios?.nombre ?? "Ejercicio"}`, bold: true })],
        }),
      );
      parrafos.push(
        new Paragraph({
          indent: { left: 360 },
          children: [new TextRun(`${i.series} ${i.series === 1 ? "serie" : "series"}${medida ? ` × ${medida}` : ""} · descanso ${i.descanso_seg} segundos`)],
        }),
      );
      if (i.nota?.trim()) parrafos.push(new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: `Nota: ${i.nota}`, italics: true })] }));
      const enlace = i.ejercicios?.video_url ? (analizarVideo(i.ejercicios.video_url)?.enlace ?? i.ejercicios.video_url) : "";
      if (enlace)
        parrafos.push(
          new Paragraph({
            indent: { left: 360 },
            children: [new TextRun("Vídeo: "), new ExternalHyperlink({ link: enlace, children: [new TextRun({ text: enlace, style: "Hyperlink", color: "0563C1", underline: {} })] })],
          }),
        );
    });
  });

  const documento = new Document({
    creator: "Miriam del Olmo",
    title: rutina.nombre,
    // Letra de la marca: Montserrat para el texto y Cormorant Garamond para los títulos (ambas están en Google Docs).
    styles: {
      default: { document: { run: { font: "Montserrat", size: 22, color: "2B2B2A" } } },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Cormorant Garamond", size: 56, bold: true, color: "2B2B2A" } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Cormorant Garamond", size: 40, bold: true, color: "5A5E3B" } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { font: "Cormorant Garamond", size: 30, bold: true, color: "5A5E3B" } },
      ],
    },
    sections: [{ children: parrafos }],
  });
  const buffer = await Packer.toBuffer(documento);
  const archivo = `${nombreArchivo(rutina.nombre)}.docx`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${archivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
