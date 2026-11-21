import type { NombreIcono } from "./Icono";

export type OpcionMenuAdmin = {
  href: string;
  icono: NombreIcono;
  texto: string;
  fijo?: boolean; // no se puede ocultar (así nunca te quedas sin salida)
  defecto: boolean; // se ve mientras no elijas otra cosa
  soloBarra?: boolean; // solo se puede poner en la barra de abajo (en la lateral ya tiene su sitio abajo)
};

// Todas las opciones que puede tener la barra lateral de la administradora, en el orden en que salen.
export const OPCIONES_MENU_ADMIN: OpcionMenuAdmin[] = [
  { href: "/inicio", icono: "inicio", texto: "Inicio", fijo: true, defecto: true },
  { href: "/admin/usuarios", icono: "usuarios", texto: "Usuarios", defecto: true },
  { href: "/admin/prueba", icono: "usuarios", texto: "Link de prueba", defecto: false },
  { href: "/clases", icono: "reservar", texto: "Reservar clases", defecto: true },
  { href: "/admin/horario", icono: "historial", texto: "Horarios presenciales", defecto: false },
  { href: "/admin/reservas", icono: "reservas", texto: "Reservas", defecto: false },
  { href: "/admin/ejercicios", icono: "biblioteca", texto: "Biblioteca de ejercicios", defecto: true },
  { href: "/admin/rutinas", icono: "rutina", texto: "Entrenamiento online", defecto: true },
  { href: "/admin/bonos", icono: "pagos", texto: "Pagos", defecto: false },
  { href: "/admin/tarifas", icono: "pagos", texto: "Servicios", defecto: false },
  { href: "/admin/descuentos", icono: "pagos", texto: "Descuentos", defecto: false },
  { href: "/admin/formas-pago", icono: "pagos", texto: "Formas de pago", defecto: false },
  { href: "/admin/informes", icono: "metricas", texto: "Informes", defecto: true },
  { href: "/admin/contenido", icono: "admin", texto: "Frases", defecto: false },
  { href: "/admin/automatizaciones", icono: "admin", texto: "Automatizaciones", defecto: false },
  { href: "/admin/legal", icono: "admin", texto: "Textos legales", defecto: false },
  { href: "/admin/exportar", icono: "metricas", texto: "Descargar datos", defecto: false },
  { href: "/ayuda", icono: "ayuda", texto: "Ayuda", defecto: false, soloBarra: true },
  { href: "/ajustes", icono: "ajustes", texto: "Ajustes", defecto: false, soloBarra: true },
  { href: "/perfil", icono: "perfil", texto: "Perfil", fijo: true, defecto: true },
];
