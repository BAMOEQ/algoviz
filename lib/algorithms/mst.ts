import type { AlgorithmDef } from '@/lib/registry/types';
import { neighbours, type GraphState } from '@/lib/structures/graph';
import { createDsu, dsuFind, dsuUnion } from '@/lib/structures/union-find';

export const primMst: AlgorithmDef<GraphState> = {
  id: 'prim',
  name: "Prim's MST",
  description: 'Grows one tree outward, always taking the cheapest edge that reaches a new node.',
  pseudocode: [
    'tree = {any node}',
    'while tree does not cover the graph',
    '  find the cheapest edge leaving the tree',
    '  if none exists: stop',
    '  add that edge and its node to the tree',
  ],
  run: (state, t) => {
    const start = state.nodes[0]?.id;
    if (start === undefined) {
      t.step(0, 'The graph is empty — there is no spanning tree.', {});
      return;
    }

    const inTree = new Set<string>([start]);
    const chosen: string[] = [];
    let total = 0;

    t.mark(start, 'active');
    t.step(0, `Starting the tree at ${start}.`, { start });

    while (inTree.size < state.nodes.length) {
      let best: { from: string; to: string; edge: string; weight: number } | null = null;

      for (const node of inTree) {
        for (const { to, edge } of neighbours(state, node)) {
          if (inTree.has(to)) continue;
          const weight = state.weighted ? edge.weight : 1;

          for (const id of inTree) t.mark(id, 'visited');
          for (const id of chosen) t.mark(id, 'path');
          t.mark(edge.id, 'compare').mark(to, 'compare');
          t.step(2, `Edge ${node}–${to} costs ${weight}.`, { from: node, to, weight }, { comparisons: 1 });

          if (best === null || weight < best.weight) {
            best = { from: node, to, edge: edge.id, weight };
          }
        }
      }

      if (best === null) {
        for (const id of inTree) t.mark(id, 'visited');
        for (const id of chosen) t.mark(id, 'path');
        t.step(3, `No edge leaves the tree — the graph is disconnected, so only ${inTree.size} node(s) are covered.`, {
          covered: inTree.size,
        });
        return;
      }

      inTree.add(best.to);
      chosen.push(best.edge);
      total += best.weight;

      for (const id of inTree) t.mark(id, 'visited');
      for (const id of chosen) t.mark(id, 'path');
      t.mark(best.to, 'inserted');
      t.step(
        4,
        `Cheapest is ${best.from}–${best.to} at ${best.weight}. Tree cost is now ${total}.`,
        { added: best.to, weight: best.weight, total },
        { writes: 1 },
      );
    }

    for (const id of inTree) t.mark(id, 'path');
    for (const id of chosen) t.mark(id, 'path');
    t.step(1, `Spanning tree complete with ${chosen.length} edge(s), total weight ${total}.`, {
      edges: chosen.length,
      total,
    });
  },
};

/**
 * Kruskal deliberately reuses the union-find structure rather than reimplementing a disjoint set —
 * the cross-link the architecture calls out between the two explainer pages.
 */
export const kruskalMst: AlgorithmDef<GraphState> = {
  id: 'kruskal',
  name: "Kruskal's MST",
  description: 'Sorts every edge by weight and keeps the ones that join two different components.',
  pseudocode: [
    'sort edges by weight',
    'make a disjoint set per node',
    'for each edge (u, v) in order',
    '  if find(u) != find(v)',
    '    union(u, v) and keep the edge',
    '  else skip it — it would close a cycle',
  ],
  run: (state, t) => {
    if (state.nodes.length === 0) {
      t.step(0, 'The graph is empty — there is no spanning tree.', {});
      return;
    }

    const indexOf = new Map(state.nodes.map((node, index) => [node.id, index]));
    const dsu = createDsu(state.nodes.length);

    const sorted = [...state.edges].sort((a, b) => {
      const aw = state.weighted ? a.weight : 1;
      const bw = state.weighted ? b.weight : 1;
      return aw - bw || a.id.localeCompare(b.id);
    });

    const order = sorted
      .map((edge) => `${edge.from}${edge.to}:${state.weighted ? edge.weight : 1}`)
      .join(' ');
    t.step(0, `Edges sorted by weight — ${order}.`, { edges: sorted.length }, { comparisons: sorted.length });

    t.step(1, `Each of the ${state.nodes.length} node(s) starts in its own set.`, {
      sets: state.nodes.length,
    });

    const chosen: string[] = [];
    let total = 0;

    for (const edge of sorted) {
      const a = indexOf.get(edge.from) as number;
      const b = indexOf.get(edge.to) as number;
      const weight = state.weighted ? edge.weight : 1;

      const rootA = dsuFind(dsu, a);
      const rootB = dsuFind(dsu, b);

      for (const id of chosen) t.mark(id, 'path');
      t.mark(edge.id, 'compare').mark(edge.from, 'compare').mark(edge.to, 'compare');
      t.step(
        3,
        `${edge.from}–${edge.to} (weight ${weight}): are they already connected?`,
        { from: edge.from, to: edge.to, weight },
        { comparisons: 1 },
      );

      if (rootA === rootB) {
        for (const id of chosen) t.mark(id, 'path');
        t.mark(edge.id, 'removed');
        t.step(5, `Yes — taking ${edge.from}–${edge.to} would close a cycle, so skip it.`, {
          from: edge.from,
          to: edge.to,
        });
        continue;
      }

      dsuUnion(dsu, a, b);
      chosen.push(edge.id);
      total += weight;

      for (const id of chosen) t.mark(id, 'path');
      t.mark(edge.from, 'inserted').mark(edge.to, 'inserted');
      t.step(
        4,
        `No — merged their sets and kept the edge. Tree cost is now ${total}.`,
        { kept: chosen.length, total },
        { writes: 1 },
      );
    }

    for (const id of chosen) t.mark(id, 'path');
    for (const node of state.nodes) t.mark(node.id, 'path');
    t.step(
      2,
      chosen.length === state.nodes.length - 1
        ? `Spanning tree complete with ${chosen.length} edge(s), total weight ${total}.`
        : `The graph is disconnected — the forest has ${chosen.length} edge(s), total weight ${total}.`,
      { edges: chosen.length, total },
    );
  },
};
