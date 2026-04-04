import { useState } from "react";

interface Draggable {
  _id?: string;
  id?: string;
}

export const useDragDropReorder = <T extends string | Draggable>(
  initialItems: T[],
) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [items, setItems] = useState<T[]>(initialItems);

  const getId = (item: T): string => {
    if (typeof item === "string") return item;
    return (item._id || item.id) as string;
  };

  const handleDragStart = (id: string) => {
    setDraggingId(id);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    setItems((current) => {
      const fromIndex = current.findIndex((item) => getId(item) === draggingId);
      const toIndex = current.findIndex((item) => getId(item) === targetId);

      if (fromIndex === -1 || toIndex === -1) return current;

      const reordered = [...current];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered;
    });

    setDraggingId(null);
  };

  return {
    draggingId,
    items,
    handleDragStart,
    handleDragOver,
    handleDrop,
    setItems,
  };
};
