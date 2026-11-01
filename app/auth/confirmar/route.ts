import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { puedeRegistrarse } from "@/lib/registro";
import { createClient } from "@/lib/supabase/server";

// Páginas a las que puede llevar un enlace de correo (lista cerrada, por seguridad).
const PERMITIDAS = new Set(["/datos", "/crear-contrasena", "/inicio", "/cuenta"]);

// Destino según el tipo de enlace, cuando el correo no indica otro.
const POR_TIPO: Record<string, string> = {
  signup: "/datos",
  email: "/datos",
  invite: "/crear-contrasena",
  recovery: "/crear-contrasena",
  magiclink: "/inicio",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const codigo = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type");
  const siguiente = searchParams.get("next");

  const fallo = request.nextUrl.clone();
  fallo.pathname = "/entrar";
  fallo.search = "?error=enlace";

  const supabase = await createClient();
  let correcto = false;

  if (codigo) {
    // Formato de los correos de serie de Supabase.
    const { error } = await supabase.auth.exchangeCodeForSession(codigo);
    correcto = !error;
  } else if (tokenHash && tipo && tipo in POR_TIPO) {
    // Formato de las plantillas propias (se usará con el correo propio).
    const { error } = await supabase.auth.verifyOtp({
      type: tipo as EmailOtpType,
      token_hash: tokenHash,
    });
    correcto = !error;
  }

  if (!correcto) return NextResponse.redirect(fallo);

  // Registro cerrado: una cuenta nueva de Google sin el código del link de prueba se borra y no entra.
  try {
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (u && Date.now() - new Date(u.created_at).getTime() < 2 * 60 * 1000 && !(await puedeRegistrarse(searchParams.get("c")))) {
      const admin = createAdminClient();
      const { data: perfil } = await admin.from("profiles").select("rol").eq("id", u.id).maybeSingle();
      if (!perfil || perfil.rol === "invitado") {
        await supabase.auth.signOut();
        await admin.auth.admin.deleteUser(u.id);
        const cerrado = request.nextUrl.clone();
        cerrado.pathname = "/entrar";
        cerrado.search = "?error=cerrado";
        return NextResponse.redirect(cerrado);
      }
    }
  } catch {
    // Si no se puede comprobar, el acceso sigue igual.
  }

  // Cuenta nueva que llega desde el link de prueba gratuita: se anota (solo si se acaba de crear).
  if (searchParams.get("origen") === "prueba") {
    try {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (u && !u.user_metadata?.origen && Date.now() - new Date(u.created_at).getTime() < 15 * 60 * 1000) {
        await createAdminClient().auth.admin.updateUserById(u.id, { user_metadata: { ...u.user_metadata, origen: "prueba" } });
      }
    } catch {
      // Si no se puede anotar, el acceso sigue igual.
    }
  }

  const destino = request.nextUrl.clone();
  destino.pathname =
    siguiente && PERMITIDAS.has(siguiente)
      ? siguiente
      : ((tipo && POR_TIPO[tipo]) ?? "/datos");
  destino.search = "";
  return NextResponse.redirect(destino);
}
