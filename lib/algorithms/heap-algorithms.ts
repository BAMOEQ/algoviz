import type { AlgorithmDef } from '@/lib/registry/types';
import { heapNodeId, outranks, type HeapState } from '@/lib/structures/heap';

/**
 * Floyd's bottom-up build. Starting from the last internal node rather than the root is what makes
 * this O(n) instead of O(n log n), and stepping through it shows why: most nodes sift barely at all.
 */
export const heapifyAlgorithm: AlgorithmDef<HeapState> = {
  id: 'heapify',
  name: 'Build Heap (Heapify)',
  description: "Floyd's bottom-up construction — O(n), not O(n log n).",
  pseudocode: [
    'for i = floor(n/2) - 1 down to 0',
    '  siftDown(i)',
    'siftDown(i)',
    '  pick the better of i and its children',
    '  if a child wins, swap and continue',
  ],
  run: (state, t) => {
    const n = state.values.length;

    if (n === 0) {
      t.step(0, 'The heap is empty — nothing to build.', {});
      return;
    }

    const start = Math.floor(n / 2) - 1;
    t.step(0, `Only the ${start + 1} internal node(s) can move — leaves are already heaps.`, { start });

    for (let i = start; i >= 0; i--) {
      t.mark(heapNodeId(i), 'active');
      t.step(1, `Sifting down from position ${i}, holding ${state.values[i]}.`, { i, value: state.values[i] });

      let index = i;
      for (;;) {
        const left = 2 * index + 1;
        const right = 2 * index + 2;
        let best = index;

        if (left < n) {
          t.mark(heapNodeId(index), 'compare').mark(heapNodeId(left), 'compare');
          t.step(3, `Compare ${state.values[index]} with left child ${state.values[left]}.`, { index, left }, { comparisons: 1 });
          if (outranks(state, state.values[left], state.values[best])) best = left;
        }

        if (right < n) {
          t.mark(heapNodeId(best), 'compare').mark(heapNodeId(right), 'compare');
          t.step(3, `Compare ${state.values[best]} with right child ${state.values[right]}.`, { index, right }, { comparisons: 1 });
          if (outranks(state, state.values[right], state.values[best])) best = right;
        }

        if (best === index) {
          t.mark(heapNodeId(index), 'visited');
          t.step(4, `Position ${index} already satisfies the heap property.`, { index });
          break;
        }

        [state.values[index], state.values[best]] = [state.values[best], state.values[index]];
        t.mark(heapNodeId(index), 'active').mark(heapNodeId(best), 'active');
        t.step(4, `Swapped down into position ${best}.`, { index: best }, { swaps: 1 });

        index = best;
      }
    }

    for (let i = 0; i < n; i++) t.mark(heapNodeId(i), 'visited');
    t.mark(heapNodeId(0), 'path');
    t.step(0, `Heap built — ${state.values[0]} is at the root.`, { root: state.values[0] });
  },
};

/**
 * Heapsort over the heap's own backing array: repeatedly swap the root to the end and shrink the
 * live region. The sorted tail is left marked so the boundary is visible as it grows.
 */
export const heapSortInPlace: AlgorithmDef<HeapState> = {
  id: 'heap-sort-in-place',
  name: 'Heapsort',
  description: 'Swaps the root to the end and shrinks the heap, sorting the array in place.',
  pseudocode: [
    'buildHeap()',
    'for end = n-1 down to 1',
    '  swap(0, end)',
    '  siftDown(0, end)',
  ],
  run: (state, t) => {
    const n = state.values.length;

    if (n < 2) {
      t.step(0, 'Fewer than two values — already sorted.', {});
      return;
    }

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      let index = i;
      for (;;) {
        const left = 2 * index + 1;
        const right = 2 * index + 2;
        let best = index;
        if (left < n && outranks(state, state.values[left], state.values[best])) best = left;
        if (right < n && outranks(state, state.values[right], state.values[best])) best = right;
        if (best === index) break;
        [state.values[index], state.values[best]] = [state.values[best], state.values[index]];
        index = best;
      }
    }

    for (let i = 0; i < n; i++) t.mark(heapNodeId(i), 'visited');
    t.step(0, `Built the initial heap — ${state.values[0]} is at the root.`, { root: state.values[0] }, { swaps: 0 });

    for (let end = n - 1; end > 0; end--) {
      for (let i = end + 1; i < n; i++) t.mark(heapNodeId(i), 'path');
      t.mark(heapNodeId(0), 'compare').mark(heapNodeId(end), 'compare');
      t.step(2, `Swap the root ${state.values[0]} with position ${end}.`, { end }, { swaps: 1 });

      [state.values[0], state.values[end]] = [state.values[end], state.values[0]];

      for (let i = end; i < n; i++) t.mark(heapNodeId(i), 'path');
      t.step(2, `${state.values[end]} is now in its final place. Live region is 0–${end - 1}.`, { end });

      let index = 0;
      for (;;) {
        const left = 2 * index + 1;
        const right = 2 * index + 2;
        let best = index;

        if (left < end) {
          if (outranks(state, state.values[left], state.values[best])) best = left;
        }
        if (right < end) {
          if (outranks(state, state.values[right], state.values[best])) best = right;
        }

        for (let i = end; i < n; i++) t.mark(heapNodeId(i), 'path');
        t.mark(heapNodeId(index), 'compare');
        t.step(3, `Sifting down from position ${index}.`, { index }, { comparisons: 1 });

        if (best === index) break;

        [state.values[index], state.values[best]] = [state.values[best], state.values[index]];
        index = best;
      }
    }

    for (let i = 0; i < n; i++) t.mark(heapNodeId(i), 'path');
    t.step(1, `Sorted: ${state.values.join(' ')}.`, { sorted: state.values.join(' ') });
  },
};
