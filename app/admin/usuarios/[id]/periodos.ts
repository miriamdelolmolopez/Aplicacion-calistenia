// Tipos compartidos entre la ficha (servidor) y sus paneles «Actual» y «Reservas» (cliente).

// Un periodo es una compra de tarifa: sus bonos (uno por servicio) con las fechas en las que está activa.
export type PeriodoBono = { id: string; servicio: string; estado: string; total: number; restantes: number; desde: string | null; hasta: string | null };

export type Periodo = {
  id: string; // la compra (tipo + momento de alta)
  nombre: string;
  estado: "activo" | "en_cola" | "finalizado";
  desde: string | null; // AAAA-MM-DD
  hasta: string | null; // AAAA-MM-DD
  pagado: boolean;
  pendiente: boolean;
  suelto: boolean; // clases o días sueltos (regalo), aparte de la tarifa
  motivo: string | null; // por qué se dieron (solo sueltos)
  sinCaducidad: boolean;
  dado: string; // día en que se creó
  bonos: PeriodoBono[];
};

export type ReservaFila = {
  id: string;
  dia: string; // AAAA-MM-DD en hora de Madrid
  hora: string; // HH:MM
  nombre: string;
  color: string;
  servicio: string;
  estado: string; // reservada | cancelada
  asistencia: string | null; // asistio | no_asistio | null
  bonoId: string | null;
  tarifa: string; // nombre de la tarifa con la que se reservó («—» si no la hay)
};

export type TipoClaseChip = { nombre: string; color: string; colorTexto: string; servicio: string };
