import { TITULAR } from "@/lib/legal";
import PaginaLegal, { type SeccionLegal } from "../PaginaLegal";

export const metadata = { title: "Términos y condiciones · Terms and conditions" };

const SALUD: SeccionLegal["bloques"] = [
  {
    p: "El Alumno declara encontrarse en condiciones adecuadas para la práctica de Calistenia y/o Pino. Deberá informar a Miriam, antes de entrenar, de cualquier lesión, dolor, limitación física, patología o circunstancia relevante que pueda afectar a la práctica segura del entrenamiento. La información debe ser veraz y suficiente para que Miriam pueda adaptar, cuando corresponda, los ejercicios o progresiones.",
  },
];

const NO_MEDICO: SeccionLegal["bloques"] = [
  {
    p: "El servicio de entrenamiento no constituye asesoramiento médico, fisioterapéutico ni nutricional, y no sustituye la valoración, el diagnóstico ni el tratamiento de un profesional sanitario. Se recomienda al Alumno realizar una revisión médica antes de comenzar cualquier programa de entrenamiento, especialmente si tiene dudas sobre su estado de salud, lesiones previas o alguna patología.",
  },
];

const RIESGOS: SeccionLegal["bloques"] = [
  {
    p: "El Alumno comprende que la práctica de Calistenia, Pino (Handstand) y entrenamiento de fuerza implica esfuerzo físico y determinados riesgos inherentes a la actividad. Estos pueden incluir, entre otros:",
  },
  { lista: ["Caídas.", "Golpes.", "Contusiones.", "Sobrecargas.", "Esguinces.", "Lesiones musculares.", "Lesiones articulares."] },
  {
    p: "El Alumno acepta participar voluntariamente en la actividad y se compromete a respetar las indicaciones de seguridad proporcionadas por Miriam.",
  },
];

const AUTORREGULACION: SeccionLegal["bloques"] = [
  {
    p: "El entrenamiento estará dirigido o planificado por Miriam, pero el Alumno deberá escuchar y responder adecuadamente a las señales de su propio cuerpo. Si un ejercicio provoca dolor articular o una molestia inusual, deberá detenerlo inmediatamente e informar a Miriam. La seguridad deberá prevalecer siempre sobre la ejecución de un ejercicio o la consecución de un objetivo deportivo.",
  },
];

const COMODIN: SeccionLegal["bloques"] = [
  {
    p: "Cada Alumno dispone de un comodín de urgencia familiar al mes, que podrá utilizarse ante una enfermedad o imprevisto grave de un familiar de hasta segundo grado: hijos, padres, hermanos, abuelos, nietos o cónyuge. A partir de la segunda cancelación en el mismo mes por este motivo, la sesión se descontará. Para solicitar el comodín, el Alumno deberá comunicarlo por escrito mediante WhatsApp al número oficial: +34 644 184 762.",
  },
];

const URGENCIA: SeccionLegal["bloques"] = [
  {
    p: "Excepcionalmente, una cancelación realizada fuera del plazo podrá ser perdonada cuando exista una urgencia médica real. Para ello, el Alumno deberá aportar un justificante médico oficial de urgencias correspondiente a ese mismo día. Una vez acreditada la situación, la sesión podrá ser recuperada y no se descontará.",
  },
];

const IMAGEN_PRESENCIAL: SeccionLegal["bloques"] = [
  {
    p: "Durante las sesiones podrán realizarse fotografías o vídeos con fines técnicos, educativos o relacionados con la actividad profesional de Miriam: analizar movimientos, realizar correcciones técnicas o generar contenido profesional. El contenido audiovisual podrá utilizarse en redes sociales y otros canales profesionales. Si el Alumno no desea aparecer en contenido audiovisual identificable, deberá comunicarlo expresamente a Miriam antes de comenzar su primer entrenamiento. La negativa al uso promocional de su imagen no afectará a su derecho a recibir el servicio contratado.",
  },
];

const PRIMEROS_AUXILIOS: SeccionLegal["bloques"] = [
  {
    p: "En caso de lesión o emergencia médica durante una sesión, el Alumno autoriza la prestación de los primeros auxilios que sean pertinentes dentro de las posibilidades de Miriam y de las circunstancias de la situación. Cuando la gravedad lo requiera, autoriza la solicitud de asistencia sanitaria, el traslado a un centro médico y la comunicación con un familiar o persona de contacto.",
  },
];

