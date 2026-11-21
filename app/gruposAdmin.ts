import type { NombreIcono } from "./Icono";

// El menú de la administradora: un solo nivel en el lateral (con títulos de grupo muy sutiles) y, dentro de cada opción,
// sus pestañas arriba de la pantalla. Lo que todavía no existe sale apagado con la etiqueta «Pronto».
export type Pestana = {
  texto: string;
  href?: string; // sin «href» = todavía no existe (Pronto)
  alias?: string[]; // otras direcciones que cuentan como esta pestaña
  icono?: NombreIcono;
};

export type ItemMenu = {
  clave: string;
  texto: string;
  icono: NombreIcono;
  href?: string; // dirección propia si no tiene pestañas (Inicio)
  pestanas?: Pestana[];
};

export type GrupoMenu = { titulo?: string; items: ItemMenu[] };

const MENU_BASE: GrupoMenu[] = [
  {
    items: [{ clave: "inicio", texto: "Inicio", icono: "inicio", href: "/inicio" }],
  },
  {
    titulo: "Personas",
    items: [
      { clave: "leads", texto: "Leads", icono: "embudo" },
      {
        clave: "usuarios",
        texto: "Usuarios",
        icono: "usuarios",
        pestanas: [
          { texto: "Clientes", icono: "usuarios", href: "/admin/usuarios" },
          { texto: "Invitados", icono: "ticket", href: "/admin/prueba" },
          { texto: "Importar contactos", icono: "historial", href: "/admin/importar" },
        ],
      },
      { clave: "mensajes", texto: "Mensajes", icono: "sobre" },
      { clave: "equipo", texto: "Equipo", icono: "usuarios" },
      { clave: "tareas", texto: "Tareas", icono: "documento" },
      { clave: "formularios", texto: "Formularios", icono: "documento" },
    ],
  },
  {
    titulo: "Servicios",
    items: [
      {
        clave: "reservas",
        texto: "Reservas",
        icono: "reservas",
        pestanas: [
          { texto: "Horarios", icono: "cronometro", href: "/admin/horario" },
          { texto: "Plantillas de horarios", icono: "documento", href: "/admin/horarios" },
          { texto: "Reservas", icono: "reservas", href: "/admin/reservas" },
          { texto: "Tipos de entrenamiento", icono: "etiqueta", href: "/admin/clases" },
        ],
      },
      {
        clave: "entrenamiento",
        texto: "Entrenamiento",
        icono: "rutina",
        pestanas: [
          { texto: "Ejercicios", icono: "biblioteca", href: "/admin/ejercicios" },
          { texto: "Rutinas", icono: "rutina", href: "/admin/rutinas" },
          { texto: "Plantillas de rutinas", icono: "documento", href: "/admin/plantillas-online" },
          { texto: "Workouts", icono: "cronometro" },
          { texto: "Colección de workouts", icono: "paquete" },
        ],
      },
      { clave: "nutricion", texto: "Nutrición", icono: "paquete" },
      { clave: "comunidad", texto: "Comunidad", icono: "tablon" },
      { clave: "retos", texto: "Retos", icono: "bandera" },
      { clave: "academia", texto: "Academia", icono: "academia" },
    ],
  },
  {
    titulo: "Dinero",
    items: [
      {
        clave: "packs",
        texto: "Packs",
        icono: "paquete",
        pestanas: [
          { texto: "Tarifas", icono: "etiqueta", href: "/admin/tarifas" },
          { texto: "Descuentos", icono: "ticket", href: "/admin/descuentos" },
          { texto: "Packs", icono: "paquete" },
          { texto: "Membresías", icono: "perfil" },
          { texto: "Ofertas", icono: "regalo" },
        ],
      },
      {
        clave: "pagos",
        texto: "Pagos",
        icono: "pagos",
        pestanas: [
          { texto: "Pagos", icono: "pagos", href: "/admin/bonos" },
          { texto: "Formas de pago", icono: "pagos", href: "/admin/formas-pago" },
        ],
      },
      { clave: "contabilidad", texto: "Contabilidad", icono: "metricas" },
    ],
  },
  {
    titulo: "Negocio",
    items: [
      {
        clave: "informes",
        texto: "Informes",
        icono: "metricas",
        pestanas: [
          { texto: "Informes", icono: "metricas", href: "/admin/informes" },
          { texto: "Descargar datos (CSV)", icono: "documento", href: "/admin/exportar" },
        ],
      },
      {
        clave: "automatizaciones",
        texto: "Automatizaciones",
        icono: "admin",
        pestanas: [{ texto: "Automatizaciones", icono: "repetir", href: "/admin/automatizaciones" }, { texto: "Onboarding de alumnos/as", icono: "bandera" }],
      },
      { clave: "recursos", texto: "Recursos", icono: "biblioteca" },
    ],
  },
];

