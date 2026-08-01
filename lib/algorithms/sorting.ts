import type { AlgorithmDef } from '@/lib/registry/types';
import type { ArrayState } from '@/lib/structures/array';

// One exported AlgorithmDef per algorithm, no shared mutable module state, no barrel object —
// later agents append their own `export const xSort: AlgorithmDef<ArrayState> = {...}` below
// without touching this one.

/**
 * Classic bubble sort, early-exit-free so step counts stay predictable across runs: every pass
 * runs its full inner loop regardless of whether the array is already sorted.
 */
export const bubbleSort: AlgorithmDef<ArrayState> = {
  id: 'bubble-sort',
  name: 'Bubble Sort',
  description: 'Repeatedly swaps adjacent out-of-order pairs until the array is sorted.',
  pseudocode: [
    'for i = 0 to n-1',           // 0
    '  for j = 0 to n-i-2',       // 1
    '    if a[j] > a[j+1]',       // 2
    '      swap(a[j], a[j+1])',   // 3
  ],
  run: (state, t) => {
    const arr = state.values;
    const n = arr.length;

    for (let i = 0; i < n; i++) {
      t.step(0, `Begin pass ${i + 1}.`, { i });

      for (let j = 0; j < n - i - 1; j++) {
        const a = arr[j];
        const b = arr[j + 1];
        const willSwap = a > b;

        t.mark(j, 'compare').mark(j + 1, 'compare');
        t.step(
          2,
          `Compare ${a} and ${b}${willSwap ? ' — swap.' : '.'}`,
          { i, j },
          { comparisons: 1 },
        );

        if (willSwap) {
          arr[j] = b;
          arr[j + 1] = a;
          t.mark(j, 'active').mark(j + 1, 'active');
          t.step(3, `Swapped — array is now ${arr.join(', ')}.`, { i, j }, { swaps: 1 });
        }
      }
    }
  },
};

/**
 * Insertion sort: keeps a sorted prefix and slides each new value left into place. The sorted
 * region is marked `visited` every step so the boundary between sorted and unsorted is visible.
 */
export const insertionSort: AlgorithmDef<ArrayState> = {
  id: 'insertion-sort',
  name: 'Insertion Sort',
  description: 'Grows a sorted prefix by sliding each next value back into position.',
  pseudocode: [
    'for i = 1 to n-1',
    '  key = a[i], j = i-1',
    '  while j >= 0 and a[j] > key',
    '    a[j+1] = a[j], j = j-1',
    '  a[j+1] = key',
  ],
  run: (state, t) => {
    const arr = state.values;
    const n = arr.length;

    for (let i = 1; i < n; i++) {
      const key = arr[i];

      for (let k = 0; k < i; k++) t.mark(k, 'visited');
      t.mark(i, 'active');
      t.step(1, `Take ${key} from index ${i} and find its place in the sorted prefix.`, { i, key }, { reads: 1 });

      let j = i - 1;

      while (j >= 0 && arr[j] > key) {
        for (let k = 0; k < i; k++) t.mark(k, 'visited');
        t.mark(j, 'compare');
        t.step(2, `Is ${arr[j]} greater than ${key}? Yes — shift it right.`, { j, key }, { comparisons: 1 });

        arr[j + 1] = arr[j];
        j -= 1;

        for (let k = 0; k <= i; k++) t.mark(k, 'visited');
        t.mark(j + 1, 'active');
        t.step(3, `Shifted. The gap is now at index ${j + 1}.`, { j }, { writes: 1 });
      }

      if (j >= 0) {
        for (let k = 0; k < i; k++) t.mark(k, 'visited');
        t.mark(j, 'compare');
        t.step(2, `Is ${arr[j]} greater than ${key}? No — ${key} belongs here.`, { j, key }, { comparisons: 1 });
      }

      arr[j + 1] = key;

      for (let k = 0; k <= i; k++) t.mark(k, 'visited');
      t.mark(j + 1, 'inserted');
      t.step(4, `Placed ${key} at index ${j + 1}.`, { i, key }, { writes: 1 });
    }

    for (let k = 0; k < n; k++) t.mark(k, 'path');
    t.step(0, `Sorted: ${arr.join(' ')}.`, { sorted: arr.join(' ') });
  },
};

/**
 * Selection sort: scans for the minimum of the unsorted suffix, then swaps it into place. Exactly
 * n-1 swaps regardless of input, which is its one practical virtue.
 */
