// Catálogo de las automatizaciones propias: qué se puede preguntar («Cuando ocurra») y qué se puede hacer («Entonces que haga»).
// Se usa en la pantalla de edición y en el motor que las ejecuta cada mañana.

export type OperadorNumero = "igual" | "mayor" | "menor" | "entre" | "vacio";
export type OperadorOpcion = "igual" | "distinto";
export type OperadorTiene = "tiene" | "no_tiene";
export type Operador = OperadorNumero | OperadorOpcion | OperadorTiene;

export type Condicion = { tipo: string; operador: Operador; valor: string; valor2?: string };

export type TipoCondicion = {
  clave: string;
  es: string;
  grupo: "Actividad" | "Tarifas" | "Pagos" | "Persona" | "Fecha";
  clase: "numero" | "opcion" | "tiene";
  unidad?: string;
  opciones?: { valor: string; es: string }[];
  dinamico?: "tarifas";
};

const DIAS = [
  { valor: "1", es: "Lunes" },
  { valor: "2", es: "Martes" },
  { valor: "3", es: "Miércoles" },
  { valor: "4", es: "Jueves" },
  { valor: "5", es: "Viernes" },
  { valor: "6", es: "Sábado" },
  { valor: "7", es: "Domingo" },
];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((es, i) => ({ valor: String(i + 1), es }));

export const CONDICIONES: TipoCondicion[] = [
  { clave: "dias_ultimo_entreno", es: "Días desde su última clase o entreno", grupo: "Actividad", clase: "numero", unidad: "días" },
  { clave: "dias_proxima_reserva", es: "Días hasta su próxima reserva", grupo: "Actividad", clase: "numero", unidad: "días" },
  { clave: "reservas_total", es: "Número de reservas (hechas y futuras)", grupo: "Actividad", clase: "numero" },
  { clave: "clases_hechas", es: "Número de clases hechas", grupo: "Actividad", clase: "numero" },
  { clave: "entrenos_online", es: "Número de entrenos online hechos", grupo: "Actividad", clase: "numero" },

  { clave: "dias_hasta_caducar", es: "Días hasta que caduca su tarifa", grupo: "Tarifas", clase: "numero", unidad: "días" },
  { clave: "dias_desde_caducada", es: "Días desde que caducó su última tarifa", grupo: "Tarifas", clase: "numero", unidad: "días" },
  { clave: "clases_restantes", es: "Clases que le quedan", grupo: "Tarifas", clase: "numero" },
  { clave: "tarifa_activa", es: "Tiene alguna tarifa en marcha", grupo: "Tarifas", clase: "opcion", opciones: [{ valor: "si", es: "Sí" }, { valor: "no", es: "No" }] },
  { clave: "tarifa", es: "Tiene la tarifa…", grupo: "Tarifas", clase: "tiene", dinamico: "tarifas" },
  {
    clave: "servicio",
    es: "Tiene el servicio…",
    grupo: "Tarifas",
    clase: "tiene",
    opciones: [{ valor: "grupal", es: "Clases grupales" }, { valor: "individual", es: "Clases individuales" }, { valor: "online", es: "Plan online" }],
  },

  { clave: "dias_ultimo_pago", es: "Días desde su último pago", grupo: "Pagos", clase: "numero", unidad: "días" },
  { clave: "pagos_total", es: "Número de pagos", grupo: "Pagos", clase: "numero" },

  {
    clave: "rol",
    es: "Tipo de usuario",
    grupo: "Persona",
    clase: "opcion",
    opciones: [{ valor: "alumno", es: "Alumno/a" }, { valor: "exalumno", es: "Exalumno/a" }, { valor: "invitado", es: "Invitado/a" }, { valor: "coach", es: "Coach" }],
  },
  { clave: "dias_alta", es: "Días desde que se dio de alta", grupo: "Persona", clase: "numero", unidad: "días" },
  { clave: "edad", es: "Edad", grupo: "Persona", clase: "numero", unidad: "años" },
  { clave: "dias_hasta_cumple", es: "Días hasta su cumpleaños", grupo: "Persona", clase: "numero", unidad: "días" },

  { clave: "dia_semana", es: "Día de la semana", grupo: "Fecha", clase: "opcion", opciones: DIAS },
  { clave: "dia_mes", es: "Día del mes", grupo: "Fecha", clase: "numero" },
  { clave: "mes", es: "Mes", grupo: "Fecha", clase: "opcion", opciones: MESES },
];

