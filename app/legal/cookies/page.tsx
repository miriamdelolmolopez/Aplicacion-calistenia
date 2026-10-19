import { TITULAR } from "@/lib/legal";
import PaginaLegal, { type SeccionLegal } from "../PaginaLegal";

export const metadata = { title: "Política de cookies · Cookies policy" };

const secciones: SeccionLegal[] = [
  {
    titulo: "1. Qué son las cookies",
    bloques: [
      {
        p: "Las cookies son pequeños archivos que una web guarda en tu dispositivo. El almacenamiento local del navegador (localStorage) cumple una función parecida. En esta política hablamos de ambos.",
      },
    ],
  },
  {
    titulo: "2. Qué usa esta aplicación",
    bloques: [
      {
        p: "Esta aplicación solo usa cookies y almacenamiento técnicos, imprescindibles para que funcione y que tú mismo/a solicitas al usarla. No usa cookies de analítica, de publicidad ni de seguimiento, y no comparte datos de navegación con redes publicitarias. Por eso no se muestra un aviso de cookies que aceptar.",
      },
      {
        lista: [
          "Sesión: mantiene tu inicio de sesión para que no tengas que escribir tu contraseña en cada pantalla. Se crea al entrar y se borra al cerrar sesión o al caducar. Proveedor: Supabase (autenticación).",
          "Preferencias: guardan tu idioma (español o inglés), el sonido y el retardo del cronómetro y los ejercicios elegidos en tu gráfica de evolución. Se guardan solo en tu dispositivo.",
          "Seguridad: protegen el inicio de sesión y los formularios frente a usos indebidos.",
        ],
      },
    ],
  },
  {
    titulo: "3. Cómo borrarlas",
    bloques: [
      {
        p: "Puedes borrar o bloquear las cookies y el almacenamiento desde la configuración de tu navegador. Si lo haces, tendrás que volver a iniciar sesión y elegir de nuevo tus preferencias.",
      },
    ],
  },
  {
    titulo: "4. Cambios y contacto",
    bloques: [
      {
        p: `Si en el futuro se añadiera una cookie no técnica (por ejemplo, de analítica), se pediría tu consentimiento antes y se actualizaría esta política. Para cualquier duda escribe a ${TITULAR.email}.`,
      },
    ],
  },
];

export default function Cookies() {
  return <PaginaLegal titulo="Política de cookies" secciones={secciones} />;
}
