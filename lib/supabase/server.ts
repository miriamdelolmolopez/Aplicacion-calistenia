import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente para el servidor (rutas internas). Lee y guarda la sesión en cookies.
export async function createClient() {
  const almacen = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return almacen.getAll();
        },
        setAll(lista) {
          try {
            lista.forEach(({ name, value, options }) =>
              almacen.set(name, value, options),
            );
          } catch {
            // Si se llama desde un componente de servidor no se pueden guardar
            // cookies; el proxy ya se encarga de renovar la sesión.
          }
        },
      },
    },
  );
}
