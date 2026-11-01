// Categorías del glosario: la clave se guarda en la base de datos y el nombre sale en cada idioma.
export const CATEGORIAS_GLOSARIO = [
  { clave: "ejercicios", es: "Ejercicios", en: "Exercises" },
  { clave: "habilidades", es: "Habilidades", en: "Skills" },
  { clave: "conceptos", es: "Conceptos", en: "Concepts" },
  { clave: "material", es: "Material", en: "Equipment" },
] as const;

export const nombreCategoria = (clave: string | null, idioma: "es" | "en") => {
  const c = CATEGORIAS_GLOSARIO.find((x) => x.clave === clave);
  return c ? c[idioma] : null;
};