const MATERIAL: SeccionLegal["bloques"] = [
  {
    p: "El Alumno deberá utilizar correctamente el material facilitado y respetar las instalaciones y el espacio público donde se desarrollan las sesiones, y mantener unas normas básicas de higiene, convivencia y respeto hacia Miriam y el resto de participantes. Miriam podrá adoptar las medidas correspondientes ante comportamientos inapropiados, irrespetuosos o vandálicos. Al realizarse al aire libre y en espacios públicos, Miriam no se responsabiliza de pérdidas, robos o daños de objetos personales.",
  },
];

const secciones: SeccionLegal[] = [
  {
    titulo: "Qué parte te afecta",
    bloques: [
      {
        p: "Estas condiciones tienen una parte general (A) y una parte para cada servicio: clases grupales presenciales (B), entrenamiento individual presencial (C) y entrenamiento online (D). Te aplican la parte general y la parte de cada servicio que contrates. Al pulsar «Estoy de acuerdo» en el alta, la persona usuaria (en adelante, «el Alumno») declara haber leído, comprendido y aceptado estas condiciones. La aceptación queda registrada en la aplicación con su fecha y la versión del texto.",
      },
    ],
  },

  // ---------------- PARTE A ----------------
  {
    titulo: "A1. Titular y contacto",
    bloques: [
      {
        p: `Los servicios los presta ${TITULAR.nombre} («Miriam»), ${TITULAR.direccion}. Correo: ${TITULAR.email}. WhatsApp: ${TITULAR.telefono}. La atención por WhatsApp es de lunes a viernes, de 08:00 a 17:00 h; los mensajes fuera de ese horario, en fines de semana o en festivos se atienden el siguiente día hábil.`,
      },
    ],
  },
  {
    titulo: "A2. Edad mínima",
    bloques: [
      {
        p: "La edad mínima para contratar cualquier servicio es de 18 años. Actualmente no se ofrecen servicios a menores de edad salvo casos excepcionales en los que Miriam lo permita.",
      },
    ],
  },
  {
    titulo: "A3. Cuenta en la aplicación",
    bloques: [
      {
        p: "La aplicación permite reservar clases, gestionar bonos, entrenar online y consultar tu progreso. La cuenta es personal e intransferible. Eres responsable de la veracidad de tus datos y de custodiar tu contraseña. Una vez realizado el pago, Miriam activa el bono o plan correspondiente en la aplicación.",
      },
    ],
  },
  {
    titulo: "A4. Protección de datos",
    bloques: [
      {
        p: "Tus datos personales se tratan según el RGPD y la Ley Orgánica 3/2018, como se explica en la política de privacidad, que forma parte de estas condiciones. Incluye los datos de salud que facilites, que se tratan con tu consentimiento para adaptar el entrenamiento a tu seguridad. Puedes ejercer tus derechos escribiendo a miriamcalistenia@gmail.com o al WhatsApp +34 644 184 762, y reclamar ante la Agencia Española de Protección de Datos.",
      },
    ],
  },
  {
    titulo: "A5. Cambios en las condiciones",
    bloques: [
      {
        p: "Si estas condiciones o la política de privacidad cambian de forma relevante, se publicará una nueva versión y deberás aceptarla de nuevo para seguir usando la aplicación.",
      },
    ],
  },

  // ---------------- PARTE B: GRUPALES ----------------
  {
    titulo: "B1. Clases grupales · Servicio y ubicación",
    bloques: [
      { p: "Miriam ofrece clases grupales presenciales de:" },
      { lista: ["Calistenia, para todos los niveles.", "Pino (Handstand) – Nivel Iniciación.", "Pino (Handstand) – Nivel Intermedio."] },
      {
        p: "Las clases duran 1 hora y se realizan bajo la supervisión directa de Miriam durante el horario oficial de la sesión. Se realizan al aire libre en Fuengirola (Málaga): las de Calistenia, en el espacio de Google Maps «Open air callisthenics gym»; las de Pino, en el Gran Parque de la Loma.",
      },
      {
        p: "Los horarios vigentes se consultan en la sección Clases de la aplicación. Podrán modificarse según la temporada y las condiciones climatológicas; cuando el cambio sea previsto, se comunicará a los alumnos afectados con un mínimo de 30 días de antelación, siempre que las circunstancias lo permitan.",
      },
    ],
  },
  {
    titulo: "B2. Clases grupales · Precios y pago",
    bloques: [
      {
        p: "Tarifas: clase suelta, 15 €; bono de 4 sesiones, 55 €; bono de 8 sesiones, 80 €; bono de 12 sesiones, 110 €. Otros bonos y tarifas vigentes se comunican antes de contratar. Todos los servicios deben abonarse por adelantado, antes de consumir la primera sesión. Los métodos de pago aceptados son exclusivamente efectivo y Bizum.",
      },
    ],
  },
  {
    titulo: "B3. Clases grupales · Validez de los bonos",
    bloques: [
      {
        p: "Las clases sueltas y los bonos mensuales tienen una validez de 30 días naturales desde la fecha exacta de compra. Los bonos trimestrales, de 90 días naturales. Las sesiones no utilizadas dentro del periodo de validez se consideran caducadas y se pierden, salvo las excepciones previstas en estas condiciones. Los bonos grupales pueden usarse indistintamente para Calistenia y Pino.",
      },
    ],
  },
  {
    titulo: "B4. Clases grupales · Clase de prueba gratuita",
    bloques: [
      {
        p: "Cada persona puede disfrutar de una única clase de prueba 100 % gratuita. Es exclusiva para clases grupales presenciales, solo para quien nunca haya asistido antes a los entrenamientos, requiere el autorregistro en la aplicación y está sujeta a la disponibilidad de plazas. No puede disfrutarse más de una vez por persona.",
      },
    ],
  },
  {
    titulo: "B5. Clases grupales · Reservas, cancelaciones y no presentación",
    bloques: [
      {
        p: "El Alumno gestiona sus reservas directamente en la aplicación y es responsable de reservar correctamente y de cancelar las clases a las que no pueda asistir.",
      },
      {
        p: "Cancelación dentro del plazo: debe hacerse con un mínimo de 2 horas de antelación; en ese caso la sesión no se descuenta del bono. Cancelación fuera de plazo: con menos de 2 horas, la sesión se considera realizada y se descuenta del bono (si es clase suelta, se considera consumida).",
      },
      {
        p: "No presentación: si el Alumno no se presenta a una clase reservada y no la ha cancelado dentro del plazo, la sesión se considera realizada y se descuenta. No genera derecho a recuperación.",
      },
      {
        p: "Retrasos: el Alumno puede incorporarse mientras la clase continúe en curso, si puede hacerse de forma segura y sin interferir en la sesión. El tiempo perdido no se recupera y la clase finaliza a la hora prevista para todo el grupo.",
      },
    ],
  },
  { titulo: "B6. Clases grupales · Urgencias médicas", bloques: URGENCIA },
  { titulo: "B7. Clases grupales · Comodín de urgencia familiar", bloques: COMODIN },
  {
    titulo: "B8. Clases grupales · Cancelación por parte de Miriam y lluvia",
    bloques: [
      {
        p: "Si Miriam debe cancelar una clase por causa de fuerza mayor, avisará con la máxima antelación posible. La sesión no se pierde y se reagenda de mutuo acuerdo.",
      },
      {
        p: "Las clases se realizan al aire libre y están sujetas a las condiciones meteorológicas. Si hay lluvia torrencial o el suelo hace que la práctica no sea segura, Miriam podrá cancelar la sesión, avisando por WhatsApp o por la aplicación. La sesión cancelada por lluvia no se pierde y podrá disfrutarse otro día. Además, por cada semana en la que Miriam deba cancelar una o varias sesiones por condiciones meteorológicas adversas, el bono correspondiente amplía su caducidad en 7 días naturales.",
      },
    ],
  },
  {
    titulo: "B9. Clases grupales · Aforo y lista de espera",
    bloques: [
      {
        p: "El aforo máximo es de 10 personas en Calistenia y de 6 en Pino. Cuando se completa el aforo, la aplicación puede gestionar una lista de espera por orden de inscripción.",
      },
    ],
  },
  { titulo: "B10. Clases grupales · Salud y aptitud", bloques: SALUD },
  { titulo: "B11. Clases grupales · El servicio no sustituye el consejo médico", bloques: NO_MEDICO },
  { titulo: "B12. Clases grupales · Autorregulación y seguridad", bloques: AUTORREGULACION },
  { titulo: "B13. Clases grupales · Riesgos inherentes", bloques: RIESGOS },
  {
    titulo: "B14. Clases grupales · Lesiones durante una clase oficial",
    bloques: [
      { p: "Cuando una lesión se produce durante una clase oficial dirigida por Miriam, el Alumno puede elegir entre:" },
      {
        lista: [
          "Opción 1 — Devolución proporcional de las sesiones pagadas y no disfrutadas.",
          "Opción 2 — Congelación del bono hasta el alta médica y una clase gratuita al reincorporarse.",
        ],
      },
      { p: "La aplicación de estas opciones atiende a las circunstancias de la lesión y de la situación concreta." },
    ],
  },
  {
    titulo: "B15. Clases grupales · Lesiones fuera de las clases oficiales",
    bloques: [
      {
        p: "Cuando la lesión se produce fuera de una clase oficial, no se realiza ningún reembolso económico, pero el saldo pendiente del bono puede congelarse en estas condiciones:",
      },
      {
        lista: [
          "Lesión estándar (recuperación de hasta 3 meses): el Alumno debe comunicar la lesión y enviar el informe médico en un máximo de 7 días naturales desde el aviso; el bono puede pausarse hasta 3 meses / 90 días; si no se reincorpora en ese periodo, el bono caduca; si se reincorpora durante la congelación, debe aportar los justificantes médicos que acrediten que seguía de baja.",
          "Lesión grave o cirugía (recuperación superior a 3 meses): el Alumno puede elegir entre prórroga de la congelación hasta un máximo absoluto de 6 meses / 180 días (después el bono caduca definitivamente) o traspaso del 100 % de las sesiones pendientes a un familiar o amigo, que tendrá 30 días naturales para consumirlas.",
        ],
      },
    ],
  },
  {
    titulo: "B16. Clases grupales · Quedadas fuera del horario oficial",
    bloques: [
      {
        p: "Los encuentros, quedadas, entrenamientos libres o eventos sociales fuera de los días y horarios oficiales son actividades voluntarias y no forman parte de las clases oficiales. Pueden organizarlos los propios alumnos o convocarlos Miriam. No son clases técnicas dirigidas y cada participante es responsable de sus movimientos, decisiones y seguridad. Cualquier caída, accidente o lesión en esas actividades se considera una lesión ocurrida fuera de una clase oficial.",
      },
    ],
  },
  { titulo: "B17. Clases grupales · Primeros auxilios", bloques: PRIMEROS_AUXILIOS },
  { titulo: "B18. Clases grupales · Material, convivencia y objetos personales", bloques: MATERIAL },
  { titulo: "B19. Clases grupales · Derechos de imagen y grabación", bloques: IMAGEN_PRESENCIAL },
  {
    titulo: "B20. Clases grupales · Comunicaciones oficiales",
    bloques: [
      {
        p: "Las gestiones que requieran comunicación escrita se hacen por el WhatsApp oficial +34 644 184 762. Las solicitudes de justificantes médicos, congelaciones por lesión, comodines de urgencia familiar y cuestiones de salud deben comunicarse por escrito.",
      },
    ],
  },

  // ---------------- PARTE C: INDIVIDUAL ----------------
  {
    titulo: "C1. Entrenamiento individual · Servicio",
    bloques: [
      {
        p: "Miriam ofrece sesiones de entrenamiento individual presencial de Calistenia y Pino (Handstand), adaptadas al nivel, objetivos y circunstancias de cada Alumno. Duran 1 hora, se realizan bajo la supervisión directa de Miriam y al aire libre, en Fuengirola (Málaga), en el lugar acordado previamente entre Miriam y el Alumno.",
      },
    ],
  },
  {
    titulo: "C2. Entrenamiento individual · Precios y pago",
    bloques: [
      {
        p: "Las tarifas son las vigentes en el momento de la contratación y se comunican antes de contratar. Todos los servicios deben abonarse por adelantado, antes de la primera sesión. Los métodos de pago aceptados son efectivo y Bizum.",
      },
    ],
  },
  {
    titulo: "C3. Entrenamiento individual · Validez de sesiones y bonos",
    bloques: [
      {
        p: "Las sesiones sueltas y los bonos mensuales tienen una validez de 30 días naturales desde la fecha exacta de compra; los bonos trimestrales, de 90 días. Las sesiones no utilizadas en ese periodo se consideran caducadas y se pierden, salvo las excepciones previstas en estas condiciones.",
      },
    ],
  },
  {
    titulo: "C4. Entrenamiento individual · Reservas y cancelaciones",
    bloques: [
      {
        p: "Las sesiones se reservan en la aplicación, en los horarios disponibles. Una vez confirmada la reserva, la sesión queda reservada en exclusiva para el Alumno.",
      },
      {
        p: "Como cada sesión individual reserva un horario exclusivo, la cancelación debe hacerse con un mínimo de 12 horas de antelación. Dentro del plazo, la sesión no se descuenta y puede reprogramarse. Con menos de 12 horas, la sesión se considera realizada y se descuenta del bono (si es suelta, se considera consumida).",
      },
      {
        p: "No presentación: si el Alumno no se presenta a una sesión confirmada y no la ha cancelado en plazo, la sesión se considera realizada, sin derecho a recuperación. Retrasos: si el Alumno llega tarde, la sesión finaliza a la hora prevista y el tiempo perdido no se recupera; si el retraso es de Miriam, el tiempo perdido se recupera en la misma sesión o en la siguiente.",
      },
    ],
  },
  { titulo: "C5. Entrenamiento individual · Urgencias médicas", bloques: URGENCIA },
  { titulo: "C6. Entrenamiento individual · Comodín de urgencia familiar", bloques: COMODIN },
  {
    titulo: "C7. Entrenamiento individual · Cancelación por Miriam y lluvia",
    bloques: [
      {
        p: "Si Miriam debe cancelar una sesión por causa de fuerza mayor, avisará con la máxima antelación posible; la sesión no se pierde y se reagenda de mutuo acuerdo. Si hay lluvia torrencial o condiciones del suelo no seguras, Miriam podrá cancelar la sesión, que se reagendará de mutuo acuerdo. Por cada semana en la que Miriam cancele sesiones por condiciones meteorológicas adversas, el bono amplía su caducidad en 7 días naturales.",
      },
    ],
  },
  { titulo: "C8. Entrenamiento individual · Salud y aptitud", bloques: SALUD },
  { titulo: "C9. Entrenamiento individual · El servicio no sustituye el consejo médico", bloques: NO_MEDICO },
  { titulo: "C10. Entrenamiento individual · Autorregulación y seguridad", bloques: AUTORREGULACION },
  { titulo: "C11. Entrenamiento individual · Riesgos inherentes", bloques: RIESGOS },
  {
    titulo: "C12. Entrenamiento individual · Lesiones",
    bloques: [
      {
        p: "Lesión durante una sesión dirigida por Miriam: el Alumno puede elegir entre (1) devolución proporcional de las sesiones pagadas y no disfrutadas, o (2) congelación del bono hasta el alta médica, recibiendo al reincorporarse una sesión gratuita que recupera la sesión en la que se produjo la lesión. Se aplica atendiendo a las circunstancias concretas.",
      },
      {
        p: "Lesión fuera de las sesiones: no hay reembolso económico, pero el saldo pendiente puede congelarse. Lesión estándar (hasta 3 meses): comunicar y enviar el informe médico en un máximo de 7 días naturales desde el aviso; pausa de hasta 3 meses / 90 días; si no se reincorpora, el bono caduca; si se reincorpora durante la congelación, debe aportar justificantes médicos. Lesión grave o cirugía (más de 3 meses): prórroga hasta un máximo de 6 meses / 180 días (después caduca definitivamente) o traspaso del 100 % de las sesiones pendientes a un familiar o amigo, con 30 días naturales para consumirlas.",
      },
      {
        p: "Al reincorporarse tras una congelación, las sesiones pendientes se programan según los huecos que Miriam tenga disponibles; no se garantiza el mismo día u horario de antes.",
      },
    ],
  },
  { titulo: "C13. Entrenamiento individual · Primeros auxilios", bloques: PRIMEROS_AUXILIOS },
  { titulo: "C14. Entrenamiento individual · Material y objetos personales", bloques: MATERIAL },
  { titulo: "C15. Entrenamiento individual · Derechos de imagen y grabación", bloques: IMAGEN_PRESENCIAL },
  {
    titulo: "C16. Entrenamiento individual · Comunicaciones oficiales",
    bloques: [
      {
        p: "Las comunicaciones sobre sesiones, cancelaciones, incidencias, justificantes médicos y solicitudes de congelación se hacen por el WhatsApp oficial +34 644 184 762 (lunes a viernes, de 08:00 a 17:00 h). Las solicitudes de justificantes médicos, congelaciones, comodines y cuestiones de salud deben comunicarse por escrito.",
      },
    ],
  },

  // ---------------- PARTE D: ONLINE ----------------
  {
    titulo: "D1. Entrenamiento online · Servicio",
    bloques: [
      {
        p: "Miriam ofrece entrenamiento online de Calistenia y Pino (Handstand), que se presta a distancia a través de la aplicación y de los canales oficiales indicados en estas condiciones. El Alumno entrena por su cuenta, en el lugar y momento que elija, sin la supervisión presencial y directa de Miriam. El contenido concreto (planificación, seguimiento, revisiones, videollamadas u otros elementos) es el de la modalidad contratada.",
      },
      {
        p: "Cuando el servicio incluya correcciones técnicas, se realizan en un día específico de la semana que Miriam comunicará; los vídeos o consultas recibidos se revisan en el siguiente día de correcciones. Solo se realizan si están incluidas en el servicio contratado.",
      },
    ],
  },
  {
    titulo: "D2. Entrenamiento online · Duración, pago y renovación",
    bloques: [
      {
        p: "La duración depende de la modalidad contratada y se informa antes de contratar. Las tarifas son las vigentes en el momento de la contratación y se comunican antes. Todos los servicios se abonan por adelantado, antes del inicio. Métodos de pago aceptados: Bizum y transferencia bancaria.",
      },
      {
        p: "El servicio no se renueva automáticamente: la renovación solo se produce cuando el Alumno paga el nuevo periodo. Si al finalizar no se ha pagado la renovación, el servicio queda pausado hasta que se efectúe el pago.",
      },
    ],
  },
  {
    titulo: "D3. Entrenamiento online · Derecho de desistimiento y devoluciones",
    bloques: [
      {
        p: "Al ser un servicio contratado a distancia, el Alumno dispone de 14 días naturales desde la fecha del pago para solicitar la devolución del importe, siempre que todavía no haya recibido la rutina o planificación de entrenamiento. Una vez entregada la rutina o planificación, no se realiza ninguna devolución, aunque no hayan pasado los 14 días. El Alumno acepta expresamente que la entrega se realice dentro de ese plazo y reconoce que, al recibirla, pierde su derecho de desistimiento.",
      },
      {
        p: "Para solicitar la devolución, debe comunicarlo por escrito por WhatsApp al +34 644 184 762 o por correo a miriamcalistenia@gmail.com. El reembolso se realiza en un máximo de 14 días naturales desde la solicitud, por el mismo medio de pago.",
      },
    ],
  },
  { titulo: "D4. Entrenamiento online · Salud y aptitud", bloques: SALUD },
  {
    titulo: "D5. Entrenamiento online · El servicio no sustituye el consejo médico",
    bloques: [
      ...NO_MEDICO,
      { p: "Ante cualquier lesión, dolor persistente o problema de salud, el Alumno deberá acudir a un profesional sanitario." },
    ],
  },
  {
    titulo: "D6. Entrenamiento online · Autorregulación y seguridad",
    bloques: [
      ...AUTORREGULACION,
      { p: "El Alumno se compromete a seguir las recomendaciones de seguridad y a entrenar en un espacio y con un material adecuados y seguros." },
    ],
  },
  {
    titulo: "D7. Entrenamiento online · Riesgos inherentes",
    bloques: [
      ...RIESGOS,
      { p: "Al entrenar sin supervisión presencial, cada Alumno es responsable de sus propios movimientos, decisiones y seguridad durante sus entrenamientos." },
    ],
  },
  {
    titulo: "D8. Entrenamiento online · Lesiones",
    bloques: [
      {
        p: "Como los entrenamientos online se realizan sin supervisión presencial, no se realiza ningún reembolso económico por lesiones, pero el servicio pendiente puede congelarse. Lesión estándar (hasta 3 meses): comunicar y enviar el informe médico en un máximo de 7 días naturales desde el aviso; el servicio puede pausarse hasta 3 meses / 90 días; si no se reincorpora, caduca; si se reincorpora durante la congelación, debe aportar justificantes médicos. Lesión grave o cirugía (más de 3 meses): la congelación puede ampliarse hasta un máximo absoluto de 6 meses / 180 días, y después el servicio caduca definitivamente.",
      },
    ],
  },
  {
    titulo: "D9. Entrenamiento online · Propiedad intelectual",
    bloques: [
      {
        p: "Todos los contenidos facilitados durante el servicio (planificaciones, rutinas, progresiones, vídeos, textos, imágenes y cualquier otro material) son propiedad de Miriam y están protegidos por la normativa de propiedad intelectual. Se facilitan exclusivamente para uso personal del Alumno. Queda prohibido, sin autorización expresa y por escrito de Miriam:",
      },
      {
        lista: [
          "Compartirlos o cederlos a terceras personas.",
          "Copiarlos, reproducirlos o distribuirlos.",
          "Publicarlos en redes sociales, webs u otros canales.",
          "Revenderlos o utilizarlos con fines comerciales.",
        ],
      },
      { p: "El incumplimiento puede suponer la finalización inmediata del servicio sin derecho a reembolso, sin perjuicio de las acciones legales que correspondan." },
    ],
  },
  {
    titulo: "D10. Entrenamiento online · Videollamadas",
    bloques: [
      {
        p: "Cuando el servicio incluya videollamadas (por Google Meet), ninguna de las partes puede grabarlas, total o parcialmente, sin el consentimiento previo y expreso de la otra, ni difundir o compartir con terceros las grabaciones o capturas sin dicho consentimiento.",
      },
    ],
  },
  {
    titulo: "D11. Entrenamiento online · Derechos de imagen",
    bloques: [
      {
        p: "Durante el servicio, el Alumno puede enviar fotografías o vídeos de sus entrenamientos con fines técnicos, como el análisis de movimientos o las correcciones. Ese contenido podrá usarse además para generar contenido relacionado con la actividad profesional de Miriam y publicarse en redes sociales y otros canales profesionales. Si el Alumno no desea aparecer en contenido audiovisual identificable, deberá comunicarlo expresamente a Miriam antes de comenzar el servicio. La negativa al uso promocional de su imagen no afecta a su derecho a recibir el servicio contratado.",
      },
    ],
  },
  {
    titulo: "D12. Entrenamiento online · Plataformas y comunicaciones",
    bloques: [
      {
        p: "Además de la aplicación, el servicio online puede usar: Tally (formularios iniciales o de seguimiento), Google Meet y Google Calendar (videollamadas y su agenda), WhatsApp (comunicaciones y envío de vídeos o consultas), Bizum y entidad bancaria (pagos). Estas plataformas pueden tratar datos del Alumno conforme a sus propias políticas de privacidad.",
      },
      {
        p: "Para las gestiones que requieran comunicación escrita se usa el WhatsApp oficial +34 644 184 762, en el horario de atención (lunes a viernes, de 08:00 a 17:00 h). Las solicitudes de justificantes médicos, congelaciones por lesión, desistimiento y cuestiones de salud deben comunicarse por escrito.",
      },
    ],
  },

  // ---------------- ACEPTACIÓN ----------------
  {
    titulo: "Aceptación de las condiciones",
    bloques: [
      { p: "Al pulsar «Estoy de acuerdo», el Alumno declara expresamente que:" },
      {
        lista: [
          "Ha leído y comprendido las presentes condiciones y acepta las aplicables a los servicios que contrata.",
          "Declara encontrarse en condiciones adecuadas para realizar actividad física y comprende que el servicio no sustituye el asesoramiento médico.",
          "Se compromete a informar de cualquier lesión, dolor, limitación o circunstancia relevante.",
          "Se compromete a respetar las normas de reservas, cancelaciones, asistencia, convivencia y seguridad.",
          "Comprende y acepta los riesgos inherentes a la práctica de Calistenia y Pino, especialmente al entrenar sin supervisión presencial.",
          "En el servicio online, ha sido informado de su derecho de desistimiento y acepta que, una vez recibida la rutina o planificación, no podrá solicitar la devolución, y se compromete a usar los contenidos solo de forma personal.",
          "Acepta el tratamiento de sus datos personales en los términos de la política de privacidad, incluido el de sus datos de salud.",
          "Ha sido informado de las condiciones sobre el uso de imágenes y grabaciones.",
        ],
      },
      {
        p: "La aceptación queda registrada en la aplicación junto con la fecha y la versión de los textos. Estas condiciones se aplican desde el momento de su aceptación y durante la prestación de los servicios.",
      },
    ],
  },
];

export default function Terminos() {
  return <PaginaLegal titulo="Términos y condiciones" secciones={secciones} />;
}
