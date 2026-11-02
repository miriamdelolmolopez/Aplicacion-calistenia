"use client";

import { useState, useTransition } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import AyudaI from "../comunes/AyudaI";
import { cambiarRegistro } from "./acciones";

export default function ControlRegistro({ abierto }: { abierto: boolean }) {
  const [valor, setValor] = useState(abierto);
  const [estado, setEstado] = useState<Estado>({});
  const [pendiente, empezar] = useTransition();

  function cambiar(nuevo: boolean) {
    setEstado({});
    empezar(async () => {
      const r = await cambiarRegistro(nuevo);
      setEstado(r);
      if (!r.error) setValor(nuevo);
    });
  }

  return (
    <div className={styles.formularioInterno}>
      <label className={styles.casilla}>
        <input type="checkbox" checked={valor} disabled={pendiente} onChange={(e) => cambiar(e.target.checked)} />
        Cualquiera puede crear una cuenta <AyudaI texto="Si está activado, cualquier persona puede crearse una cuenta desde la pantalla de inicio. Si no, las cuentas solo se crean desde Administración o con el link de prueba." />
      </label>
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      {estado.mensaje && (
        <p className={styles.aviso} role="status">
          {estado.mensaje}
        </p>
      )}
    </div>
  );
}
