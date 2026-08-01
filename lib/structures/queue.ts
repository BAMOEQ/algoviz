import { ringBufferWalk } from '@/lib/algorithms/queue-algorithms';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const QUEUE_CAPACITY = 8;

/**
 * A circular (ring-buffer) queue. `slots` is the fixed backing store; `head` is the index of the
 * front element and `size` how many slots are occupied. The tail wraps around modulo capacity,
 * which is the behaviour the visualization exists to make obvious.
 */
export interface QueueState {
  slots: Array<number | null>;
  head: number;
  size: number;
}

function tailIndex(state: QueueState): number {
  return (state.head + state.size) % state.slots.length;
}

export const queueStructure: StructureHandle = defineStructure<QueueState>({
  id: 'queue',
  name: 'Queue',
  slug: 'queue',
  category: 'linear',
  summary: 'A first-in, first-out sequence over a fixed ring buffer whose tail wraps around.',
  create: () => ({ slots: Array<number | null>(QUEUE_CAPACITY).fill(null), head: 0, size: 0 }),
  seed: () => {
    const slots = Array<number | null>(QUEUE_CAPACITY).fill(null);
    slots[5] = 12;
    slots[6] = 7;
    slots[7] = 3;
    slots[0] = 9;
    return { slots, head: 5, size: 4 };
  },
  clone: (state) => ({ slots: [...state.slots], head: state.head, size: state.size }),

  operations: [
    {
      id: 'enqueue',
      name: 'Enqueue',
      fields: [{ name: 'value', label: 'Value', type: 'number' }],
      validate: (state, args) => {
        if (typeof args.value !== 'number' || !Number.isFinite(args.value)) {
          return 'Value must be a number.';
        }
        if (state.size >= state.slots.length) {
          return `Queue is full — ${state.slots.length} slots maximum.`;
        }
        return null;
      },
      run: (state, args, t) => {
        const value = args.value as number;
        const tail = tailIndex(state);
        const wrapped = tail < state.head;

        t.mark(tail, 'active');
        t.step(
          0,
          wrapped
            ? `Tail wrapped around to slot ${tail}. Writing ${value} there.`
            : `Writing ${value} into slot ${tail}.`,
          { value, tail, head: state.head, size: state.size },
        );

        state.slots[tail] = value;
        state.size += 1;

        t.mark(tail, 'inserted');
        t.step(0, `Enqueued ${value}. Queue holds ${state.size} value(s).`, { value, size: state.size }, { writes: 1 });
      },
    },
    {
      id: 'dequeue',
      name: 'Dequeue',
      fields: [],
      validate: (state) => (state.size === 0 ? 'Queue is empty — enqueue a value first.' : null),
      run: (state, _args, t) => {
        const { head } = state;
        const value = state.slots[head];

        t.mark(head, 'removed');
        t.step(0, `Removing ${value} from the front (slot ${head}).`, { value, head }, { reads: 1 });

        state.slots[head] = null;
        state.head = (head + 1) % state.slots.length;
        state.size -= 1;

        t.step(
          0,
          `Dequeued ${value}. Head advanced to slot ${state.head}.`,
          { value, head: state.head, size: state.size },
          { writes: 1 },
        );
      },
    },
    {
      id: 'peek',
      name: 'Peek',
      fields: [],
      validate: (state) => (state.size === 0 ? 'Queue is empty — enqueue a value first.' : null),
      run: (state, _args, t) => {
        t.mark(state.head, 'active');
        t.step(
          0,
          `Front of the queue is ${state.slots[state.head]}. Nothing is removed.`,
          { head: state.head },
          { reads: 1 },
        );
      },
    },
  ],

  algorithms: [ringBufferWalk],

  toScene: (state, marks) => ({
    kind: 'linear',
    cells: state.slots.map((value, index) => ({
      id: `cell-${index}`,
      value,
      index,
      highlight: marks.get(index) ?? 'none',
    })),
    pointers:
      state.size === 0
        ? [{ id: 'ptr-head', label: 'head', index: state.head, highlight: 'active' }]
        : [
            { id: 'ptr-head', label: 'head', index: state.head, highlight: 'active' },
            { id: 'ptr-tail', label: 'tail', index: tailIndex(state), highlight: 'compare' },
          ],
  }),

  complexity: {
    rows: [
      { operation: 'enqueue', average: 'O(1)', worst: 'O(1)' },
      { operation: 'dequeue', average: 'O(1)', worst: 'O(1)' },
      { operation: 'peek', average: 'O(1)', worst: 'O(1)' },
      { operation: 'search', average: 'O(n)', worst: 'O(n)' },
    ],
    space: 'O(n)',
  },
});
