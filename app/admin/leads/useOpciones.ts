"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { actualizarElemento, crearElemento, eliminarElemento, ordenarElementos, type TablaLista } from "./accionesCatalogos";
import { PALETA, type ItemColor } from "./tipos";
import { moverElemento } from "./useArrastre";

// Todo lo que se puede hacer con una lista de opciones (etiquetas, tipos o estados): crear, cambiar nombre y color, eliminar y ordenar.
// Cada cambio se guarda al momento y la pantalla se actualiza.
export function useOpciones(tabla: TablaLista, iniciales: ItemColor[]) {
  const router = useRouter();
  const [items, setItems] = useState<ItemColor[]>(iniciales);
  const [error, setError] = useState("");

  const colorSiguiente = () => PALETA[(items.length + 1) % PALETA.length].valor;

  async function crear(nombre: string, color?: string): Promise<ItemColor | null> {
    setError("");
    const r = await crearElemento(tabla, nombre, color ?? colorSiguiente());
    if (!r.ok || !r.item) {
      setError(r.error ?? "No se ha podido crear.");
      return null;
    }
    setItems((l) => [...l, r.item!]);
    router.refresh();
    return r.item;
  }

  async function cambiar(id: string, cambios: { nombre?: string; color?: string }): Promise<boolean> {
    setError("");
    const anterior = items;
    setItems((l) => l.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
    const r = await actualizarElemento(tabla, id, cambios);
    if (!r.ok) {
      setItems(anterior);
      setError(r.error ?? "No se ha podido guardar.");
      return false;
    }
    router.refresh();
    return true;
  }

  async function eliminar(id: string): Promise<boolean> {
    setError("");
    const r = await eliminarElemento(tabla, id);
    if (!r.ok) {
      setError(r.error ?? "No se ha podido eliminar.");
      return false;
    }
    setItems((l) => l.filter((x) => x.id !== id));
    router.refresh();
    return true;
  }

  function mover(desde: number, hasta: number) {
    const nuevos = moverElemento(items, desde, hasta);
    if (nuevos === items) return;
    setItems(nuevos);
    ordenarElementos(
      tabla,
      nuevos.map((x) => x.id),
    ).then((r) => {
      if (!r.ok) setError(r.error ?? "No se ha podido guardar el orden.");
      else router.refresh();
    });
  }

  // Ordena la lista alfabéticamente (de la A a la Z o al revés) y lo deja guardado; después se puede seguir moviendo a mano.
  function ordenarAlfabeticamente(sentido: "az" | "za") {
    const nuevos = [...items].sort((a, b) => a.nombre.localeCompare(b.nombre, "es") * (sentido === "az" ? 1 : -1));
    setItems(nuevos);
    ordenarElementos(
      tabla,
      nuevos.map((x) => x.id),
    ).then((r) => {
      if (!r.ok) setError(r.error ?? "No se ha podido guardar el orden.");
      else router.refresh();
    });
  }

  return { items, error, crear, cambiar, eliminar, mover, ordenarAlfabeticamente };
}
