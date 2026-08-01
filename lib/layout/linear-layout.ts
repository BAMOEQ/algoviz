import type { Cell } from '@/lib/engine/types';

export interface CellBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LinearLayout {
  boxes: CellBox[];
  width: number;
  height: number;
}

/**
 * Pure, deterministic left-to-right row layout for linear scenes (arrays, stacks, queues).
 * Same input -> identical output, every time. No React, no side effects.
 */
export function layoutLinear(
  cells: readonly Cell[],
  options?: { cellSize?: number; gap?: number },
): LinearLayout {
  const cellSize = options?.cellSize ?? 56;
  const gap = options?.gap ?? 8;

  const boxes: CellBox[] = cells.map((cell, index) => ({
    id: cell.id,
    x: index * (cellSize + gap),
    y: 0,
    width: cellSize,
    height: cellSize,
  }));

  const width = cells.length === 0 ? 0 : cells.length * cellSize + (cells.length - 1) * gap;

  return { boxes, width, height: cellSize };
}
