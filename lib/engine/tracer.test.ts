import { describe, expect, it } from 'vitest';
import type { Cell, MarkSet, Primitive, SceneGraph } from '@/lib/engine/types';
import { MAX_STEPS, trace } from '@/lib/engine/tracer';

interface FakeState {
  values: Primitive[];
}

function makeState(length = 3): FakeState {
  return { values: Array.from({ length }, (_, i) => i) };
}

function toScene(state: FakeState, marks: MarkSet): SceneGraph {
  const cells: Cell[] = state.values.map((value, index) => ({
    id: `cell-${index}`,
    value,
    index,
    highlight: marks.get(index) ?? 'none',
  }));
  return { kind: 'linear', cells, pointers: [] };
}

function cellHighlights(scene: SceneGraph): string[] {
  if (scene.kind !== 'linear') throw new Error('expected linear scene');
  return scene.cells.map((c) => c.highlight);
}

describe('trace / Tracer', () => {
  it('applies staged marks to the scene captured by step(), then clears them', () => {
    const state = makeState();
    const result = trace(state, toScene, (s, t) => {
      t.mark(0, 'compare');
      t.step(0, 'first');
      t.step(1, 'second');
    });

    expect(cellHighlights(result.steps[0].scene)).toEqual(['compare', 'none', 'none']);
    expect(cellHighlights(result.steps[1].scene)).toEqual(['none', 'none', 'none']);
  });

  it('chains mark(...).mark(...) and applies both to the next step', () => {
    const state = makeState();
    const result = trace(state, toScene, (s, t) => {
      t.mark(0, 'compare').mark(1, 'compare');
      t.step(0, 'compare 0 and 1');
    });

    expect(cellHighlights(result.steps[0].scene)).toEqual(['compare', 'compare', 'none']);
  });

  it('clearMarks() drops staged marks without emitting a step', () => {
    const state = makeState();
    const result = trace(state, toScene, (s, t) => {
      t.mark(0, 'compare');
      t.clearMarks();
      t.step(0, 'no marks here');
    });

    expect(result.steps).toHaveLength(1);
    expect(cellHighlights(result.steps[0].scene)).toEqual(['none', 'none', 'none']);
  });

  it('accumulates metrics across steps, each step holding an independent snapshot', () => {
    const state = makeState();
    const result = trace(state, toScene, (s, t) => {
      t.step(0, 'a', {}, { comparisons: 1 });
      t.step(1, 'b', {}, { swaps: 2 });
    });

    expect(result.steps[0].metrics).toEqual({ comparisons: 1, swaps: 0, reads: 0, writes: 0 });
    expect(result.steps[1].metrics).toEqual({ comparisons: 1, swaps: 2, reads: 0, writes: 0 });

    // Mutating step 0's metrics must never affect step 1's.
    result.steps[0].metrics.comparisons = 999;
    expect(result.steps[1].metrics.comparisons).toBe(1);
  });

  it('defaults vars to {} and omits callStack unless supplied', () => {
    const state = makeState();
    const frame = { id: 'f1', label: 'main', vars: {} };
    const result = trace(state, toScene, (s, t) => {
      t.step(0, 'no vars, no call stack');
      t.step(1, 'with call stack', { i: 1 }, undefined, [frame]);
    });

    expect(result.steps[0].vars).toEqual({});
    expect('callStack' in result.steps[0]).toBe(false);

    expect(result.steps[1].vars).toEqual({ i: 1 });
    expect(result.steps[1].callStack).toEqual([frame]);
  });

  it('truncates at MAX_STEPS, sets truncated: true, and stops executing run after the aborting step()', () => {
    const state = makeState();
    let executedAfter = 0;

    const result = trace(state, toScene, (s, t) => {
      for (let i = 0; i < 6000; i++) {
        t.step(0, `step ${i}`);
        executedAfter++;
      }
    });

    expect(result.truncated).toBe(true);
    expect(result.steps).toHaveLength(MAX_STEPS);
    // The step() call that would push past MAX_STEPS aborts run immediately —
    // the code after it (the increment) never executes for that iteration.
    expect(executedAfter).toBe(MAX_STEPS);
  });

  it('does not truncate when the run emits exactly MAX_STEPS steps', () => {
    const state = makeState();
    const result = trace(state, toScene, (s, t) => {
      for (let i = 0; i < MAX_STEPS; i++) {
        t.step(0, `step ${i}`);
      }
    });

    expect(result.truncated).toBe(false);
    expect(result.steps).toHaveLength(MAX_STEPS);
  });

  it('propagates a real error thrown inside run out of trace, unchanged', () => {
    const state = makeState();
    expect(() =>
      trace(state, toScene, () => {
        throw new Error('boom');
      }),
    ).toThrow('boom');
  });
});
