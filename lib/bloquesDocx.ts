import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import type { Bloque } from "./rutinaDocumento";

// Documento de Word a partir de los mismos bloques que usan el PDF y la imagen.
export async function bloquesEnDocx(titulo: string, bloques: Bloque[]): Promise<Uint8Array> {
  const parrafos = bloques.map((b) => {
    switch (b.tipo) {
      case "titulo":
        return new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: b.texto, bold: true })] });
      case "h1":
        return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360 }, children: [new TextRun(b.texto)] });
      case "h2":
        return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [new TextRun(b.texto)] });
      case "meta":
        return new Paragraph({ children: [new TextRun({ text: b.texto, color: "555555" })] });
      case "ejercicio":
        return new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: b.texto, bold: true })] });
      case "detalle":
        return new Paragraph({ indent: { left: 360 }, children: [new TextRun(b.texto)] });
      case "nota":
        return new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: b.texto, italics: true })] });
      case "enlace":
        return new Paragraph({ indent: { left: 360 }, children: [new TextRun({ text: b.texto, color: "0563C1" })] });
      default:
        return new Paragraph({ children: [new TextRun(b.texto)] });
    }
  });
  const documento = new Document({
    creator: "Miriam del Olmo",
    title: titulo,
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
  return new Uint8Array(await Packer.toBuffer(documento));
}
