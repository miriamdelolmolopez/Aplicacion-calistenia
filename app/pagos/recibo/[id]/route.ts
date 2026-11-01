import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { TITULAR } from "@/lib/legal";
import { nombresFormas } from "@/lib/formasPago";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Las letras estándar de PDF no tienen todos los símbolos: lo que no existe se cambia por «?».
const limpiar = (s: string) => s.replace(/[^ -~ -ÿ–—‘’“”•…€]/g, "?");

const MESES = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};

// Recibo de un pago cobrado. La alumna solo puede bajar los suyos; Miriam, los de cualquiera.
// Es un justificante de pago, no una factura.
export async function GET(_peticion: Request, contexto: { params: Promise<{ id: string }> }) {
  const { id } = await contexto.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse("No encontrado", { status: 404 });

  // Se pregunta con la sesión de quien lo pide: las reglas de seguridad solo le devuelven sus propios pagos.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No has iniciado sesión", { status: 401 });
  const { data: pago } = await supabase
    .from("pagos")
    .select("id, user_id, bono_id, importe_centimos, importe_original_centimos, descuento_centimos, metodo, estado, pagado_en, creado_en, periodo, nota")
    .eq("id", id)
    .maybeSingle();
  if (!pago || pago.estado !== "pagado" || !pago.user_id) return new NextResponse("No encontrado", { status: 404 });

  const admin = createAdminClient();
  const [{ data: perfil }, { data: bono }, formas] = await Promise.all([
    admin.from("profiles").select("nombre, apellidos, dni, email, idioma").eq("id", pago.user_id).maybeSingle(),
    pago.bono_id ? admin.from("bonos").select("tipos_bono(nombre, iva_porcentaje)").eq("id", pago.bono_id).maybeSingle() : Promise.resolve({ data: null }),
    nombresFormas().catch(() => ({}) as Record<string, string>),
  ]);
  const idioma: "es" | "en" = perfil?.idioma === "en" ? "en" : "es";
  const es = idioma === "es";
  const tipo = (bono as { tipos_bono?: { nombre?: string; iva_porcentaje?: number } | null } | null)?.tipos_bono;
  const iva = tipo?.iva_porcentaje ?? 21;
  const total = pago.importe_centimos as number;
  const base = Math.round(total / (1 + iva / 100));
  const euros = (c: number) => new Intl.NumberFormat(es ? "es-ES" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
  const fecha = (iso: string) => new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  const concepto = tipo?.nombre ?? (pago.nota as string | null) ?? (es ? "Pago" : "Payment");
  const cliente = [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(" ") || perfil?.email || "";
  const periodo = pago.periodo as string | null;

  const pdf = await PDFDocument.create();
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pagina = pdf.addPage([595.28, 841.89]);
  const M = 56;
  const ANCHO = 595.28 - M * 2;
  const acento = rgb(0.04, 0.5, 0.6);
  const gris = rgb(0.4, 0.42, 0.45);
  const negro = rgb(0.1, 0.1, 0.11);
  let y = 841.89 - M;

  const texto = (t: string, x: number, tam = 10, fuente = normal, color = negro) => pagina.drawText(limpiar(t), { x, y, size: tam, font: fuente, color });
  const derecha = (t: string, tam = 10, fuente = normal, color = negro) => pagina.drawText(limpiar(t), { x: M + ANCHO - fuente.widthOfTextAtSize(limpiar(t), tam), y, size: tam, font: fuente, color });
  const linea = () => pagina.drawLine({ start: { x: M, y: y + 6 }, end: { x: M + ANCHO, y: y + 6 }, thickness: 0.6, color: rgb(0.85, 0.86, 0.88) });

  texto(es ? "Recibo de pago" : "Payment receipt", M, 22, negrita, acento);
  derecha(`${es ? "Recibo n.º" : "Receipt no."} ${id.slice(0, 8).toUpperCase()}`, 10, normal, gris);
  y -= 34;
  linea();
  y -= 16;

  texto(es ? "Emitido por" : "Issued by", M, 9, negrita, gris);
  texto(es ? "Recibido de" : "Received from", M + ANCHO / 2, 9, negrita, gris);
  y -= 15;
  texto(TITULAR.nombre, M, 10, negrita);
  texto(cliente, M + ANCHO / 2, 10, negrita);
  y -= 14;
  texto(`NIF ${TITULAR.nif}`, M);
  if (perfil?.dni) texto(`DNI/NIE ${perfil.dni}`, M + ANCHO / 2);
  y -= 14;
  texto(TITULAR.direccion.length > 52 ? TITULAR.direccion.slice(0, 52) : TITULAR.direccion, M, 9, normal, gris);
  if (perfil?.email) texto(perfil.email, M + ANCHO / 2, 9, normal, gris);
  y -= 30;
  linea();
  y -= 18;

  const fila = (etiqueta: string, valor: string, fuerte = false) => {
    texto(etiqueta, M, 10, normal, gris);
    texto(valor, M + 170, 10, fuerte ? negrita : normal);
    y -= 20;
  };
  fila(es ? "Concepto" : "Item", concepto, true);
  fila(es ? "Fecha del pago" : "Payment date", fecha((pago.pagado_en as string | null) ?? (pago.creado_en as string)));
  if (periodo && /^\d{4}-\d{2}$/.test(periodo)) fila(es ? "Corresponde a" : "Covers", `${MESES[idioma][Number(periodo.slice(5)) - 1]} ${periodo.slice(0, 4)}`);
  fila(es ? "Forma de pago" : "Payment method", (formas as Record<string, string>)[pago.metodo as string] ?? (pago.metodo as string));
  y -= 6;
  linea();
  y -= 20;

  const importe = (etiqueta: string, valor: string, fuerte = false) => {
    texto(etiqueta, M, fuerte ? 12 : 10, fuerte ? negrita : normal);
    derecha(valor, fuerte ? 12 : 10, fuerte ? negrita : normal);
    y -= fuerte ? 24 : 18;
  };
  if ((pago.descuento_centimos as number) > 0 && pago.importe_original_centimos !== null) {
    importe(es ? "Precio" : "Price", euros(pago.importe_original_centimos as number));
    importe(es ? "Descuento" : "Discount", `-${euros(pago.descuento_centimos as number)}`);
  }
  importe(es ? "Base imponible" : "Taxable amount", euros(base));
  importe(`IVA ${iva} %`, euros(total - base));
  y -= 2;
  importe(es ? "Total pagado" : "Total paid", euros(total), true);

  y -= 24;
  const aviso = es
    ? "Este documento es un justificante del pago recibido. No es una factura."
    : "This document is a receipt for the payment received. It is not an invoice.";
  texto(aviso, M, 9, normal, gris);
  y -= 13;
  texto(`${TITULAR.email} · ${TITULAR.telefono}`, M, 9, normal, gris);

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="recibo-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
