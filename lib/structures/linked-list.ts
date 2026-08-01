import {
  cycleDetection,
  middleNode,
  reverseList,
  traverseList,
} from '@/lib/algorithms/list-algorithms';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const LIST_MAX = 40;

export interface LinkedListState {
  values: number[];
  doubly: boolean;
  /** Index the tail's `next` points back to, modelling a cycle for Floyd's algorithm. */
  cycleTo: number | null;
}

export function nodeId(index: number): string {
  return `node-${index}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export const linkedListStructure: StructureHandle = defineStructure<LinkedListState>({
  id: 'linked-list',
  name: 'Linked List',
  slug: 'linked-list',
  category: 'linear',
  summary: 'A chain of nodes where each one points to the next, so order is stored in the links.',
  create: () => ({ values: [], doubly: false, cycleTo: null }),
  seed: () => ({ values: [3, 8, 1, 6, 4], doubly: false, cycleTo: null }),
  clone: (state) => ({ values: [...state.values], doubly: state.doubly, cycleTo: state.cycleTo }),

  operations: [
    {
      id: 'pushFront',
      name: 'Push front',
      fields: [{ name: 'value', label: 'Value', type: 'number' }],
      validate: (state, args) => {
        if (!isFiniteNumber(args.value)) return 'Value must be a number.';
        if (state.values.length >= LIST_MAX) return 'List is full — 40 nodes maximum.';
        return null;
      },
      run: (state, args, t) => {
        const value = args.value as number;
        t.step(0, `Linking a new node holding ${value} in front of the head.`, { value });

        state.values.unshift(value);
        t.mark(nodeId(0), 'inserted');
        t.step(0, `${value} is the new head.`, { value }, { writes: 1 });
      },
    },
    {
      id: 'pushBack',
      name: 'Push back',
      fields: [{ name: 'value', label: 'Value', type: 'number' }],
      validate: (state, args) => {
        if (!isFiniteNumber(args.value)) return 'Value must be a number.';
        if (state.values.length >= LIST_MAX) return 'List is full — 40 nodes maximum.';
        return null;
      },
      run: (state, args, t) => {
        const value = args.value as number;
        const tail = state.values.length - 1;

        if (tail >= 0) {
          t.mark(nodeId(tail), 'active');
          t.step(0, `Walking to the tail to append ${value}.`, { value }, { reads: 1 });
        }

        state.values.push(value);
        t.mark(nodeId(state.values.length - 1), 'inserted');
        t.step(0, `Appended ${value} at the tail.`, { value }, { writes: 1 });
      },
    },
    {
      id: 'popFront',
      name: 'Pop front',
      fields: [],
      validate: (state) => (state.values.length === 0 ? 'List is empty — push a value first.' : null),
      run: (state, _args, t) => {
        const value = state.values[0];
        t.mark(nodeId(0), 'removed');
        t.step(0, `Unlinking the head node holding ${value}.`, { value }, { reads: 1 });

        state.values.shift();
        if (state.cycleTo !== null) state.cycleTo = null;
        t.step(0, `Removed ${value}. The second node is the new head.`, { value }, { writes: 1 });
      },
    },
    {
      id: 'popBack',
      name: 'Pop back',
      fields: [],
      validate: (state) => (state.values.length === 0 ? 'List is empty — push a value first.' : null),
      run: (state, _args, t) => {
        const tail = state.values.length - 1;
        const value = state.values[tail];

        t.mark(nodeId(tail), 'removed');
        t.step(0, `Unlinking the tail node holding ${value}.`, { value }, { reads: 1 });

        state.values.pop();
        if (state.cycleTo !== null) state.cycleTo = null;
        t.step(0, `Removed ${value}.`, { value }, { writes: 1 });
      },
    },
    {
      id: 'insertAfter',
      name: 'Insert after',
      fields: [
        { name: 'index', label: 'After index', type: 'number' },
        { name: 'value', label: 'Value', type: 'number' },
      ],
      validate: (state, args) => {
        if (!isInteger(args.index)) return 'Index must be a whole number.';
        if (!isFiniteNumber(args.value)) return 'Value must be a number.';
        if (state.values.length >= LIST_MAX) return 'List is full — 40 nodes maximum.';
        if (state.values.length === 0) return 'List is empty — push a value first.';
        if (args.index < 0 || args.index > state.values.length - 1) {
          return `Index ${args.index} is out of range (0–${state.values.length - 1}).`;
        }
        return null;
      },
      run: (state, args, t) => {
        const index = args.index as number;
        const value = args.value as number;

        t.mark(nodeId(index), 'active');
        t.step(0, `Splicing ${value} in after node ${index}.`, { index, value }, { reads: 1 });

        state.values.splice(index + 1, 0, value);
        t.mark(nodeId(index + 1), 'inserted');
        t.step(0, `Inserted ${value} at position ${index + 1}.`, { index: index + 1, value }, { writes: 1 });
      },
    },
    {
      id: 'remove',
      name: 'Remove',
      fields: [{ name: 'index', label: 'Index', type: 'number' }],
      validate: (state, args) => {
        if (!isInteger(args.index)) return 'Index must be a whole number.';
        if (state.values.length === 0) return 'List is empty — nothing to remove.';
        if (args.index < 0 || args.index > state.values.length - 1) {
          return `Index ${args.index} is out of range (0–${state.values.length - 1}).`;
        }
        return null;
      },
      run: (state, args, t) => {
        const index = args.index as number;
        const value = state.values[index];

        t.mark(nodeId(index), 'removed');
        t.step(0, `Unlinking node ${index} holding ${value}.`, { index, value }, { reads: 1 });

        state.values.splice(index, 1);
        if (state.cycleTo !== null && state.cycleTo >= state.values.length) state.cycleTo = null;
        t.step(0, `Removed ${value}. The previous node now points past it.`, { value }, { writes: 1 });
      },
    },
    {
      id: 'toggleDoubly',
      name: 'Toggle doubly',
      fields: [],
      run: (state, _args, t) => {
        state.doubly = !state.doubly;
        t.step(
          0,
          state.doubly
            ? 'Now a doubly linked list — every node also points back to its predecessor.'
            : 'Now a singly linked list — links run forward only.',
          { doubly: state.doubly },
        );
      },
    },
    {
      id: 'linkTail',
      name: 'Link tail to',
      fields: [{ name: 'index', label: 'Index', type: 'number' }],
      validate: (state, args) => {
        if (!isInteger(args.index)) return 'Index must be a whole number.';
        if (state.values.length < 2) return 'Add at least two nodes before creating a cycle.';
        if (args.index < 0 || args.index > state.values.length - 1) {
          return `Index ${args.index} is out of range (0–${state.values.length - 1}).`;
        }
        return null;
      },
      run: (state, args, t) => {
        const index = args.index as number;
        state.cycleTo = index;

        t.mark(nodeId(state.values.length - 1), 'active').mark(nodeId(index), 'compare');
        t.step(
          0,
          `Tail now points back to node ${index} — the list has a cycle.`,
          { cycleTo: index },
          { writes: 1 },
        );
      },
    },
  ],

  algorithms: [traverseList, reverseList, cycleDetection, middleNode],

  toScene: (state, marks) => {
    const nodes = state.values.map((value, index) => ({
      id: nodeId(index),
      value,
      highlight: marks.get(nodeId(index)) ?? 'none',
    }));

    const links = state.values.map((_value, index) => {
      const isTail = index === state.values.length - 1;
      const target = isTail
        ? state.cycleTo === null
          ? null
          : nodeId(state.cycleTo)
        : nodeId(index + 1);

      return {
        id: `link-${index}`,
        from: nodeId(index),
        to: target,
        highlight: marks.get(`link-${index}`) ?? 'none',
      };
    });

    if (state.doubly) {
      for (let index = 1; index < state.values.length; index++) {
        links.push({
          id: `back-${index}`,
          from: nodeId(index),
          to: nodeId(index - 1),
          highlight: marks.get(`back-${index}`) ?? 'none',
        });
      }
    }

    return { kind: 'linked', nodes, links };
  },

  complexity: {
    rows: [
      { operation: 'access', average: 'O(n)', worst: 'O(n)' },
      { operation: 'search', average: 'O(n)', worst: 'O(n)' },
      { operation: 'insert at head', average: 'O(1)', worst: 'O(1)' },
      { operation: 'insert at tail', average: 'O(n)', worst: 'O(n)' },
      { operation: 'delete', average: 'O(1) given the node', worst: 'O(n)' },
    ],
    space: 'O(n)',
  },
});
