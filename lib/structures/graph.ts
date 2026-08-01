import { connectedComponents, graphBfs, graphDfs } from '@/lib/algorithms/graph-search';
import { kruskalMst, primMst } from '@/lib/algorithms/mst';
import { dijkstra } from '@/lib/algorithms/shortest-path';
import { cycleDetectionGraph, topologicalSort } from '@/lib/algorithms/topological';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const GRAPH_MAX_NODES = 40;

export interface GraphNodeData {
  id: string;
  label: string;
}

export interface GraphEdgeData {
  id: string;
  from: string;
  to: string;
  weight: number;
}

export interface GraphState {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
  directed: boolean;
  weighted: boolean;
}

export function edgeId(from: string, to: string): string {
  return `edge-${from}-${to}`;
}

/** Neighbours of `id`, honouring the directed flag. */
export function neighbours(state: GraphState, id: string): Array<{ to: string; edge: GraphEdgeData }> {
  const out: Array<{ to: string; edge: GraphEdgeData }> = [];

  for (const edge of state.edges) {
    if (edge.from === id) out.push({ to: edge.to, edge });
    else if (!state.directed && edge.to === id) out.push({ to: edge.from, edge });
  }

  return out.sort((a, b) => a.to.localeCompare(b.to));
}

export function nodeLabel(state: GraphState, id: string): string {
  return state.nodes.find((node) => node.id === id)?.label ?? id;
}

function normalizeLabel(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed === '' ? null : trimmed;
}

