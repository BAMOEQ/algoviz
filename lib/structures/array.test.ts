import { describe, expect, it } from 'vitest';
import type { ArrayState } from './array';
import { ARRAY_MAX, arrayStructure } from './array';

function cellsOf(scene: ReturnType<typeof arrayStructure.scene>): { value: unknown; highlight: string }[] {
  if (scene.kind !== 'linear') throw new Error('expected linear scene');
  return scene.cells.map((c) => ({ value: c.value, highlight: c.highlight }));
}

describe('arrayStructure metadata', () => {
  it('exposes the expected identity and category', () => {
    expect(arrayStructure.id).toBe('array');
    expect(arrayStructure.slug).toBe('array');
    expect(arrayStructure.name).toBe('Array');
    expect(arrayStructure.category).toBe('linear');
  });

  it('create() returns an empty array state', () => {
    expect(arrayStructure.create()).toEqual({ values: [] });
  });

  it('seed() returns the documented example instance', () => {
    expect(arrayStructure.seed()).toEqual({ values: [5, 2, 9, 1, 7, 3] });
  });

  it('clone() deep-copies values so mutating the clone leaves the original untouched', () => {
    const original = { values: [1, 2, 3] } as ArrayState;
    const clone = arrayStructure.clone(original) as ArrayState;
    clone.values.push(4);
    expect(original.values).toEqual([1, 2, 3]);
  });

  it('reports the documented complexity table', () => {
    expect(arrayStructure.complexity).toEqual({
      rows: [
        { operation: 'access', average: 'O(1)', worst: 'O(1)' },
        { operation: 'search', average: 'O(n)', worst: 'O(n)' },
        { operation: 'insert', average: 'O(n)', worst: 'O(n)' },
        { operation: 'append', average: 'O(1) amortized', worst: 'O(n)' },
        { operation: 'delete', average: 'O(n)', worst: 'O(n)' },
      ],
      space: 'O(n)',
    });
  });
});

describe('arrayStructure.scene', () => {
  it('assigns cell ids as cell-${index}, stable across two different states', () => {
    const sceneA = arrayStructure.scene({ values: [10, 20, 30] });
    const sceneB = arrayStructure.scene({ values: [99, 98] });
    if (sceneA.kind !== 'linear' || sceneB.kind !== 'linear') throw new Error('expected linear');

    expect(sceneA.cells.map((c) => c.id)).toEqual(['cell-0', 'cell-1', 'cell-2']);
    expect(sceneB.cells.map((c) => c.id)).toEqual(['cell-0', 'cell-1']);
  });

  it('defaults highlight to none and honors marks by index', () => {
    const marks = new Map([[1, 'compare' as const]]);
    const scene = arrayStructure.scene({ values: [1, 2, 3] }, marks);
    expect(cellsOf(scene)).toEqual([
      { value: 1, highlight: 'none' },
      { value: 2, highlight: 'compare' },
      { value: 3, highlight: 'none' },
    ]);
  });
});

describe('push', () => {
  it('happy path appends the value, marks it inserted, and records a write', () => {
    const { result, state } = arrayStructure.runOperation('push', { values: [1, 2] }, { value: 3 });
    expect(state).toEqual({ values: [1, 2, 3] });

    expect(result.steps).toHaveLength(2);
    const last = result.steps[result.steps.length - 1];
    expect(last.metrics).toEqual({ comparisons: 0, swaps: 0, reads: 0, writes: 1 });
    if (last.scene.kind === 'linear') {
      expect(last.scene.cells.at(-1)).toMatchObject({ value: 3, highlight: 'inserted' });
    }
  });

  it('rejects a push once the array is full, leaving state untouched', () => {
    const full: ArrayState = { values: Array.from({ length: ARRAY_MAX }, (_, i) => i) };
    const message = arrayStructure.validateOperation('push', full, { value: 1 });
    expect(message).toBe('Array is full — 60 values maximum.');
    expect(full.values).toHaveLength(ARRAY_MAX);
  });

  it('rejects a non-numeric value', () => {
    const message = arrayStructure.validateOperation('push', { values: [] }, { value: 'x' });
    expect(message).toBe('Value must be a number.');
  });

  it('accepts a valid push on a non-full array', () => {
    const message = arrayStructure.validateOperation('push', { values: [1] }, { value: 2 });
    expect(message).toBeNull();
  });

  it('checks argument shape before capacity — a bad value on a full array reports the shape error', () => {
    const full: ArrayState = { values: Array.from({ length: ARRAY_MAX }, (_, i) => i) };
    const message = arrayStructure.validateOperation('push', full, { value: 'x' });
    expect(message).toBe('Value must be a number.');
  });
});

describe('pop', () => {
  it('happy path removes the last value and records a read and a write', () => {
    const { result, state } = arrayStructure.runOperation('pop', { values: [1, 2, 3] }, {});
    expect(state).toEqual({ values: [1, 2] });

    const last = result.steps[result.steps.length - 1];
    expect(last.metrics).toEqual({ comparisons: 0, swaps: 0, reads: 1, writes: 1 });

    const first = result.steps[0];
    if (first.scene.kind === 'linear') {
      expect(first.scene.cells.at(-1)).toMatchObject({ value: 3, highlight: 'removed' });
    }
  });

  it('rejects popping an empty array', () => {
    const message = arrayStructure.validateOperation('pop', { values: [] }, {});
    expect(message).toBe('Array is empty — nothing to pop.');
  });
});

