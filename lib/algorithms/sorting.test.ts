import { describe, expect, it } from 'vitest';
import { trace } from '@/lib/engine/tracer';
import type { MarkSet, SceneGraph } from '@/lib/engine/types';
import type { ArrayState } from '@/lib/structures/array';
import { bubbleSort } from './sorting';

// Kept local and minimal (mirrors lib/engine/tracer.test.ts) so this file tests bubbleSort's own
// behavior in isolation, rather than coupling to lib/structures/array.ts's toScene implementation.
function toScene(state: ArrayState, marks: MarkSet): SceneGraph {
  return {
    kind: 'linear',
    cells: state.values.map((value, index) => ({
      id: `cell-${index}`,
      value,
      index,
      highlight: marks.get(index) ?? 'none',
    })),
    pointers: [],
  };
}

function run(values: number[]) {
  const state: ArrayState = { values };
  return trace(state, toScene, bubbleSort.run);
}

describe('bubbleSort', () => {
  it('golden trace: [3, 1, 2] sorts in exactly 8 steps with 3 comparisons', () => {
    const result = run([3, 1, 2]);

    expect(result.truncated).toBe(false);
    expect(result.steps).toHaveLength(8);

    const last = result.steps[result.steps.length - 1];
    expect(last.scene.kind).toBe('linear');
    if (last.scene.kind === 'linear') {
      expect(last.scene.cells.map((c) => c.value)).toEqual([1, 2, 3]);
    }
    expect(last.metrics.comparisons).toBe(3);
    expect(last.metrics.swaps).toBe(2);

    expect(result.steps[0].narration).toBe('Begin pass 1.');
    expect(last.narration).toBe('Begin pass 3.');
  });

  it('names the actual compared values in narration, flagging swaps', () => {
    const result = run([3, 1, 2]);
    expect(result.steps[1].narration).toBe('Compare 3 and 1 — swap.');
    expect(result.steps[3].narration).toBe('Compare 3 and 2 — swap.');
    expect(result.steps[6].narration).toBe('Compare 1 and 2.');
  });

  it('performs the same number of comparisons and zero swaps on an already-sorted array', () => {
    const result = run([1, 2, 3]);
    const last = result.steps[result.steps.length - 1];
    expect(last.metrics.comparisons).toBe(3);
    expect(last.metrics.swaps).toBe(0);
    if (last.scene.kind === 'linear') {
      expect(last.scene.cells.map((c) => c.value)).toEqual([1, 2, 3]);
    }
  });

  it('produces a valid, non-throwing trace for an empty array', () => {
    const result = run([]);
    expect(result.truncated).toBe(false);
    expect(result.steps).toEqual([]);
  });

  it('produces a valid, non-throwing trace for a single-element array', () => {
    const result = run([1]);
    expect(result.truncated).toBe(false);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].metrics).toEqual({ comparisons: 0, swaps: 0, reads: 0, writes: 0 });
    if (result.steps[0].scene.kind === 'linear') {
      expect(result.steps[0].scene.cells.map((c) => c.value)).toEqual([1]);
    }
  });

  it('every step.line is a valid index into bubbleSort.pseudocode', () => {
    const result = run([5, 4, 3, 2, 1]);
    for (const step of result.steps) {
      expect(step.line).toBeGreaterThanOrEqual(0);
      expect(step.line).toBeLessThan(bubbleSort.pseudocode.length);
    }
  });
});
