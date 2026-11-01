import { NextResponse } from "next/server";
import { puedeRegistrarse } from "@/lib/registro";

// Lo usa la pantalla de registro para saber si hay que enseñar el formulario o el aviso de «registro cerrado».
export async function GET(peticion: Request) {
  const codigo = new URL(peticion.url).searchParams.get("c");
  return NextResponse.json({ abierto: await puedeRegistrarse(codigo) }, { headers: { "Cache-Control": "no-store" } });
}
