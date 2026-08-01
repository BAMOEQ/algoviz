import { pathCompressionDemo, unionByRankDemo } from '@/lib/algorithms/union-find-algorithms';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const UNION_FIND_MAX = 20;

export interface UnionFindState {
  labels: string[];
  parent: number[];
  rank: number[];
}

export function dsuNodeId(index: number): string {
  return `set-${index}`;
}

/** Find with path compression. Returns the root and reports every node it re-pointed. */
export function dsuFind(
  state: UnionFindState,
  index: number,
  onCompress?: (node: number, newParent: number) => void,
): number {
  let root = index;
  while (state.parent[root] !== root) root = state.parent[root];

  let cursor = index;
  while (state.parent[cursor] !== root) {
    const next = state.parent[cursor];
    state.parent[cursor] = root;
    onCompress?.(cursor, root);
    cursor = next;
  }

  return root;
}

/** Union by rank. Returns false when both elements already share a root. */
export function dsuUnion(state: UnionFindState, a: number, b: number): boolean {
  const rootA = dsuFind(state, a);
  const rootB = dsuFind(state, b);
  if (rootA === rootB) return false;

  if (state.rank[rootA] < state.rank[rootB]) {
    state.parent[rootA] = rootB;
  } else if (state.rank[rootA] > state.rank[rootB]) {
    state.parent[rootB] = rootA;
  } else {
    state.parent[rootB] = rootA;
    state.rank[rootA] += 1;
  }

  return true;
}

