// Tipos y valores de la sección Leads (se pueden usar tanto en el servidor como en el navegador).

// Colores que se pueden elegir para las etiquetas y los tipos de lead.
export const COLORES = {
  gris: { texto: "Gris", fg: "#4a5058", bg: "#f1f2f4" },
  azul: { texto: "Azul", fg: "#0e7490", bg: "#e5f6f9" },
  verde: { texto: "Verde", fg: "#1f6b3a", bg: "#e6f6ec" },
  ambar: { texto: "Ámbar", fg: "#8a4b0f", bg: "#fff3dc" },
  rojo: { texto: "Rojo", fg: "#a52f2e", bg: "#ffebeb" },
  lila: { texto: "Lila", fg: "#5b3fb3", bg: "#efebfc" },
  rosa: { texto: "Rosa", fg: "#a3246b", bg: "#fde8f3" },
  turquesa: { texto: "Turquesa", fg: "#0b6b63", bg: "#dff6f2" },
} as const;
type ClaveColor = keyof typeof COLORES;
// Un color es el nombre de uno de los 8 de arriba o cualquier color propio escrito como «#rrggbb».
export type ColorLead = string;
export const CLAVES_COLOR = Object.keys(COLORES) as ClaveColor[];
export const esHex = (c: string) => /^#[0-9a-f]{6}$/i.test(c);
export const colorValido = (c: string) => (CLAVES_COLOR as string[]).includes(c) || esHex(c);
// Letra y fondo de un color: los 8 de siempre tienen los suyos; un color propio saca el fondo suave y la letra oscura a partir de él.
export const colorDe = (clave: string | null | undefined): { fg: string; bg: string } => {
  if (clave && esHex(clave)) return { fg: `color-mix(in srgb, ${clave} 70%, black)`, bg: `color-mix(in srgb, ${clave} 16%, white)` };
  return COLORES[(clave as ClaveColor) in COLORES ? (clave as ClaveColor) : "gris"];
};
// El valor que se enseña en la rueda de color (los 8 de siempre se pasan a su tono).
export const hexDe = (clave: string): string => (esHex(clave) ? clave : COLORES[(clave as ClaveColor) in COLORES ? (clave as ClaveColor) : "gris"].fg);

export type EstadoLead = { id: string; nombre: string; orden: number; es_ganado: boolean; color: ColorLead };

// Los colores que se ofrecen al editar (como en Notion). El que se guarda es el «valor»: uno de los 8 de serie o un color propio #rrggbb.
export const PALETA: { valor: string; texto: string }[] = [
  { valor: "gris", texto: "Predeterminado" },
  { valor: "#9ca3af", texto: "Gris" },
  { valor: "#92643a", texto: "Marrón" },
  { valor: "#e8782a", texto: "Naranja" },
  { valor: "#d9a406", texto: "Amarillo" },
  { valor: "verde", texto: "Verde" },
  { valor: "azul", texto: "Azul" },
  { valor: "lila", texto: "Morado" },
  { valor: "rosa", texto: "Rosa" },
  { valor: "rojo", texto: "Rojo" },
];

// Una etiqueta, un tipo de lead o un estado (listas que cada entrenador edita).
export type ItemColor = { id: string; nombre: string; color: ColorLead; orden: number; es_ganado?: boolean };

export type InfoLead = { clave: string; valor: string };

export type Lead = {
  id: string;
  estado_id: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  email: string;
  pais: string;
  idioma: "es" | "en";
  tipo_id: string | null;
  destino: string;
  manual: boolean;
  etiqueta_ids: string[];
  notas: string;
  info: InfoLead[];
  cliente_id: string | null;
  llegada_en: string;
};

export type NotaVenta = { id: string; texto: string; estado_nombre: string; autor: string; creado_en: string };

// Tarifa que se puede asignar al convertir un lead en cliente.
export type TarifaLead = { id: string; nombre: string; servicio: string; precio_centimos: number };

// Servicios que puede contratar un cliente al convertirse (los mismos que en el alta de clientes).
export const SERVICIOS_CONTRATO: { valor: string; texto: string }[] = [
  { valor: "online", texto: "Entrenamiento online" },
  { valor: "grupal", texto: "Clases grupales" },
  { valor: "individual", texto: "Entrenamiento individual" },
];

export const COLUMNAS_LEAD = "id, estado_id, nombre, apellidos, telefono, email, pais, idioma, tipo_id, destino, manual, etiqueta_ids, notas, info, cliente_id, llegada_en";

// Estados con los que empieza cada entrenador (después puede añadir, cambiar o quitar los que quiera).
export const ESTADOS_INICIALES: { nombre: string; ganado: boolean; color: ColorLead }[] = [
  { nombre: "Nuevo lead", ganado: false, color: "azul" },
  { nombre: "Contactado", ganado: false, color: "turquesa" },
  { nombre: "En conversaciones", ganado: false, color: "lila" },
  { nombre: "Primera reunión", ganado: false, color: "ambar" },
  { nombre: "Oferta enviada", ganado: false, color: "rosa" },
  { nombre: "Ganado", ganado: true, color: "verde" },
  { nombre: "En espera", ganado: false, color: "gris" },
  { nombre: "Perdido", ganado: false, color: "rojo" },
];

// Listas de ejemplo con las que empieza cada entrenador (después las cambia como quiera). Sin verificar con Miriam.
export const TIPOS_INICIALES: { nombre: string; color: ColorLead }[] = [
  { nombre: "Online", color: "azul" },
  { nombre: "Presencial", color: "verde" },
  { nombre: "Híbrido", color: "lila" },
];
export const ETIQUETAS_INICIALES: { nombre: string; color: ColorLead }[] = [
  { nombre: "Instagram", color: "rosa" },
  { nombre: "Web", color: "azul" },
  { nombre: "Recomendación", color: "verde" },
  { nombre: "Evento", color: "ambar" },
];
