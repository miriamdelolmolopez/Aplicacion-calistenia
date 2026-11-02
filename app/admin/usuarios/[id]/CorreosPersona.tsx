"use client";

import { useState, useTransition } from "react";
import styles from "../../admin.module.css";
import estilos from "../usuarios.module.css";
import { cambiarAvisoPersona, cambiarSinCorreos } from "../acciones";

export type AvisosPersona = {
  sinCorreos: boolean;
  avisos_reserva: boolean;
  avisos_recordatorio: boolean;
  avisos_bono: boolean;
  avisos_novedades: boolean;
  avisar_cumple: boolean;
};

type ClaveAviso = Exclude<keyof AvisosPersona, "sinCorreos">;

const OPCIONES: { clave: ClaveAviso; titulo: string; ayuda: string }[] = [
  { clave: "avisos_reserva", titulo: "Confirmación de reservas", ayuda: "Un correo cada vez que reserva o cancela una clase." },
  { clave: "avisos_recordatorio", titulo: "Recordatorio de clase", ayuda: "Un aviso el día antes de su clase." },
  { clave: "avisos_bono", titulo: "Su tarifa", ayuda: "Cuando está a punto de caducar o se le acaban las clases." },
  { clave: "avisos_novedades", titulo: "Mensajes tuyos", ayuda: "Cuando lleva tiempo sin venir, aniversarios y novedades." },
  { clave: "avisar_cumple", titulo: "Felicitación de cumpleaños", ayuda: "Un correo el día de su cumpleaños." },
];

function Interruptor({ activo, deshabilitado, alCambiar, titulo, ayuda }: { activo: boolean; deshabilitado: boolean; alCambiar: (v: boolean) => void; titulo: string; ayuda: string }) {
  return (
    <label className={estilos.filaInterruptor}>
      <span>
        <strong>{titulo}</strong>
        <small>{ayuda}</small>
      </span>
      <input type="checkbox" role="switch" className={estilos.interruptor} checked={activo} disabled={deshabilitado} onChange={(e) => alCambiar(e.target.checked)} />
    </label>
  );
}

// Los correos que recibe esa persona: se ve lo que tiene activado y se puede cambiar desde aquí.
export default function CorreosPersona({ userId, inicial }: { userId: string; inicial: AvisosPersona }) {
  const [valores, setValores] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, empezar] = useTransition();

  function cambiarAviso(clave: ClaveAviso, valor: boolean) {
    setError(null);
    setValores((v) => ({ ...v, [clave]: valor }));
    empezar(async () => {
      const r = await cambiarAvisoPersona(userId, clave, valor);
      if (r.error) {
        setError(r.error);
        setValores((v) => ({ ...v, [clave]: !valor }));
      }
    });
  }

  function cambiarGeneral(recibe: boolean) {
    setError(null);
    setValores((v) => ({ ...v, sinCorreos: !recibe }));
    empezar(async () => {
      const r = await cambiarSinCorreos(userId, !recibe);
      if (r.error) {
        setError(r.error);
        setValores((v) => ({ ...v, sinCorreos: recibe }));
      }
    });
  }

  return (
    <div className={estilos.interruptores}>
      <Interruptor activo={!valores.sinCorreos} deshabilitado={pendiente} alCambiar={cambiarGeneral} titulo="Recibe correos" ayuda="Si lo desactivas, la app no le manda ningún correo. Los avisos dentro de la app siguen igual." />
      {OPCIONES.map((o) => (
        <Interruptor key={o.clave} activo={valores[o.clave]} deshabilitado={pendiente || valores.sinCorreos} alCambiar={(v) => cambiarAviso(o.clave, v)} titulo={o.titulo} ayuda={o.ayuda} />
      ))}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