// Las opciones se reparten en secciones, como en HubFit: Principal, Administrar, Biblioteca y Automatizaciones.
const POR_CLAVE = new Map(MENU_BASE.flatMap((g) => g.items).map((i) => [i.clave, i]));
const de = (...claves: string[]): ItemMenu[] => claves.map((c) => POR_CLAVE.get(c)).filter((i): i is ItemMenu => !!i);

export const MENU_ADMIN: GrupoMenu[] = [
  { titulo: "Principal", items: de("inicio", "leads", "usuarios", "mensajes", "tareas") },
  { titulo: "Administrar", items: de("reservas", "packs", "pagos", "informes", "comunidad", "retos", "equipo", "contabilidad") },
  { titulo: "Biblioteca", items: de("entrenamiento", "nutricion", "formularios", "recursos", "academia") },
  { titulo: "Automatizaciones", items: de("automatizaciones") },
];

// Las pestañas de Ajustes (se abren desde el menú de tu foto). «alias» = otras pantallas que cuentan como esa pestaña.
export const PESTANAS_AJUSTES: Pestana[] = [
  { texto: "Perfil", href: "/ajustes", icono: "perfil", alias: ["/perfil", "/ajustes/privacidad", "/ajustes/textos-legales"] },
  { texto: "Notificaciones", href: "/ajustes/notificaciones", icono: "campana" },
  { texto: "Branding", icono: "paleta" },
  { texto: "Integraciones", icono: "externo" },
  { texto: "API", icono: "candado" },
  { texto: "MCP", icono: "globo" },
  { texto: "Frases", href: "/admin/contenido", icono: "admin" },
  { texto: "Textos legales", href: "/admin/legal", icono: "documento" },
  { texto: "Registro", href: "/admin/registro", icono: "usuarios" },
  { texto: "Eliminar cuenta", icono: "salir" },
];

const coincide = (ruta: string, href: string) => ruta === href || ruta.startsWith(href + "/");

export function esDePestana(ruta: string, p: Pestana): boolean {
  // «/ajustes» solo es la pestaña Perfil cuando es exactamente esa pantalla (las demás cuelgan de «/ajustes/...» y tienen su pestaña).
  if (p.href === "/ajustes") return ruta === "/ajustes" || (p.alias ?? []).some((h) => coincide(ruta, h));
  return [p.href, ...(p.alias ?? [])].some((h) => !!h && coincide(ruta, h));
}

// Primera dirección real de una opción del menú (a donde lleva al pulsarla).
export function destinoDe(i: ItemMenu): string | null {
  return i.href ?? i.pestanas?.find((p) => p.href)?.href ?? null;
}

// La opción del menú a la que pertenece una dirección (la coincidencia más larga gana, así «/admin/horarios» no se confunde con «/admin/horario»).
export function itemDeRuta(ruta: string): ItemMenu | null {
  let mejor: { i: ItemMenu; largo: number } | null = null;
  for (const g of MENU_ADMIN) {
    for (const i of g.items) {
      for (const h of [i.href, ...(i.pestanas ?? []).flatMap((p) => [p.href, ...(p.alias ?? [])])]) {
        if (h && coincide(ruta, h) && (!mejor || h.length > mejor.largo)) mejor = { i, largo: h.length };
      }
    }
  }
  return mejor?.i ?? null;
}
