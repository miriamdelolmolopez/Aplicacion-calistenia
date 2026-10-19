import { TITULAR } from "@/lib/legal";
import PaginaLegal, { type SeccionLegal } from "../PaginaLegal";

export const metadata = { title: "Política de privacidad · Privacy policy" };

const secciones: SeccionLegal[] = [
  {
    titulo: "1. Responsable del tratamiento",
    bloques: [
      {
        p: "Los datos personales que facilites en esta aplicación se tratan de acuerdo con el Reglamento General de Protección de Datos (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD). El responsable es:",
      },
      {
        lista: [
          `${TITULAR.nombre}`,
          `Domicilio: ${TITULAR.direccion}`,
          `Correo electrónico: ${TITULAR.email}`,
          `Teléfono y WhatsApp: ${TITULAR.telefono}`,
        ],
      },
    ],
  },
  {
    titulo: "2. Qué datos tratamos",
    bloques: [
      {
        lista: [
          "Datos de identificación y contacto: nombre, apellidos, DNI/NIE, fecha de nacimiento, teléfono y correo electrónico.",
          "Contacto de emergencia: nombre y teléfono de la persona que indiques. Antes de facilitarlos, debes haberle informado.",
          "Foto de perfil (opcional).",
          "Datos de salud y condición física: peso, medidas, lesiones, dolores o limitaciones que nos comuniques, y tu historial de entrenamientos y progreso. Son datos de categoría especial.",
          "Datos del servicio: servicios contratados, bonos, reservas, asistencia, lista de espera, rutinas y entrenamientos realizados.",
          "Datos de pago: importe, fecha y método de pago (efectivo, Bizum o transferencia). No guardamos números de tarjeta.",
          "Vídeos o fotos que envíes para correcciones técnicas, y contenido audiovisual de las sesiones, según lo indicado en los términos y condiciones.",
          "Datos técnicos: dirección IP, tipo de dispositivo y registros de acceso, necesarios para la seguridad y el funcionamiento de la aplicación.",
        ],
      },
    ],
  },
  {
    titulo: "3. Para qué los usamos y con qué base legal",
    bloques: [
      {
        lista: [
          "Gestionar tu cuenta, tus reservas, bonos, rutinas y el servicio que contratas, y comunicarnos contigo sobre ello. Base: ejecución del contrato (art. 6.1.b RGPD).",
          "Gestionar pagos, facturación y obligaciones fiscales y administrativas. Base: obligación legal (art. 6.1.c).",
          "Adaptar el entrenamiento a tu salud y tu seguridad, y atender emergencias durante las sesiones. Base: tu consentimiento explícito (art. 9.2.a), que das al aceptar esta política y los términos, y la protección de tus intereses vitales en una emergencia (art. 6.1.d).",
          "Enviarte avisos del servicio (por ejemplo, un bono a punto de caducar o una clase cancelada). Base: ejecución del contrato e interés legítimo en que el servicio funcione correctamente (art. 6.1.f).",
          "Usar imágenes y vídeos en redes sociales y canales profesionales, solo en los términos indicados en los términos y condiciones, y respetando tu derecho a no aparecer de forma identificable. Base: tu consentimiento (art. 6.1.a).",
          "Seguridad de la aplicación y prevención de usos indebidos. Base: interés legítimo (art. 6.1.f).",
        ],
      },
      {
        p: "Puedes retirar tu consentimiento en cualquier momento escribiendo a la dirección indicada arriba, sin que ello afecte a lo ya realizado. Si lo retiras, puede que no podamos seguir prestándote parte del servicio.",
      },
    ],
  },
  {
    titulo: "4. Quién más accede a tus datos",
    bloques: [
      {
        p: "Tus datos no se venden ni se ceden con fines comerciales. Para prestar el servicio usamos proveedores que tratan datos por cuenta de la responsable (encargados del tratamiento), con los que existe el contrato exigido por la ley:",
      },
      {
        lista: [
          "Supabase: base de datos, autenticación (acceso con correo y contraseña) y almacenamiento de archivos como las fotos de perfil. Aquí se guardan los datos de tu cuenta y de tu servicio.",
          "Vercel: alojamiento y funcionamiento de la aplicación web. Procesa las conexiones y registros técnicos de acceso.",
          "Resend: envío de los correos de la aplicación (confirmación de cuenta, recuperación de contraseña, avisos). Procesa tu correo electrónico y el contenido del mensaje.",
          "Google (Calendar, Meet y Gmail): videollamadas y agenda del servicio online y comunicaciones por correo.",
          "WhatsApp (Meta): comunicaciones y envío de vídeos o consultas. Tally: formularios iniciales o de seguimiento.",
          "Bizum y entidad bancaria: gestión de los pagos.",
          "Administraciones públicas y asesoría fiscal o contable, cuando la ley lo exija o sea necesario para cumplir obligaciones fiscales.",
        ],
      },
      {
        p: "Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo (por ejemplo, en Estados Unidos). En ese caso, la transferencia se ampara en las garantías previstas por el RGPD, como las cláusulas contractuales tipo de la Comisión Europea o el Marco de Privacidad de Datos UE-EE. UU. Puedes pedirnos más información sobre estas garantías.",
      },
    ],
  },
  {
    titulo: "5. Cuánto tiempo los guardamos",
    bloques: [
      {
        lista: [
          "Los datos de tu cuenta y de tu servicio, mientras mantengas la relación con nosotros.",
          "Cuando dejes de ser alumna o alumno, o pidas la baja, los bloquearemos y solo se conservarán durante los plazos legales para atender posibles responsabilidades (en general, hasta 6 años para datos mercantiles y fiscales), y después se eliminarán.",
          "Los datos de pagos y facturación se conservan los plazos que exigen las normas fiscales y mercantiles, aunque se elimine tu cuenta.",
          "Los datos de salud se conservan mientras sean necesarios para la seguridad de tu entrenamiento y, después, solo bloqueados el tiempo legal que corresponda.",
        ],
      },
    ],
  },
  {
    titulo: "6. Tus derechos",
    bloques: [
      {
        p: `Puedes ejercer los derechos de acceso, rectificación, supresión, limitación del tratamiento, oposición y portabilidad escribiendo a ${TITULAR.email} o por WhatsApp al ${TITULAR.telefono}. Responderemos en el plazo máximo de un mes. Para proteger tu cuenta, podemos pedirte que acredites tu identidad. Algunos datos (como el DNI) solo los puede cambiar la responsable: pídelo por esos mismos medios.`,
      },
      {
        p: "Si consideras que tus datos no se tratan correctamente, tienes derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (www.aepd.es).",
      },
    ],
  },
  {
    titulo: "7. Cómo protegemos tus datos",
    bloques: [
      {
        p: "El acceso a la aplicación exige cuenta y contraseña; las conexiones van cifradas; cada persona solo ve sus propios datos, y solo la responsable accede a los datos del resto de alumnos, incluidos los de salud. Aun así, ningún sistema es infalible: si ocurriera una brecha de seguridad que afecte a tus derechos, te lo comunicaremos según la ley.",
      },
    ],
  },
  {
    titulo: "8. Menores de edad",
    bloques: [
      {
        p: "La aplicación y los servicios son para mayores de 18 años. Si detectamos que una cuenta pertenece a una persona menor sin autorización, podremos eliminarla.",
      },
    ],
  },
  {
    titulo: "9. Cookies",
    bloques: [
      {
        p: "La aplicación solo usa cookies y almacenamiento técnicos. Tienes el detalle en la política de cookies.",
      },
    ],
  },
  {
    titulo: "10. Cambios en esta política",
    bloques: [
      {
        p: "Si cambiamos esta política o los términos y condiciones de forma relevante, publicaremos una nueva versión y tendrás que volver a aceptarla para seguir usando la aplicación.",
      },
    ],
  },
];

export default function Privacidad() {
  return <PaginaLegal titulo="Política de privacidad" secciones={secciones} />;
}
