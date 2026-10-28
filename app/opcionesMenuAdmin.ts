import type { NombreIcono } from "./Icono";

export type OpcionMenuAdmin = {
  href: string;
  icono: NombreIcono;
  texto: string;
  fijo?: boolean; // no se puede ocultar (así nunca te quedas sin salida)
  defecto: boolean; // se ve mientras no elijas otra cosa
};

// Todas las opciones que puede tener la barra lateral de la administradora, en el orden en que salen.
export const OPCIONES_MENU_ADMIN: OpcionMenuAdmin[] = [
  { href: "/inicio", icono: "inicio", texto: "Inicio", fijo: true, defecto: true },
  { href: "/admin", icono: "admin", texto: "Panel", fijo: true, defecto: true },
  { href: "/admin/usuarios", icono: "usuarios", texto: "Usuarios", defecto: true },
  { href: "/clases", icono: "reservar", texto: "Reservar clases", defecto: true },
  { href: "/admin/presenciales", icono: "historial", texto: "Clases presenciales", defecto: true },
  { href: "/admin/horario", icono: "historial", texto: "Horarios presenciales", defecto: false },
  { href: "/admin/reservas", icono: "reservas", texto: "Reservas", defecto: false },
  { href: "/admin/online", icono: "rutina", texto: "Entrenamientos online 1:1", defecto: true },
  { href: "/admin/academia", icono: "academia", texto: "Cursos", defecto: true },
  { href: "/admin/bonos", icono: "pagos", texto: "Pagos", defecto: false },
  { href: "/admin/tarifas", icono: "pagos", texto: "Tarifas", defecto: false },
  { href: "/admin/descuentos", icono: "pagos", texto: "Descuentos", defecto: false },
  { href: "/admin/informes", icono: "metricas", texto: "Informes", defecto: true },
  { href: "/admin/contenido", icono: "admin", texto: "Fotos y frases", defecto: false },
  { href: "/admin/automatizaciones", icono: "admin", texto: "Automatizaciones", defecto: false },
  { href: "/admin/legal", icono: "admin", texto: "Textos legales", defecto: false },
  { href: "/admin/aprende", icono: "aprende", texto: "Aprende", defecto: true },
  { href: "/perfil", icono: "perfil", texto: "Perfil", fijo: true, defecto: true },
];
