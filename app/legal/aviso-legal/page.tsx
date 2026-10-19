import { TITULAR } from "@/lib/legal";
import PaginaLegal, { type SeccionLegal } from "../PaginaLegal";

export const metadata = { title: "Aviso legal · Legal notice" };

const secciones: SeccionLegal[] = [
  {
    titulo: "1. Quién es la titular",
    bloques: [
      {
        p: "En cumplimiento de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico, se informa de que esta aplicación web es titularidad de:",
      },
      {
        lista: [
          `Nombre: ${TITULAR.nombre}`,
          `NIF: ${TITULAR.nif}`,
          `Domicilio: ${TITULAR.direccion}`,
          `Correo electrónico: ${TITULAR.email}`,
          `Teléfono y WhatsApp: ${TITULAR.telefono}`,
          "Actividad: entrenamiento de calistenia y pino (handstand), en clases grupales presenciales, sesiones individuales presenciales y entrenamiento online.",
        ],
      },
    ],
  },
  {
    titulo: "2. Objeto de la aplicación",
    bloques: [
      {
        p: "La aplicación permite a las alumnas y alumnos reservar clases, gestionar sus bonos, seguir su entrenamiento online, consultar su progreso y acceder a contenidos formativos. Su uso requiere crear una cuenta y aceptar los términos y condiciones y la política de privacidad.",
      },
    ],
  },
  {
    titulo: "3. Condiciones de uso",
    bloques: [
      {
        lista: [
          "Debes ser mayor de 18 años para crear una cuenta.",
          "Los datos que facilites deben ser veraces y estar actualizados.",
          "La cuenta es personal e intransferible. Eres responsable de guardar tu contraseña y de lo que se haga con tu cuenta.",
          "No se puede usar la aplicación para fines ilícitos, ni intentar acceder a datos de otras personas ni dañar su funcionamiento.",
        ],
      },
    ],
  },
  {
    titulo: "4. Propiedad intelectual",
    bloques: [
      {
        p: "Los textos, imágenes, vídeos, rutinas, programas de entrenamiento, logotipos, diseño y demás contenidos de la aplicación pertenecen a la titular o se usan con autorización. Quedan prohibidas su copia, distribución, comunicación pública, reventa o cualquier otro uso sin autorización expresa y por escrito, salvo el uso personal propio del servicio contratado.",
      },
    ],
  },
  {
    titulo: "5. Responsabilidad",
    bloques: [
      {
        p: "Los contenidos de la aplicación tienen carácter deportivo e informativo y no sustituyen el consejo médico, fisioterapéutico ni nutricional. Antes de empezar cualquier programa de entrenamiento se recomienda una revisión médica. Las calculadoras y estimaciones de la aplicación son orientativas.",
      },
      {
        p: "La titular procura que la aplicación funcione de forma continua, pero no garantiza que esté libre de interrupciones o errores, ni se hace responsable de los daños derivados de fallos técnicos ajenos a su control. Las condiciones de cada servicio (cancelaciones, lesiones, riesgos, etc.) están en los términos y condiciones.",
      },
    ],
  },
  {
    titulo: "6. Enlaces y servicios de terceros",
    bloques: [
      {
        p: "La aplicación puede enlazar con servicios de terceros (por ejemplo WhatsApp, Google Meet o Tally). La titular no controla esos servicios ni se responsabiliza de sus contenidos o de su política de privacidad.",
      },
    ],
  },
  {
    titulo: "7. Protección de datos y cookies",
    bloques: [
      {
        p: "El tratamiento de tus datos personales se explica en la política de privacidad. El uso de cookies y almacenamiento del navegador se explica en la política de cookies.",
      },
    ],
  },
  {
    titulo: "8. Reclamaciones y ley aplicable",
    bloques: [
      {
        p: "Tienes a tu disposición hojas de reclamaciones; puedes pedirlas escribiendo a la dirección de correo de la titular. Estas condiciones se rigen por la legislación española. Si eres consumidora o consumidor, serán competentes los juzgados y tribunales que la ley te reconozca.",
      },
    ],
  },
];

export default function AvisoLegal() {
  return <PaginaLegal titulo="Aviso legal" secciones={secciones} />;
}
