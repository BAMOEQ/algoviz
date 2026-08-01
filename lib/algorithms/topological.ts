import type { AlgorithmDef } from '@/lib/registry/types';
import { neighbours, type GraphState } from '@/lib/structures/graph';

export const topologicalSort: AlgorithmDef<GraphState> = {
  id: 'topological-sort',
  name: 'Topological Sort',
  description: "Kahn's algorithm: repeatedly take a node with no remaining prerequisites.",
  pseudocode: [
    'compute in-degree of every node',
    'ready = nodes with in-degree 0',
    'while ready is not empty',
    '  node = ready.shift(); output node',
    '  for each edge (node, v)',
    '    decrement in-degree of v',
    '    if it reaches 0, add v to ready',
    'if output is short, a cycle exists',
  ],
  run: (state, t) => {
    if (!state.directed) {
      t.step(0, 'Topological order is only defined for directed graphs — toggle Directed first.', {});
      return;
    }

    if (state.nodes.length === 0) {
      t.step(0, 'The graph is empty — the order is empty too.', {});
      return;
    }

    const inDegree = new Map<string, number>();
    for (const node of state.nodes) inDegree.set(node.id, 0);
    for (const edge of state.edges) {
      inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    }

    const summary = state.nodes.map((node) => `${node.id}:${inDegree.get(node.id)}`).join(' ');
    t.step(0, `In-degrees — ${summary}.`, { nodes: state.nodes.length }, { reads: state.edges.length });

    const ready = state.nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id);
    const output: string[] = [];

    for (const id of ready) t.mark(id, 'compare');
    t.step(1, `${ready.length} node(s) have no prerequisites: ${ready.join(' ') || '—'}.`, {
      ready: ready.length,
    });

    while (ready.length > 0) {
      const node = ready.shift() as string;
      output.push(node);

      for (const id of output) t.mark(id, 'path');
      for (const id of ready) t.mark(id, 'compare');
      t.mark(node, 'active');
      t.step(3, `Output ${node}. Order so far: ${output.join(' ')}.`, { node, placed: output.length });

      for (const { to, edge } of neighbours(state, node)) {
        const remaining = (inDegree.get(to) ?? 0) - 1;
        inDegree.set(to, remaining);

        for (const id of output) t.mark(id, 'path');
        t.mark(to, 'compare').mark(edge.id, 'visited');
        t.step(5, `${to} now has ${remaining} unmet prerequisite(s).`, { node: to, inDegree: remaining }, { writes: 1 });

        if (remaining === 0) {
          ready.push(to);
          for (const id of output) t.mark(id, 'path');
          t.mark(to, 'inserted');
          t.step(6, `${to} is ready — added to the queue.`, { node: to });
        }
      }
    }

    if (output.length < state.nodes.length) {
      for (const node of state.nodes) {
        if (!output.includes(node.id)) t.mark(node.id, 'removed');
      }
      t.step(7, `Only ${output.length} of ${state.nodes.length} nodes could be ordered — the graph has a cycle.`, {
        ordered: output.length,
      });
      return;
    }

    for (const id of output) t.mark(id, 'path');
    t.step(7, `Topological order: ${output.join(' → ')}.`, { ordered: output.length });
  },
};

export const cycleDetectionGraph: AlgorithmDef<GraphState> = {
  id: 'graph-cycle-detection',
  name: 'Cycle Detection',
  description: 'Depth-first search that flags an edge back into the current recursion stack.',
  pseudocode: [
    'for each unvisited node',
    '  dfs(node)',
    'dfs(node)',
    '  mark node in-progress',
    '  for each neighbour',
    '    if in-progress: cycle found',
    '    else if unvisited: dfs(neighbour)',
    '  mark node done',
  ],
  run: (state, t) => {
    if (state.nodes.length === 0) {
      t.step(0, 'The graph is empty — there is no cycle.', {});
      return;
    }

    const IN_PROGRESS = 1;
    const DONE = 2;
    const marks = new Map<string, number>();
    let cycleFound = false;

    const visit = (id: string, parent: string | null): boolean => {
      marks.set(id, IN_PROGRESS);

      for (const [node, mark] of marks) if (mark === DONE) t.mark(node, 'visited');
      t.mark(id, 'active');
      t.step(3, `${id} is now on the recursion stack.`, { node: id }, { reads: 1 });

      for (const { to, edge } of neighbours(state, id)) {
        /* In an undirected graph the edge you arrived on is not a cycle. */
        if (!state.directed && to === parent) continue;

        const mark = marks.get(to);

        for (const [node, value] of marks) if (value === DONE) t.mark(node, 'visited');
        t.mark(id, 'active').mark(to, 'compare').mark(edge.id, 'compare');
        t.step(5, `Is ${to} already on the stack?`, { node: id, neighbour: to }, { comparisons: 1 });

        if (mark === IN_PROGRESS) {
          t.mark(id, 'removed').mark(to, 'removed').mark(edge.id, 'removed');
          t.step(5, `${to} is still on the stack — the edge ${id}→${to} closes a cycle.`, {
            from: id,
            to,
          });
          cycleFound = true;
          return true;
        }

        if (mark === undefined && visit(to, id)) return true;
      }

      marks.set(id, DONE);

      for (const [node, value] of marks) if (value === DONE) t.mark(node, 'visited');
      t.step(7, `${id} is finished — no cycle through it.`, { node: id });
      return false;
    };

    for (const node of state.nodes) {
      if (marks.has(node.id)) continue;
      if (visit(node.id, null)) break;
    }

    if (!cycleFound) {
      for (const node of state.nodes) t.mark(node.id, 'visited');
      t.step(0, 'Every node finished without revisiting the stack — the graph is acyclic.', { cycle: false });
    }
  },
};
