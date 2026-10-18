export type Idioma = "es" | "en";

export const IDIOMAS: { codigo: Idioma; nombre: string }[] = [
  { codigo: "es", nombre: "Español" },
  { codigo: "en", nombre: "English" },
];

export const textos = {
  es: {
    lema: "Calistenia y pino · Fuengirola",
    intro: "¿Qué te interesa?",
    online: "Entrenamiento online",
    presencial: "Entrenamiento presencial",
    academia: "Academia",
    entrar: "Entrar",
    idioma: "Idioma",
  },
  en: {
    lema: "Calisthenics & handstand · Fuengirola",
    intro: "What are you interested in?",
    online: "Online training",
    presencial: "In-person training",
    academia: "Academy",
    entrar: "Log in",
    idioma: "Language",
  },
} satisfies Record<Idioma, Record<string, string>>;
