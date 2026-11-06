// Tipos de persona del registro «Exalumnos e invitados antiguos» (personas sin cuenta en la app).
// `bloquea` = si por defecto esa persona ya no puede hacer la clase de prueba gratis (Miriam lo puede cambiar en cada una).
export const TIPOS_PERSONA = [
  { valor: "exalumno_grupal", texto: "Exalumno/a de clases grupales", bloquea: true },
  { valor: "exalumno_individual", texto: "Exalumno/a de entrenamiento personal", bloquea: true },
  { valor: "exalumno_online", texto: "Exalumno/a online", bloquea: true },
  { valor: "exalumno_taller", texto: "Exalumno/a de talleres", bloquea: true },
  { valor: "invitado_sin_probar", texto: "Invitado/a que nunca usó su prueba", bloquea: false },
  { valor: "invitado_probo", texto: "Invitado/a que probó la clase y no volvió", bloquea: true },
] as const;

export const TEXTO_TIPO: Record<string, string> = Object.fromEntries(TIPOS_PERSONA.map((t) => [t.valor, t.texto]));
export const TIPOS_VALIDOS: string[] = TIPOS_PERSONA.map((t) => t.valor);
