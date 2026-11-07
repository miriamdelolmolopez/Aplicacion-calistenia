// Cómo se muestra una tarifa en toda la app: un color según su estado y otro según su pago.
// Activo = verde · caduca dentro de poco = naranja · caducado = gris.
// Pagado = verde · pendiente de pago = naranja · si la tarifa ya no está en fechas, todo en gris.

export type Tono = "verde" | "naranja" | "gris";
export type EtiquetaT = { texto: string; tono: Tono };

const DIAS_AVISO = 7;

type BonoEstado = { estado: string; caduca_en?: string | null };

// «Vigente»: activo, o sin clases pero todavía dentro de sus fechas (sigue siendo una tarifa activa).
export function tarifaVigente(b: BonoEstado, ahora: number = Date.now()): boolean {
  if (b.estado === "activo") return true;
  return b.estado === "agotado" && !!b.caduca_en && new Date(b.caduca_en).getTime() > ahora;
}

export function etiquetaTarifa(b: BonoEstado, ahora: number = Date.now(), en = false): EtiquetaT {
  if (b.estado === "anulado") return { texto: en ? "Cancelled" : "Anulado", tono: "gris" };
  if (b.estado === "en_cola") return { texto: en ? "Upcoming" : "Próxima", tono: "gris" };
  if (!tarifaVigente(b, ahora)) return { texto: en ? "Expired" : "Caducado", tono: "gris" };
  if (b.caduca_en) {
    const dias = (new Date(b.caduca_en).getTime() - ahora) / 86_400_000;
    if (dias <= DIAS_AVISO) return { texto: en ? "Expires soon" : "Caduca dentro de poco", tono: "naranja" };
  }
  return { texto: en ? "Active" : "Activo", tono: "verde" };
}

// El estado del pago de una tarifa. Sin dato de pago (regalo, cortesía…) no se muestra nada.
export function etiquetaPago(pago: string | null | undefined, vigente: boolean, en = false): EtiquetaT | null {
  if (pago !== "pagado" && pago !== "pendiente") return null;
  const texto = pago === "pagado" ? (en ? "Paid" : "Pagado") : en ? "Payment pending" : "Pendiente de pago";
  return { texto, tono: vigente ? (pago === "pagado" ? "verde" : "naranja") : "gris" };
}
