"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../admin.module.css";
import { alternarRegla } from "./reglasAcciones";
import estilos from "./automatizaciones.module.css";
import { describirAccion, describirCondicion, type Regla, type Tarifa } from "@/lib/reglasCatalogo";

export type ReglaConDatos = Regla & { aplicadas: number };

// Las automatizaciones que has creado tú: resumen de «cuando ocurra» y «entonces que haga», con interruptor.
export default function ReglasPropias({ reglas, tarifas }: { reglas: ReglaConDatos[]; tarifas: Tarifa[] }) {
  const router = useRouter();
  const [trabajando, setTrabajando] = useState<string | null>(null);

  async function cambiar(r: ReglaConDatos) {
    setTrabajando(r.id);
    await alternarRegla(r.id, !r.activa);
    setTrabajando(null);
    router.refresh();
  }

  return (
    <section className={styles.tarjeta}>
      <div className={estilos.cabeceraPropias}>
        <h2>Mis automatizaciones</h2>
        <Link href="/admin/automatizaciones/regla/nueva" className={styles.boton}>
          + Nueva automatización
        </Link>
      </div>
      <p className={styles.ayuda}>Las creas tú: eliges cuándo se activan (por ejemplo, «lleva 21 días sin venir») y qué pasa (un aviso, un correo, clases de regalo o una tarea para ti).</p>
      {reglas.length === 0 && <p className={estilos.vacio}>Todavía no has creado ninguna.</p>}
      {reglas.map((r) => (
        <article key={r.id} className={estilos.reglaCaja}>
          <div className={estilos.estado}>
            <strong>{r.nombre}</strong>
            <span className={`${estilos.chip} ${r.activa ? estilos.chipOn : estilos.chipOff}`}>{r.activa ? "Activada" : "Apagada"}</span>
            <span className={estilos.chip}>{r.aplicadas === 0 ? "Aún no se ha aplicado" : `Aplicada a ${r.aplicadas} ${r.aplicadas === 1 ? "persona" : "personas"}`}</span>
          </div>
          <dl className={estilos.datos}>
            <div>
              <dt>Cuando</dt>
              <dd>{r.condiciones.map((c) => describirCondicion(c, tarifas)).join(" · ")}</dd>
            </div>
            <div>
              <dt>Entonces</dt>
              <dd>{r.acciones.map(describirAccion).join(" · ")}</dd>
            </div>
            <div>
              <dt>Cada cuánto</dt>
              <dd>{r.repeticion_dias === null ? "Una sola vez por persona" : `Otra vez cada ${r.repeticion_dias} días si sigue cumpliéndose`}</dd>
            </div>
          </dl>
          <div className={estilos.botonera}>
            <Link href={`/admin/automatizaciones/regla/${r.id}`} className={`${styles.boton} ${styles.botonSecundario}`}>
              Editar
            </Link>
            <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} disabled={trabajando === r.id} onClick={() => cambiar(r)}>
              {r.activa ? "Apagar" : "Activar"}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
