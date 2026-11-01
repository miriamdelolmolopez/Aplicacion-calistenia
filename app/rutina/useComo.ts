"use client";

import { useSyncExternalStore } from "react";

// «?como=<persona>»: Miriam mira la pantalla como la vería esa persona. En el servidor no hay dirección, así que vale vacío.
export function useComo(): string | null {
  return useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(location.search).get("como"),
    () => null,
  );
}