export const selectionSort: AlgorithmDef<ArrayState> = {
  id: 'selection-sort',
  name: 'Selection Sort',
  description: 'Finds the smallest remaining value and swaps it into the next position.',
  pseudocode: [
    'for i = 0 to n-2',
    '  min = i',
    '  for j = i+1 to n-1',
    '    if a[j] < a[min]: min = j',
    '  swap(a[i], a[min])',
  ],
  run: (state, t) => {
    const arr = state.values;
    const n = arr.length;

    for (let i = 0; i < n - 1; i++) {
      let min = i;

      for (let k = 0; k < i; k++) t.mark(k, 'visited');
      t.mark(i, 'active');
      t.step(1, `Looking for the smallest value in indices ${i}–${n - 1}.`, { i, min });

      for (let j = i + 1; j < n; j++) {
        for (let k = 0; k < i; k++) t.mark(k, 'visited');
        t.mark(min, 'active').mark(j, 'compare');
        t.step(3, `Is ${arr[j]} smaller than the current minimum ${arr[min]}?`, { j, min }, { comparisons: 1, reads: 1 });

        if (arr[j] < arr[min]) {
          min = j;
          for (let k = 0; k < i; k++) t.mark(k, 'visited');
          t.mark(min, 'active');
          t.step(3, `Yes — ${arr[min]} at index ${min} is the new minimum.`, { min });
        }
      }

      if (min !== i) {
        [arr[i], arr[min]] = [arr[min], arr[i]];
        for (let k = 0; k <= i; k++) t.mark(k, 'visited');
        t.mark(i, 'inserted');
        t.step(4, `Swapped ${arr[i]} into index ${i}.`, { i, min }, { swaps: 1 });
      } else {
        for (let k = 0; k <= i; k++) t.mark(k, 'visited');
        t.step(4, `${arr[i]} is already the smallest — no swap needed.`, { i });
      }
    }

    for (let k = 0; k < n; k++) t.mark(k, 'path');
    t.step(0, `Sorted: ${arr.join(' ')}.`, { sorted: arr.join(' ') });
  },
};

/**
 * Merge sort, bottom-up so the whole thing stays iterative and every step maps to a visible run
 * of the array rather than to a recursion frame that has no on-screen presence.
 */
export const mergeSort: AlgorithmDef<ArrayState> = {
  id: 'merge-sort',
  name: 'Merge Sort',
  description: 'Merges adjacent sorted runs, doubling the run length each pass.',
  pseudocode: [
    'width = 1',
    'while width < n',
    '  for each pair of runs of size width',
    '    merge them into one sorted run',
    '  width = width * 2',
  ],
  run: (state, t) => {
    const arr = state.values;
    const n = arr.length;

    if (n < 2) {
      t.step(0, 'Fewer than two values — already sorted.', {});
      return;
    }

    for (let width = 1; width < n; width *= 2) {
      t.step(1, `Merging runs of length ${width}.`, { width });

      for (let left = 0; left < n; left += width * 2) {
        const mid = Math.min(left + width, n);
        const right = Math.min(left + width * 2, n);
        if (mid >= right) continue;

        for (let k = left; k < mid; k++) t.mark(k, 'compare');
        for (let k = mid; k < right; k++) t.mark(k, 'active');
        t.step(2, `Merging [${arr.slice(left, mid).join(' ')}] with [${arr.slice(mid, right).join(' ')}].`, {
          left,
          mid,
          right,
        });

        const merged: number[] = [];
        let i = left;
        let j = mid;

        while (i < mid && j < right) {
          t.mark(i, 'compare').mark(j, 'compare');
          t.step(3, `Compare ${arr[i]} and ${arr[j]} — take the smaller.`, { i, j }, { comparisons: 1, reads: 2 });
          merged.push(arr[i] <= arr[j] ? arr[i++] : arr[j++]);
        }
        while (i < mid) merged.push(arr[i++]);
        while (j < right) merged.push(arr[j++]);

        for (let k = 0; k < merged.length; k++) arr[left + k] = merged[k];

        for (let k = left; k < right; k++) t.mark(k, 'inserted');
        t.step(3, `Merged run is now [${merged.join(' ')}].`, { left, right }, { writes: merged.length });
      }
    }

    for (let k = 0; k < n; k++) t.mark(k, 'path');
    t.step(0, `Sorted: ${arr.join(' ')}.`, { sorted: arr.join(' ') });
  },
};

/**
 * Quicksort with Lomuto partitioning and a last-element pivot. The pivot is marked `active` for
 * the whole partition so its role stays legible while the boundary walks past it.
 */
