// Convierte el texto que escribe la administradora en secciones para mostrarlo.
//
// Formato sencillo:
//   ## Título de un apartado
//   Un párrafo (las líneas seguidas forman un solo párrafo; una línea en blanco empieza otro).
//   - Un punto de una lista (una línea que empieza por «- »).

export type Bloque = { p?: string; lista?: string[] };
export type SeccionLegal = { titulo: string; bloques: Bloque[] };

export function analizarTexto(texto: string): { intro: Bloque[]; secciones: SeccionLegal[] } {
  const intro: Bloque[] = [];
  const secciones: SeccionLegal[] = [];
  let actual: Bloque[] = intro;
  let parrafo: string[] = [];
  let lista: string[] = [];

  const cerrar = () => {
    if (parrafo.length > 0) actual.push({ p: parrafo.join(" ") });
    if (lista.length > 0) actual.push({ lista });
    parrafo = [];
    lista = [];
  };

  for (const crudo of texto.replace(/\r\n/g, "\n").split("\n")) {
    const linea = crudo.trim();
    if (linea.startsWith("## ")) {
      cerrar();
      const seccion: SeccionLegal = { titulo: linea.slice(3).trim(), bloques: [] };
      secciones.push(seccion);
      actual = seccion.bloques;
    } else if (linea === "") {
      cerrar();
    } else if (linea.startsWith("- ")) {
      if (parrafo.length > 0) {
        actual.push({ p: parrafo.join(" ") });
        parrafo = [];
      }
      lista.push(linea.slice(2).trim());
    } else {
      if (lista.length > 0) {
        actual.push({ lista });
        lista = [];
      }
      parrafo.push(linea);
    }
  }
  cerrar();
  return { intro, secciones };
}

export const DOCUMENTOS = ["terminos", "privacidad", "aviso-legal", "cookies"] as const;
export type Documento = (typeof DOCUMENTOS)[number];

export const TITULO_DOCUMENTO: Record<Documento, string> = {
  terminos: "Términos y condiciones",
  privacidad: "Política de privacidad",
  "aviso-legal": "Aviso legal",
  cookies: "Política de cookies",
};

// Los dos textos que cada persona tiene que aceptar (si cambian de forma importante, se vuelven a pedir).
export const DOCUMENTOS_CON_ACEPTACION: Documento[] = ["privacidad", "terminos"];
