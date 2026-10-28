"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import type { Estado } from "../acciones";
import styles from "../admin.module.css";
import { crearRutina } from "../rutinas/acciones";

// Crea una plantilla (una rutina sin alumno), en blanco o copiando otra plantilla, y abre su editor.
export default function NuevaPlantillaOnline({ plantillas }: { plantillas: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<Estado & { id?: string }, FormData>(crearRutina, {});

  useEffect(() => {
    if (estado.id) router.push(`/admin/rutinas/${estado.id}`);
  }, [estado.id, router]);

  return (
    <form action={accion} className={styles.tarjeta}>
      <input type="hidden" name="alumno" value="plantilla" />
      <div className={styles.campo}>
        <label htmlFor="npo-nombre">Nombre de la plantilla</label>
        <input id="npo-nombre" name="nombre" required maxLength={80} placeholder="Fuerza 4 semanas" />
      </div>
      <div className={styles.campo}>
        <label htmlFor="npo-desde">Empezar desde (opcional)</label>
        <select id="npo-desde" name="desde" defaultValue="">
          <option value="">Plantilla en blanco</option>
          {plantillas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      {estado.error && (
        <p className={styles.error} role="alert">
          {estado.error}
        </p>
      )}
      <button className={styles.boton} type="submit" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear y editar"}
      </button>
    </form>
  );
}