export const quickSort: AlgorithmDef<ArrayState> = {
  id: 'quick-sort',
  name: 'Quick Sort',
  description: 'Partitions around a pivot, then sorts each side of it.',
  pseudocode: [
    'quicksort(lo, hi)',
    '  if lo >= hi: return',
    '  p = partition(lo, hi)',
    '  quicksort(lo, p-1)',
    '  quicksort(p+1, hi)',
    'partition: pivot = a[hi]; slide smaller values left',
  ],
  run: (state, t) => {
    const arr = state.values;
    const n = arr.length;

    if (n < 2) {
      t.step(1, 'Fewer than two values — already sorted.', {});
      return;
    }

    const settled = new Set<number>();

    const partition = (lo: number, hi: number): number => {
      const pivot = arr[hi];

      for (const k of settled) t.mark(k, 'path');
      t.mark(hi, 'active');
      t.step(5, `Partitioning ${lo}–${hi} around the pivot ${pivot}.`, { lo, hi, pivot }, { reads: 1 });

      let boundary = lo;

      for (let j = lo; j < hi; j++) {
        for (const k of settled) t.mark(k, 'path');
        t.mark(hi, 'active').mark(j, 'compare');
        t.step(5, `Is ${arr[j]} less than the pivot ${pivot}?`, { j, pivot }, { comparisons: 1 });

        if (arr[j] < pivot) {
          if (boundary !== j) {
            [arr[boundary], arr[j]] = [arr[j], arr[boundary]];
            for (const k of settled) t.mark(k, 'path');
            t.mark(hi, 'active').mark(boundary, 'inserted');
            t.step(5, `Yes — swapped ${arr[boundary]} to index ${boundary}.`, { boundary }, { swaps: 1 });
          }
          boundary += 1;
        }
      }

      [arr[boundary], arr[hi]] = [arr[hi], arr[boundary]];
      settled.add(boundary);

      for (const k of settled) t.mark(k, 'path');
      t.step(2, `Pivot ${pivot} lands at index ${boundary} — everything left is smaller.`, { pivot: boundary }, { swaps: 1 });

      return boundary;
    };

    const sort = (lo: number, hi: number): void => {
      if (lo >= hi) {
        if (lo === hi) settled.add(lo);
        return;
      }
      const p = partition(lo, hi);
      sort(lo, p - 1);
      sort(p + 1, hi);
    };

    sort(0, n - 1);

    for (let k = 0; k < n; k++) t.mark(k, 'path');
    t.step(0, `Sorted: ${arr.join(' ')}.`, { sorted: arr.join(' ') });
  },
};

/**
 * Heapsort, self-contained on a plain array — it deliberately does not import the heap structure,
 * so the sorting file has no dependency on the tree family.
 */
export const heapSort: AlgorithmDef<ArrayState> = {
  id: 'heap-sort',
  name: 'Heap Sort',
  description: 'Builds a max-heap in place, then repeatedly moves the root to the end.',
  pseudocode: [
    'build a max-heap',
    'for end = n-1 down to 1',
    '  swap(a[0], a[end])',
    '  sift a[0] down within 0..end-1',
  ],
  run: (state, t) => {
    const arr = state.values;
    const n = arr.length;

    if (n < 2) {
      t.step(0, 'Fewer than two values — already sorted.', {});
      return;
    }

    const siftDown = (start: number, size: number): void => {
      let index = start;
      for (;;) {
        const left = 2 * index + 1;
        const right = 2 * index + 2;
        let largest = index;

        if (left < size && arr[left] > arr[largest]) largest = left;
        if (right < size && arr[right] > arr[largest]) largest = right;
        if (largest === index) break;

        [arr[index], arr[largest]] = [arr[largest], arr[index]];
        index = largest;
      }
    };

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      t.mark(i, 'compare');
      t.step(0, `Sifting down from index ${i} to build the heap.`, { i }, { comparisons: 1 });
      siftDown(i, n);
    }

    for (let k = 0; k < n; k++) t.mark(k, 'visited');
    t.step(0, `Max-heap built — ${arr[0]} is the largest value.`, { root: arr[0] }, { writes: n });

    for (let end = n - 1; end > 0; end--) {
      [arr[0], arr[end]] = [arr[end], arr[0]];

      for (let k = end; k < n; k++) t.mark(k, 'path');
      t.mark(0, 'active');
      t.step(2, `Moved ${arr[end]} to index ${end}, its final position.`, { end }, { swaps: 1 });

      siftDown(0, end);

      for (let k = end; k < n; k++) t.mark(k, 'path');
      t.step(3, `Re-heaped the first ${end} value(s). ${arr[0]} is the new largest.`, { end }, { comparisons: end });
    }

    for (let k = 0; k < n; k++) t.mark(k, 'path');
    t.step(1, `Sorted: ${arr.join(' ')}.`, { sorted: arr.join(' ') });
  },
};
