import { hierarchy, tree as d3tree, type HierarchyPointNode } from 'd3-hierarchy';
import type { Edge, TNode } from '@/lib/engine/types';

export interface TreeNodeBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TreeLayout {
  boxes: TreeNodeBox[];
  width: number;
  height: number;
}

export interface TreeLayoutOptions {
  nodeSize?: number;
  /** Horizontal gap between adjacent nodes on the same level. */
  gap?: number;
  /** Vertical distance between levels. */
  levelHeight?: number;
}

interface Shaped {
  id: string;
  children: Shaped[];
}

/**
 * Reingold–Tilford tidy layout, via `d3-hierarchy` for the math only — nothing here renders.
 *
 * Pure and deterministic: the same nodes and edges always produce the same coordinates, which is
 * what makes the layout testable and screenshots reproducible. Edge order defines child order, so
 * a BST's left child must be emitted before its right child.
 */
export function layoutTree(
  nodes: readonly TNode[],
  edges: readonly Edge[],
  options?: TreeLayoutOptions,
): TreeLayout {
  const nodeSize = options?.nodeSize ?? 48;
  const gap = options?.gap ?? 24;
  const levelHeight = options?.levelHeight ?? 76;

  if (nodes.length === 0) {
    return { boxes: [], width: 0, height: 0 };
  }

  const childIds = new Map<string, string[]>();
  const hasParent = new Set<string>();

  for (const edge of edges) {
    const siblings = childIds.get(edge.from) ?? [];
    siblings.push(edge.to);
    childIds.set(edge.from, siblings);
    hasParent.add(edge.to);
  }

  const roots = nodes.filter((node) => !hasParent.has(node.id));
  if (roots.length === 0) {
    /* Every node has a parent, so the edges describe a cycle rather than a tree. Fall back to a
     * single row so the view still renders something honest instead of throwing. */
    return rowFallback(nodes, nodeSize, gap);
  }

  const shape = (id: string, seen: Set<string>): Shaped => {
    seen.add(id);
    const children = (childIds.get(id) ?? [])
      .filter((childId) => !seen.has(childId))
      .map((childId) => shape(childId, seen));
    return { id, children };
  };

  const seen = new Set<string>();
  const forest = roots.map((root) => shape(root.id, seen));

  /* A synthetic parent lets a forest (a trie's first letters, a disconnected heap) lay out with
   * the same algorithm as a single-rooted tree; it is dropped before the boxes are returned. */
  const SYNTHETIC_ROOT = '__algoviz_root__';
  const rootShape: Shaped =
    forest.length === 1 ? forest[0] : { id: SYNTHETIC_ROOT, children: forest };

  const laidOut = d3tree<Shaped>()
    .nodeSize([nodeSize + gap, levelHeight])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.25))(hierarchy(rootShape, (d) => d.children));

  const points: Array<HierarchyPointNode<Shaped>> = laidOut
    .descendants()
    .filter((point) => point.data.id !== SYNTHETIC_ROOT);

  const yOffset = forest.length === 1 ? 0 : -levelHeight;

  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y + yOffset));

  const boxes = points.map((point) => ({
    id: point.data.id,
    x: point.x - minX,
    y: point.y + yOffset,
    width: nodeSize,
    height: nodeSize,
  }));

  return {
    boxes,
    width: maxX - minX + nodeSize,
    height: maxY + nodeSize,
  };
}

function rowFallback(nodes: readonly TNode[], nodeSize: number, gap: number): TreeLayout {
  return {
    boxes: nodes.map((node, index) => ({
      id: node.id,
      x: index * (nodeSize + gap),
      y: 0,
      width: nodeSize,
      height: nodeSize,
    })),
    width: nodes.length * nodeSize + (nodes.length - 1) * gap,
    height: nodeSize,
  };
}
