import type { NombreIcono } from "./Icono";

// Los grupos del panel de administración: se usan en el menú lateral (dos niveles) y en las tarjetas de la pantalla «Panel».
export type OpcionGrupo = { href?: string; texto: string; descripcion: string; icono: NombreIcono; proximamente?: boolean; sub?: string };
// «opciones» son las tarjetas de la pantalla Panel; «menu» (si hay) es la lista completa que sale en el menú lateral, con subtítulos.
export type GrupoAdmin = { clave: string; titulo: string; icono: NombreIcono; opciones: OpcionGrupo[]; menu?: OpcionGrupo[] };

export const GRUPOS_ADMIN: GrupoAdmin[] = [
  {
    clave: "personas",
    titulo: "Personas",
    icono: "usuarios",
    opciones: [
      { href: "/admin/usuarios", texto: "Usuarios", descripcion: "Alumnos/as, invitados/as y su ficha", icono: "usuarios" },
      { href: "/admin/registro", texto: "Registro", descripcion: "Quién puede darse de alta", icono: "perfil" },
      { href: "/admin/importar", texto: "Importar contactos", descripcion: "Subir una lista de personas", icono: "historial" },
      { texto: "Leads", descripcion: "Personas que llegan de fuera, con embudo y etiquetas", icono: "embudo", proximamente: true },
      { texto: "Mensajes", descripcion: "Chats, grupos y difusiones", icono: "sobre", proximamente: true },
      { texto: "Tareas", descripcion: "Cosas por hacer para ti y tu equipo", icono: "documento", proximamente: true },
      { texto: "Formularios y check-ins", descripcion: "Cuestionarios y seguimiento periódico", icono: "documento", proximamente: true },
      { texto: "Hábitos", descripcion: "Hábitos para asignar a las personas", icono: "repetir", proximamente: true },
      { texto: "Onboarding de clientes", descripcion: "Pasos de bienvenida automáticos", icono: "bandera", proximamente: true },
      { texto: "Referidos", descripcion: "Enlace de recomendación con descuento", icono: "regalo", proximamente: true },
      { texto: "Equipo y roles", descripcion: "Invita a más personas y elige sus permisos", icono: "usuarios", proximamente: true },
    ],
  },
  {
    clave: "servicios",
    titulo: "Servicios",
    icono: "rutina",
    opciones: [
      { href: "/admin/presenciales", texto: "Clases presenciales", descripcion: "Horarios, plantillas y tipos de clase", icono: "historial" },
      { href: "/admin/reservas", texto: "Reservas", descripcion: "Quién está apuntado a cada clase", icono: "reservas" },
      { href: "/admin/online", texto: "Entrenamientos online 1:1", descripcion: "Rutinas y seguimiento online", icono: "rutina" },
      { href: "/admin/talleres", texto: "Talleres", descripcion: "Talleres y eventos puntuales", icono: "historial" },
      { href: "/admin/academia", texto: "Cursos", descripcion: "Cursos para ver en la app", icono: "academia" },
      { texto: "Nutrición", descripcion: "Alimentos, planes de comidas y recetas", icono: "paquete", proximamente: true },
      { texto: "Comunidad", descripcion: "Publicaciones, temas y miembros", icono: "tablon", proximamente: true },
      { texto: "Retos", descripcion: "Retos con ranking o por hitos", icono: "bandera", proximamente: true },
      { texto: "Membresías", descripcion: "Acceso a contenido por suscripción", icono: "ticket", proximamente: true },
      { texto: "Packs y ofertas", descripcion: "Packs de varios productos y cobro recurrente", icono: "paquete", proximamente: true },
    ],
    menu: [
      { href: "/admin/reservas", texto: "Reservar clases", descripcion: "", icono: "reservas", sub: "Clases presenciales" },
      { href: "/admin/horario", texto: "Horarios presenciales", descripcion: "", icono: "historial", sub: "Clases presenciales" },
      { href: "/admin/horarios", texto: "Plantillas presenciales", descripcion: "", icono: "historial", sub: "Clases presenciales" },
      { href: "/admin/clases", texto: "Tipos de clase", descripcion: "", icono: "historial", sub: "Clases presenciales" },
      { href: "/admin/prueba", texto: "Link de prueba gratuita", descripcion: "", icono: "usuarios", sub: "Clases presenciales" },
      { href: "/admin/ejercicios", texto: "Biblioteca", descripcion: "", icono: "biblioteca", sub: "Entrenamientos online 1:1" },
      { href: "/admin/rutinas", texto: "Rutinas", descripcion: "", icono: "rutina", sub: "Entrenamientos online 1:1" },
      { href: "/admin/plantillas-online", texto: "Plantillas online", descripcion: "", icono: "rutina", sub: "Entrenamientos online 1:1" },
      { href: "/admin/talleres", texto: "Talleres", descripcion: "", icono: "historial", sub: "Otros servicios" },
      { href: "/admin/academia", texto: "Cursos", descripcion: "", icono: "academia", sub: "Otros servicios" },
      { texto: "Nutrición", descripcion: "", icono: "paquete", proximamente: true, sub: "Próximamente" },
      { texto: "Comunidad", descripcion: "", icono: "tablon", proximamente: true, sub: "Próximamente" },
      { texto: "Retos", descripcion: "", icono: "bandera", proximamente: true, sub: "Próximamente" },
      { texto: "Membresías", descripcion: "", icono: "ticket", proximamente: true, sub: "Próximamente" },
      { texto: "Packs y ofertas", descripcion: "", icono: "paquete", proximamente: true, sub: "Próximamente" },
    ],
  },
  {
    clave: "economia",
    titulo: "Economía",
    icono: "pagos",
    opciones: [
      { href: "/admin/bonos", texto: "Pagos", descripcion: "Cobros, bonos y pendientes", icono: "pagos" },
      { href: "/admin/tarifas", texto: "Servicios", descripcion: "Tarifas y precios", icono: "pagos" },
      { href: "/admin/descuentos", texto: "Descuentos", descripcion: "Códigos y ofertas", icono: "pagos" },
      { href: "/admin/formas-pago", texto: "Formas de pago", descripcion: "Efectivo, Bizum, tarjeta…", icono: "pagos" },
      { texto: "Contabilidad", descripcion: "Ingresos, gastos y acceso para tu gestor", icono: "metricas", proximamente: true },
      { texto: "Planes y facturas", descripcion: "Tu plan, sus precios y tus facturas", icono: "documento", proximamente: true },
      { texto: "Tienda y marcas", descripcion: "Merchandising y productos de marcas", icono: "maletin", proximamente: true },
    ],
  },
  {
    clave: "resumen",
    titulo: "Resumen y contenido",
    icono: "metricas",
    opciones: [
      { href: "/admin/informes", texto: "Informes", descripcion: "Cifras y estadísticas", icono: "metricas" },
      { href: "/admin/aprende", texto: "Aprende", descripcion: "Contenido y exámenes", icono: "aprende" },
      { href: "/admin/tablon", texto: "Tablón de anuncios", descripcion: "Avisos para todas las personas", icono: "tablon" },
      { href: "/admin/contenido", texto: "Frases", descripcion: "Frases que salen en el Inicio", icono: "admin" },
      { href: "/admin/automatizaciones", texto: "Automatizaciones", descripcion: "Correos y avisos automáticos", icono: "admin" },
      { href: "/admin/legal", texto: "Textos legales", descripcion: "Privacidad, términos y consentimientos", icono: "admin" },
      { href: "/admin/exportar", texto: "Descargar datos (CSV)", descripcion: "Copia de tus datos", icono: "metricas" },
      { texto: "Asistente de IA", descripcion: "Ayuda para crear entrenos, recetas y textos", icono: "globo", proximamente: true },
      { texto: "Integraciones", descripcion: "Conexión con otras aplicaciones y claves de API", icono: "externo", proximamente: true },
    ],
  },
];

// Grupo al que pertenece una dirección (para abrir el menú lateral en su sitio). null si no es de ningún grupo.
export function grupoDeRuta(ruta: string): GrupoAdmin | null {
  let mejor: { g: GrupoAdmin; largo: number } | null = null;
  for (const g of GRUPOS_ADMIN) {
    for (const o of [...g.opciones, ...(g.menu ?? [])]) {
      if (!o.href) continue;
      if ((ruta === o.href || ruta.startsWith(o.href + "/")) && (!mejor || o.href.length > mejor.largo)) mejor = { g, largo: o.href.length };
    }
  }
  return mejor?.g ?? null;
}
