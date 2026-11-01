// Plantillas de automatizaciones que Miriam puede añadir con «Nueva». Cada una trae su texto de ejemplo en español e inglés.
// La lógica de cuándo y a quién se envían está en lib/automatizaciones.ts.

export type ClavePlantilla = "echamos_menos" | "bienvenida" | "recordatorio_clase" | "bono_agotado" | "aniversario";

export type PlantillaAuto = {
  clave: ClavePlantilla;
  orden: number;
  titulo: string;
  cuando: string;
  aQuien: string;
  queHace: string;
  variables: string;
  dias?: { defecto: number; etiqueta: string };
  asunto_es: string;
  mensaje_es: string;
  asunto_en: string;
  mensaje_en: string;
};

export const PLANTILLAS: PlantillaAuto[] = [
  {
    clave: "echamos_menos",
    orden: 5,
    titulo: "Echamos de menos",
    cuando: "Cuando una alumna lleva los días que pongas abajo (o más) sin ir a clase ni entrenar, en la revisión de la mañana. Solo una vez por cada «parón».",
    aQuien: "A las alumnas con un bono activo que llevan ese tiempo sin venir y no tienen ninguna clase reservada.",
    queHace: "Le envía un correo cariñoso para que vuelva, con un enlace a Reservar. Si vuelve a venir y luego deja de venir otra vez, se le puede enviar de nuevo.",
    variables: "{nombre}, {dias}",
    dias: { defecto: 14, etiqueta: "Días sin venir ni entrenar" },
    asunto_es: "Te echamos de menos, {nombre}",
    mensaje_es:
      "Hola {nombre},\n\nHace {dias} días que no te vemos por aquí y queremos que sepas que tu sitio te espera.\n\nSi tienes alguna duda o te cuesta encontrar hueco, respóndeme a este correo y lo vemos juntas.\n\nReserva tu próxima clase cuando quieras.",
    asunto_en: "We miss you, {nombre}",
    mensaje_en:
      "Hi {nombre},\n\nIt has been {dias} days since we last saw you and we want you to know your spot is waiting.\n\nIf you have any questions or find it hard to fit a class in, just reply to this email and we'll work it out together.\n\nBook your next class whenever you like.",
  },
  {
    clave: "bienvenida",
    orden: 6,
    titulo: "Bienvenida",
    cuando: "Cuando una persona se da de alta como alumna (cuenta creada desde que añades esta plantilla), en la revisión de la mañana.",
    aQuien: "A cada nueva alumna, una sola vez.",
    queHace: "Le da la bienvenida a CalisCoach y le cuenta qué puede hacer en la app.",
    variables: "{nombre}",
    asunto_es: "Te damos la bienvenida a CalisCoach, {nombre}",
    mensaje_es:
      "Hola {nombre},\n\nYa formas parte de CalisCoach. Desde la app puedes reservar tus clases, ver tu bono y seguir tu progreso.\n\nSi tienes cualquier duda, respóndeme a este correo. ¡Nos vemos en clase!",
    asunto_en: "Welcome to CalisCoach, {nombre}",
    mensaje_en:
      "Hi {nombre},\n\nYou are now part of CalisCoach. In the app you can book your classes, check your pass and follow your progress.\n\nIf you have any questions, just reply to this email. See you in class!",
  },
  {
    clave: "recordatorio_clase",
    orden: 7,
    titulo: "Recordatorio de clase",
    cuando: "El día antes de una clase reservada, en la revisión de la mañana.",
    aQuien: "A quien tiene una clase reservada para mañana (no a las de prueba, que tienen su propio recordatorio) y no ha apagado los avisos de reserva.",
    queHace: "Le recuerda el día y la hora de su clase y le pide que cancele con tiempo si no puede ir. Una vez por reserva.",
    variables: "{nombre}, {clase}, {fecha}",
    asunto_es: "Mañana tienes clase: {clase}",
    mensaje_es: "Hola {nombre},\n\nTe recordamos que mañana tienes {clase} el {fecha}.\n\nSi no puedes venir, cancélala con tiempo desde la app para que otra persona pueda usar tu plaza.",
    asunto_en: "Tomorrow you have a class: {clase}",
    mensaje_en: "Hi {nombre},\n\nJust a reminder that tomorrow you have {clase} on {fecha}.\n\nIf you cannot make it, please cancel in the app in good time so someone else can use your spot.",
  },
  {
    clave: "bono_agotado",
    orden: 8,
    titulo: "Bono agotado",
    cuando: "Cuando a una alumna se le acaban las clases de su bono (en los últimos dos días), en la revisión de la mañana.",
    aQuien: "A quien se ha quedado sin clases y no ha apagado los avisos del bono.",
    queHace: "Le avisa de que ha usado todas las clases y le invita a renovar, con un enlace a las tarifas. Una vez por bono.",
    variables: "{nombre}, {bono}",
    asunto_es: "Has usado todas las clases de tu bono",
    mensaje_es: "Hola {nombre},\n\nHas usado todas las clases de tu bono ({bono}). ¡Qué buen ritmo!\n\nCuando quieras seguir entrenando, puedes renovarlo. Escríbeme y te lo activo.",
    asunto_en: "You have used all the classes in your pass",
    mensaje_en: "Hi {nombre},\n\nYou have used all the classes in your pass ({bono}). Great pace!\n\nWhenever you want to keep training you can renew it. Message me and I will activate it for you.",
  },
  {
    clave: "aniversario",
    orden: 9,
    titulo: "Aniversario",
    cuando: "El día en que se cumplen uno o más años desde que la alumna se apuntó, en la revisión de la mañana.",
    aQuien: "A las alumnas con un bono activo que cumplen años de antigüedad ese día.",
    queHace: "Le da las gracias por entrenar contigo. Una vez al año por persona.",
    variables: "{nombre}, {tiempo}",
    asunto_es: "Hoy cumples {tiempo} en CalisCoach",
    mensaje_es: "Hola {nombre},\n\nHoy hace {tiempo} que te apuntaste a CalisCoach. Gracias por entrenar conmigo: ver tu evolución es lo que más me motiva.\n\n¡A por el siguiente año!",
    asunto_en: "Today marks {tiempo} with CalisCoach",
    mensaje_en: "Hi {nombre},\n\nToday it is {tiempo} since you joined CalisCoach. Thank you for training with me: seeing your progress is what motivates me most.\n\nHere's to the next year!",
  },
];

export const CLAVES_NUEVAS = PLANTILLAS.map((p) => p.clave);
