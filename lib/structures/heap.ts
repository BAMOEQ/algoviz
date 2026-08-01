import { heapifyAlgorithm, heapSortInPlace } from '@/lib/algorithms/heap-algorithms';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const HEAP_MAX = 63;

export interface HeapState {
  values: number[];
  kind: 'min' | 'max';
}

export function heapNodeId(index: number): string {
  return `heap-${index}`;
}

/** True when `child` should sit above `parent` for this heap's ordering. */
export function outranks(state: HeapState, child: number, parent: number): boolean {
  return state.kind === 'min' ? child < parent : child > parent;
}

export function siftUp(state: HeapState, from: number, onSwap?: (a: number, b: number) => void): void {
  let index = from;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (!outranks(state, state.values[index], state.values[parent])) break;
    [state.values[index], state.values[parent]] = [state.values[parent], state.values[index]];
    onSwap?.(index, parent);
    index = parent;
  }
}

export function siftDown(state: HeapState, from: number, size: number, onSwap?: (a: number, b: number) => void): void {
  let index = from;
  for (;;) {
    const left = 2 * index + 1;
    const right = 2 * index + 2;
    let best = index;

    if (left < size && outranks(state, state.values[left], state.values[best])) best = left;
    if (right < size && outranks(state, state.values[right], state.values[best])) best = right;
    if (best === index) break;

    [state.values[index], state.values[best]] = [state.values[best], state.values[index]];
    onSwap?.(index, best);
    index = best;
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export const heapStructure: StructureHandle = defineStructure<HeapState>({
  id: 'heap',
  name: 'Binary Heap',
  slug: 'binary-heap',
  category: 'tree',
  summary: 'A complete binary tree where every parent outranks its children, stored in an array.',
  create: () => ({ values: [], kind: 'min' }),
  seed: () => ({ values: [2, 5, 3, 11, 8, 6, 9], kind: 'min' }),
  clone: (state) => ({ values: [...state.values], kind: state.kind }),

  operations: [
    {
      id: 'insert',
      name: 'Insert',
      fields: [{ name: 'value', label: 'Value', type: 'number' }],
      validate: (state, args) => {
        if (!isFiniteNumber(args.value)) return 'Value must be a number.';
        if (state.values.length >= HEAP_MAX) return 'Heap is full — 63 values maximum.';
        return null;
      },
      run: (state, args, t) => {
        const value = args.value as number;

        state.values.push(value);
        let index = state.values.length - 1;

        t.mark(heapNodeId(index), 'inserted');
        t.step(0, `Added ${value} at the end, position ${index}.`, { value, index }, { writes: 1 });

        while (index > 0) {
          const parent = Math.floor((index - 1) / 2);

          t.mark(heapNodeId(index), 'compare').mark(heapNodeId(parent), 'compare');
          t.step(
            0,
            `Compare ${state.values[index]} with its parent ${state.values[parent]}.`,
            { index, parent },
            { comparisons: 1 },
          );

          if (!outranks(state, state.values[index], state.values[parent])) {
            t.mark(heapNodeId(index), 'path');
            t.step(0, `Heap property holds — ${value} settles at position ${index}.`, { index });
            return;
          }

          [state.values[index], state.values[parent]] = [state.values[parent], state.values[index]];
          t.mark(heapNodeId(index), 'active').mark(heapNodeId(parent), 'active');
          t.step(0, `Sift up: swapped into position ${parent}.`, { index: parent }, { swaps: 1 });

          index = parent;
        }

        t.mark(heapNodeId(0), 'path');
        t.step(0, `${value} sifted all the way to the root.`, { index: 0 });
      },
    },
    {
      id: 'extract',
      name: 'Extract',
      fields: [],
      validate: (state) => (state.values.length === 0 ? 'Heap is empty — insert a value first.' : null),
      run: (state, _args, t) => {
        const top = state.values[0];

        t.mark(heapNodeId(0), 'removed');
        t.step(0, `Extracting the ${state.kind === 'min' ? 'minimum' : 'maximum'}, ${top}.`, { value: top }, { reads: 1 });

        const last = state.values.pop() as number;
        if (state.values.length === 0) {
          t.step(0, `Heap is now empty.`, { value: top }, { writes: 1 });
          return;
        }

        state.values[0] = last;
        t.mark(heapNodeId(0), 'active');
        t.step(0, `Moved the last value, ${last}, to the root. Now sift it down.`, { value: last }, { writes: 1 });

        let index = 0;
        for (;;) {
          const left = 2 * index + 1;
          const right = 2 * index + 2;
          let best = index;

          if (left < state.values.length) {
            t.mark(heapNodeId(index), 'compare').mark(heapNodeId(left), 'compare');
            t.step(0, `Compare ${state.values[index]} with left child ${state.values[left]}.`, { index, left }, { comparisons: 1 });
            if (outranks(state, state.values[left], state.values[best])) best = left;
          }

          if (right < state.values.length) {
            t.mark(heapNodeId(best), 'compare').mark(heapNodeId(right), 'compare');
            t.step(0, `Compare ${state.values[best]} with right child ${state.values[right]}.`, { index, right }, { comparisons: 1 });
            if (outranks(state, state.values[right], state.values[best])) best = right;
          }

          if (best === index) {
            t.mark(heapNodeId(index), 'path');
            t.step(0, `Heap property restored. ${top} was removed.`, { removed: top });
            return;
          }

          [state.values[index], state.values[best]] = [state.values[best], state.values[index]];
          t.mark(heapNodeId(index), 'active').mark(heapNodeId(best), 'active');
          t.step(0, `Sift down: swapped into position ${best}.`, { index: best }, { swaps: 1 });

          index = best;
        }
      },
    },
    {
      id: 'peek',
      name: 'Peek',
      fields: [],
      validate: (state) => (state.values.length === 0 ? 'Heap is empty — insert a value first.' : null),
      run: (state, _args, t) => {
        t.mark(heapNodeId(0), 'active');
        t.step(
          0,
          `The root holds ${state.values[0]}, the ${state.kind === 'min' ? 'smallest' : 'largest'} value. Nothing is removed.`,
          { root: state.values[0] },
          { reads: 1 },
        );
      },
    },
    {
      id: 'toggleKind',
      name: 'Toggle min/max',
      fields: [],
      run: (state, _args, t) => {
        state.kind = state.kind === 'min' ? 'max' : 'min';

        t.step(0, `Switching to a ${state.kind}-heap — rebuilding to restore the invariant.`, { kind: state.kind });

        for (let i = Math.floor(state.values.length / 2) - 1; i >= 0; i--) {
          siftDown(state, i, state.values.length);
        }

        for (let i = 0; i < state.values.length; i++) t.mark(heapNodeId(i), 'visited');
        t.step(0, `Now a ${state.kind}-heap with ${state.values[0] ?? '—'} at the root.`, { kind: state.kind }, { writes: state.values.length });
      },
    },
  ],

  algorithms: [heapifyAlgorithm, heapSortInPlace],

  toScene: (state, marks) => {
    const nodes = state.values.map((value, index) => ({
      id: heapNodeId(index),
      value,
      highlight: marks.get(heapNodeId(index)) ?? 'none',
      label: String(index),
    }));

    const edges = state.values.flatMap((_value, index) => {
      const out: Array<{ id: string; from: string; to: string; highlight: 'none' }> = [];
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < state.values.length) {
        out.push({ id: `edge-${index}-L`, from: heapNodeId(index), to: heapNodeId(left), highlight: 'none' });
      }
      if (right < state.values.length) {
        out.push({ id: `edge-${index}-R`, from: heapNodeId(index), to: heapNodeId(right), highlight: 'none' });
      }
      return out;
    });

    return {
      kind: 'tree',
      nodes,
      edges: edges.map((edge) => ({ ...edge, highlight: marks.get(edge.id) ?? 'none' })),
    };
  },

  complexity: {
    rows: [
      { operation: 'peek', average: 'O(1)', worst: 'O(1)' },
      { operation: 'insert', average: 'O(log n)', worst: 'O(log n)' },
      { operation: 'extract', average: 'O(log n)', worst: 'O(log n)' },
      { operation: 'build heap', average: 'O(n)', worst: 'O(n)' },
      { operation: 'search', average: 'O(n)', worst: 'O(n)' },
    ],
    space: 'O(n)',
  },
});
