import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { claveDia, haceHoras, textoDia, textoHora } from "@/lib/fechas";
import styles from "../admin.module.css";
import { FilaClase, FormularioTipo, GenerarClases } from "./Controles";

export const metadata = { title: "Clases · Administración" };

type Tipo = { id: string; nombre: string; plazas_max: number; minimo_alumnos: number };
type Clase = {
  id: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  motivo_cancelacion: string | null;
  tipos_clase: { nombre: string } | null;
};

export default async function AdminClases() {
  const { supabase } = await requireAdmin();

  const { data: tiposDatos } = await supabase
    .from("tipos_clase")
    .select("id, nombre, plazas_max, minimo_alumnos")
    .order("nombre");
  const tipos = (tiposDatos ?? []) as Tipo[];

  // Las clases de hoy en adelante (con un margen de unas horas).
  const desde = haceHoras(3);
  const { data: clasesDatos } = await supabase
    .from("sesiones_clase")
    .select("id, empieza_en, plazas, estado, motivo_cancelacion, tipos_clase(nombre)")
    .gte("empieza_en", desde)
    .order("empieza_en")
    .limit(200);
  const clases = (clasesDatos ?? []) as unknown as Clase[];

  const porDia = new Map<string, Clase[]>();
  for (const c of clases) {
    const dia = claveDia(c.empieza_en);
    porDia.set(dia, [...(porDia.get(dia) ?? []), c]);
  }

  return (
    <main className={styles.pagina}>
      <header className={styles.barra}>
        <h1>Clases</h1>
        <Link href="/admin" className={styles.enlaceBarra}>
          ← Administración
        </Link>
      </header>

      <GenerarClases />

      <section className={styles.tarjeta}>
        <h2>Plazas y mínimo por tipo de clase</h2>
        <p className={styles.ayuda}>
          El mínimo es solo un aviso para ti (0 = sin aviso). Los cambios afectan a las
          clases que crees a partir de ahora.
        </p>
        {tipos.map((t) => (
          <FormularioTipo key={t.id} tipo={t} />
        ))}
      </section>

      <section className={styles.tarjeta}>
        <h2>Próximas clases ({clases.length})</h2>
        {clases.length === 0 && (
          <p className={styles.ayuda}>
            Todavía no hay clases. Pulsa «Crear clases» para generarlas.
          </p>
        )}
        {[...porDia.entries()].map(([dia, lista]) => (
          <div key={dia}>
            <h3 className={styles.dia}>{textoDia(lista[0].empieza_en)}</h3>
            <ul className={styles.lista}>
              {lista.map((c) => (
                <li key={c.id} className={styles.persona}>
                  <div className={styles.personaCabecera}>
                    <div>
                      <strong>
                        {textoHora(c.empieza_en)} · {c.tipos_clase?.nombre}
                      </strong>
                      <div className={styles.ayuda}>{c.plazas} plazas</div>
                    </div>
                    {c.estado === "cancelada" && (
                      <span className={styles.etiqueta}>Cancelada</span>
                    )}
                  </div>
                  <FilaClase
                    clase={{
                      id: c.id,
                      plazas: c.plazas,
                      cancelada: c.estado === "cancelada",
                      motivo: c.motivo_cancelacion,
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
