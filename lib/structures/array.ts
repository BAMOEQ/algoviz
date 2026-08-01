import { binarySearch, linearSearch } from '@/lib/algorithms/searching';
import {
  bubbleSort,
  heapSort,
  insertionSort,
  mergeSort,
  quickSort,
  selectionSort,
} from '@/lib/algorithms/sorting';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const ARRAY_MAX = 60;

export interface ArrayState {
  values: number[];
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

// Validation precedence, applied by every operation below in this order, so two operations never
// disagree about which complaint wins: (1) argument shape — is each field the right type, checked
// in field order — (2) state capacity — is the array empty or full — (3) range — does an
// already-well-typed index fall within current bounds.
function rangeError(index: number, maxIndex: number): string | null {
  if (index < 0 || index > maxIndex) {
    return `Index ${index} is out of range (0–${maxIndex}).`;
  }
  return null;
}

export const arrayStructure: StructureHandle = defineStructure<ArrayState>({
  id: 'array',
  name: 'Array',
  slug: 'array',
  category: 'linear',
  summary: 'A fixed-layout, index-addressable sequence of values with O(1) access.',
  create: () => ({ values: [] }),
  seed: () => ({ values: [5, 2, 9, 1, 7, 3] }),
  clone: (state) => ({ values: [...state.values] }),

  operations: [
    {
      id: 'push',
      name: 'Push',
      fields: [{ name: 'value', label: 'Value', type: 'number' }],
      validate: (state, args) => {
        if (!isFiniteNumber(args.value)) return 'Value must be a number.';
        if (state.values.length >= ARRAY_MAX) return 'Array is full — 60 values maximum.';
        return null;
      },
      run: (state, args, t) => {
        const value = args.value as number;
        t.step(0, `Pushing ${value} onto the array.`, { value });

        state.values.push(value);
        const index = state.values.length - 1;
        t.mark(index, 'inserted');
        t.step(0, `Pushed ${value} at index ${index}.`, { value, index }, { writes: 1 });
      },
    },
    {
      id: 'pop',
      name: 'Pop',
      fields: [],
      validate: (state) => {
        if (state.values.length === 0) return 'Array is empty — nothing to pop.';
        return null;
      },
      run: (state, _args, t) => {
        const index = state.values.length - 1;
        const value = state.values[index];

        t.mark(index, 'removed');
        t.step(0, `Removing ${value} from index ${index}.`, { value, index }, { reads: 1 });

        state.values.pop();
        t.step(0, `Popped ${value}.`, { value }, { writes: 1 });
      },
    },
    {
      id: 'get',
      name: 'Get',
      fields: [{ name: 'index', label: 'Index', type: 'number' }],
      validate: (state, args) => {
        const index = args.index;
        if (!isInteger(index)) return 'Index must be a whole number.';
        if (state.values.length === 0) return 'Array is empty — push a value first.';
        return rangeError(index, state.values.length - 1);
      },
      run: (state, args, t) => {
        const index = args.index as number;
        t.mark(index, 'active');
        t.step(0, `Reading index ${index}.`, { index });

        const value = state.values[index];
        t.mark(index, 'active');
        t.step(0, `Index ${index} holds ${value}.`, { index, value }, { reads: 1 });
      },
    },
    {
      id: 'set',
      name: 'Set',
      fields: [
        { name: 'index', label: 'Index', type: 'number' },
        { name: 'value', label: 'Value', type: 'number' },
      ],
      validate: (state, args) => {
        const index = args.index;
        const value = args.value;
        if (!isInteger(index)) return 'Index must be a whole number.';
        if (!isFiniteNumber(value)) return 'Value must be a number.';
        if (state.values.length === 0) return 'Array is empty — push a value first.';
        return rangeError(index, state.values.length - 1);
      },
      run: (state, args, t) => {
        const index = args.index as number;
        const value = args.value as number;
        const oldValue = state.values[index];

        t.mark(index, 'active');
        t.step(0, `Writing ${value} to index ${index} (was ${oldValue}).`, { index, value, oldValue }, { reads: 1 });

        state.values[index] = value;
        t.mark(index, 'active');
        t.step(0, `Set index ${index} to ${value}.`, { index, value }, { writes: 1 });
      },
    },
    {
      id: 'insertAt',
      name: 'Insert at',
      fields: [
        { name: 'index', label: 'Index', type: 'number' },
        { name: 'value', label: 'Value', type: 'number' },
      ],
      validate: (state, args) => {
        const index = args.index;
        const value = args.value;
        if (!isInteger(index)) return 'Index must be a whole number.';
        if (!isFiniteNumber(value)) return 'Value must be a number.';
        if (state.values.length >= ARRAY_MAX) return 'Array is full — 60 values maximum.';
        return rangeError(index, state.values.length);
      },
      run: (state, args, t) => {
        const index = args.index as number;
        const value = args.value as number;
        const shiftCount = state.values.length - index;

        t.mark(index, 'active');
        t.step(
          0,
          `Inserting ${value} at index ${index}, shifting ${shiftCount} value(s) right.`,
          { index, value },
        );

        state.values.splice(index, 0, value);
        t.mark(index, 'inserted');
        t.step(0, `Inserted ${value} at index ${index}.`, { index, value }, { writes: shiftCount + 1 });
      },
    },
    {
      id: 'removeAt',
      name: 'Remove at',
      fields: [{ name: 'index', label: 'Index', type: 'number' }],
      validate: (state, args) => {
        const index = args.index;
        if (!isInteger(index)) return 'Index must be a whole number.';
        if (state.values.length === 0) return 'Array is empty — nothing to remove.';
        return rangeError(index, state.values.length - 1);
      },
      run: (state, args, t) => {
        const index = args.index as number;
        const value = state.values[index];
        const shiftCount = state.values.length - index - 1;

        t.mark(index, 'removed');
        t.step(0, `Removing ${value} from index ${index}.`, { index, value }, { reads: 1 });

        state.values.splice(index, 1);
        t.step(0, `Removed ${value} from index ${index}.`, { index, value }, { writes: shiftCount + 1 });
      },
    },
  ],

  algorithms: [
    bubbleSort,
    insertionSort,
    selectionSort,
    mergeSort,
    quickSort,
    heapSort,
    linearSearch,
    binarySearch,
  ],

  toScene: (state, marks) => ({
    kind: 'linear',
    cells: state.values.map((value, index) => ({
      id: `cell-${index}`,
      value,
      index,
      highlight: marks.get(index) ?? 'none',
    })),
    pointers: [],
  }),

  complexity: {
    rows: [
      { operation: 'access', average: 'O(1)', worst: 'O(1)' },
      { operation: 'search', average: 'O(n)', worst: 'O(n)' },
      { operation: 'insert', average: 'O(n)', worst: 'O(n)' },
      { operation: 'append', average: 'O(1) amortized', worst: 'O(n)' },
      { operation: 'delete', average: 'O(n)', worst: 'O(n)' },
    ],
    space: 'O(n)',
  },
});