export const GRUPOS = ["Actividad", "Tarifas", "Pagos", "Persona", "Fecha"] as const;

export const OPERADORES: Record<TipoCondicion["clase"], { valor: Operador; es: string }[]> = {
  numero: [
    { valor: "igual", es: "Igual a" },
    { valor: "mayor", es: "Mayor que" },
    { valor: "menor", es: "Menor que" },
    { valor: "entre", es: "Entre" },
    { valor: "vacio", es: "No tiene dato" },
  ],
  opcion: [
    { valor: "igual", es: "Igual a" },
    { valor: "distinto", es: "Distinto de" },
  ],
  tiene: [
    { valor: "tiene", es: "Tiene" },
    { valor: "no_tiene", es: "No tiene" },
  ],
};

export const tipoDeCondicion = (clave: string) => CONDICIONES.find((c) => c.clave === clave);

export type Tarifa = { id: string; nombre: string };

export function describirCondicion(c: Condicion, tarifas: Tarifa[] = []): string {
  const t = tipoDeCondicion(c.tipo);
  if (!t) return "(condición desconocida)";
  const op = OPERADORES[t.clase].find((o) => o.valor === c.operador)?.es.toLowerCase() ?? c.operador;
  if (t.clase === "numero") {
    if (c.operador === "vacio") return `${t.es}: sin dato`;
    const u = t.unidad ? ` ${t.unidad}` : "";
    return c.operador === "entre" ? `${t.es}: entre ${c.valor} y ${c.valor2 ?? "?"}${u}` : `${t.es}: ${op} ${c.valor}${u}`;
  }
  const nombre = t.dinamico === "tarifas" ? (tarifas.find((x) => x.id === c.valor)?.nombre ?? "(tarifa)") : (t.opciones?.find((o) => o.valor === c.valor)?.es ?? c.valor);
  if (t.clase === "tiene") {
    const base = t.es.replace("Tiene ", "").replace("…", "").trim();
    return `${c.operador === "tiene" ? "Tiene" : "No tiene"} ${base} ${nombre}`;
  }
  return `${t.es}: ${op} ${nombre}`;
}

// ---- Consecuencias ---------------------------------------------------------------------------------------

export type Accion =
  | { tipo: "app"; titulo: string; texto: string; enlace?: string }
  | { tipo: "correo"; asunto: string; mensaje: string; asunto_en?: string; mensaje_en?: string; enlace?: string }
  | { tipo: "clases"; cantidad: number; servicio: "grupal" | "individual"; nota?: string }
  | { tipo: "tarea"; texto: string };

export const ACCIONES = [
  { tipo: "app", es: "Aviso en la app y en el móvil", ayuda: "Le llega una notificación (campana) con tu texto." },
  { tipo: "correo", es: "Correo", ayuda: "Le envías un correo con tu texto. Si tiene desactivados los correos, no se le envía." },
  { tipo: "clases", es: "Añadir clases", ayuda: "Le sumas clases sueltas (sin caducidad) a su cuenta." },
  { tipo: "tarea", es: "Tarea para ti (con botón de WhatsApp)", ayuda: "Te deja un aviso para que escribas tú a la persona; el mensaje ya sale preparado en WhatsApp." },
] as const;

// Palabras entre llaves que se sustituyen en los textos.
export const VARIABLES = [
  { clave: "nombre", es: "Su nombre" },
  { clave: "tarifa", es: "Su tarifa" },
  { clave: "clases", es: "Clases que le quedan" },
  { clave: "fecha_caducidad", es: "Fecha en que caduca su tarifa" },
  { clave: "dias_sin_venir", es: "Días desde su última clase" },
  { clave: "edad", es: "Su edad" },
] as const;

export type Regla = {
  id: string;
  nombre: string;
  activa: boolean;
  condiciones: Condicion[];
  acciones: Accion[];
  repeticion_dias: number | null;
};

export function describirAccion(a: Accion): string {
  if (a.tipo === "app") return `Aviso en la app: «${a.titulo}»`;
  if (a.tipo === "correo") return `Correo: «${a.asunto}»`;
  if (a.tipo === "clases") return `Añadir ${a.cantidad} ${a.cantidad === 1 ? "clase" : "clases"} ${a.servicio === "individual" ? "individuales" : "grupales"}`;
  return `Tarea para ti: «${a.texto.slice(0, 50)}${a.texto.length > 50 ? "…" : ""}»`;
}