describe('get', () => {
  it('happy path reads the value without mutating state', () => {
    const { result, state } = arrayStructure.runOperation('get', { values: [5, 6, 7] }, { index: 1 });
    expect(state).toEqual({ values: [5, 6, 7] });

    const last = result.steps[result.steps.length - 1];
    expect(last.metrics).toEqual({ comparisons: 0, swaps: 0, reads: 1, writes: 0 });
    if (last.scene.kind === 'linear') {
      expect(last.scene.cells[1]).toMatchObject({ value: 6, highlight: 'active' });
    }
  });

  it('rejects an out-of-range index with the exact documented message', () => {
    const seed = arrayStructure.seed() as ArrayState; // [5, 2, 9, 1, 7, 3] — valid indices 0-5
    const message = arrayStructure.validateOperation('get', seed, { index: 7 });
    expect(message).toBe('Index 7 is out of range (0–5).');
  });

  it('rejects a non-integer index', () => {
    const message = arrayStructure.validateOperation('get', { values: [1, 2, 3] }, { index: 1.5 });
    expect(message).toBe('Index must be a whole number.');
  });

  it('rejects reading from an empty array with a message that says how to fix it', () => {
    const message = arrayStructure.validateOperation('get', { values: [] }, { index: 0 });
    expect(message).toBe('Array is empty — push a value first.');
  });

  it('checks index shape before emptiness — a non-integer index on an empty array reports the shape error', () => {
    const message = arrayStructure.validateOperation('get', { values: [] }, { index: 1.5 });
    expect(message).toBe('Index must be a whole number.');
  });
});

describe('set', () => {
  it('happy path overwrites the value at the index and records a read and a write', () => {
    const { result, state } = arrayStructure.runOperation('set', { values: [5, 6, 7] }, { index: 1, value: 42 });
    expect(state).toEqual({ values: [5, 42, 7] });

    const last = result.steps[result.steps.length - 1];
    expect(last.metrics).toEqual({ comparisons: 0, swaps: 0, reads: 1, writes: 1 });
    if (last.scene.kind === 'linear') {
      expect(last.scene.cells[1]).toMatchObject({ value: 42, highlight: 'active' });
    }
  });

  it('rejects an out-of-range index, leaving state untouched', () => {
    const state: ArrayState = { values: [1, 2, 3] };
    const message = arrayStructure.validateOperation('set', state, { index: 9, value: 1 });
    expect(message).toBe('Index 9 is out of range (0–2).');
    expect(state.values).toEqual([1, 2, 3]);
  });

  it('rejects a non-numeric value', () => {
    const message = arrayStructure.validateOperation('set', { values: [1, 2, 3] }, { index: 0, value: 'x' });
    expect(message).toBe('Value must be a number.');
  });

  it('rejects writing to an empty array with a message that says how to fix it', () => {
    const message = arrayStructure.validateOperation('set', { values: [] }, { index: 0, value: 1 });
    expect(message).toBe('Array is empty — push a value first.');
  });

  it('checks argument shape before emptiness or range — bad index wins over an empty array', () => {
    const message = arrayStructure.validateOperation('set', { values: [] }, { index: 1.5, value: 1 });
    expect(message).toBe('Index must be a whole number.');
  });
});

describe('insertAt', () => {
  it('happy path shifts values right and marks the new cell inserted', () => {
    const { result, state } = arrayStructure.runOperation(
      'insertAt',
      { values: [1, 2, 3] },
      { index: 1, value: 99 },
    );
    expect(state).toEqual({ values: [1, 99, 2, 3] });

    const last = result.steps[result.steps.length - 1];
    expect(last.metrics).toEqual({ comparisons: 0, swaps: 0, reads: 0, writes: 3 });
    if (last.scene.kind === 'linear') {
      expect(last.scene.cells[1]).toMatchObject({ value: 99, highlight: 'inserted' });
    }
  });

  it('allows inserting at the end (index === length)', () => {
    const message = arrayStructure.validateOperation('insertAt', { values: [1, 2, 3] }, { index: 3, value: 9 });
    expect(message).toBeNull();
  });

  it('rejects an out-of-range index', () => {
    const message = arrayStructure.validateOperation('insertAt', { values: [1, 2, 3] }, { index: 4, value: 9 });
    expect(message).toBe('Index 4 is out of range (0–3).');
  });

  it('rejects insertion once the array is full', () => {
    const full: ArrayState = { values: Array.from({ length: ARRAY_MAX }, (_, i) => i) };
    const message = arrayStructure.validateOperation('insertAt', full, { index: 0, value: 1 });
    expect(message).toBe('Array is full — 60 values maximum.');
  });

  it('checks argument shape before capacity — a bad index on a full array reports the shape error, matching push', () => {
    const full: ArrayState = { values: Array.from({ length: ARRAY_MAX }, (_, i) => i) };
    const message = arrayStructure.validateOperation('insertAt', full, { index: 1.5, value: 1 });
    expect(message).toBe('Index must be a whole number.');
  });
});

describe('removeAt', () => {
  it('happy path removes the value at the index and shifts the rest left', () => {
    const { result, state } = arrayStructure.runOperation('removeAt', { values: [1, 2, 3] }, { index: 1 });
    expect(state).toEqual({ values: [1, 3] });

    const first = result.steps[0];
    if (first.scene.kind === 'linear') {
      expect(first.scene.cells[1]).toMatchObject({ value: 2, highlight: 'removed' });
    }
  });

  it('rejects removal from an empty array', () => {
    const message = arrayStructure.validateOperation('removeAt', { values: [] }, { index: 0 });
    expect(message).toBe('Array is empty — nothing to remove.');
  });

  it('rejects an out-of-range index', () => {
    const message = arrayStructure.validateOperation('removeAt', { values: [1, 2, 3] }, { index: 3 });
    expect(message).toBe('Index 3 is out of range (0–2).');
  });
});
