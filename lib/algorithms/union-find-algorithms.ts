import type { AlgorithmDef } from '@/lib/registry/types';
import { dsuFind, dsuNodeId, type UnionFindState } from '@/lib/structures/union-find';

export const unionByRankDemo: AlgorithmDef<UnionFindState> = {
  id: 'union-by-rank',
  name: 'Union by Rank',
  description: 'Merges every pair in turn, always hanging the shorter tree under the taller one.',
  pseudocode: [
    'union(a, b)',
    '  rootA = find(a), rootB = find(b)',
    '  if rootA == rootB: return',
    '  if rank[rootA] < rank[rootB]: swap',
    '  parent[rootB] = rootA',
    '  if ranks were equal: rank[rootA] += 1',
  ],
  run: (state, t) => {
    const n = state.labels.length;
    if (n < 2) {
      t.step(0, 'Make at least two sets before merging them.', {});
      return;
    }

    t.step(0, `Merging ${n} element(s) pairwise, always by rank.`, { elements: n });

    for (let i = 0; i + 1 < n; i += 2) {
      const rootA = dsuFind(state, i);
      const rootB = dsuFind(state, i + 1);

      t.mark(dsuNodeId(i), 'active').mark(dsuNodeId(i + 1), 'active');
      t.mark(dsuNodeId(rootA), 'compare').mark(dsuNodeId(rootB), 'compare');
      t.step(1, `Roots of ${i} and ${i + 1} are ${rootA} and ${rootB}.`, { a: i, b: i + 1 }, { reads: 2 });

      if (rootA === rootB) {
        t.mark(dsuNodeId(rootA), 'visited');
        t.step(2, `${i} and ${i + 1} already share a root — skipping.`, { root: rootA }, { comparisons: 1 });
        continue;
      }

      const rankA = state.rank[rootA];
      const rankB = state.rank[rootB];

      t.mark(dsuNodeId(rootA), 'compare').mark(dsuNodeId(rootB), 'compare');
      t.step(3, `Rank ${rankA} versus rank ${rankB}.`, { rankA, rankB }, { comparisons: 1 });

      let winner: number;
      if (rankA < rankB) {
        state.parent[rootA] = rootB;
        winner = rootB;
      } else if (rankA > rankB) {
        state.parent[rootB] = rootA;
        winner = rootA;
      } else {
        state.parent[rootB] = rootA;
        state.rank[rootA] += 1;
        winner = rootA;
      }

      t.mark(dsuNodeId(winner), 'path');
      t.step(
        rankA === rankB ? 5 : 4,
        rankA === rankB
          ? `Equal ranks, so ${winner} takes over and its rank rises to ${state.rank[winner]}.`
          : `${winner} is taller, so it takes over — no rank change.`,
        { root: winner, rank: state.rank[winner] },
        { writes: 1 },
      );
    }

    const roots = state.labels.filter((_label, index) => state.parent[index] === index).length;
    for (let i = 0; i < n; i++) t.mark(dsuNodeId(i), state.parent[i] === i ? 'path' : 'visited');
    t.step(0, `${roots} disjoint set(s) remain.`, { sets: roots });
  },
};

export const pathCompressionDemo: AlgorithmDef<UnionFindState> = {
  id: 'path-compression',
  name: 'Path Compression',
  description: 'Runs find on every element; each call re-points the whole path at the root.',
  pseudocode: [
    'find(x)',
    '  if parent[x] != x',
    '    parent[x] = find(parent[x])',
    '  return parent[x]',
  ],
  run: (state, t) => {
    const n = state.labels.length;
    if (n === 0) {
      t.step(0, 'There are no sets yet.', {});
      return;
    }

    const depthOf = (index: number): number => {
      let depth = 0;
      let cursor = index;
      while (state.parent[cursor] !== cursor) {
        cursor = state.parent[cursor];
        depth += 1;
      }
      return depth;
    };

    const before = Math.max(...state.labels.map((_label, index) => depthOf(index)));
    t.step(0, `The deepest element sits ${before} link(s) from its root.`, { depth: before });

    let totalCompressed = 0;

    for (let index = 0; index < n; index++) {
      const depth = depthOf(index);
      if (depth < 2) continue;

      const chain: number[] = [];
      let cursor = index;
      while (state.parent[cursor] !== cursor) {
        chain.push(cursor);
        cursor = state.parent[cursor];
      }

      for (const node of chain) t.mark(dsuNodeId(node), 'active');
      t.mark(dsuNodeId(cursor), 'compare');
      t.step(1, `${index} is ${depth} link(s) from root ${cursor}.`, { element: index, depth }, { reads: depth });

      const compressed: number[] = [];
      dsuFind(state, index, (node) => compressed.push(node));
      totalCompressed += compressed.length;

      for (const node of compressed) t.mark(dsuNodeId(node), 'inserted');
      t.mark(dsuNodeId(cursor), 'path');
      t.step(2, `Re-pointed ${compressed.length} node(s) straight at ${cursor}.`, {
        compressed: compressed.length,
      }, { writes: compressed.length });
    }

    const after = Math.max(...state.labels.map((_label, index) => depthOf(index)));
    for (let i = 0; i < n; i++) t.mark(dsuNodeId(i), state.parent[i] === i ? 'path' : 'visited');
    t.step(
      3,
      totalCompressed === 0
        ? 'Every element already pointed straight at its root — nothing to flatten.'
        : `Flattened ${totalCompressed} link(s). Maximum depth fell from ${before} to ${after}.`,
      { before, after, compressed: totalCompressed },
    );
  },
};
