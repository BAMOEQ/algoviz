import type { AlgorithmDef } from '@/lib/registry/types';
import type { ArrayState } from '@/lib/structures/array';

/**
 * Both searches look for the value sitting at the array's midpoint, so the demo always has a
 * target that exists and the narration can name it. The target is chosen before any reordering.
 */
function pickTarget(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  return values[Math.floor(values.length / 2)];
}

export const linearSearch: AlgorithmDef<ArrayState> = {
  id: 'linear-search',
  name: 'Linear Search',
  description: 'Scans left to right until the target is found or the array runs out.',
  pseudocode: [
    'for i = 0 to n-1',
    '  if a[i] == target',
    '    return i',
    'return not found',
  ],
  run: (state, t) => {
    const target = pickTarget(state.values);

    if (target === null) {
      t.step(3, 'The array is empty — there is nothing to search.', {});
      return;
    }

    for (let i = 0; i < state.values.length; i++) {
      for (let seen = 0; seen < i; seen++) t.mark(seen, 'visited');
      t.mark(i, 'compare');
      t.step(1, `Is a[${i}] = ${state.values[i]} equal to ${target}?`, { i, target }, { comparisons: 1, reads: 1 });

      if (state.values[i] === target) {
        for (let seen = 0; seen < i; seen++) t.mark(seen, 'visited');
        t.mark(i, 'path');
        t.step(2, `Found ${target} at index ${i} after ${i + 1} comparison(s).`, { i, target });
        return;
      }
    }

    for (let seen = 0; seen < state.values.length; seen++) t.mark(seen, 'visited');
    t.step(3, `${target} is not in the array.`, { target });
  },
};

export const binarySearch: AlgorithmDef<ArrayState> = {
  id: 'binary-search',
  name: 'Binary Search',
  description: 'Halves the search window each comparison. Requires sorted input.',
  pseudocode: [
    'lo = 0, hi = n-1',
    'while lo <= hi',
    '  mid = (lo + hi) / 2',
    '  if a[mid] == target',
    '    return mid',
    '  else if a[mid] < target',
    '    lo = mid + 1',
    '  else',
    '    hi = mid - 1',
    'return not found',
  ],
  run: (state, t) => {
    const target = pickTarget(state.values);

    if (target === null) {
      t.step(9, 'The array is empty — there is nothing to search.', {});
      return;
    }

    const sorted = state.values.every((value, i) => i === 0 || state.values[i - 1] <= value);

    if (!sorted) {
      /* The algorithm runs against a clone, so sorting here never touches the built structure. */
      state.values.sort((a, b) => a - b);
      t.step(0, 'Binary search needs sorted input, so the array was sorted first.', { target }, { writes: state.values.length });
    }

    let lo = 0;
    let hi = state.values.length - 1;

    t.step(0, `Searching for ${target} across indices ${lo}–${hi}.`, { lo, hi, target });

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);

      for (let i = 0; i < state.values.length; i++) {
        if (i < lo || i > hi) t.mark(i, 'visited');
      }
      t.mark(mid, 'compare');
      t.step(2, `Midpoint of ${lo}–${hi} is index ${mid}, holding ${state.values[mid]}.`, { lo, hi, mid }, { reads: 1 });

      t.mark(mid, 'compare');
      t.step(3, `Is ${state.values[mid]} equal to ${target}?`, { mid, target }, { comparisons: 1 });

      if (state.values[mid] === target) {
        t.mark(mid, 'path');
        t.step(4, `Found ${target} at index ${mid}.`, { mid, target });
        return;
      }

      if (state.values[mid] < target) {
        lo = mid + 1;
        t.step(6, `${state.values[mid]} is smaller — discard everything up to ${mid}. Window is now ${lo}–${hi}.`, { lo, hi });
      } else {
        hi = mid - 1;
        t.step(8, `${state.values[mid]} is larger — discard everything from ${mid}. Window is now ${lo}–${hi}.`, { lo, hi });
      }
    }

    t.step(9, `${target} is not in the array.`, { target });
  },
};
