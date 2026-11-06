// Las secciones del panel de administración que se pueden excluir a una administradora.
export const SECCIONES_ADMIN: { clave: string; texto: string }[] = [
  { clave: "usuarios", texto: "Usuarios" },
  { clave: "importar", texto: "Importar contactos" },
  { clave: "registro", texto: "Registro" },
  { clave: "presenciales", texto: "Clases presenciales (horarios, plantillas, tipos de clase)" },
  { clave: "reservas", texto: "Reservas" },
  { clave: "online", texto: "Entrenamientos online 1:1" },
  { clave: "talleres", texto: "Talleres" },
  { clave: "academia", texto: "Cursos" },
  { clave: "pagos", texto: "Pagos" },
  { clave: "tarifas", texto: "Servicios (tarifas)" },
  { clave: "descuentos", texto: "Descuentos" },
  { clave: "formas-pago", texto: "Formas de pago" },
  { clave: "informes", texto: "Informes" },
  { clave: "legal", texto: "Textos legales" },
  { clave: "automatizaciones", texto: "Automatizaciones" },
  { clave: "contenido", texto: "Fotos y frases" },
  { clave: "aprende", texto: "Aprende" },
  { clave: "exportar", texto: "Descargar datos (CSV)" },
];

export const CLAVES_SECCIONES = SECCIONES_ADMIN.map((s) => s.clave);

// A qué sección del panel pertenece una dirección (null = no es de ninguna sección que se pueda excluir).
const PREFIJOS: [string, string][] = [
  ["/admin/usuarios", "usuarios"],
  ["/admin/tablon", "contenido"],
  ["/admin/importar", "importar"],
  ["/admin/registro", "registro"],
  ["/admin/presenciales", "presenciales"],
  ["/admin/clases", "presenciales"],
  ["/admin/horario", "presenciales"], // también «/admin/horarios»
  ["/admin/prueba", "presenciales"],
  ["/admin/reservas", "reservas"],
  ["/admin/online", "online"],
  ["/admin/rutinas", "online"],
  ["/admin/plantillas-online", "online"],
  ["/admin/ejercicios", "online"],
  ["/admin/talleres", "talleres"],
  ["/admin/academia", "academia"],
  ["/admin/bonos", "pagos"],
  ["/admin/tarifas", "tarifas"],
  ["/admin/descuentos", "descuentos"],
  ["/admin/formas-pago", "formas-pago"],
  ["/admin/informes", "informes"],
  ["/admin/legal", "legal"],
  ["/admin/automatizaciones", "automatizaciones"],
  ["/admin/contenido", "contenido"],
  ["/admin/aprende", "aprende"],
  ["/admin/exportar", "exportar"],
];

export function seccionDeRuta(ruta: string): string | null {
  return PREFIJOS.find(([prefijo]) => ruta.startsWith(prefijo))?.[1] ?? null;
}

// Quita de una lista de opciones (con «href») las que llevan a una sección excluida.
export function sinExcluidas<T extends { href?: string }>(opciones: T[], excluidas: string[]): T[] {
  return opciones.filter((o) => !o.href || !excluidas.includes(seccionDeRuta(o.href) ?? ""));
}
