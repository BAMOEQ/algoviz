import {
  bstHeight,
  bstSuccessor,
  bstValidate,
  inorderTraversal,
  levelorderTraversal,
  postorderTraversal,
  preorderTraversal,
} from '@/lib/algorithms/tree-traversal';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const TREE_MAX = 63;

export interface BstNode {
  id: string;
  value: number;
  left: string | null;
  right: string | null;
}

export interface BstState {
  nodes: Record<string, BstNode>;
  root: string | null;
  /** Monotonic id source, so a node keeps its id for its whole life and `motion` can track it. */
  counter: number;
}

export function bstNodes(state: BstState): BstNode[] {
  return Object.values(state.nodes);
}

/** In-order value walk, used by the validate algorithm and by tests. */
export function bstInorderValues(state: BstState): number[] {
  const out: number[] = [];
  const walk = (id: string | null): void => {
    if (id === null) return;
    const node = state.nodes[id];
    walk(node.left);
    out.push(node.value);
    walk(node.right);
  };
  walk(state.root);
  return out;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function insertValue(state: BstState, value: number): string {
  const id = `bst-${state.counter}`;
  state.counter += 1;
  state.nodes[id] = { id, value, left: null, right: null };

  if (state.root === null) {
    state.root = id;
    return id;
  }

  let currentId = state.root;
  for (;;) {
    const current = state.nodes[currentId];
    if (value < current.value) {
      if (current.left === null) {
        current.left = id;
        return id;
      }
      currentId = current.left;
    } else {
      if (current.right === null) {
        current.right = id;
        return id;
      }
      currentId = current.right;
    }
  }
}

function findParent(state: BstState, targetId: string): BstNode | null {
  for (const node of bstNodes(state)) {
    if (node.left === targetId || node.right === targetId) return node;
  }
  return null;
}

function replaceChild(state: BstState, parent: BstNode | null, childId: string, replacement: string | null): void {
  if (parent === null) {
    state.root = replacement;
    return;
  }
  if (parent.left === childId) parent.left = replacement;
  else parent.right = replacement;
}

export const bstStructure: StructureHandle = defineStructure<BstState>({
  id: 'bst',
  name: 'Binary Search Tree',
  slug: 'binary-search-tree',
  category: 'tree',
  summary: 'A tree whose every left subtree holds smaller values and every right subtree larger.',
  create: () => ({ nodes: {}, root: null, counter: 0 }),
  seed: () => {
    const state: BstState = { nodes: {}, root: null, counter: 0 };
    for (const value of [50, 30, 70, 20, 40, 60, 80]) insertValue(state, value);
    return state;
  },
  clone: (state) => ({
    nodes: Object.fromEntries(Object.entries(state.nodes).map(([id, node]) => [id, { ...node }])),
    root: state.root,
    counter: state.counter,
  }),

  operations: [
    {
      id: 'insert',
      name: 'Insert',
      fields: [{ name: 'value', label: 'Value', type: 'number' }],
      validate: (state, args) => {
        if (!isFiniteNumber(args.value)) return 'Value must be a number.';
        if (bstNodes(state).length >= TREE_MAX) return 'Tree is full — 63 nodes maximum.';
        return null;
      },
      run: (state, args, t) => {
        const value = args.value as number;

        if (state.root === null) {
          const id = insertValue(state, value);
          t.mark(id, 'inserted');
          t.step(0, `${value} becomes the root.`, { value }, { writes: 1 });
          return;
        }

        let currentId: string | null = state.root;
        let depth = 0;

        while (currentId !== null) {
          const current: BstNode = state.nodes[currentId];
          t.mark(currentId, 'compare');
          t.step(
            0,
            `Compare ${value} with ${current.value} — go ${value < current.value ? 'left' : 'right'}.`,
            { value, node: current.value, depth },
            { comparisons: 1 },
          );

          const nextId: string | null = value < current.value ? current.left : current.right;
          if (nextId === null) break;
          currentId = nextId;
          depth += 1;
        }

        const id = insertValue(state, value);
        t.mark(id, 'inserted');
        t.step(0, `Inserted ${value} at depth ${depth + 1}.`, { value, depth: depth + 1 }, { writes: 1 });
      },
    },
    {
      id: 'search',
      name: 'Search',
      fields: [{ name: 'value', label: 'Value', type: 'number' }],
      validate: (state, args) => {
        if (!isFiniteNumber(args.value)) return 'Value must be a number.';
        if (state.root === null) return 'Tree is empty — insert a value first.';
        return null;
      },
      run: (state, args, t) => {
        const value = args.value as number;
        let currentId: string | null = state.root;
        const path: string[] = [];

        while (currentId !== null) {
          const current: BstNode = state.nodes[currentId];
          path.push(currentId);

          for (const seen of path) t.mark(seen, 'visited');
          t.mark(currentId, 'compare');
          t.step(0, `Compare ${value} with ${current.value}.`, { value, node: current.value }, { comparisons: 1 });

          if (current.value === value) {
            for (const seen of path) t.mark(seen, 'path');
            t.step(0, `Found ${value} after ${path.length} comparison(s).`, { value, depth: path.length - 1 });
            return;
          }

          currentId = value < current.value ? current.left : current.right;
        }

        for (const seen of path) t.mark(seen, 'visited');
        t.step(0, `${value} is not in the tree.`, { value });
      },
    },
    {
      id: 'delete',
      name: 'Delete',
      fields: [{ name: 'value', label: 'Value', type: 'number' }],
      validate: (state, args) => {
        if (!isFiniteNumber(args.value)) return 'Value must be a number.';
        if (state.root === null) return 'Tree is empty — nothing to delete.';
        return null;
      },
      run: (state, args, t) => {
        const value = args.value as number;

        let targetId: string | null = state.root;
        while (targetId !== null && state.nodes[targetId].value !== value) {
          const node: BstNode = state.nodes[targetId];
          t.mark(targetId, 'compare');
          t.step(0, `Compare ${value} with ${node.value}.`, { value }, { comparisons: 1 });
          targetId = value < node.value ? node.left : node.right;
        }

        if (targetId === null) {
          t.step(0, `${value} is not in the tree — nothing to delete.`, { value });
          return;
        }

        const target = state.nodes[targetId];
        t.mark(targetId, 'removed');
        t.step(0, `Found ${value}. Removing it.`, { value }, { reads: 1 });

        const parent = findParent(state, targetId);

        if (target.left === null || target.right === null) {
          const child = target.left ?? target.right;
          replaceChild(state, parent, targetId, child);
          delete state.nodes[targetId];

          t.step(
            0,
            child === null
              ? `${value} was a leaf — removed outright.`
              : `${value} had one child, which took its place.`,
            { value },
            { writes: 1 },
          );
          return;
        }

        /* Two children: replace the value with its in-order successor (leftmost of the right
         * subtree), then delete that successor node, which has at most one child by construction. */
        let successorId = target.right;
        while (state.nodes[successorId].left !== null) {
          successorId = state.nodes[successorId].left as string;
        }

        t.mark(targetId, 'removed').mark(successorId, 'active');
        t.step(
          0,
          `${value} has two children — its in-order successor is ${state.nodes[successorId].value}.`,
          { value, successor: state.nodes[successorId].value },
          { reads: 1 },
        );

        const successorValue = state.nodes[successorId].value;
        const successorParent = findParent(state, successorId);
        replaceChild(state, successorParent, successorId, state.nodes[successorId].right);
        delete state.nodes[successorId];
        target.value = successorValue;

        t.mark(targetId, 'inserted');
        t.step(0, `${successorValue} moved up to replace ${value}.`, { value: successorValue }, { writes: 1 });
      },
    },
    {
      id: 'min',
      name: 'Min',
      fields: [],
      validate: (state) => (state.root === null ? 'Tree is empty — insert a value first.' : null),
      run: (state, _args, t) => {
        let currentId = state.root as string;
        const path: string[] = [];

        for (;;) {
          path.push(currentId);
          for (const seen of path) t.mark(seen, 'visited');
          t.mark(currentId, 'active');
          t.step(0, `At ${state.nodes[currentId].value} — the minimum is always leftmost.`, {}, { reads: 1 });

          const left = state.nodes[currentId].left;
          if (left === null) break;
          currentId = left;
        }

        for (const seen of path) t.mark(seen, 'path');
        t.step(0, `Minimum is ${state.nodes[currentId].value}.`, { min: state.nodes[currentId].value });
      },
    },
    {
      id: 'max',
      name: 'Max',
      fields: [],
      validate: (state) => (state.root === null ? 'Tree is empty — insert a value first.' : null),
      run: (state, _args, t) => {
        let currentId = state.root as string;
        const path: string[] = [];

        for (;;) {
          path.push(currentId);
          for (const seen of path) t.mark(seen, 'visited');
          t.mark(currentId, 'active');
          t.step(0, `At ${state.nodes[currentId].value} — the maximum is always rightmost.`, {}, { reads: 1 });

          const right = state.nodes[currentId].right;
          if (right === null) break;
          currentId = right;
        }

        for (const seen of path) t.mark(seen, 'path');
        t.step(0, `Maximum is ${state.nodes[currentId].value}.`, { max: state.nodes[currentId].value });
      },
    },
  ],

  algorithms: [
    inorderTraversal,
    preorderTraversal,
    postorderTraversal,
    levelorderTraversal,
    bstHeight,
    bstValidate,
    bstSuccessor,
  ],

  toScene: (state, marks) => {
    const nodes = bstNodes(state).map((node) => ({
      id: node.id,
      value: node.value,
      highlight: marks.get(node.id) ?? 'none',
    }));

    const edges = bstNodes(state).flatMap((node) => {
      const children: Array<{ id: string; to: string }> = [];
      /* Left before right so the tidy layout keeps BST ordering visually. */
      if (node.left !== null) children.push({ id: `edge-${node.id}-L`, to: node.left });
      if (node.right !== null) children.push({ id: `edge-${node.id}-R`, to: node.right });

      return children.map((child) => ({
        id: child.id,
        from: node.id,
        to: child.to,
        highlight: marks.get(child.id) ?? 'none',
      }));
    });

    return { kind: 'tree', nodes, edges };
  },

  complexity: {
    rows: [
      { operation: 'search', average: 'O(log n)', worst: 'O(n)' },
      { operation: 'insert', average: 'O(log n)', worst: 'O(n)' },
      { operation: 'delete', average: 'O(log n)', worst: 'O(n)' },
      { operation: 'min / max', average: 'O(log n)', worst: 'O(n)' },
      { operation: 'in-order walk', average: 'O(n)', worst: 'O(n)' },
    ],
    space: 'O(n)',
  },
});
