import type { SupabaseClient } from "@supabase/supabase-js";

// Día en que empieza la semana de entreno de una persona online (0 = lunes … 6 = domingo).
// Si todavía no existe la columna en la base de datos (SQL 100) o falla la lectura, se usa el lunes: nada se rompe.
export async function diaInicioSemana(supabase: SupabaseClient, userId: string): Promise<number> {
  try {
    const { data, error } = await supabase.from("profiles").select("dia_inicio_semana").eq("id", userId).maybeSingle();
    const dia = (data as { dia_inicio_semana?: number } | null)?.dia_inicio_semana;
    return !error && Number.isInteger(dia) && (dia as number) >= 0 && (dia as number) <= 6 ? (dia as number) : 0;
  } catch {
    return 0;
  }
}

export const NOMBRES_DIAS = {
  es: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
} as const;