export const graphStructure: StructureHandle = defineStructure<GraphState>({
  id: 'graph',
  name: 'Graph',
  slug: 'graph',
  category: 'graph',
  summary: 'Nodes joined by edges, stored as an adjacency list, directed or not and weighted or not.',
  create: () => ({ nodes: [], edges: [], directed: false, weighted: true }),
  seed: () => {
    const labels = ['A', 'B', 'C', 'D', 'E', 'F'];
    const nodes = labels.map((label) => ({ id: label, label }));
    const pairs: Array<[string, string, number]> = [
      ['A', 'B', 4],
      ['A', 'C', 2],
      ['B', 'C', 1],
      ['B', 'D', 5],
      ['C', 'D', 8],
      ['C', 'E', 10],
      ['D', 'E', 2],
      ['D', 'F', 6],
      ['E', 'F', 3],
    ];

    return {
      nodes,
      edges: pairs.map(([from, to, weight]) => ({ id: edgeId(from, to), from, to, weight })),
      directed: false,
      weighted: true,
    };
  },
  clone: (state) => ({
    nodes: state.nodes.map((node) => ({ ...node })),
    edges: state.edges.map((edge) => ({ ...edge })),
    directed: state.directed,
    weighted: state.weighted,
  }),

  operations: [
    {
      id: 'addNode',
      name: 'Add node',
      fields: [{ name: 'label', label: 'Label', type: 'string', placeholder: 'G' }],
      validate: (state, args) => {
        const label = normalizeLabel(args.label);
        if (label === null) return 'Enter a label for the node.';
        if (label.length > 3) return 'Labels may be at most 3 characters.';
        if (state.nodes.some((node) => node.id === label)) return `Node "${label}" already exists.`;
        if (state.nodes.length >= GRAPH_MAX_NODES) return 'Graph is full — 40 nodes maximum.';
        return null;
      },
      run: (state, args, t) => {
        const label = normalizeLabel(args.label) as string;
        state.nodes.push({ id: label, label });

        t.mark(label, 'inserted');
        t.step(0, `Added node ${label}. The graph now has ${state.nodes.length} node(s).`, { label }, { writes: 1 });
      },
    },
    {
      id: 'addEdge',
      name: 'Add edge',
      fields: [
        { name: 'from', label: 'From', type: 'string', placeholder: 'A' },
        { name: 'to', label: 'To', type: 'string', placeholder: 'B' },
        { name: 'weight', label: 'Weight', type: 'number', placeholder: '1', required: false },
      ],
      validate: (state, args) => {
        const from = normalizeLabel(args.from);
        const to = normalizeLabel(args.to);
        if (from === null || to === null) return 'Enter both endpoints.';
        if (from === to) return 'An edge must join two different nodes.';
        if (!state.nodes.some((node) => node.id === from)) return `Node "${from}" does not exist.`;
        if (!state.nodes.some((node) => node.id === to)) return `Node "${to}" does not exist.`;
        if (args.weight !== null && (typeof args.weight !== 'number' || !Number.isFinite(args.weight))) {
          return 'Weight must be a number.';
        }
        if (typeof args.weight === 'number' && args.weight < 0) return 'Weights must not be negative.';

        const duplicate = state.edges.some(
          (edge) =>
            (edge.from === from && edge.to === to) ||
            (!state.directed && edge.from === to && edge.to === from),
        );
        if (duplicate) return `An edge between ${from} and ${to} already exists.`;
        return null;
      },
      run: (state, args, t) => {
        const from = normalizeLabel(args.from) as string;
        const to = normalizeLabel(args.to) as string;
        const weight = typeof args.weight === 'number' ? args.weight : 1;

        const edge = { id: edgeId(from, to), from, to, weight };
        state.edges.push(edge);

        t.mark(from, 'active').mark(to, 'active').mark(edge.id, 'inserted');
        t.step(
          0,
          state.weighted
            ? `Joined ${from} and ${to} with weight ${weight}.`
            : `Joined ${from} and ${to}.`,
          { from, to, weight },
          { writes: 1 },
        );
      },
    },
    {
      id: 'removeEdge',
      name: 'Remove edge',
      fields: [
        { name: 'from', label: 'From', type: 'string' },
        { name: 'to', label: 'To', type: 'string' },
      ],
      validate: (state, args) => {
        const from = normalizeLabel(args.from);
        const to = normalizeLabel(args.to);
        if (from === null || to === null) return 'Enter both endpoints.';

        const found = state.edges.some(
          (edge) =>
            (edge.from === from && edge.to === to) ||
            (!state.directed && edge.from === to && edge.to === from),
        );
        if (!found) return `There is no edge between ${from} and ${to}.`;
        return null;
      },
      run: (state, args, t) => {
        const from = normalizeLabel(args.from) as string;
        const to = normalizeLabel(args.to) as string;

        const target = state.edges.find(
          (edge) =>
            (edge.from === from && edge.to === to) ||
            (!state.directed && edge.from === to && edge.to === from),
        ) as GraphEdgeData;

        t.mark(target.id, 'removed');
        t.step(0, `Removing the edge between ${from} and ${to}.`, { from, to }, { reads: 1 });

        state.edges = state.edges.filter((edge) => edge.id !== target.id);
        t.step(0, `Removed. ${state.edges.length} edge(s) remain.`, { edges: state.edges.length }, { writes: 1 });
      },
    },
    {
      id: 'removeNode',
      name: 'Remove node',
      fields: [{ name: 'label', label: 'Label', type: 'string' }],
      validate: (state, args) => {
        const label = normalizeLabel(args.label);
        if (label === null) return 'Enter the node to remove.';
        if (!state.nodes.some((node) => node.id === label)) return `Node "${label}" does not exist.`;
        return null;
      },
      run: (state, args, t) => {
        const label = normalizeLabel(args.label) as string;
        const attached = state.edges.filter((edge) => edge.from === label || edge.to === label);

        t.mark(label, 'removed');
        for (const edge of attached) t.mark(edge.id, 'removed');
        t.step(
          0,
          `Removing ${label} and its ${attached.length} incident edge(s).`,
          { label, edges: attached.length },
          { reads: 1 },
        );

        state.nodes = state.nodes.filter((node) => node.id !== label);
        state.edges = state.edges.filter((edge) => edge.from !== label && edge.to !== label);

        t.step(0, `Removed ${label}.`, { nodes: state.nodes.length }, { writes: 1 + attached.length });
      },
    },
    {
      id: 'toggleDirected',
      name: 'Toggle directed',
      fields: [],
      run: (state, _args, t) => {
        state.directed = !state.directed;
        t.step(
          0,
          state.directed
            ? 'Edges now run one way, from source to target.'
            : 'Edges now run both ways.',
          { directed: state.directed },
        );
      },
    },
    {
      id: 'toggleWeighted',
      name: 'Toggle weighted',
      fields: [],
      run: (state, _args, t) => {
        state.weighted = !state.weighted;
        t.step(
          0,
          state.weighted
            ? 'Edge weights are shown and used by the weighted algorithms.'
            : 'Every edge now counts as weight 1.',
          { weighted: state.weighted },
        );
      },
    },
  ],

  algorithms: [
    graphBfs,
    graphDfs,
    dijkstra,
    topologicalSort,
    cycleDetectionGraph,
    connectedComponents,
    primMst,
    kruskalMst,
  ],

  toScene: (state, marks) => ({
    kind: 'graph',
    directed: state.directed,
    weighted: state.weighted,
    nodes: state.nodes.map((node) => ({
      id: node.id,
      value: node.label,
      highlight: marks.get(node.id) ?? 'none',
    })),
    edges: state.edges.map((edge) => ({
      id: edge.id,
      from: edge.from,
      to: edge.to,
      weight: edge.weight,
      highlight: marks.get(edge.id) ?? 'none',
    })),
  }),

  complexity: {
    rows: [
      { operation: 'add node / edge', average: 'O(1)', worst: 'O(1)' },
      { operation: 'remove node', average: 'O(V + E)', worst: 'O(V + E)' },
      { operation: 'BFS / DFS', average: 'O(V + E)', worst: 'O(V + E)' },
      { operation: 'Dijkstra', average: 'O((V + E) log V)', worst: 'O((V + E) log V)' },
      { operation: 'Prim / Kruskal', average: 'O(E log V)', worst: 'O(E log V)' },
    ],
    space: 'O(V + E)',
  },
});
