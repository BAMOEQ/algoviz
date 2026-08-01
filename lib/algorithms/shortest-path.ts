import type { AlgorithmDef } from '@/lib/registry/types';
import { neighbours, type GraphState } from '@/lib/structures/graph';

export const dijkstra: AlgorithmDef<GraphState> = {
  id: 'dijkstra',
  name: "Dijkstra's Shortest Path",
  description: 'Settles the closest unvisited node each round, relaxing the edges leaving it.',
  pseudocode: [
    'dist[start] = 0, all others = infinity',
    'while unsettled nodes remain',
    '  u = unsettled node with smallest dist',
    '  settle u',
    '  for each edge (u, v)',
    '    if dist[u] + w < dist[v]',
    '      dist[v] = dist[u] + w',
  ],
  run: (state, t) => {
    const start = state.nodes[0]?.id;
    if (start === undefined) {
      t.step(0, 'The graph is empty — there is no path to find.', {});
      return;
    }

    const dist = new Map<string, number>();
    const previous = new Map<string, string>();
    const previousEdge = new Map<string, string>();
    const settled = new Set<string>();

    for (const node of state.nodes) dist.set(node.id, Number.POSITIVE_INFINITY);
    dist.set(start, 0);

    const format = (value: number) => (value === Number.POSITIVE_INFINITY ? '∞' : String(value));

    t.mark(start, 'active');
    t.step(0, `${start} is the source, so its distance is 0. Every other node starts at ∞.`, { start });

    for (;;) {
      let best: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const node of state.nodes) {
        if (settled.has(node.id)) continue;
        const candidate = dist.get(node.id) as number;
        if (candidate < bestDistance) {
          bestDistance = candidate;
          best = node.id;
        }
      }

      if (best === null) break;

      settled.add(best);

      for (const id of settled) t.mark(id, 'visited');
      t.mark(best, 'active');
      t.step(2, `${best} has the smallest tentative distance, ${format(bestDistance)} — settling it.`, {
        node: best,
        distance: bestDistance,
      }, { comparisons: state.nodes.length - settled.size + 1 });

      for (const { to, edge } of neighbours(state, best)) {
        if (settled.has(to)) continue;

        const weight = state.weighted ? edge.weight : 1;
        const through = bestDistance + weight;
        const existing = dist.get(to) as number;

        for (const id of settled) t.mark(id, 'visited');
        t.mark(best, 'active').mark(to, 'compare').mark(edge.id, 'compare');
        t.step(
          5,
          `Is ${format(bestDistance)} + ${weight} = ${through} better than ${to}'s current ${format(existing)}?`,
          { via: best, node: to, candidate: through, current: format(existing) },
          { comparisons: 1 },
        );

        if (through < existing) {
          dist.set(to, through);
          previous.set(to, best);
          previousEdge.set(to, edge.id);

          for (const id of settled) t.mark(id, 'visited');
          t.mark(to, 'inserted').mark(edge.id, 'path');
          t.step(6, `Yes — ${to}'s distance drops to ${through} via ${best}.`, {
            node: to,
            distance: through,
          }, { writes: 1 });
        }
      }
    }

    /* Highlight the tree of shortest paths that came out of it. */
    const target = state.nodes[state.nodes.length - 1]?.id;
    if (target !== undefined && (dist.get(target) as number) < Number.POSITIVE_INFINITY) {
      let cursor: string | undefined = target;
      const pathNodes: string[] = [];

      while (cursor !== undefined) {
        pathNodes.push(cursor);
        const edge = previousEdge.get(cursor);
        if (edge !== undefined) t.mark(edge, 'path');
        cursor = previous.get(cursor);
      }

      for (const id of pathNodes) t.mark(id, 'path');
      t.step(
        1,
        `Shortest path from ${start} to ${target} costs ${dist.get(target)}: ${pathNodes.reverse().join(' → ')}.`,
        { from: start, to: target, cost: dist.get(target) as number },
      );
      return;
    }

    for (const id of settled) t.mark(id, 'visited');
    t.step(1, `Settled every reachable node from ${start}.`, { settled: settled.size });
  },
};
