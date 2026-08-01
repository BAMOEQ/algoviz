import { balancedParens, postfixEval } from '@/lib/algorithms/stack-algorithms';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const STACK_MAX = 60;

export interface StackState {
  /** Bottom of the stack is index 0; the top is the last element. */
  values: string[];
}

export const stackStructure: StructureHandle = defineStructure<StackState>({
  id: 'stack',
  name: 'Stack',
  slug: 'stack',
  category: 'linear',
  summary: 'A last-in, first-out sequence where every operation touches only the top.',
  create: () => ({ values: [] }),
  seed: () => ({ values: ['(', '[', '{'] }),
  clone: (state) => ({ values: [...state.values] }),

  operations: [
    {
      id: 'push',
      name: 'Push',
      fields: [{ name: 'value', label: 'Value', type: 'string', placeholder: '(' }],
      validate: (state, args) => {
        if (typeof args.value !== 'string' || args.value === '') return 'Value must not be empty.';
        if (state.values.length >= STACK_MAX) return 'Stack is full — 60 values maximum.';
        return null;
      },
      run: (state, args, t) => {
        const value = args.value as string;
        t.step(0, `Pushing ${value} onto the stack.`, { value });

        state.values.push(value);
        const top = state.values.length - 1;
        t.mark(top, 'inserted');
        t.step(0, `Pushed ${value}. Stack height is now ${state.values.length}.`, { value, top }, { writes: 1 });
      },
    },
    {
      id: 'pop',
      name: 'Pop',
      fields: [],
      validate: (state) => (state.values.length === 0 ? 'Stack is empty — push a value first.' : null),
      run: (state, _args, t) => {
        const top = state.values.length - 1;
        const value = state.values[top];

        t.mark(top, 'removed');
        t.step(0, `Popping ${value} off the top.`, { value, top }, { reads: 1 });

        state.values.pop();
        t.step(0, `Popped ${value}. Stack height is now ${state.values.length}.`, { value }, { writes: 1 });
      },
    },
    {
      id: 'peek',
      name: 'Peek',
      fields: [],
      validate: (state) => (state.values.length === 0 ? 'Stack is empty — push a value first.' : null),
      run: (state, _args, t) => {
        const top = state.values.length - 1;
        t.mark(top, 'active');
        t.step(0, `Top of the stack is ${state.values[top]}. Nothing is removed.`, { top }, { reads: 1 });
      },
    },
  ],

  algorithms: [balancedParens, postfixEval],

  toScene: (state, marks) => ({
    kind: 'linear',
    cells: state.values.map((value, index) => ({
      id: `cell-${index}`,
      value,
      index,
      highlight: marks.get(index) ?? 'none',
    })),
    pointers:
      state.values.length === 0
        ? []
        : [{ id: 'ptr-top', label: 'top', index: state.values.length - 1, highlight: 'active' }],
  }),

  complexity: {
    rows: [
      { operation: 'push', average: 'O(1)', worst: 'O(1) amortized' },
      { operation: 'pop', average: 'O(1)', worst: 'O(1)' },
      { operation: 'peek', average: 'O(1)', worst: 'O(1)' },
      { operation: 'search', average: 'O(n)', worst: 'O(n)' },
    ],
    space: 'O(n)',
  },
});
