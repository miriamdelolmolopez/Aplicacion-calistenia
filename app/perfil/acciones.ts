"use server";

import { enviarCorreo } from "@/lib/email";
import { correoSolicitudBorrado } from "@/lib/plantillas-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type Resultado = { ok: boolean; codigo?: string };

const TIPOS_FOTO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_FOTO = 1024 * 1024; // 1 MB (el móvil ya la reduce a unos 50 KB)

async function persona() {
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  return user;
}

// Guarda la foto de la persona que llama (privada: solo se ve con enlaces temporales).
export async function subirFoto(formData: FormData): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const archivo = formData.get("foto");
  if (!(archivo instanceof File) || !(archivo.type in TIPOS_FOTO) || archivo.size === 0 || archivo.size > MAX_FOTO) {
    return { ok: false, codigo: "foto" };
  }

  const admin = createAdminClient();
  const { data: antes } = await admin.from("profiles").select("foto_path").eq("id", user.id).maybeSingle();

  const ruta = `${user.id}/${Date.now()}.${TIPOS_FOTO[archivo.type]}`;
  const { error } = await admin.storage
    .from("avatares")
    .upload(ruta, Buffer.from(await archivo.arrayBuffer()), { contentType: archivo.type });
  if (error) return { ok: false, codigo: "foto" };

  const { error: falloPerfil } = await admin.from("profiles").update({ foto_path: ruta }).eq("id", user.id);
  if (falloPerfil) {
    await admin.storage.from("avatares").remove([ruta]);
    return { ok: false, codigo: "general" };
  }
  if (antes?.foto_path) await admin.storage.from("avatares").remove([antes.foto_path]);
  return { ok: true };
}

export async function quitarFoto(): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const admin = createAdminClient();
  const { data: antes } = await admin.from("profiles").select("foto_path").eq("id", user.id).maybeSingle();
  await admin.from("profiles").update({ foto_path: null }).eq("id", user.id);
  if (antes?.foto_path) await admin.storage.from("avatares").remove([antes.foto_path]);
  return { ok: true };
}

// Enlaces temporales a las fotos de varias personas. Reglas:
//  · la propia persona y la administradora ven siempre la suya / todas;
//  · las alumnas actuales ven las de quien tenga la foto visible;
//  · las invitadas no ven las de nadie más.
export async function obtenerFotos(ids: string[]): Promise<Record<string, string>> {
  const user = await persona();
  if (!user) return {};

  const admin = createAdminClient();
  const { data: yo } = await admin.from("profiles").select("rol").eq("id", user.id).maybeSingle();
  if (!yo) return {};

  const pedidos = [...new Set(ids)].slice(0, 100);
  const { data } = await admin.from("profiles").select("id, foto_path, mostrar_foto").in("id", pedidos);

  const permitidas = (data ?? []).filter(
    (p) =>
      p.foto_path &&
      (p.id === user.id || yo.rol === "admin" || (yo.rol === "alumno" && p.mostrar_foto)),
  );
  if (permitidas.length === 0) return {};

  const { data: firmadas } = await admin.storage
    .from("avatares")
    .createSignedUrls(permitidas.map((p) => p.foto_path as string), 3600);

  const resultado: Record<string, string> = {};
  for (const p of permitidas) {
    const f = firmadas?.find((x) => x.path === p.foto_path);
    if (f?.signedUrl) resultado[p.id] = f.signedUrl;
  }
  return resultado;
}

// La profe (Miriam) con su foto, para las tarjetas de clase. La ve cualquier persona con sesión.
export async function obtenerProfe(): Promise<{ nombre: string; foto: string | null } | null> {
  if (!(await persona())) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("foto_path")
    .eq("rol", "admin")
    .order("creado_en")
    .limit(1)
    .maybeSingle();
  if (!data) return null;

  let foto: string | null = null;
  if (data.foto_path) {
    const { data: firmada } = await admin.storage.from("avatares").createSignedUrl(data.foto_path, 3600);
    foto = firmada?.signedUrl ?? null;
  }
  return { nombre: "Miriam", foto };
}

// La persona pide que se borre su cuenta; Miriam recibe un aviso y lo gestiona.
export async function pedirBorradoCuenta(): Promise<Resultado> {
  const user = await persona();
  if (!user) return { ok: false, codigo: "sesion" };

  const admin = createAdminClient();
  const { error } = await admin.from("solicitudes_borrado").insert({ user_id: user.id });
  if (error) return { ok: error.code === "23505" }; // ya había una pendiente

  const [{ data: yo }, { data: admins }] = await Promise.all([
    admin.from("profiles").select("nombre, apellidos, email").eq("id", user.id).maybeSingle(),
    admin.from("profiles").select("email").eq("rol", "admin"),
  ]);
  const nombre = [yo?.nombre, yo?.apellidos].filter(Boolean).join(" ") || "(sin nombre)";
  for (const a of admins ?? []) {
    if (a.email) await enviarCorreo(correoSolicitudBorrado({ para: a.email, nombre, correo: yo?.email ?? "" }));
  }
  return { ok: true };
}
