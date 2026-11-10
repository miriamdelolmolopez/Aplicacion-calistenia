import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import type { Bloque } from "./rutinaDocumento";

const ANCHO = 595;
const ALTO = 842;
const MARGEN = 50;

// Cada bloque: tamaño de letra, tipo de letra, color, sangría y aire por encima.
const ESTILO: Record<Bloque["tipo"], { tam: number; fuente: "n" | "b" | "c"; color: [number, number, number]; sangria: number; antes: number }> = {
  titulo: { tam: 24, fuente: "b", color: [0.17, 0.17, 0.16], sangria: 0, antes: 0 },
  meta: { tam: 10.5, fuente: "n", color: [0.33, 0.33, 0.33], sangria: 0, antes: 4 },
  h1: { tam: 16, fuente: "b", color: [0.35, 0.37, 0.23], sangria: 0, antes: 22 },
  h2: { tam: 13, fuente: "b", color: [0.35, 0.37, 0.23], sangria: 0, antes: 14 },
  texto: { tam: 10.5, fuente: "n", color: [0.17, 0.17, 0.16], sangria: 0, antes: 4 },
  ejercicio: { tam: 11.5, fuente: "b", color: [0.17, 0.17, 0.16], sangria: 0, antes: 11 },
  detalle: { tam: 10.5, fuente: "n", color: [0.17, 0.17, 0.16], sangria: 16, antes: 2 },
  nota: { tam: 10, fuente: "c", color: [0.33, 0.33, 0.33], sangria: 16, antes: 2 },
  enlace: { tam: 9, fuente: "n", color: [0.02, 0.39, 0.76], sangria: 16, antes: 2 },
};

// Las letras estándar del PDF no tienen todos los símbolos: lo que no se pueda dibujar se cambia por «?».
function segura(texto: string, fuente: PDFFont): string {
  let fuera = "";
  for (const c of texto.replace(/\u00a0/g, " ")) {
    try {
      fuente.encodeText(c);
      fuera += c;
    } catch {
      fuera += "?";
    }
  }
  return fuera;
}

function lineasDe(texto: string, fuente: PDFFont, tam: number, ancho: number): string[] {
  const salida: string[] = [];
  let actual = "";
  const palabras = texto.split(/\s+/).filter(Boolean);
  for (let palabra of palabras) {
    // Una palabra más ancha que la línea (un enlace) se parte.
    while (fuente.widthOfTextAtSize(palabra, tam) > ancho) {
      let corte = palabra.length - 1;
      while (corte > 1 && fuente.widthOfTextAtSize(palabra.slice(0, corte), tam) > ancho) corte--;
      if (actual) {
        salida.push(actual);
        actual = "";
      }
      salida.push(palabra.slice(0, corte));
      palabra = palabra.slice(corte);
    }
    const prueba = actual ? `${actual} ${palabra}` : palabra;
    if (fuente.widthOfTextAtSize(prueba, tam) <= ancho) actual = prueba;
    else {
      if (actual) salida.push(actual);
      actual = palabra;
    }
  }
  if (actual) salida.push(actual);
  return salida;
}

export async function rutinaEnPdf(titulo: string, bloques: Bloque[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(titulo);
  pdf.setAuthor("Miriam del Olmo");
  const fuentes = { n: await pdf.embedFont(StandardFonts.Helvetica), b: await pdf.embedFont(StandardFonts.HelveticaBold), c: await pdf.embedFont(StandardFonts.HelveticaOblique) };

  let pagina = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - MARGEN;
  for (const bloque of bloques) {
    const e = ESTILO[bloque.tipo];
    const fuente = fuentes[e.fuente];
    const lineas = lineasDe(segura(bloque.texto, fuente), fuente, e.tam, ANCHO - 2 * MARGEN - e.sangria);
    const alto = e.tam * 1.35;
    // Un título no se queda solo al final de la página: si no caben él y su primera línea, pasa a la siguiente.
    const necesario = e.antes + alto * Math.min(lineas.length, bloque.tipo === "h1" || bloque.tipo === "ejercicio" ? lineas.length + 2 : lineas.length);
    if (y - necesario < MARGEN) {
      pagina = pdf.addPage([ANCHO, ALTO]);
      y = ALTO - MARGEN;
    } else y -= e.antes;
    for (const linea of lineas) {
      if (y - alto < MARGEN) {
        pagina = pdf.addPage([ANCHO, ALTO]);
        y = ALTO - MARGEN;
      }
      y -= alto;
      pagina.drawText(linea, { x: MARGEN + e.sangria, y: y + e.tam * 0.25, size: e.tam, font: fuente, color: rgb(...e.color) });
      if (bloque.url && bloque.url.startsWith("http")) {
        // Cada línea del enlace (aunque se parta en dos) se puede pulsar.
        const x = MARGEN + e.sangria;
        const enlace = pdf.context.register(
          pdf.context.obj({
            Type: "Annot",
            Subtype: "Link",
            Rect: [x, y, x + fuente.widthOfTextAtSize(linea, e.tam), y + alto],
            Border: [0, 0, 0],
            A: { Type: "Action", S: "URI", URI: PDFString.of(bloque.url) },
          }),
        );
        pagina.node.addAnnot(enlace);
      }
    }
  }
  return pdf.save();
}
