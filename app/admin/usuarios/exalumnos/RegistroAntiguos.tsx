import { createAdminClient } from "@/lib/supabase/admin";
import styles from "../../admin.module.css";
import FormularioPersona from "./FormularioPersona";
import ListaAntiguos, { type PersonaAntigua } from "./ListaAntiguos";
import { TIPOS_PERSONA } from "./tipos";

type Fila = { id: string; nombre: string | null; correo: string | null; dni: string | null; telefono: string | null; origen: string; tipos: string[] | null; tipo: string; bloquea_prueba: boolean; nota: string | null; creado_en: string };

// Las personas antiguas que no tienen cuenta: exalumnos/as (en Clientes) e invitados/as que no siguieron (en Invitados).
// Siguen sirviendo para avisar si alguien intenta repetir su clase de prueba gratis.
export default async function RegistroAntiguos({ grupo }: { grupo: "clientes" | "invitados" }) {
  const prefijo = grupo === "clientes" ? "exalumno_" : "invitado_";
  const { data } = await createAdminClient()
    .from("personas_registradas")
    .select("id, nombre, correo, dni, telefono, origen, tipo, tipos, bloquea_prueba, nota, creado_en")
    .order("creado_en", { ascending: false })
    .limit(1000);
  const personas: PersonaAntigua[] = ((data ?? []) as Fila[])
    .map((f) => ({ id: f.id, nombre: f.nombre, correo: f.correo, dni: f.dni, telefono: f.telefono, origen: f.origen, tipos: f.tipos && f.tipos.length > 0 ? f.tipos : [f.tipo], bloquea_prueba: f.bloquea_prueba, nota: f.nota, creado_en: f.creado_en }))
    .filter((p) => p.tipos.some((t) => t.startsWith(prefijo)));
  const tiposDelGrupo = TIPOS_PERSONA.map((t) => t.valor as string).filter((t) => t.startsWith(prefijo));

  return (
    <>
      <section className={styles.tarjeta}>
        <p className={styles.ayuda} style={{ margin: 0 }}>
          Personas que ya no tienen cuenta o nunca la crearon. Si alguien se registra con el mismo correo, DNI o teléfono que una de ellas y está marcada como «sin clase de prueba gratis», la app le dice que su cuenta ya consta y que lo confirme contigo.
        </p>
      </section>
      <ListaAntiguos personas={personas} tiposDelGrupo={tiposDelGrupo} textoVacio="Todavía no hay nadie aquí." />
      <details className={styles.tarjeta}>
        <summary style={{ cursor: "pointer", fontWeight: 500 }}>Añadir persona a mano</summary>
        <FormularioPersona />
      </details>
    </>
  );
}
