import { NextResponse } from "next/server";
import { avisarBonosPorCaducar, avisarMinimos } from "@/lib/avisos";

// Lo llama una vez al día el planificador de Vercel (ver vercel.json), que envía
// "Authorization: Bearer <CRON_SECRET>". Sin esa clave no hace nada.
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [bonos, minimos] = await Promise.all([avisarBonosPorCaducar(), avisarMinimos()]);
  return NextResponse.json({ bonosPorCaducar: bonos, minimoNoAlcanzado: minimos });
}
