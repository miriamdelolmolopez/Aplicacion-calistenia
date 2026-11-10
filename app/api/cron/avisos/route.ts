import { NextResponse } from "next/server";
import { avisarMinimos } from "@/lib/avisos";
import { avisarDiaDeEntreno } from "@/lib/diasEntreno";
import { ejecutarReglas } from "@/lib/reglas";
import { createAdminClient } from "@/lib/supabase/admin";
import { aniversarioAlumna, bienvenidaAlumna, bonoAgotado, bonoPorCaducar, echamosMenos, felicitarCumpleanos, avisarAdminBonosPorCaducar, mensajeTrasPrueba, recordatorioClase, recordatorioPrueba } from "@/lib/automatizaciones";

// Lo llama una vez al día el planificador de Vercel (ver vercel.json), que envía
// "Authorization: Bearer <CRON_SECRET>". Sin esa clave no hace nada.
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Se ponen al día los bonos que han caducado o se han agotado.
  await createAdminClient().rpc("refrescar_bonos");

  const propias = await ejecutarReglas();
  const diasEntreno = await avisarDiaDeEntreno().catch(() => 0);
  const [minimos, bonos, recordatorios, tras, cumples, menos, bienvenidas, recordatoriosClase, agotados, aniversarios, avisosCaducanAdmin] = await Promise.all([
    avisarMinimos(),
    bonoPorCaducar(),
    recordatorioPrueba(),
    mensajeTrasPrueba(),
    felicitarCumpleanos(),
    echamosMenos(),
    bienvenidaAlumna(),
    recordatorioClase(),
    bonoAgotado(),
    aniversarioAlumna(),
    avisarAdminBonosPorCaducar(),
  ]);
  return NextResponse.json({
    minimoNoAlcanzado: minimos,
    bonosPorCaducar: bonos,
    recordatoriosPrueba: recordatorios,
    mensajesTrasPrueba: tras,
    cumpleanos: cumples,
    echamosDeMenos: menos,
    bienvenidas,
    recordatoriosClase,
    bonosAgotados: agotados,
    aniversarios,
    avisosCaducanAdmin,
    automatizacionesPropias: propias,
    avisosDiaDeEntreno: diasEntreno,
  });
}
