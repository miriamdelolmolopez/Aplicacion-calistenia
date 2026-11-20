// Cálculos de semanas (lunes a domingo, hora de Madrid) con fechas AAAA-MM-DD.

export function sumarDias(clave: string, dias: number): string {
  const d = new Date(`${clave}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return clave;
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// 0 = lunes … 6 = domingo
export function diaDeLaSemana(clave: string): number {
  return (new Date(`${clave}T12:00:00Z`).getUTCDay() + 6) % 7;
}

// Primer día de la semana de una fecha. «inicio» es el día en que empieza la semana de esa persona (0 = lunes … 6 = domingo; por defecto, lunes).
export function inicioSemanaDe(clave: string, inicio = 0): string {
  return sumarDias(clave, -((diaDeLaSemana(clave) - inicio + 7) % 7));
}

export function lunesDe(clave: string): string {
  return inicioSemanaDe(clave, 0);
}

// Número de semana de una rutina (1, 2, 3…): la semana de su publicación es la 1.
export function numeroSemana(publicadaClave: string, hoyClave: string, inicio = 0): number {
  const a = new Date(`${inicioSemanaDe(publicadaClave, inicio)}T12:00:00Z`).getTime();
  const b = new Date(`${inicioSemanaDe(hoyClave, inicio)}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / (7 * 86400000)) + 1);
}
