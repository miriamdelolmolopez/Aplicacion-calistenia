import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { analizarTexto } from "@/lib/legalTexto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const TITULOS: Record<string, string> = {
  terminos: "Términos y condiciones",
  privacidad: "Política de privacidad",
  imagen: "Uso de la imagen (fotos y vídeos)",
  "aviso-legal": "Aviso legal",
  cookies: "Política de cookies",
};
const ORDEN = ["terminos", "privacidad", "imagen", "aviso-legal", "cookies"];

// Las letras estándar de PDF no tienen todos los símbolos: lo que no existe se cambia por «?».
const limpiar = (s: string) => s.replace(/[^ -~ -ÿ–—‘’“”•…€]/g, "?");

const cuando = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const nombreArchivo = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "persona";

export async function GET(_peticion: Request, contexto: { params: Promise<{ id: string }> }) {
  // Solo la administradora puede descargarlo.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No has iniciado sesión", { status: 401 });
  const { data: quien } = await supabase.from("profiles").select("rol").eq("id", user.id).maybeSingle();
  if (quien?.rol !== "admin") return new NextResponse("No autorizado", { status: 403 });

  const { id } = await contexto.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("No encontrado", { status: 404 });
  const admin = createAdminClient();
  const [{ data: p }, { data: aceptadas }, { data: textos }] = await Promise.all([
    admin.from("profiles").select("nombre, apellidos, dni, email, rol").eq("id", id).maybeSingle(),
    admin.from("consentimientos").select("tipo, version, aceptado_en, concedido").eq("user_id", id).order("aceptado_en", { ascending: false }),
    admin.from("textos_legales").select("documento, version, contenido"),
  ]);
  if (!p || p.rol === "admin") return new NextResponse("No encontrado", { status: 404 });

  // La última versión que aceptó de cada documento.
  const ultimas = new Map<string, { tipo: string; version: string; aceptado_en: string; concedido: boolean | null }>();
  for (const a of (aceptadas ?? []) as { tipo: string; version: string; aceptado_en: string; concedido: boolean | null }[]) {
    if (!ultimas.has(a.tipo)) ultimas.set(a.tipo, a);
  }
  if (ultimas.size === 0) return new NextResponse("Todavía no ha aceptado ningún texto legal", { status: 404 });
  const contenidoDe = new Map(((textos ?? []) as { documento: string; version: string; contenido: string }[]).map((t) => [`${t.documento}|${t.version}`, t.contenido]));

  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ANCHO = 595.28;
  const ALTO = 841.89;
  const MARGEN = 56;
  const util = ANCHO - MARGEN * 2;
  const gris = rgb(0.35, 0.37, 0.4);
  const negro = rgb(0.1, 0.1, 0.11);
  const acento = rgb(0.04, 0.5, 0.6);

  let pagina: PDFPage = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - MARGEN;

  const nuevaPagina = () => {
    pagina = pdf.addPage([ANCHO, ALTO]);
    y = ALTO - MARGEN;
  };

  const lineas = (texto: string, fuente: PDFFont, tam: number, ancho: number): string[] => {
    const salida: string[] = [];
    let actual = "";
    for (const palabra of limpiar(texto).split(/\s+/).filter(Boolean)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (fuente.widthOfTextAtSize(prueba, tam) <= ancho) actual = prueba;
      else {
        if (actual) salida.push(actual);
        actual = palabra;
      }
    }
    if (actual) salida.push(actual);
    return salida;
  };

  const escribir = (texto: string, opciones: { fuente?: PDFFont; tam?: number; color?: ReturnType<typeof rgb>; sangria?: number; despues?: number } = {}) => {
    const fuente = opciones.fuente ?? normal;
    const tam = opciones.tam ?? 10;
    const sangria = opciones.sangria ?? 0;
    const alto = tam * 1.4;
    for (const linea of lineas(texto, fuente, tam, util - sangria)) {
      if (y - alto < MARGEN) nuevaPagina();
      y -= alto;
      pagina.drawText(linea, { x: MARGEN + sangria, y, size: tam, font: fuente, color: opciones.color ?? negro });
    }
    y -= opciones.despues ?? 4;
  };

  // Portada: quién es y qué contiene
  escribir("Registro de aceptación de textos legales", { fuente: negrita, tam: 18, color: acento, despues: 12 });
  escribir(`Persona: ${[p.nombre, p.apellidos].filter(Boolean).join(" ") || "(sin nombre)"}`, { fuente: negrita, tam: 11 });
  if (p.dni) escribir(`DNI: ${p.dni}`, { tam: 11 });
  if (p.email) escribir(`Correo: ${p.email}`, { tam: 11 });
  escribir(`Documento generado el ${cuando(new Date().toISOString())} (hora de Madrid).`, { tam: 9, color: gris, despues: 14 });
  escribir("Contiene la última versión que aceptó de cada documento, con el día y la hora de la aceptación:", { tam: 10, despues: 6 });

  const tipos = [...ultimas.keys()].sort((a, b) => (ORDEN.indexOf(a) + 100) % 100 - ((ORDEN.indexOf(b) + 100) % 100));
  for (const tipo of tipos) {
    const a = ultimas.get(tipo)!;
    escribir(`•  ${TITULOS[tipo] ?? tipo} · versión ${a.version} · aceptado el ${cuando(a.aceptado_en)}`, { tam: 10, sangria: 8, despues: 2 });
  }

  // Cada documento en su página, con el texto completo
  for (const tipo of tipos) {
    const a = ultimas.get(tipo)!;
    nuevaPagina();
    escribir(TITULOS[tipo] ?? tipo, { fuente: negrita, tam: 16, color: acento, despues: 6 });
    escribir(`Versión ${a.version} · aceptada el ${cuando(a.aceptado_en)} (hora de Madrid)`, { tam: 9, color: gris, despues: 4 });
    if (tipo === "imagen") escribir(a.concedido === false ? "Respuesta: NO autorizó el uso de su imagen." : "Respuesta: autorizó el uso de su imagen.", { fuente: negrita, tam: 10, despues: 8 });
    else y -= 6;

    const texto = contenidoDe.get(`${tipo}|${a.version}`);
    if (!texto) {
      escribir("El texto completo de esta versión no se conservó en el sistema; solo consta que fue aceptada en la fecha indicada.", { tam: 10, color: gris });
      continue;
    }
    const { intro, secciones } = analizarTexto(texto);
    const bloques = (lista: { p?: string; lista?: string[] }[]) => {
      for (const b of lista) {
        if (b.p) escribir(b.p, { tam: 10, despues: 6 });
        if (b.lista) {
          for (const item of b.lista) escribir(`•  ${item}`, { tam: 10, sangria: 10, despues: 2 });
          y -= 4;
        }
      }
    };
    bloques(intro);
    for (const s of secciones) {
      y -= 4;
      escribir(s.titulo, { fuente: negrita, tam: 12, despues: 4 });
      bloques(s.bloques);
    }
  }

  // Número de página
  const paginas = pdf.getPages();
  paginas.forEach((pg, n) => {
    const t = `${n + 1} / ${paginas.length}`;
    pg.drawText(t, { x: ANCHO - MARGEN - normal.widthOfTextAtSize(t, 8), y: 28, size: 8, font: normal, color: gris });
  });

  const bytes = await pdf.save();
  const hoy = new Date().toISOString().slice(0, 10);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="aceptaciones-${nombreArchivo([p.nombre, p.apellidos].filter(Boolean).join(" "))}-${hoy}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
