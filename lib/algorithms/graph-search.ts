import type { AlgorithmDef } from '@/lib/registry/types';
import { neighbours, type GraphState } from '@/lib/structures/graph';

function startNode(state: GraphState): string | null {
  return state.nodes[0]?.id ?? null;
}

export const graphBfs: AlgorithmDef<GraphState> = {
  id: 'bfs',
  name: 'Breadth-First Search',
  description: 'Explores the graph in rings, using a queue — which is what makes it find shortest hop counts.',
  pseudocode: [
    'queue = [start], seen = {start}',
    'while queue is not empty',
    '  node = queue.shift()',
    '  visit node',
    '  for each neighbour not seen',
    '    mark seen and enqueue',
  ],
  run: (state, t) => {
    const start = startNode(state);
    if (start === null) {
      t.step(0, 'The graph is empty — there is nothing to search.', {});
      return;
    }

    const seen = new Set<string>([start]);
    const queue: string[] = [start];
    const visited: string[] = [];
    const treeEdges: string[] = [];

    t.mark(start, 'active');
    t.step(0, `Starting from ${start}. The queue holds 1 node.`, { queued: 1 });

    while (queue.length > 0) {
      const node = queue.shift() as string;
      visited.push(node);

      for (const id of visited) t.mark(id, 'visited');
      for (const id of treeEdges) t.mark(id, 'path');
      t.mark(node, 'active');
      t.step(3, `Visiting ${node}. Visited ${visited.length} of ${state.nodes.length}.`, {
        node,
        visited: visited.length,
      }, { reads: 1 });

      for (const { to, edge } of neighbours(state, node)) {
        for (const id of visited) t.mark(id, 'visited');
        for (const id of treeEdges) t.mark(id, 'path');
        t.mark(node, 'active').mark(to, 'compare').mark(edge.id, 'compare');
        t.step(4, `Is ${to} already seen?`, { node, neighbour: to }, { comparisons: 1 });

        if (seen.has(to)) continue;

        seen.add(to);
        queue.push(to);
        treeEdges.push(edge.id);

        for (const id of visited) t.mark(id, 'visited');
        for (const id of treeEdges) t.mark(id, 'path');
        t.mark(to, 'inserted');
        t.step(5, `Enqueued ${to}. The queue holds ${queue.length}.`, { queued: queue.length });
      }
    }

    for (const id of visited) t.mark(id, 'visited');
    for (const id of treeEdges) t.mark(id, 'path');
    t.step(1, `Reached ${visited.length} node(s) in breadth-first order: ${visited.join(' ')}.`, {
      reached: visited.length,
    });
  },
};

export const graphDfs: AlgorithmDef<GraphState> = {
  id: 'dfs',
  name: 'Depth-First Search',
  description: 'Follows one branch as deep as it goes before backtracking, using an explicit stack.',
  pseudocode: [
    'stack = [start]',
    'while stack is not empty',
    '  node = stack.pop()',
    '  if node already seen: continue',
    '  visit node',
    '  push every neighbour',
  ],
  run: (state, t) => {
    const start = startNode(state);
    if (start === null) {
      t.step(0, 'The graph is empty — there is nothing to search.', {});
      return;
    }

    const seen = new Set<string>();
    const stack: string[] = [start];
    const visited: string[] = [];
    const treeEdges: string[] = [];

    t.mark(start, 'active');
    t.step(0, `Pushing the start node ${start} onto the stack.`, { stack: 1 });

    while (stack.length > 0) {
      const node = stack.pop() as string;

      if (seen.has(node)) {
        for (const id of visited) t.mark(id, 'visited');
        t.mark(node, 'compare');
        t.step(3, `${node} was already visited — skipping it.`, { node }, { comparisons: 1 });
        continue;
      }

      seen.add(node);
      visited.push(node);

      for (const id of visited) t.mark(id, 'visited');
      for (const id of treeEdges) t.mark(id, 'path');
      t.mark(node, 'active');
      t.step(4, `Visiting ${node} at depth ${visited.length - 1}.`, { node }, { reads: 1 });

      const next = neighbours(state, node).filter(({ to }) => !seen.has(to));

      for (const { to, edge } of [...next].reverse()) {
        stack.push(to);
        treeEdges.push(edge.id);
      }

      if (next.length > 0) {
        for (const id of visited) t.mark(id, 'visited');
        for (const id of treeEdges) t.mark(id, 'path');
        for (const { to } of next) t.mark(to, 'compare');
        t.step(5, `Pushed ${next.length} neighbour(s). The stack holds ${stack.length}.`, {
          stack: stack.length,
        });
      }
    }

    for (const id of visited) t.mark(id, 'visited');
    t.step(1, `Reached ${visited.length} node(s) in depth-first order: ${visited.join(' ')}.`, {
      reached: visited.length,
    });
  },
};

export const connectedComponents: AlgorithmDef<GraphState> = {
  id: 'connected-components',
  name: 'Connected Components',
  description: 'Repeatedly floods from an unvisited node; each flood is one component.',
  pseudocode: [
    'components = 0',
    'for each node not seen',
    '  components = components + 1',
    '  flood fill from node',
    'return components',
  ],
  run: (state, t) => {
    if (state.nodes.length === 0) {
      t.step(4, 'The graph is empty — it has 0 components.', { components: 0 });
      return;
    }

    const seen = new Set<string>();
    let components = 0;

    for (const node of state.nodes) {
      if (seen.has(node.id)) continue;

      components += 1;
      const members: string[] = [];
      const queue = [node.id];
      seen.add(node.id);

      for (const id of seen) t.mark(id, 'visited');
      t.mark(node.id, 'active');
      t.step(2, `${node.id} has not been seen — starting component ${components}.`, { components });

      while (queue.length > 0) {
        const current = queue.shift() as string;
        members.push(current);

        for (const id of seen) t.mark(id, 'visited');
        for (const id of members) t.mark(id, 'path');
        t.step(3, `Component ${components} now holds ${members.join(' ')}.`, {
          component: components,
          size: members.length,
        }, { reads: 1 });

        for (const { to } of neighbours(state, current)) {
          if (seen.has(to)) continue;
          seen.add(to);
          queue.push(to);
        }
      }
    }

    for (const node of state.nodes) t.mark(node.id, 'visited');
    t.step(
      4,
      components === 1
        ? 'The graph is fully connected — 1 component.'
        : `The graph has ${components} separate components.`,
      { components },
    );
  },
};
