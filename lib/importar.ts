// Lectura y comprobación de un archivo de contactos (CSV o Excel) para la subida masiva. Se usa en el navegador.

export type FilaImport = {
  correo: string;
  nombre: string;
  apellidos: string;
  telefono: string;
  tipo: "alumno" | "invitado";
  idioma: "es" | "en";
  servicios: string[];
  dni: string;
  nacimiento: string; // aaaa-mm-dd
  emergenciaNombre: string;
  emergenciaTelefono: string;
  tarifa: string; // nombre de la tarifa tal como está en la app
  inicio: string; // aaaa-mm-dd
  fin: string; // aaaa-mm-dd
  dias: string; // días de duración, si no se pone el fin
  pagado: boolean | null; // null = no se dice (queda pendiente)
  fechaPago: string; // aaaa-mm-dd
  horaPago: string; // hh:mm
  formaPago: string; // nombre de la forma de pago
  descuento: string; // nombre del descuento
  importe: string; // euros, si no es el precio de la tarifa
};
export type FilaLeida = FilaImport & { linea: number; problemas: string[] };

const SERVICIOS = ["grupal", "individual", "online", "taller"];

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
export const clave = (s: unknown) => sinTildes(String(s ?? "").trim().toLowerCase());

type Col = keyof FilaImport;

