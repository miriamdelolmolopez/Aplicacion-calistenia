// Lectura y comprobación de un archivo de contactos (CSV o Excel) para la subida masiva. Se usa en el navegador.

export type FilaImport = { correo: string; nombre: string; apellidos: string; telefono: string; tipo: "alumno" | "invitado"; servicios: string[] };
export type FilaLeida = FilaImport & { linea: number; problemas: string[] };

const SERVICIOS = ["grupal", "individual", "online", "taller"];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const clave = (s: unknown) => sinTildes(String(s ?? "").trim().toLowerCase());

// Nombres de columna que se entienden (en español o en inglés).
const COLUMNAS: Record<string, "correo" | "nombre" | "apellidos" | "telefono" | "tipo" | "servicios"> = {
  correo: "correo",
  email: "correo",
  "e-mail": "correo",
  mail: "correo",
  "correo electronico": "correo",
  nombre: "nombre",
  name: "nombre",
  apellidos: "apellidos",
  apellido: "apellidos",
  surname: "apellidos",
  telefono: "telefono",
  movil: "telefono",
  phone: "telefono",
  tipo: "tipo",
  servicio: "servicios",
  servicios: "servicios",
};

export const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Convierte el texto de un CSV en filas de celdas. Entiende «;», «,» o tabulador, y las comillas.
export function leerCsv(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const primera = limpio.split(/\r?\n/, 1)[0] ?? "";
  const separador = [";", ",", "\t"].map((s) => [s, primera.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === separador) {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && limpio[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (celda !== "" || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas.filter((f) => f.some((x) => x.trim() !== ""));
}

function tipoDe(valor: string, porDefecto: "alumno" | "invitado"): "alumno" | "invitado" {
  const v = clave(valor);
  if (v.includes("invit") || v.includes("prueba")) return "invitado";
  if (v.includes("alum") || v.includes("atleta")) return "alumno";
  return porDefecto;
}

// Devuelve los servicios entendidos y lo que no se ha entendido.
function serviciosDe(valor: string): { servicios: string[]; raros: string[] } {
  const servicios: string[] = [];
  const raros: string[] = [];
  for (const parte of valor.split(/[+,;/|]/).map((p) => clave(p)).filter(Boolean)) {
    const s = parte.includes("grup") ? "grupal" : parte.includes("indiv") || parte.includes("person") ? "individual" : parte.includes("onl") ? "online" : parte.includes("taller") || parte.includes("workshop") ? "taller" : null;
    if (s && SERVICIOS.includes(s)) {
      if (!servicios.includes(s)) servicios.push(s);
    } else raros.push(parte);
  }
  return { servicios, raros };
}

// De la tabla (primera fila = títulos) saca las personas, con los problemas que tiene cada una.
export function leerTabla(tabla: string[][], tipoPorDefecto: "alumno" | "invitado"): { filas: FilaLeida[]; error?: string } {
  if (tabla.length < 2) return { filas: [], error: "El archivo no tiene filas con datos (la primera fila son los títulos de las columnas)." };
  const indice: Partial<Record<(typeof COLUMNAS)[string], number>> = {};
  tabla[0].forEach((titulo, i) => {
    const c = COLUMNAS[clave(titulo)];
    if (c && indice[c] === undefined) indice[c] = i;
  });
  if (indice.correo === undefined) return { filas: [], error: "No encuentro la columna del correo. Ponle de título «correo» o «email» en la primera fila." };

  const vistos = new Set<string>();
  const filas = tabla.slice(1).map((celdas, n): FilaLeida => {
    const dato = (c: keyof typeof indice) => String(celdas[indice[c] ?? -1] ?? "").trim();
    const correo = dato("correo").toLowerCase();
    const problemas: string[] = [];
    if (!CORREO_VALIDO.test(correo)) problemas.push("El correo no es válido");
    else if (vistos.has(correo)) problemas.push("Repetido en el archivo");
    vistos.add(correo);
    const tipo = tipoDe(dato("tipo"), tipoPorDefecto);
    const { servicios, raros } = serviciosDe(dato("servicios"));
    if (raros.length > 0) problemas.push(`Servicio no entendido: ${raros.join(", ")}`);
    return { linea: n + 2, correo, nombre: dato("nombre"), apellidos: dato("apellidos"), telefono: dato("telefono"), tipo, servicios, problemas };
  });
  return { filas };
}

export const PLANTILLA_CSV = "correo;nombre;apellidos;telefono;tipo;servicios\r\nejemplo@correo.com;Ana;García López;600123123;alumno;grupal + online\r\n";
