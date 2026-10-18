import { createBrowserClient } from "@supabase/ssr";

// Cliente para las pantallas del navegador. Solo usa la clave pública.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
