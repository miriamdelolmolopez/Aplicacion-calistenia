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
