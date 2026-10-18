// Los importes se guardan en céntimos para no tener errores de decimales.
export function euros(centimos: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(
    centimos / 100,
  );
}

// Convierte "55", "55,5" o "55.50" en céntimos. Devuelve NaN si no es un importe válido.
export function aCentimos(texto: string): number {
  const limpio = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return NaN;
  return Math.round(parseFloat(limpio) * 100);
}