export function createDsu(size: number): UnionFindState {
  return {
    labels: Array.from({ length: size }, (_value, index) => String(index)),
    parent: Array.from({ length: size }, (_value, index) => index),
    rank: Array<number>(size).fill(0),
  };
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

export const unionFindStructure: StructureHandle = defineStructure<UnionFindState>({
  id: 'union-find',
  name: 'Union-Find',
  slug: 'union-find',
  category: 'graph',
  summary: 'Disjoint sets that merge in near-constant time, flattening as you query them.',
  create: () => ({ labels: [], parent: [], rank: [] }),
  seed: () => {
    const state = createDsu(8);
    dsuUnion(state, 0, 1);
    dsuUnion(state, 2, 3);
    dsuUnion(state, 4, 5);
    dsuUnion(state, 0, 2);
    return state;
  },
  clone: (state) => ({
    labels: [...state.labels],
    parent: [...state.parent],
    rank: [...state.rank],
  }),

  operations: [
    {
      id: 'makeSet',
      name: 'Make set',
      fields: [],
      validate: (state) =>
        state.labels.length >= UNION_FIND_MAX ? `At most ${UNION_FIND_MAX} sets.` : null,
      run: (state, _args, t) => {
        const index = state.labels.length;
        state.labels.push(String(index));
        state.parent.push(index);
        state.rank.push(0);

        t.mark(dsuNodeId(index), 'inserted');
        t.step(0, `Created set ${index}, which is its own root.`, { index }, { writes: 1 });
      },
    },
    {
      id: 'union',
      name: 'Union',
      fields: [
        { name: 'a', label: 'A', type: 'number' },
        { name: 'b', label: 'B', type: 'number' },
      ],
      validate: (state, args) => {
        if (!isInteger(args.a) || !isInteger(args.b)) return 'Both elements must be whole numbers.';
        const max = state.labels.length - 1;
        if (state.labels.length === 0) return 'No sets yet — make a set first.';
        if (args.a < 0 || args.a > max) return `Element ${args.a} is out of range (0–${max}).`;
        if (args.b < 0 || args.b > max) return `Element ${args.b} is out of range (0–${max}).`;
        return null;
      },
      run: (state, args, t) => {
        const a = args.a as number;
        const b = args.b as number;

        const rootA = dsuFind(state, a);
        const rootB = dsuFind(state, b);

        t.mark(dsuNodeId(a), 'active').mark(dsuNodeId(b), 'active');
        t.mark(dsuNodeId(rootA), 'compare').mark(dsuNodeId(rootB), 'compare');
        t.step(0, `${a} lives under root ${rootA}; ${b} lives under root ${rootB}.`, { a, b, rootA, rootB }, { reads: 2, comparisons: 1 });

        if (rootA === rootB) {
          t.mark(dsuNodeId(rootA), 'visited');
          t.step(0, `${a} and ${b} are already in the same set — nothing to merge.`, { a, b });
          return;
        }

        const rankA = state.rank[rootA];
        const rankB = state.rank[rootB];
        dsuUnion(state, a, b);
        const winner = state.parent[rootA] === rootA ? rootA : rootB;

        t.mark(dsuNodeId(winner), 'path');
        t.step(
          0,
          rankA === rankB
            ? `Equal ranks (${rankA}) — ${winner} becomes the root and its rank rises to ${state.rank[winner]}.`
            : `Rank ${Math.max(rankA, rankB)} beats ${Math.min(rankA, rankB)} — ${winner} becomes the root.`,
          { root: winner, rank: state.rank[winner] },
          { writes: 1 },
        );
      },
    },
    {
      id: 'find',
      name: 'Find',
      fields: [{ name: 'element', label: 'Element', type: 'number' }],
      validate: (state, args) => {
        if (!isInteger(args.element)) return 'Element must be a whole number.';
        const max = state.labels.length - 1;
        if (state.labels.length === 0) return 'No sets yet — make a set first.';
        if (args.element < 0 || args.element > max) return `Element ${args.element} is out of range (0–${max}).`;
        return null;
      },
      run: (state, args, t) => {
        const element = args.element as number;

        const chain: number[] = [];
        let cursor = element;
        while (state.parent[cursor] !== cursor) {
          chain.push(cursor);
          cursor = state.parent[cursor];
        }
        const root = cursor;

        for (const node of chain) t.mark(dsuNodeId(node), 'active');
        t.mark(dsuNodeId(root), 'compare');
        t.step(
          0,
          chain.length === 0
            ? `${element} is already a root.`
            : `Walked ${chain.length} link(s) from ${element} up to root ${root}.`,
          { element, root, depth: chain.length },
          { reads: chain.length + 1 },
        );

        if (chain.length > 1) {
          const compressed: number[] = [];
          dsuFind(state, element, (node) => compressed.push(node));

          for (const node of compressed) t.mark(dsuNodeId(node), 'inserted');
          t.mark(dsuNodeId(root), 'path');
          t.step(
            0,
            `Path compression re-pointed ${compressed.length} node(s) straight at ${root} — the tree just flattened.`,
            { compressed: compressed.length, root },
            { writes: compressed.length },
          );
        }
      },
    },
  ],

  algorithms: [unionByRankDemo, pathCompressionDemo],

  toScene: (state, marks) => {
    const nodes = state.labels.map((label, index) => ({
      id: dsuNodeId(index),
      value: label,
      highlight: marks.get(dsuNodeId(index)) ?? 'none',
      label: state.parent[index] === index ? `rank ${state.rank[index]}` : undefined,
    }));

    const edges = state.labels
      .map((_label, index) => index)
      .filter((index) => state.parent[index] !== index)
      .map((index) => ({
        id: `edge-${index}`,
        from: dsuNodeId(state.parent[index]),
        to: dsuNodeId(index),
        highlight: marks.get(`edge-${index}`) ?? 'none',
      }));

    return { kind: 'tree', nodes, edges };
  },

  complexity: {
    rows: [
      { operation: 'make set', average: 'O(1)', worst: 'O(1)' },
      { operation: 'find', average: 'O(α(n))', worst: 'O(log n) without compression' },
      { operation: 'union', average: 'O(α(n))', worst: 'O(log n) without rank' },
      { operation: 'connected?', average: 'O(α(n))', worst: 'O(log n)' },
    ],
    space: 'O(n)',
  },
});
