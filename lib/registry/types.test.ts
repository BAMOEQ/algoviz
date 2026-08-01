import { describe, expect, it } from 'vitest';
import { defineStructure } from '@/lib/registry/types';
import type { StructureDef } from '@/lib/registry/types';

interface FakeState {
  values: number[];
}

function makeFakeDef(): StructureDef<FakeState> {
  return {
    id: 'fake',
    name: 'Fake',
    slug: 'fake',
    category: 'linear',
    summary: 'fake structure for types.test.ts',
    create: () => ({ values: [] }),
    seed: () => ({ values: [1, 2, 3] }),
    clone: (state) => ({ values: [...state.values] }),
    operations: [
      {
        id: 'push',
        name: 'Push',
        fields: [{ name: 'value', label: 'Value', type: 'number' }],
        validate: (_state, args) =>
          typeof args.value === 'number' && args.value > 0 ? null : 'value must be a positive number',
        run: (state, args, t) => {
          const value = args.value as number;
          state.values.push(value);
          t.step(0, `Pushed ${value}`, { value });
        },
      },
    ],
    algorithms: [
      {
        id: 'double',
        name: 'Double',
        pseudocode: ['double each value'],
        run: (state, t) => {
          for (let i = 0; i < state.values.length; i++) {
            state.values[i] *= 2;
            t.step(0, `Doubled index ${i}`, { i });
          }
        },
      },
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
    complexity: { rows: [{ operation: 'push', average: 'O(1)', worst: 'O(1)' }], space: 'O(n)' },
  };
}

describe('defineStructure', () => {
  it('clones state before runOperation mutates it, leaving the caller state untouched', () => {
    const handle = defineStructure(makeFakeDef());
    const original = { values: [1, 2, 3] };

    const { result, state } = handle.runOperation('push', original, { value: 9 });

    expect(original).toEqual({ values: [1, 2, 3] });
    expect(state).toEqual({ values: [1, 2, 3, 9] });
    expect(state).not.toBe(original);
    expect(result.steps).toHaveLength(1);
  });

  it('clones state before runAlgorithm mutates it, leaving the caller state untouched', () => {
    const handle = defineStructure(makeFakeDef());
    const original = { values: [1, 2, 3] };

    const result = handle.runAlgorithm('double', original);

    expect(original).toEqual({ values: [1, 2, 3] });
    expect(result.steps).toHaveLength(3);
    expect(result.steps.at(-1)?.scene).toEqual({
      kind: 'linear',
      cells: [
        { id: 'cell-0', value: 2, index: 0, highlight: 'none' },
        { id: 'cell-1', value: 4, index: 1, highlight: 'none' },
        { id: 'cell-2', value: 6, index: 2, highlight: 'none' },
      ],
      pointers: [],
    });
  });

  it('runOperation throws when validate rejects the args, and never mutates the caller state', () => {
    const handle = defineStructure(makeFakeDef());
    const original = { values: [1, 2, 3] };

    expect(() => handle.runOperation('push', original, { value: -1 })).toThrow(
      /value must be a positive number/,
    );
    expect(original).toEqual({ values: [1, 2, 3] });
  });

  it('throws naming the structure and operation id for an unknown operation', () => {
    const handle = defineStructure(makeFakeDef());
    expect(() => handle.runOperation('nope', { values: [] }, {})).toThrow(/fake/);
    expect(() => handle.runOperation('nope', { values: [] }, {})).toThrow(/nope/);
  });

  it('throws naming the structure and algorithm id for an unknown algorithm', () => {
    const handle = defineStructure(makeFakeDef());
    expect(() => handle.runAlgorithm('nope', { values: [] })).toThrow(/fake/);
    expect(() => handle.runAlgorithm('nope', { values: [] })).toThrow(/nope/);
  });

  it("validateOperation passes through the operation's validate result", () => {
    const handle = defineStructure(makeFakeDef());
    expect(handle.validateOperation('push', { values: [] }, { value: 5 })).toBeNull();
    expect(handle.validateOperation('push', { values: [] }, { value: -1 })).toBe(
      'value must be a positive number',
    );
  });

  it('validateOperation returns null when the operation defines no validate', () => {
    const def = makeFakeDef();
    def.operations = [{ ...def.operations[0], validate: undefined }];
    const handle = defineStructure(def);

    expect(handle.validateOperation('push', { values: [] }, { value: -1 })).toBeNull();
  });

  it('validateOperation throws naming the structure and operation id for an unknown operation', () => {
    const handle = defineStructure(makeFakeDef());
    expect(() => handle.validateOperation('nope', { values: [] }, {})).toThrow(/fake/);
    expect(() => handle.validateOperation('nope', { values: [] }, {})).toThrow(/nope/);
  });

  it('narrows operations and algorithms to their erased handle shape', () => {
    const handle = defineStructure(makeFakeDef());

    expect(handle.operations).toEqual([
      { id: 'push', name: 'Push', fields: [{ name: 'value', label: 'Value', type: 'number' }] },
    ]);
    expect(handle.algorithms).toEqual([{ id: 'double', name: 'Double', pseudocode: ['double each value'] }]);
  });
});
