import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import Avatar from "../../Avatar";
import { claveDia, dentroDeHoras, haceHoras, textoDia, textoHora } from "@/lib/fechas";
import styles from "../admin.module.css";
import BotonFoto from "../fotos/BotonFoto";
import { FilaClase, FormularioAjustes, FormularioTipo, NuevoTipo } from "./Controles";

export const metadata = { title: "Clases · Administración" };

type Tipo = {
  id: string;
  nombre: string;
  plazas_max: number;
  minimo_alumnos: number;
  plazas_prueba: number;
  duracion_min: number;
  activo: boolean;
  servicio: string;
  foto_url: string | null;
  color: string | null;
  color_texto: string | null;
  orden: number;
  lista_espera: boolean;
  reserva_dias_max: number | null;
  cancelacion_horas: number | null;
  creditos: number;
  descripcion: string | null;
  descripcion_en: string | null;
};
type Persona = { nombre: string | null; apellidos: string | null; email: string | null; foto_path?: string | null };
type Reserva = {
  id: string;
  estado: string;
  user_id: string;
  es_prueba: boolean;
  profiles: Persona | null;
};
type Espera = { id: string; creado_en: string; profiles: Persona | null };
type Clase = {
  id: string;
  empieza_en: string;
  plazas: number;
  plazas_prueba: number;
  estado: string;
  motivo_cancelacion: string | null;
  tipos_clase: { nombre: string; minimo_alumnos: number } | null;
  reservas: Reserva[];
  lista_espera: Espera[];
};

function nombreDe(p: Persona | null) {
  if (!p) return "(persona borrada)";
  return [p.nombre, p.apellidos].filter(Boolean).join(" ") || p.email || "(sin nombre)";
}

export default async function AdminClases() {
  const { supabase } = await requireAdmin();

  const { data: tiposDatos } = await supabase
    .from("tipos_clase")
    .select("id, nombre, plazas_max, minimo_alumnos, plazas_prueba, duracion_min, activo, servicio, foto_url, color, color_texto, orden, lista_espera, reserva_dias_max, cancelacion_horas, creditos, descripcion, descripcion_en")
    .order("orden")
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
      "id, empieza_en, plazas, plazas_prueba, estado, motivo_cancelacion, tipos_clase(nombre, minimo_alumnos), reservas(id, estado, user_id, es_prueba, profiles(nombre, apellidos, email, foto_path)), lista_espera(id, creado_en, profiles(nombre, apellidos, email))",
    )
    .gte("empieza_en", desde)
    .order("empieza_en")
    .limit(200);
  const clases = (clasesDatos ?? []) as unknown as Clase[];

  // Fotos de las personas apuntadas (privadas: enlaces temporales solo para esta pantalla).
  const rutasFotos = [
    ...new Set(
      clases.flatMap((c) =>
        c.reservas.filter((r) => r.estado === "reservada").map((r) => r.profiles?.foto_path ?? null),
      ),
    ),
  ].filter((r): r is string => !!r);
  const { data: firmadas } = rutasFotos.length
    ? await createAdminClient().storage.from("avatares").createSignedUrls(rutasFotos, 3600)
    : { data: [] };
  const fotoDe = (ruta: string | null | undefined) =>
    ruta ? (firmadas?.find((f) => f.path === ruta)?.signedUrl ?? null) : null;

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

      <section className={styles.tarjeta}>
        <h2>Publicar clases</h2>
        <p className={styles.ayuda}>
          Las clases no se crean solas. Prepara tu horario en <Link href="/admin/horarios">Horarios</Link> y allí
          eliges desde qué día hasta qué día publicarlas.
        </p>
      </section>

      <FormularioAjustes
        horas={Number(ajuste("cancelacion_horas") ?? 2)}
        horasIndividual={Number(ajuste("cancelacion_horas_individual") ?? 12)}
        dias={Number(ajuste("reserva_dias_max") ?? 14)}
        ver={ajuste("ver_apuntados") !== "false"}
      />

      <section className={styles.tarjeta}>
        <h2>Tipos de clase</h2>
        <p className={styles.ayuda}>
          Aquí cambias el nombre, las plazas, el mínimo y la duración de cada tipo, o lo desactivas. El
          mínimo es solo un aviso para ti (0 = sin aviso). Los cambios afectan a las clases que crees a
          partir de ahora. Los horarios (plantillas) están en{" "}
          <Link href="/admin/horarios">Horarios</Link>.
        </p>
        {tipos.map((t) => (
          <div key={t.id} className={styles.bloqueTipo}>
            <BotonFoto destino="tipo_clase" id={t.id} actual={t.foto_url} />
            <FormularioTipo tipo={t} />
          </div>
        ))}
        <NuevoTipo />
      </section>

      <section className={styles.tarjeta}>
        <h2>Próximas clases ({clases.length})</h2>
        {clases.length === 0 && (
          <p className={styles.ayuda}>
            Todavía no hay clases. Publícalas desde Horarios.
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
                    prueba: r.es_prueba,
                    foto: fotoDe(r.profiles?.foto_path),
                  }));
                const espera = [...c.lista_espera]
                  .sort((a, b) => a.creado_en.localeCompare(b.creado_en))
                  .map((e) => ({ esperaId: e.id, nombre: nombreDe(e.profiles) }));
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
                            ` · ${apuntados
                              .map((a) => a.nombre + (a.prueba ? " (prueba)" : ""))
                              .join(", ")}`}
                        </div>
                        {apuntados.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "8px 0" }}>
                            {apuntados.map((a) => (
                              <div key={a.reservaId} style={{ width: 60, textAlign: "center" }} title={a.nombre}>
                                <Avatar nombre={a.nombre} url={a.foto} tamano={48} />
                                <div style={{ fontSize: "0.72rem", lineHeight: 1.2, marginTop: 2 }}>
                                  {a.nombre.split(" ")[0]}
                                  {a.prueba && " (prueba)"}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {espera.length > 0 && (
                          <div className={styles.ayuda}>
                            Lista de espera: {espera.map((e) => e.nombre).join(", ")}
                          </div>
                        )}
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
                        plazasPrueba: c.plazas_prueba,
                        cancelada,
                        motivo: c.motivo_cancelacion,
                        apuntados,
                        espera,
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
