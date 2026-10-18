import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { claveDia, dentroDeHoras, haceHoras, textoDia, textoHora } from "@/lib/fechas";
import styles from "../admin.module.css";
import { FilaClase, FormularioAjustes, FormularioTipo, GenerarClases } from "./Controles";

export const metadata = { title: "Clases · Administración" };

type Tipo = { id: string; nombre: string; plazas_max: number; minimo_alumnos: number };
type Persona = { nombre: string | null; apellidos: string | null; email: string | null };
type Reserva = { id: string; estado: string; user_id: string; profiles: Persona | null };
type Clase = {
  id: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  motivo_cancelacion: string | null;
  tipos_clase: { nombre: string; minimo_alumnos: number } | null;
  reservas: Reserva[];
};

function nombreDe(p: Persona | null) {
  if (!p) return "(persona borrada)";
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

export default async function AdminClases() {
  const { supabase } = await requireAdmin();

  const { data: tiposDatos } = await supabase
    .from("tipos_clase")
    .select("id, nombre, plazas_max, minimo_alumnos")
    .order("nombre");
  const tipos = (tiposDatos ?? []) as Tipo[];

  const { data: ajustesDatos } = await supabase.from("ajustes").select("clave, valor");
  const ajuste = (clave: string) => ajustesDatos?.find((a) => a.clave === clave)?.valor;

  const { data: alumnosDatos } = await supabase
    .from("profiles")
    .select("id, nombre, apellidos, email")
    .eq("rol", "alumno")
    .order("nombre");
  const alumnos = ((alumnosDatos ?? []) as (Persona & { id: string })[]).map((a) => ({
    id: a.id,
    texto: nombreDe(a) + (a.nombre && a.email ? ` · ${a.email}` : ""),
  }));

  // Las clases de hoy en adelante (con un margen de unas horas).
  const desde = haceHoras(3);
  const { data: clasesDatos } = await supabase
    .from("sesiones_clase")
    .select(
      "id, empieza_en, plazas, estado, motivo_cancelacion, tipos_clase(nombre, minimo_alumnos), reservas(id, estado, user_id, profiles(nombre, apellidos, email))",
    )
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

      <FormularioAjustes
        horas={Number(ajuste("cancelacion_horas") ?? 2)}
        dias={Number(ajuste("reserva_dias_max") ?? 14)}
        ver={ajuste("ver_apuntados") !== "false"}
      />

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
              {lista.map((c) => {
                const cancelada = c.estado === "cancelada";
                const apuntados = c.reservas
                  .filter((r) => r.estado === "reservada")
                  .map((r) => ({
                    reservaId: r.id,
                    userId: r.user_id,
                    nombre: nombreDe(r.profiles),
                  }));
                const minimo = c.tipos_clase?.minimo_alumnos ?? 0;
                const faltan = minimo - apuntados.length;
                const alerta =
                  !cancelada && faltan > 0 && dentroDeHoras(c.empieza_en, 24);
                return (
                  <li key={c.id} className={styles.persona}>
                    <div className={styles.personaCabecera}>
                      <div>
                        <strong>
                          {textoHora(c.empieza_en)} · {c.tipos_clase?.nombre}
                        </strong>
                        <div className={styles.ayuda}>
                          {apuntados.length}/{c.plazas} plazas
                          {apuntados.length > 0 &&
                            ` · ${apuntados.map((a) => a.nombre).join(", ")}`}
                        </div>
                      </div>
                      {cancelada && <span className={styles.etiqueta}>Cancelada</span>}
                    </div>
                    {alerta && (
                      <p className={styles.alerta} role="status">
                        Faltan {faltan} para el mínimo ({minimo}). Decide tú si das la clase.
                      </p>
                    )}
                    <FilaClase
                      clase={{
                        id: c.id,
                        plazas: c.plazas,
                        cancelada,
                        motivo: c.motivo_cancelacion,
                        apuntados,
                        alumnos,
                      }}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
