import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Páginas a las que puede llevar un enlace de correo (lista cerrada, por seguridad).
const PERMITIDAS = new Set(["/datos", "/crear-contrasena", "/cuenta"]);

// Destino según el tipo de enlace, cuando el correo no indica otro.
const POR_TIPO: Record<string, string> = {
  signup: "/datos",
  email: "/datos",
  invite: "/crear-contrasena",
  recovery: "/crear-contrasena",
  magiclink: "/cuenta",
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

  const destino = request.nextUrl.clone();
  destino.pathname =
    siguiente && PERMITIDAS.has(siguiente)
      ? siguiente
      : ((tipo && POR_TIPO[tipo]) ?? "/datos");
  destino.search = "";
  return NextResponse.redirect(destino);
}
