import type { AlgorithmDef } from '@/lib/registry/types';
import type { BstNode, BstState } from '@/lib/structures/bst';

/** Shared walk helper: visits ids in order and lets the caller narrate each stop. */
function childrenOf(state: BstState, id: string): { left: string | null; right: string | null } {
  const node: BstNode = state.nodes[id];
  return { left: node.left, right: node.right };
}

function markVisited(visited: readonly string[], t: Parameters<AlgorithmDef<BstState>['run']>[1]): void {
  for (const id of visited) t.mark(id, 'visited');
}

export const inorderTraversal: AlgorithmDef<BstState> = {
  id: 'inorder',
  name: 'In-order Traversal',
  description: 'Left subtree, node, right subtree — which yields a BST in sorted order.',
  pseudocode: [
    'inorder(node)',
    '  if node is null: return',
    '  inorder(node.left)',
    '  visit node',
    '  inorder(node.right)',
  ],
  run: (state, t) => {
    if (state.root === null) {
      t.step(1, 'The tree is empty — nothing to traverse.', {});
      return;
    }

    const visited: string[] = [];
    const output: number[] = [];

    const walk = (id: string | null, depth: number): void => {
      if (id === null) return;
      const { left, right } = childrenOf(state, id);

      markVisited(visited, t);
      t.mark(id, 'active');
      t.step(2, `Descending left from ${state.nodes[id].value}.`, { node: state.nodes[id].value, depth });
      walk(left, depth + 1);

      visited.push(id);
      output.push(state.nodes[id].value);
      markVisited(visited, t);
      t.mark(id, 'path');
      t.step(3, `Visit ${state.nodes[id].value}. Output so far: ${output.join(' ')}.`, {
        node: state.nodes[id].value,
        depth,
      }, { reads: 1 });

      markVisited(visited, t);
      t.mark(id, 'active');
      t.step(4, `Descending right from ${state.nodes[id].value}.`, { node: state.nodes[id].value, depth });
      walk(right, depth + 1);
    };

    walk(state.root, 0);

    markVisited(visited, t);
    t.step(1, `In-order output: ${output.join(' ')} — sorted, as a BST guarantees.`, {
      count: output.length,
    });
  },
};

export const preorderTraversal: AlgorithmDef<BstState> = {
  id: 'preorder',
  name: 'Pre-order Traversal',
  description: 'Node first, then subtrees — the order you would use to copy a tree.',
  pseudocode: [
    'preorder(node)',
    '  if node is null: return',
    '  visit node',
    '  preorder(node.left)',
    '  preorder(node.right)',
  ],
  run: (state, t) => {
    if (state.root === null) {
      t.step(1, 'The tree is empty — nothing to traverse.', {});
      return;
    }

    const visited: string[] = [];
    const output: number[] = [];

    const walk = (id: string | null, depth: number): void => {
      if (id === null) return;
      const { left, right } = childrenOf(state, id);

      visited.push(id);
      output.push(state.nodes[id].value);
      markVisited(visited, t);
      t.mark(id, 'path');
      t.step(2, `Visit ${state.nodes[id].value}. Output so far: ${output.join(' ')}.`, {
        node: state.nodes[id].value,
        depth,
      }, { reads: 1 });

      walk(left, depth + 1);
      walk(right, depth + 1);
    };

    walk(state.root, 0);

    markVisited(visited, t);
    t.step(1, `Pre-order output: ${output.join(' ')}.`, { count: output.length });
  },
};

export const postorderTraversal: AlgorithmDef<BstState> = {
  id: 'postorder',
  name: 'Post-order Traversal',
  description: 'Both subtrees before the node — the order you would use to free a tree.',
  pseudocode: [
    'postorder(node)',
    '  if node is null: return',
    '  postorder(node.left)',
    '  postorder(node.right)',
    '  visit node',
  ],
  run: (state, t) => {
    if (state.root === null) {
      t.step(1, 'The tree is empty — nothing to traverse.', {});
      return;
    }

    const visited: string[] = [];
    const output: number[] = [];

    const walk = (id: string | null, depth: number): void => {
      if (id === null) return;
      const { left, right } = childrenOf(state, id);

      walk(left, depth + 1);
      walk(right, depth + 1);

      visited.push(id);
      output.push(state.nodes[id].value);
      markVisited(visited, t);
      t.mark(id, 'path');
      t.step(4, `Visit ${state.nodes[id].value}. Output so far: ${output.join(' ')}.`, {
        node: state.nodes[id].value,
        depth,
      }, { reads: 1 });
    };

    walk(state.root, 0);

    markVisited(visited, t);
    t.step(1, `Post-order output: ${output.join(' ')}.`, { count: output.length });
  },
};

export const levelorderTraversal: AlgorithmDef<BstState> = {
  id: 'levelorder',
  name: 'Level-order Traversal',
  description: 'Breadth-first, one level at a time, using a queue.',
  pseudocode: [
    'queue = [root]',
    'while queue is not empty',
    '  node = queue.shift()',
    '  visit node',
    '  push node.left and node.right',
  ],
  run: (state, t) => {
    if (state.root === null) {
      t.step(0, 'The tree is empty — nothing to traverse.', {});
      return;
    }

    const queue: Array<{ id: string; depth: number }> = [{ id: state.root, depth: 0 }];
    const visited: string[] = [];
    const output: number[] = [];

    t.mark(state.root, 'active');
    t.step(0, `Queue starts with the root, ${state.nodes[state.root].value}.`, { queued: 1 });

    while (queue.length > 0) {
      const { id, depth } = queue.shift() as { id: string; depth: number };
      const { left, right } = childrenOf(state, id);

      visited.push(id);
      output.push(state.nodes[id].value);

      markVisited(visited, t);
      t.mark(id, 'path');
      t.step(3, `Level ${depth}: visit ${state.nodes[id].value}. Output: ${output.join(' ')}.`, {
        node: state.nodes[id].value,
        depth,
      }, { reads: 1 });

      if (left !== null) queue.push({ id: left, depth: depth + 1 });
      if (right !== null) queue.push({ id: right, depth: depth + 1 });

      if (queue.length > 0) {
        markVisited(visited, t);
        for (const queued of queue) t.mark(queued.id, 'compare');
        t.step(4, `Queued ${queue.length} node(s) for the next level.`, { queued: queue.length });
      }
    }

    markVisited(visited, t);
    t.step(1, `Level-order output: ${output.join(' ')}.`, { count: output.length });
  },
};

