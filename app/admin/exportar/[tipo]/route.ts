import { NextResponse } from "next/server";
import { filasAtletas } from "@/lib/informes";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Fila = Record<string, unknown>;

// Lee una tabla entera (de mil en mil filas).
async function leerTodo(tabla: string, seleccion = "*"): Promise<Fila[]> {
  const admin = createAdminClient();
  const filas: Fila[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await admin.from(tabla).select(seleccion).range(desde, desde + 999);
    if (error) throw new Error(error.message);
    const lote = (data ?? []) as unknown as Fila[];
    filas.push(...lote);
    if (lote.length < 1000) break;
  }
  return filas;
}

// Fechas legibles en hora de Madrid.
function fecha(valor: unknown): string {
  if (!valor) return "";
  const d = new Date(String(valor));
  if (Number.isNaN(d.getTime())) return String(valor);
  return d.toLocaleString("es-ES", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" });
}

function dinero(centimos: unknown): string {
  return (Number(centimos ?? 0) / 100).toFixed(2).replace(".", ",");
}

function celda(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

// CSV con «;» y BOM para que Excel en español lo abra bien con las tildes.
function aCsv(columnas: string[], filas: string[][]): string {
  return "﻿" + [columnas, ...filas].map((f) => f.map(celda).join(";")).join("\r\n");
}

async function construir(tipo: string): Promise<{ nombre: string; csv: string } | null> {
  if (tipo === "atletas") {
    const { columnas, filas } = await filasAtletas();
    return { nombre: "atletas", csv: aCsv(columnas, filas) };
  }

  const perfiles = await leerTodo("profiles");
  const porId = new Map(perfiles.map((p) => [String(p.id), p]));
  const persona = (id: unknown) => {
    const p = porId.get(String(id));
    return p ? [`${p.nombre ?? ""} ${p.apellidos ?? ""}`.trim(), String(p.email ?? ""), String(p.dni ?? "")] : ["(persona borrada)", "", ""];
  };

  if (tipo === "alumnos") {
    const servicios = await leerTodo("perfil_servicios");
    const de = (id: unknown) =>
      servicios
        .filter((s) => s.user_id === id)
        .map((s) => s.servicio)
        .join(" + ");
    return {
      nombre: "alumnos",
      csv: aCsv(
        ["Nombre", "Apellidos", "Correo", "Teléfono", "DNI", "Fecha de nacimiento", "Contacto de emergencia", "Teléfono de emergencia", "Servicios", "Rol", "Alta"],
        perfiles.map((p) => [
          String(p.nombre ?? ""),
          String(p.apellidos ?? ""),
          String(p.email ?? ""),
          String(p.telefono ?? ""),
          String(p.dni ?? ""),
          String(p.fecha_nacimiento ?? ""),
          String(p.contacto_emergencia_nombre ?? ""),
          String(p.contacto_emergencia_telefono ?? ""),
          de(p.id),
          String(p.rol ?? ""),
          fecha(p.creado_en),
        ]),
      ),
    };
  }

  if (tipo === "pagos") {
    const [pagos, bonos] = await Promise.all([leerTodo("pagos"), leerTodo("bonos", "id, tipo_bono_id, tipos_bono(nombre)")]);
    const bono = new Map(bonos.map((b) => [String(b.id), (b.tipos_bono as { nombre?: string } | null)?.nombre ?? ""]));
    return {
      nombre: "pagos",
      csv: aCsv(
        ["Fecha", "Persona", "Correo", "DNI", "Importe (€)", "Método", "Estado", "Bono", "Nota", "Pagado el"],
        pagos
          .sort((a, b) => String(b.creado_en).localeCompare(String(a.creado_en)))
          .map((p) => {
            const [nombre, correo, dni] = p.user_id ? persona(p.user_id) : [String(p.persona_nombre ?? "(persona borrada)"), "", String(p.persona_dni ?? "")];
            return [fecha(p.creado_en), nombre, correo, dni, dinero(p.importe_centimos), String(p.metodo ?? ""), String(p.estado ?? ""), bono.get(String(p.bono_id)) ?? "", String(p.nota ?? ""), fecha(p.pagado_en)];
          }),
      ),
    };
  }

  if (tipo === "bonos") {
    const bonos = await leerTodo("bonos", "*, tipos_bono(nombre)");
    return {
      nombre: "bonos",
      csv: aCsv(
        ["Persona", "Correo", "Bono", "Servicio", "Clases totales", "Clases restantes", "Estado", "Activo desde", "Caduca", "Comprado el", "Nota"],
        bonos.map((b) => {
          const [nombre, correo] = persona(b.user_id);
          return [nombre, correo, (b.tipos_bono as { nombre?: string } | null)?.nombre ?? "", String(b.servicio ?? ""), String(b.clases_total ?? ""), String(b.clases_restantes ?? ""), String(b.estado ?? ""), fecha(b.activo_desde), fecha(b.caduca_en), fecha(b.creado_en), String(b.nota ?? "")];
        }),
      ),
    };
  }

  if (tipo === "reservas") {
    const reservas = await leerTodo("reservas", "*, sesiones_clase(empieza_en, tipos_clase(nombre))");
    type Ses = { empieza_en?: string; tipos_clase?: { nombre?: string } | null } | null;
    return {
      nombre: "historial-de-clases",
      csv: aCsv(
        ["Fecha de la clase", "Clase", "Persona", "Correo", "Estado de la reserva", "Clase de prueba", "Clase devuelta al bono", "Reservada el", "Cancelada el"],
        reservas
          .sort((a, b) => String((b.sesiones_clase as Ses)?.empieza_en).localeCompare(String((a.sesiones_clase as Ses)?.empieza_en)))
          .map((r) => {
            const s = r.sesiones_clase as Ses;
            const [nombre, correo] = persona(r.user_id);
            return [fecha(s?.empieza_en), s?.tipos_clase?.nombre ?? "", nombre, correo, String(r.estado ?? ""), r.es_prueba ? "sí" : "no", r.clase_devuelta ? "sí" : "no", fecha(r.creado_en), fecha(r.cancelada_en)];
          }),
      ),
    };
  }

  if (tipo === "aceptaciones") {
    const filas = await leerTodo("consentimientos");
    return {
      nombre: "aceptaciones-legales",
      csv: aCsv(
        ["Persona", "Correo", "Documento", "Versión", "Aceptado el"],
        filas.map((c) => {
          const [nombre, correo] = persona(c.user_id);
          return [nombre, correo, String(c.tipo ?? ""), String(c.version ?? ""), fecha(c.aceptado_en)];
        }),
      ),
    };
  }

  return null;
}

export async function GET(_peticion: Request, contexto: { params: Promise<{ tipo: string }> }) {
  // Solo la administradora puede descargar datos.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No has iniciado sesión", { status: 401 });
  const { data: perfil } = await supabase.from("profiles").select("rol").eq("id", user.id).maybeSingle();
  if (perfil?.rol !== "admin") return new NextResponse("No autorizado", { status: 403 });

  const { tipo } = await contexto.params;
  const resultado = await construir(tipo).catch(() => null);
  if (!resultado) return new NextResponse("No encontrado", { status: 404 });

  const hoy = new Date().toISOString().slice(0, 10);
  return new NextResponse(resultado.csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${resultado.nombre}-${hoy}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
