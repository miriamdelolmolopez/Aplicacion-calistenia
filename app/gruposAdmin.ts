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

export const MENU_ADMIN: GrupoMenu[] = [
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
          { texto: "Clientes", href: "/admin/usuarios" },
          { texto: "Invitados", href: "/admin/prueba" },
          { texto: "Importar contactos", href: "/admin/importar" },
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
          { texto: "Horarios", href: "/admin/horario" },
          { texto: "Plantillas de horarios", href: "/admin/horarios" },
          { texto: "Reservas", href: "/admin/reservas" },
          { texto: "Tipos de entrenamiento", href: "/admin/clases" },
        ],
      },
      {
        clave: "entrenamiento",
        texto: "Entrenamiento",
        icono: "rutina",
        pestanas: [
          { texto: "Ejercicios", href: "/admin/ejercicios" },
          { texto: "Rutinas", href: "/admin/rutinas" },
          { texto: "Plantillas de rutinas", href: "/admin/plantillas-online" },
          { texto: "Workouts" },
          { texto: "Colección de workouts" },
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
          { texto: "Tarifas", href: "/admin/tarifas" },
          { texto: "Descuentos", href: "/admin/descuentos" },
          { texto: "Packs" },
          { texto: "Membresías" },
          { texto: "Ofertas" },
        ],
      },
      {
        clave: "pagos",
        texto: "Pagos",
        icono: "pagos",
        pestanas: [
          { texto: "Pagos", href: "/admin/bonos" },
          { texto: "Formas de pago", href: "/admin/formas-pago" },
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
          { texto: "Informes", href: "/admin/informes" },
          { texto: "Descargar datos (CSV)", href: "/admin/exportar" },
        ],
      },
      {
        clave: "automatizaciones",
        texto: "Automatizaciones",
        icono: "admin",
        pestanas: [{ texto: "Automatizaciones", href: "/admin/automatizaciones" }, { texto: "Onboarding de alumnos/as" }],
      },
      { clave: "recursos", texto: "Recursos", icono: "biblioteca" },
    ],
  },
];

// Las pestañas de Ajustes (se abren desde el menú de tu foto). «alias» = otras pantallas que cuentan como esa pestaña.
export const PESTANAS_AJUSTES: Pestana[] = [
  { texto: "Perfil", href: "/perfil", icono: "perfil", alias: ["/ajustes", "/ajustes/privacidad", "/ajustes/textos-legales"] },
  { texto: "Branding", icono: "paleta" },
  { texto: "Integraciones", icono: "externo" },
  { texto: "Notificaciones", href: "/ajustes/notificaciones", icono: "campana" },
  { texto: "API", icono: "candado" },
  { texto: "MCP", icono: "globo" },
  { texto: "Frases", href: "/admin/contenido", icono: "admin" },
  { texto: "Textos legales", href: "/admin/legal", icono: "documento" },
  { texto: "Registro", href: "/admin/registro", icono: "usuarios" },
  { texto: "Menú", href: "/ajustes/barra-lateral", icono: "ajustes", alias: ["/ajustes/barra-inferior"] },
  { texto: "Eliminar cuenta", icono: "salir" },
];

const coincide = (ruta: string, href: string) => ruta === href || ruta.startsWith(href + "/");

export function esDePestana(ruta: string, p: Pestana): boolean {
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
