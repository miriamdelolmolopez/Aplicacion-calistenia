import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { claveDia } from "@/lib/fechas";
import styles from "../admin.module.css";
import { Aplicar, AnadirClase, Borrar, Duplicar, HacerPrincipal, NuevaPlantilla, QuitarClase, Renombrar } from "./Controles";

export const metadata = { title: "Plantillas de clases · Administración" };

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

type Item = {
  id: string;
  dia_semana: number;
  hora: string;
  plazas: number | null;
  tipos_clase: { nombre: string; plazas_max: number } | null;
};
type Plantilla = { id: string; nombre: string; principal: boolean; plantilla_clases: Item[] };

export default async function Horarios() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("plantillas_horario")
    .select("id, nombre, principal, plantilla_clases(id, dia_semana, hora, plazas, tipos_clase(nombre, plazas_max))")
    .order("principal", { ascending: false })
    .order("nombre");
  const plantillas = (data ?? []) as unknown as Plantilla[];

  const { data: tiposDatos } = await supabase
    .from("tipos_clase")
    .select("id, nombre")
    .eq("activo", true)
    .order("nombre");
  const tipos = tiposDatos ?? [];

  const hoy = claveDia(new Date().toISOString());

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Plantillas de clases</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <section className={styles.tarjeta}>
        <p className={styles.ayuda}>
          Una plantilla es un horario semanal que puedes aplicar a las semanas que quieras. Cambiar una
          plantilla no modifica las clases que ya se han creado. Las clases no se crean solas: tú eliges desde qué día hasta qué día las publicas.
        </p>
      </section>

      {plantillas.map((p) => {
        const items = [...p.plantilla_clases].sort((a, b) => a.hora.localeCompare(b.hora));
        return (
          <section key={p.id} className={styles.tarjeta}>
            <div className={styles.personaCabecera}>
              <h2 style={{ margin: 0 }}>{p.nombre}</h2>
              {p.principal && <span className={styles.etiqueta}>Principal</span>}
            </div>

            {DIAS.map((nombreDia, i) => {
              const delDia = items.filter((c) => c.dia_semana === i + 1);
              if (delDia.length === 0) return null;
              return (
                <div key={nombreDia}>
                  <h3 className={styles.dia}>{nombreDia}</h3>
                  <ul className={styles.lista}>
                    {delDia.map((c) => (
                      <li key={c.id}>
                        <QuitarClase
                          id={c.id}
                          texto={`${c.hora.slice(0, 5)} · ${c.tipos_clase?.nombre ?? "?"} · ${c.plazas ?? c.tipos_clase?.plazas_max ?? "?"} plazas`}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {items.length === 0 && <p className={styles.ayuda}>Esta plantilla todavía no tiene clases.</p>}

            <details className={styles.detalles}>
              <summary>Añadir clases</summary>
              <AnadirClase plantillaId={p.id} tipos={tipos} />
            </details>

            <details className={styles.detalles}>
              <summary>Publicar clases (elegir días)</summary>
              <Aplicar id={p.id} hoy={hoy} />
            </details>

            <details className={styles.detalles}>
              <summary>Nombre y más opciones</summary>
              <Renombrar id={p.id} nombre={p.nombre} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Duplicar id={p.id} />
                {!p.principal && <HacerPrincipal id={p.id} />}
                <Link href={`/admin/horarios/${p.id}/imprimir`} className={`${styles.boton} ${styles.botonSecundario}`}>
                  Imprimir / PDF
                </Link>
                {!p.principal && <Borrar id={p.id} nombre={p.nombre} />}
              </div>
            </details>
          </section>
        );
      })}

      <NuevaPlantilla />
    </main>
  );
}
