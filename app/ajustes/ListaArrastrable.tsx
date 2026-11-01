"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";

function Fila({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "6px 10px",
        background: "var(--blanco)",
        border: "1px solid var(--linea)",
        borderRadius: 14,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 2 : undefined,
        position: "relative",
      }}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para cambiar el orden"
        style={{ flex: "none", width: 36, height: 44, font: "inherit", fontSize: "1.2rem", color: "var(--secundario)", background: "none", border: 0, cursor: "grab", touchAction: "none" }}
      >
        ⠿
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

// Lista que se ordena arrastrando (con el dedo, el ratón o el teclado).
export default function ListaArrastrable({ elementos, alOrdenar }: { elementos: { id: string; contenido: ReactNode }[]; alOrdenar: (ids: string[]) => void }) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = elementos.map((e) => e.id);

  function alSoltar(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const de = ids.indexOf(String(e.active.id));
    const a = ids.indexOf(String(e.over.id));
    if (de < 0 || a < 0) return;
    alOrdenar(arrayMove(ids, de, a));
  }

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {elementos.map((e) => (
            <Fila key={e.id} id={e.id}>
              {e.contenido}
            </Fila>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