// Nombres de columna que se entienden (en español o en inglés).
const COLUMNAS: Record<string, Col> = {
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
  idioma: "idioma",
  language: "idioma",
  lengua: "idioma",
  servicio: "servicios",
  servicios: "servicios",
  dni: "dni",
  nif: "dni",
  "fecha nacimiento": "nacimiento",
  "fecha de nacimiento": "nacimiento",
  nacimiento: "nacimiento",
  "contacto emergencia": "emergenciaNombre",
  "contacto de emergencia": "emergenciaNombre",
  "nombre contacto emergencia": "emergenciaNombre",
  "telefono emergencia": "emergenciaTelefono",
  "telefono de emergencia": "emergenciaTelefono",
  "telefono contacto emergencia": "emergenciaTelefono",
  tarifa: "tarifa",
  "tipo de tarifa": "tarifa",
  bono: "tarifa",
  inicio: "inicio",
  "fecha inicio": "inicio",
  "fecha de inicio": "inicio",
  fin: "fin",
  "fecha fin": "fin",
  "fecha de fin": "fin",
  caducidad: "fin",
  dias: "dias",
  "dias de duracion": "dias",
  pagado: "pagado",
  pago: "pagado",
  "fecha pago": "fechaPago",
  "fecha de pago": "fechaPago",
  "hora pago": "horaPago",
  "hora de pago": "horaPago",
  "forma pago": "formaPago",
  "forma de pago": "formaPago",
  metodo: "formaPago",
  "metodo de pago": "formaPago",
  descuento: "descuento",
  importe: "importe",
  precio: "importe",
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

// Una fecha como «15/11/2026», «2026-11-15» o «15-11-2026» (con hora opcional «18:30») pasa a aaaa-mm-dd y hh:mm.
function fechaDe(valor: string): { fecha: string; hora: string } | null {
  const m = valor.trim().match(/^(\d{1,4})[/.-](\d{1,2})[/.-](\d{1,4})(?:[ T]+(\d{1,2}):(\d{2}))?/);
  if (!m) return null;
  const [d, mes, a] = m[1].length === 4 ? [m[3], m[2], m[1]] : [m[1], m[2], m[3]];
  if (a.length !== 4) return null;
  const dia = Number(d);
  const mm = Number(mes);
  const fecha = new Date(Date.UTC(Number(a), mm - 1, dia));
  if (fecha.getUTCFullYear() !== Number(a) || fecha.getUTCMonth() !== mm - 1 || fecha.getUTCDate() !== dia) return null;
  return { fecha: `${a}-${String(mm).padStart(2, "0")}-${String(dia).padStart(2, "0")}`, hora: m[4] ? `${m[4].padStart(2, "0")}:${m[5]}` : "" };
}

function siNo(valor: string): boolean | null | undefined {
  const v = clave(valor);
  if (v === "") return null;
  if (["si", "s", "yes", "y", "1", "true", "pagado", "pagada"].includes(v)) return true;
  if (["no", "n", "0", "false", "pendiente"].includes(v)) return false;
  return undefined;
}

// Importe en euros («45», «45,50», «45.5 €») a texto con punto, o null si no se entiende.
function importeDe(valor: string): string | null {
  const v = valor.replace(/[€\s]|eur(os)?/gi, "").replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0 ? v : null;
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
  const indice: Partial<Record<Col, number>> = {};
  tabla[0].forEach((titulo, i) => {
    const c = COLUMNAS[clave(titulo)];
    if (c && indice[c] === undefined) indice[c] = i;
  });
  if (indice.correo === undefined) return { filas: [], error: "No encuentro la columna del correo. Ponle de título «correo» o «email» en la primera fila." };

  const vistos = new Set<string>();
  const filas = tabla.slice(1).map((celdas, n): FilaLeida => {
    const dato = (c: Col) => String(celdas[indice[c] ?? -1] ?? "").trim();
    const correo = dato("correo").toLowerCase();
    const problemas: string[] = [];
    if (!CORREO_VALIDO.test(correo)) problemas.push("El correo no es válido");
    else if (vistos.has(correo)) problemas.push("Repetido en el archivo");
    vistos.add(correo);
    const tipo = tipoDe(dato("tipo"), tipoPorDefecto);
    const idioma = clave(dato("idioma")).startsWith("en") || clave(dato("idioma")).startsWith("ingl") ? "en" : "es";
    const { servicios, raros } = serviciosDe(dato("servicios"));
    if (raros.length > 0) problemas.push(`Servicio no entendido: ${raros.join(", ")}`);

    // Fechas: en el archivo pueden venir de muchas formas; aquí se dejan como aaaa-mm-dd.
    const fecha = (c: Col, nombre: string) => {
      const v = dato(c);
      if (!v) return { fecha: "", hora: "" };
      const f = fechaDe(v);
      if (!f) problemas.push(`${nombre} no es válida (usa día/mes/año, por ejemplo 15/11/2026)`);
      return f ?? { fecha: "", hora: "" };
    };
    const nacimiento = fecha("nacimiento", "La fecha de nacimiento").fecha;
    const inicio = fecha("inicio", "La fecha de inicio").fecha;
    const fin = fecha("fin", "La fecha de fin").fecha;
    const pago = fecha("fechaPago", "La fecha de pago");
    let horaPago = pago.hora;
    if (dato("horaPago")) {
      const h = dato("horaPago").match(/^(\d{1,2}):(\d{2})/);
      if (h && Number(h[1]) < 24 && Number(h[2]) < 60) horaPago = `${h[1].padStart(2, "0")}:${h[2]}`;
      else problemas.push("La hora de pago no es válida (por ejemplo 18:30)");
    }
    const pagado = siNo(dato("pagado"));
    if (pagado === undefined) problemas.push("«Pagado» tiene que ser sí o no");
    const dias = dato("dias");
    if (dias && !(Number(dias) >= 1 && Number(dias) <= 730 && Number.isInteger(Number(dias)))) problemas.push("Los días tienen que ser un número entero (de 1 a 730)");
    const importeTexto = dato("importe");
    const importe = importeTexto ? importeDe(importeTexto) : "";
    if (importe === null) problemas.push("El importe no es válido (por ejemplo 45 o 45,50)");

    const tarifa = dato("tarifa");
    if (tipo === "invitado" && (tarifa || pagado)) problemas.push("Un/a invitado/a no lleva tarifa ni pago");
    if (!tarifa && tipo === "alumno" && (inicio || fin || dias || pagado || dato("fechaPago") || dato("formaPago") || dato("descuento") || importeTexto)) problemas.push("Hay datos de tarifa o pago pero falta la columna «tarifa»");
    if (inicio && fin && fin <= inicio) problemas.push("La fecha de fin tiene que ser posterior a la de inicio");
    if (fin && dias) problemas.push("Pon la fecha de fin o los días, no las dos cosas");

    return {
      linea: n + 2,
      correo,
      nombre: dato("nombre"),
      apellidos: dato("apellidos"),
      telefono: dato("telefono"),
      tipo,
      idioma: idioma as "es" | "en",
      servicios,
      dni: dato("dni"),
      nacimiento,
      emergenciaNombre: dato("emergenciaNombre"),
      emergenciaTelefono: dato("emergenciaTelefono"),
      tarifa,
      inicio,
      fin,
      dias,
      pagado: pagado === undefined ? null : pagado,
      fechaPago: pago.fecha,
      horaPago,
      formaPago: dato("formaPago"),
      descuento: dato("descuento"),
      importe: importe ?? "",
      problemas,
    };
  });
  return { filas };
}

export const PLANTILLA_CSV =
  "correo;nombre;apellidos;telefono;idioma;dni;fecha nacimiento;contacto emergencia;telefono emergencia;tipo;servicios;tarifa;fecha inicio;fecha fin;dias;pagado;fecha pago;hora pago;forma de pago;descuento;importe\r\n" +
  "ejemplo@correo.com;Ana;García López;600123123;español;12345678Z;15/03/1990;Luis García;600987987;alumno;grupal;Nombre exacto de la tarifa;01/11/2026;;30;sí;01/11/2026;18:30;Bizum;;\r\n";
