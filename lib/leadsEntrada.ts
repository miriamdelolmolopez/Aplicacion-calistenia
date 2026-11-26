import { createHash, randomBytes } from "node:crypto";

// Ayudas para recibir leads de formularios externos (Tally, formularios web propios, Zapier…).
// Aquí no se toca la base de datos: solo se genera la clave y se interpretan los datos que llegan.

export const sinTildes = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const LIMITE_POR_MINUTO = 20; // leads por minuto y por conexión
export const MAX_BYTES = 60_000;

export function nuevaClave(): { token: string; hash: string; ultimos4: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: huella(token), ultimos4: token.slice(-4) };
}

export function huella(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Qué tipo de lead y qué etiquetas lleva un lead que llega por una conexión.
// Si la petición trae «tipo» o «etiquetas» (y reconocemos el tipo), mandan sobre los de la conexión; si no, se usan los de la conexión.
// Las etiquetas que lleguen y no existan se devuelven en «etiquetasNuevas» (quien llama las crea). Un tipo que no existe NO se crea:
// se ignora y se usa el de la conexión (un texto libre de un formulario no debe llenar la lista de tipos).
type Nombrado = { id: string; nombre: string };
export function tipoYEtiquetasDeLead(
  lead: { tipo: string; etiquetas: string[] },
  conexion: { tipo_id: string | null; etiqueta_ids: string[] | null },
  tipos: Nombrado[],
  etiquetas: Nombrado[],
): { tipoId: string | null; etiquetaIds: string[]; etiquetasNuevas: string[] } {
  const delLead = lead.tipo ? tipos.find((t) => sinTildes(t.nombre) === sinTildes(lead.tipo)) : undefined;
  const delaConexion = conexion.tipo_id ? tipos.find((t) => t.id === conexion.tipo_id) : undefined;
  const tipoId = (delLead ?? delaConexion)?.id ?? null;

  const pedidas = lead.etiquetas.map((e) => e.trim()).filter(Boolean);
  if (pedidas.length === 0) {
    const validas = new Set(etiquetas.map((e) => e.id));
    return { tipoId, etiquetaIds: [...new Set(conexion.etiqueta_ids ?? [])].filter((id) => validas.has(id)), etiquetasNuevas: [] };
  }
  const etiquetaIds: string[] = [];
  const etiquetasNuevas: string[] = [];
  for (const nombre of pedidas) {
    const hallada = etiquetas.find((e) => sinTildes(e.nombre) === sinTildes(nombre));
    if (hallada) {
      if (!etiquetaIds.includes(hallada.id)) etiquetaIds.push(hallada.id);
    } else if (!etiquetasNuevas.some((n) => sinTildes(n) === sinTildes(nombre))) {
      etiquetasNuevas.push(nombre);
    }
  }
  return { tipoId, etiquetaIds, etiquetasNuevas };
}

export type CampoEntrada ={ clave: string; valor: string; tipo?: string };

export type LeadEntrada = {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  pais: string;
  idioma: "es" | "en";
  tipo: string; // texto tal como llega (Online, Híbrido…); se busca en la lista de tipos del entrenador
  etiquetas: string[];
  info: { clave: string; valor: string }[];
  spam: boolean;
};

function comoTexto(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(comoTexto).filter(Boolean).join(", ");
  if (typeof v === "object") return "";
  return String(v).trim();
}

// Pasa lo que envía el formulario a una lista sencilla de «pregunta → respuesta».
// Sirve para el aviso de Tally (data.fields), para un JSON con campos sueltos y para formularios web normales.
export function camposDe(cuerpo: unknown): CampoEntrada[] {
  const raiz = (cuerpo && typeof cuerpo === "object" ? cuerpo : {}) as Record<string, unknown>;
  const datos = raiz.data as { fields?: unknown } | undefined;
  if (datos && Array.isArray(datos.fields)) {
    // Tally: cada campo trae su pregunta (label), su tipo y su valor. En las preguntas de elegir, el valor son identificadores de opciones.
    return (datos.fields as Record<string, unknown>[]).map((f) => {
      const opciones = Array.isArray(f.options) ? (f.options as { id: string; text: string }[]) : null;
      let valor = f.value;
      if (opciones && Array.isArray(valor)) valor = valor.map((id) => opciones.find((o) => o.id === id)?.text ?? id);
      else if (opciones && typeof valor === "string") valor = opciones.find((o) => o.id === valor)?.text ?? valor;
      return { clave: comoTexto(f.label) || comoTexto(f.key), valor: comoTexto(valor), tipo: comoTexto(f.type) };
    });
  }
  return Object.entries(raiz).map(([clave, valor]) => ({ clave, valor: comoTexto(valor) }));
}

const NOMBRE = ["nombre", "name", "first name", "firstname", "first_name", "nombre y apellidos", "nombre completo", "full name", "fullname"];
const APELLIDOS = ["apellidos", "apellido", "last name", "lastname", "last_name", "surname"];
const EMAIL = ["email", "e-mail", "correo", "correo electronico", "mail"];
const TELEFONO = ["telefono", "movil", "whatsapp", "phone", "tel", "celular", "numero de telefono"];
const PAIS = ["pais", "country"];
const IDIOMA = ["idioma", "language", "lang"];
const TIPO = ["tipo", "tipo de lead", "servicio"];
const ETIQUETAS = ["etiquetas", "tags"];
const TRAMPA = ["website", "web", "_hp", "hp", "honeypot", "url"]; // campo oculto que solo rellenan los robots

const es = (clave: string, lista: string[]) => lista.includes(sinTildes(clave));
const contiene = (clave: string, lista: string[]) => lista.some((p) => sinTildes(clave).includes(p));

// Convierte los campos recibidos en un lead. Lo que no se reconoce (objetivo, edad, motivación…) se guarda como «información del lead».
export function leadDe(campos: CampoEntrada[]): LeadEntrada {
  const lead: LeadEntrada = { nombre: "", apellidos: "", email: "", telefono: "", pais: "", idioma: "es", tipo: "", etiquetas: [], info: [], spam: false };
  for (const c of campos) {
    const clave = c.clave.trim();
    const valor = c.valor.trim();
    if (!clave || !valor) continue;
    if (es(clave, TRAMPA)) {
      lead.spam = true;
      continue;
    }
    if (c.tipo === "INPUT_EMAIL" || es(clave, EMAIL)) lead.email ||= valor.toLowerCase();
    else if (c.tipo === "INPUT_PHONE_NUMBER" || es(clave, TELEFONO)) lead.telefono ||= valor;
    else if (es(clave, NOMBRE)) lead.nombre ||= valor;
    else if (es(clave, APELLIDOS) || (contiene(clave, ["apellid"]) && !lead.apellidos)) lead.apellidos ||= valor;
    else if (contiene(clave, ["nombre"]) && !lead.nombre) lead.nombre ||= valor;
    else if (es(clave, PAIS)) lead.pais ||= valor;
    else if (es(clave, IDIOMA)) lead.idioma = sinTildes(valor).startsWith("en") ? "en" : "es";
    else if (es(clave, TIPO)) lead.tipo = valor.slice(0, 30);
    else if (es(clave, ETIQUETAS)) lead.etiquetas = valor.split(",").map((e) => e.trim().slice(0, 30)).filter(Boolean).slice(0, 20);
    else lead.info.push({ clave: clave.slice(0, 80), valor: valor.slice(0, 500) });
  }
  // Si solo hay una casilla con «nombre y apellidos», se separa la primera palabra del resto.
  if (lead.nombre && !lead.apellidos && lead.nombre.includes(" ")) {
    const [primero, ...resto] = lead.nombre.split(/\s+/);
    lead.nombre = primero;
    lead.apellidos = resto.join(" ");
  }
  lead.nombre = lead.nombre.slice(0, 80);
  lead.apellidos = lead.apellidos.slice(0, 120);
  lead.telefono = lead.telefono.slice(0, 30);
  lead.pais = lead.pais.slice(0, 60);
  lead.info = lead.info.slice(0, 40);
  return lead;
}
