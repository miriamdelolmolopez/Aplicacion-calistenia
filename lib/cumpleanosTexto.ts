// Parte de los cumpleaños que también usa la pantalla (no toca la base de datos).
export type CumpleProximo = { id: string; nombre: string; faltan: number; dia: number; mes: number; edad: number };

export const textoCuando = (c: CumpleProximo): string => {
  const cuando = c.faltan === 0 ? "hoy" : c.faltan === 1 ? "mañana" : `en ${c.faltan} días (${String(c.dia).padStart(2, "0")}/${String(c.mes).padStart(2, "0")})`;
  return c.edad > 0 ? `cumple ${c.edad} años ${cuando}` : cuando;
};
