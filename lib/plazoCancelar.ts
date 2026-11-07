// Horas antes de la clase hasta las que se puede cancelar sin perderla (cuando el tipo de clase no tiene un plazo propio):
// individuales, 12 h; grupales de mañana (antes de las 14:00, hora de Madrid), 12 h; resto de grupales, las generales (2 h).
// Tiene que coincidir con la función cancelar_reserva de la base de datos (archivo 088).
const HORA_FIN_MANANA = 14;
const HORAS_MANANA = 12;

export function esDeManana(empiezaEn: string): boolean {
  const hora = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", hour12: false }).format(new Date(empiezaEn)));
  return hora < HORA_FIN_MANANA;
}

export function horasGeneralesCancelar(servicio: string, empiezaEn: string, general: number, individual: number): number {
  if (servicio === "individual") return individual;
  return esDeManana(empiezaEn) ? HORAS_MANANA : general;
}
