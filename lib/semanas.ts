// Cálculos de semanas (lunes a domingo, hora de Madrid) con fechas AAAA-MM-DD.

export function sumarDias(clave: string, dias: number): string {
  const d = new Date(`${clave}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// 0 = lunes … 6 = domingo
export function diaDeLaSemana(clave: string): number {
  return (new Date(`${clave}T12:00:00Z`).getUTCDay() + 6) % 7;
}

export function lunesDe(clave: string): string {
  return sumarDias(clave, -diaDeLaSemana(clave));
}

// Número de semana de una rutina (1, 2, 3…): la semana de su publicación es la 1.
export function numeroSemana(publicadaClave: string, hoyClave: string): number {
  const a = new Date(`${lunesDe(publicadaClave)}T12:00:00Z`).getTime();
  const b = new Date(`${lunesDe(hoyClave)}T12:00:00Z`).getTime();
  return Math.max(1, Math.round((b - a) / (7 * 86400000)) + 1);
}
