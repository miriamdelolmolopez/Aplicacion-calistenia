import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { claveDia, sumarDias } from "@/lib/fechas";
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

// Factura simplificada de un pago cobrado (FS-AAAA-NNN). La alumna solo puede bajar las suyas; Miriam, las de cualquiera.
// Los datos de la clienta solo salen si el total llega a 400 €.
// Si el pago se anuló después de facturarse, esta misma dirección da la factura rectificativa (FSR-AAAA-NNN);
// con ?tipo=original se descarga la factura original.
export async function GET(peticion: Request, contexto: { params: Promise<{ id: string }> }) {
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
  if (!pago || !["pagado", "anulado"].includes(pago.estado as string) || !pago.user_id) return new NextResponse("No encontrado", { status: 404 });

  const admin = createAdminClient();
  const numero = (f: { anio: number; numero: number }, serie: string) => `${serie}-${f.anio}-${String(f.numero).padStart(3, "0")}`;
  // El número se da al cobrar; si por lo que sea faltara, se da ahora.
  let { data: original } = await admin.from("facturas").select("anio, numero, emitida_en").eq("pago_id", id).eq("tipo", "normal").maybeSingle();
  if (!original && pago.estado === "pagado") {
    await admin.rpc("emitir_factura", { p_pago: id });
    original = (await admin.from("facturas").select("anio, numero, emitida_en").eq("pago_id", id).eq("tipo", "normal").maybeSingle()).data;
  }
  if (!original) return new NextResponse("Este pago no llegó a facturarse", { status: 404 });
  // Pago anulado: se baja la rectificativa (que anula la original), salvo que se pida la original.
  const rectificativa = pago.estado === "anulado" && new URL(peticion.url).searchParams.get("tipo") !== "original";
  const factura = rectificativa
    ? (await admin.from("facturas").select("anio, numero, emitida_en").eq("pago_id", id).eq("tipo", "rectificativa").maybeSingle()).data
    : original;
  if (!factura) return new NextResponse("No se ha podido emitir la factura", { status: 500 });
  const numeroFactura = rectificativa ? numero(factura, "FSR") : numero(factura, "FS");
  const signo = rectificativa ? -1 : 1;
  const [{ data: perfil }, { data: bono }, formas] = await Promise.all([
    admin.from("profiles").select("nombre, apellidos, dni, email, idioma").eq("id", pago.user_id).maybeSingle(),
    pago.bono_id ? admin.from("bonos").select("activo_desde, validez_dias, tipos_bono(nombre, iva_porcentaje)").eq("id", pago.bono_id).maybeSingle() : Promise.resolve({ data: null }),
    nombresFormas().catch(() => ({}) as Record<string, string>),
  ]);
  const idioma: "es" | "en" = perfil?.idioma === "en" ? "en" : "es";
  const es = idioma === "es";
  const tipo = (bono as { tipos_bono?: { nombre?: string; iva_porcentaje?: number } | null } | null)?.tipos_bono;
  const iva = tipo?.iva_porcentaje ?? 21;
  const total = (pago.importe_centimos as number) * signo;
  const base = Math.round(total / (1 + iva / 100));
  const euros = (c: number) => new Intl.NumberFormat(es ? "es-ES" : "en-GB", { style: "currency", currency: "EUR" }).format(c / 100);
  const fecha = (iso: string) => new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", { timeZone: "Europe/Madrid", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
  const concepto = tipo?.nombre ?? (pago.nota as string | null) ?? (es ? "Pago" : "Payment");
  const cliente = [perfil?.nombre, perfil?.apellidos].filter(Boolean).join(" ") || perfil?.email || "";
  const periodo = pago.periodo as string | null;
  // Lo que cubre el pago: desde que empieza la tarifa hasta que se acaban los días que se pagan (los días de cortesía que se regalen después no cuentan).
  const infoBono = bono as { activo_desde?: string | null; validez_dias?: number | null } | null;
  const cubre =
    infoBono?.activo_desde && infoBono.validez_dias
      ? (() => {
          const desde = claveDia(infoBono.activo_desde);
          const hasta = sumarDias(desde, infoBono.validez_dias - 1);
          const corta = (dia: string) => new Intl.DateTimeFormat(es ? "es-ES" : "en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${dia}T12:00:00Z`));
          return `${corta(desde)} – ${corta(hasta)}`;
        })()
      : null;
  const conCliente = Math.abs(total) >= 40000;

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

  texto(rectificativa ? (es ? "Factura rectificativa" : "Corrective invoice") : (es ? "Factura simplificada" : "Simplified invoice"), M, 22, negrita, acento);
  derecha(`${es ? "Nº" : "No."} ${numeroFactura}`, 12, negrita);
  y -= 34;
  linea();
  y -= 16;

  texto(es ? "Emitida por" : "Issued by", M, 9, negrita, gris);
  if (conCliente) texto(es ? "Para" : "To", M + ANCHO / 2, 9, negrita, gris);
  y -= 15;
  texto(TITULAR.nombre, M, 10, negrita);
  if (conCliente) texto(cliente, M + ANCHO / 2, 10, negrita);
  y -= 14;
  texto(`NIF ${TITULAR.nif}`, M);
  if (conCliente && perfil?.dni) texto(`DNI/NIE ${perfil.dni}`, M + ANCHO / 2);
  y -= 14;
  texto(TITULAR.direccion, M, 9, normal, gris);
  y -= 30;
  linea();
  y -= 18;

  const fila = (etiqueta: string, valor: string, fuerte = false) => {
    texto(etiqueta, M, 10, normal, gris);
    texto(valor, M + 170, 10, fuerte ? negrita : normal);
    y -= 20;
  };
  fila(es ? "Fecha de emisión" : "Issue date", fecha(factura.emitida_en as string));
  if (rectificativa) {
    fila(es ? "Rectifica la factura" : "Corrects invoice", `${numero(original, "FS")} (${fecha(original.emitida_en as string)})`, true);
    fila(es ? "Motivo" : "Reason", es ? "Anulación del pago" : "Payment cancelled");
  }
  fila(es ? "Descripción" : "Description", concepto, true);
  fila(es ? "Fecha del pago" : "Payment date", fecha((pago.pagado_en as string | null) ?? (pago.creado_en as string)));
  if (cubre) fila(es ? "Cubre" : "Covers", cubre);
  else if (periodo && /^[0-9]{4}-[0-9]{2}$/.test(periodo)) fila(es ? "Corresponde a" : "Covers", `${MESES[idioma][Number(periodo.slice(5)) - 1]} ${periodo.slice(0, 4)}`);
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
    importe(es ? "Precio" : "Price", euros((pago.importe_original_centimos as number) * signo));
    importe(es ? "Descuento" : "Discount", euros(-(pago.descuento_centimos as number) * signo));
  }
  importe(es ? "Precio base (sin IVA)" : "Base price (excl. VAT)", euros(base));
  importe(`IVA ${iva} %`, euros(total - base));
  y -= 2;
  importe(rectificativa ? (es ? "Total a devolver" : "Total to refund") : es ? "Total a pagar" : "Total to pay", euros(total), true);

  y -= 24;
  const aviso = es
    ? rectificativa
      ? "Factura rectificativa: anula la factura indicada. Importes en negativo."
      : "Factura simplificada. IVA incluido en el total."
    : rectificativa
      ? "Corrective invoice: cancels the invoice shown. Amounts are negative."
      : "Simplified invoice. VAT included in the total.";
  texto(aviso, M, 9, normal, gris);
  y -= 13;
  texto(`${TITULAR.email} · ${TITULAR.telefono}`, M, 9, normal, gris);

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${numeroFactura}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
