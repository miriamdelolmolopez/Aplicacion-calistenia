// Pruebas de la lectura de formularios externos. Se ejecutan con: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { camposDe, huella, leadDe, nuevaClave, tipoYEtiquetasDeLead } from "./leadsEntrada.ts";

test("Tally: reconoce nombre, email, teléfono y guarda el resto como información", () => {
  const aviso = {
    eventType: "FORM_RESPONSE",
    data: {
      fields: [
        { key: "q1", label: "Nombre", type: "INPUT_TEXT", value: "Laura" },
        { key: "q2", label: "Apellidos", type: "INPUT_TEXT", value: "Pérez Gil" },
        { key: "q3", label: "Tu correo", type: "INPUT_EMAIL", value: "Laura@Ejemplo.com" },
        { key: "q4", label: "Teléfono", type: "INPUT_PHONE_NUMBER", value: "+34600111222" },
        { key: "q5", label: "Objetivo", type: "MULTIPLE_CHOICE", value: ["a1"], options: [{ id: "a1", text: "Perder peso" }] },
        { key: "q6", label: "Edad", type: "INPUT_NUMBER", value: 31 },
      ],
    },
  };
  const lead = leadDe(camposDe(aviso));
  assert.equal(lead.nombre, "Laura");
  assert.equal(lead.apellidos, "Pérez Gil");
  assert.equal(lead.email, "laura@ejemplo.com");
  assert.equal(lead.telefono, "+34600111222");
  assert.deepEqual(lead.info, [
    { clave: "Objetivo", valor: "Perder peso" },
    { clave: "Edad", valor: "31" },
  ]);
});

test("Formulario web: campos sueltos, tipo de servicio y etiquetas", () => {
  const lead = leadDe(camposDe({ nombre: "Marc", apellidos: "Roca", email: "marc@ejemplo.com", telefono: "600", tipo: "Híbrido", etiquetas: "instagram, verano", motivacion: "Salud" }));
  assert.equal(lead.tipo, "Híbrido");
  assert.deepEqual(lead.etiquetas, ["instagram", "verano"]);
  assert.deepEqual(lead.info, [{ clave: "motivacion", valor: "Salud" }]);
});

test("Una sola casilla «Nombre y apellidos» se separa", () => {
  const lead = leadDe(camposDe({ "Nombre y apellidos": "Ana María López", email: "ana@ejemplo.com" }));
  assert.equal(lead.nombre, "Ana");
  assert.equal(lead.apellidos, "María López");
});

test("El campo oculto (trampa para robots) marca el envío como spam", () => {
  assert.equal(leadDe(camposDe({ nombre: "X", email: "x@ejemplo.com", website: "http://spam" })).spam, true);
  assert.equal(leadDe(camposDe({ nombre: "X", email: "x@ejemplo.com", website: "" })).spam, false);
});

test("Las claves se generan distintas y solo se guarda su huella", () => {
  const a = nuevaClave();
  const b = nuevaClave();
  assert.notEqual(a.token, b.token);
  assert.equal(a.hash, huella(a.token));
  assert.notEqual(a.hash, a.token);
  assert.equal(a.ultimos4, a.token.slice(-4));
});

// ---- Tipo y etiquetas por defecto de la conexión ----
const TIPOS = [
  { id: "t-online", nombre: "Online" },
  { id: "t-presencial", nombre: "Presencial" },
];
const ETIQUETAS = [
  { id: "e-web", nombre: "web" },
  { id: "e-cali", nombre: "Calistenia" },
];
const SIN_DATOS = { tipo: "", etiquetas: [] as string[] };

test("Conexión con tipo y etiquetas: el lead las lleva sin que la petición las traiga", () => {
  const r = tipoYEtiquetasDeLead(SIN_DATOS, { tipo_id: "t-presencial", etiqueta_ids: ["e-web", "e-cali"] }, TIPOS, ETIQUETAS);
  assert.deepEqual(r, { tipoId: "t-presencial", etiquetaIds: ["e-web", "e-cali"], etiquetasNuevas: [] });
});

test("Conexión sin tipo ni etiquetas: se comporta como antes (nada)", () => {
  assert.deepEqual(tipoYEtiquetasDeLead(SIN_DATOS, { tipo_id: null, etiqueta_ids: null }, TIPOS, ETIQUETAS), { tipoId: null, etiquetaIds: [], etiquetasNuevas: [] });
  assert.deepEqual(tipoYEtiquetasDeLead(SIN_DATOS, { tipo_id: null, etiqueta_ids: [] }, TIPOS, ETIQUETAS), { tipoId: null, etiquetaIds: [], etiquetasNuevas: [] });
});

test("Lo que trae la petición manda sobre la conexión (sin tildes ni mayúsculas)", () => {
  const r = tipoYEtiquetasDeLead({ tipo: "ONLINE", etiquetas: ["Calistenia"] }, { tipo_id: "t-presencial", etiqueta_ids: ["e-web"] }, TIPOS, ETIQUETAS);
  assert.deepEqual(r, { tipoId: "t-online", etiquetaIds: ["e-cali"], etiquetasNuevas: [] });
});

test("Un tipo desconocido en la petición no se crea: se usa el de la conexión", () => {
  const r = tipoYEtiquetasDeLead({ tipo: "Algo raro", etiquetas: [] }, { tipo_id: "t-presencial", etiqueta_ids: [] }, TIPOS, ETIQUETAS);
  assert.equal(r.tipoId, "t-presencial");
  const sin = tipoYEtiquetasDeLead({ tipo: "Algo raro", etiquetas: [] }, { tipo_id: null, etiqueta_ids: [] }, TIPOS, ETIQUETAS);
  assert.equal(sin.tipoId, null);
});

test("Etiquetas nuevas de la petición se piden para crear (sin repetir); las existentes se reutilizan", () => {
  const r = tipoYEtiquetasDeLead({ tipo: "", etiquetas: ["web", "Nueva", "nueva", "WEB"] }, { tipo_id: null, etiqueta_ids: ["e-cali"] }, TIPOS, ETIQUETAS);
  assert.deepEqual(r, { tipoId: null, etiquetaIds: ["e-web"], etiquetasNuevas: ["Nueva"] });
});

test("Si una etiqueta o tipo de la conexión ya no existe (se borró), se ignora sin romper", () => {
  const r = tipoYEtiquetasDeLead(SIN_DATOS, { tipo_id: "t-borrado", etiqueta_ids: ["e-web", "e-borrada"] }, TIPOS, ETIQUETAS);
  assert.deepEqual(r, { tipoId: null, etiquetaIds: ["e-web"], etiquetasNuevas: [] });
});
