import { describe, expect, it } from 'vitest';
import type { Cell } from '@/lib/engine/types';
import { layoutLinear } from './linear-layout';

function makeCells(n: number): Cell[] {
  return Array.from({ length: n }, (_, index) => ({
    id: `cell-${index}`,
    value: index,
    index,
    highlight: 'none' as const,
  }));
}

describe('layoutLinear', () => {
  it('is deterministic — the same input produces deep-equal output on repeat calls', () => {
    const cells = makeCells(5);
    const first = layoutLinear(cells);
    const second = layoutLinear(cells);
    expect(second).toEqual(first);
  });

  it('lays out cells left-to-right on one row using default cellSize 56 and gap 8', () => {
    const cells = makeCells(3);
    const layout = layoutLinear(cells);

    expect(layout.boxes).toEqual([
      { id: 'cell-0', x: 0, y: 0, width: 56, height: 56 },
      { id: 'cell-1', x: 64, y: 0, width: 56, height: 56 },
      { id: 'cell-2', x: 128, y: 0, width: 56, height: 56 },
    ]);
    expect(layout.width).toBe(56 * 3 + 8 * 2);
    expect(layout.height).toBe(56);
  });

  it('honors custom cellSize and gap options', () => {
    const cells = makeCells(3);
    const layout = layoutLinear(cells, { cellSize: 40, gap: 4 });

    expect(layout.boxes).toEqual([
      { id: 'cell-0', x: 0, y: 0, width: 40, height: 40 },
      { id: 'cell-1', x: 44, y: 0, width: 40, height: 40 },
      { id: 'cell-2', x: 88, y: 0, width: 40, height: 40 },
    ]);
    expect(layout.width).toBe(40 * 3 + 4 * 2);
    expect(layout.height).toBe(40);
  });

  it('produces non-overlapping boxes for every consecutive pair', () => {
    const cells = makeCells(6);
    const layout = layoutLinear(cells);

    for (let i = 0; i < layout.boxes.length - 1; i++) {
      const current = layout.boxes[i];
      const next = layout.boxes[i + 1];
      expect(current.x + current.width).toBeLessThanOrEqual(next.x);
    }
  });

  it('handles an empty cell list without throwing', () => {
    const layout = layoutLinear([]);
    expect(layout.boxes).toEqual([]);
    expect(layout.width).toBe(0);
  });

  it('preserves cell id as the box id, keyed by index, so motion can track elements across renders', () => {
    const cells = makeCells(2);
    const layout = layoutLinear(cells);
    expect(layout.boxes.map((b) => b.id)).toEqual(['cell-0', 'cell-1']);
  });
});