export const bstHeight: AlgorithmDef<BstState> = {
  id: 'bst-height',
  name: 'Height',
  description: 'The longest root-to-leaf path, computed bottom-up.',
  pseudocode: [
    'height(node)',
    '  if node is null: return -1',
    '  return 1 + max(height(left), height(right))',
  ],
  run: (state, t) => {
    if (state.root === null) {
      t.step(1, 'An empty tree has height -1 by convention.', { height: -1 });
      return;
    }

    const visited: string[] = [];

    const height = (id: string | null): number => {
      if (id === null) return -1;
      const { left, right } = childrenOf(state, id);

      const leftHeight = height(left);
      const rightHeight = height(right);
      const own = 1 + Math.max(leftHeight, rightHeight);

      visited.push(id);
      markVisited(visited, t);
      t.mark(id, 'active');
      t.step(
        2,
        `${state.nodes[id].value}: left subtree ${leftHeight}, right ${rightHeight} — height ${own}.`,
        { node: state.nodes[id].value, height: own },
        { comparisons: 1 },
      );

      return own;
    };

    const result = height(state.root);

    markVisited(visited, t);
    t.mark(state.root, 'path');
    t.step(2, `The tree's height is ${result}.`, { height: result });
  },
};

export const bstValidate: AlgorithmDef<BstState> = {
  id: 'bst-validate',
  name: 'Validate BST',
  description: 'Checks every node against the min/max window its ancestors impose.',
  pseudocode: [
    'validate(node, low, high)',
    '  if node is null: return true',
    '  if node.value <= low or node.value >= high',
    '    return false',
    '  return validate(left, low, node.value)',
    '     and validate(right, node.value, high)',
  ],
  run: (state, t) => {
    if (state.root === null) {
      t.step(1, 'An empty tree is trivially a valid BST.', { valid: true });
      return;
    }

    const visited: string[] = [];
    let valid = true;

    const check = (id: string | null, low: number, high: number): boolean => {
      if (id === null) return true;
      const node = state.nodes[id];

      visited.push(id);
      markVisited(visited, t);
      t.mark(id, 'compare');

      const lowLabel = low === Number.NEGATIVE_INFINITY ? '-∞' : String(low);
      const highLabel = high === Number.POSITIVE_INFINITY ? '+∞' : String(high);

      t.step(
        2,
        `${node.value} must sit strictly between ${lowLabel} and ${highLabel}.`,
        { node: node.value, low: lowLabel, high: highLabel },
        { comparisons: 1 },
      );

      if (node.value <= low || node.value >= high) {
        t.mark(id, 'removed');
        t.step(3, `${node.value} breaks the BST invariant.`, { node: node.value });
        valid = false;
        return false;
      }

      return check(node.left, low, node.value) && check(node.right, node.value, high);
    };

    check(state.root, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);

    markVisited(visited, t);
    t.step(
      1,
      valid ? 'Every node sits inside its window — this is a valid BST.' : 'This is not a valid BST.',
      { valid },
    );
  },
};

export const bstSuccessor: AlgorithmDef<BstState> = {
  id: 'bst-successor',
  name: 'In-order Successor',
  description: 'Finds the next-largest value after the root, without a full traversal.',
  pseudocode: [
    'if node.right is not null',
    '  return leftmost(node.right)',
    'else',
    '  walk up until node is a left child',
  ],
  run: (state, t) => {
    if (state.root === null) {
      t.step(0, 'The tree is empty — there is no successor.', {});
      return;
    }

    const rootNode = state.nodes[state.root];
    t.mark(state.root, 'active');
    t.step(0, `Finding the in-order successor of the root, ${rootNode.value}.`, { node: rootNode.value });

    if (rootNode.right === null) {
      t.step(3, `${rootNode.value} has no right subtree, and it is the root — it has no successor here.`, {
        node: rootNode.value,
      });
      return;
    }

    let currentId = rootNode.right;
    const path = [state.root, currentId];

    t.mark(state.root, 'visited').mark(currentId, 'active');
    t.step(1, `Step once right to ${state.nodes[currentId].value}, then go left as far as possible.`, {
      node: state.nodes[currentId].value,
    });

    while (state.nodes[currentId].left !== null) {
      currentId = state.nodes[currentId].left as string;
      path.push(currentId);

      for (const id of path) t.mark(id, 'visited');
      t.mark(currentId, 'active');
      t.step(1, `Left to ${state.nodes[currentId].value}.`, { node: state.nodes[currentId].value }, { reads: 1 });
    }

    for (const id of path) t.mark(id, 'visited');
    t.mark(currentId, 'path');
    t.step(1, `The successor of ${rootNode.value} is ${state.nodes[currentId].value}.`, {
      successor: state.nodes[currentId].value,
    });
  },
};
