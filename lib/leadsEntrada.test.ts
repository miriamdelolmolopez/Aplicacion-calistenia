// Pruebas de la lectura de formularios externos. Se ejecutan con: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { camposDe, huella, leadDe, nuevaClave } from "./leadsEntrada.ts";

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
