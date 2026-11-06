// Parte de los cumpleaños que también usa la pantalla (no toca la base de datos).
export type CumpleProximo = { id: string; nombre: string; faltan: number; dia: number; mes: number };

export const textoCuando = (c: CumpleProximo): string =>
  c.faltan === 0 ? "hoy" : c.faltan === 1 ? "mañana" : `en ${c.faltan} días (${String(c.dia).padStart(2, "0")}/${String(c.mes).padStart(2, "0")})`;
