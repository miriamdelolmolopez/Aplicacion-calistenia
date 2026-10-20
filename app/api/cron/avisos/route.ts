import { NextResponse } from "next/server";
import { avisarMinimos } from "@/lib/avisos";
import { bonoPorCaducar, felicitarCumpleanos, mensajeTrasPrueba, recordatorioPrueba } from "@/lib/automatizaciones";

// Lo llama una vez al día el planificador de Vercel (ver vercel.json), que envía
// "Authorization: Bearer <CRON_SECRET>". Sin esa clave no hace nada.
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [minimos, bonos, recordatorios, tras, cumples] = await Promise.all([
    avisarMinimos(),
    bonoPorCaducar(),
    recordatorioPrueba(),
    mensajeTrasPrueba(),
    felicitarCumpleanos(),
  ]);
  return NextResponse.json({
    minimoNoAlcanzado: minimos,
    bonosPorCaducar: bonos,
    recordatoriosPrueba: recordatorios,
    mensajesTrasPrueba: tras,
    cumpleanos: cumples,
  });
}
