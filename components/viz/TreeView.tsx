'use client';

import type { ReactElement } from 'react';
import type { SceneGraph } from '@/lib/engine/types';
import { layoutTree } from '@/lib/layout/tree-layout';
import { HIGHLIGHT_STYLES } from './highlight';
import { VizNode } from './VizNode';

type TreeScene = Extract<SceneGraph, { kind: 'tree' }>;

const NODE_SIZE = 48;

/**
 * BSTs, binary heaps, and tries. Coordinates come from the pure Reingold–Tilford layout; this
 * component never positions a node itself.
 */
export function TreeView({ scene }: { scene: TreeScene }): ReactElement {
  if (scene.nodes.length === 0) {
    return <p className="text-sm text-muted">Insert a value to grow the tree.</p>;
  }

  const layout = layoutTree(scene.nodes, scene.edges, { nodeSize: NODE_SIZE });
  const boxById = new Map(layout.boxes.map((box) => [box.id, box]));

  const pad = 28;

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${layout.width + pad * 2} ${layout.height + pad * 2}`}
      className="h-full max-h-[26rem] w-full"
      role="img"
      aria-label={`Tree with ${scene.nodes.length} nodes`}
    >
      {scene.edges.map((edge) => {
        const from = boxById.get(edge.from);
        const to = boxById.get(edge.to);
        if (!from || !to) return null;

        const style = HIGHLIGHT_STYLES[edge.highlight];

        return (
          <line
            key={edge.id}
            x1={from.x + from.width / 2}
            y1={from.y + from.height}
            x2={to.x + to.width / 2}
            y2={to.y}
            className={edge.highlight === 'none' ? 'stroke-border-strong' : style.className}
            strokeWidth={style.strokeWidth}
            strokeDasharray={style.strokeDasharray}
            opacity={style.opacity}
          />
        );
      })}

      {scene.nodes.map((node) => {
        const box = boxById.get(node.id);
        if (!box) return null;

        return (
          <VizNode
            key={node.id}
            id={node.id}
            value={node.value}
            highlight={node.highlight}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            shape="circle"
            label={node.label}
          />
        );
      })}
    </svg>
  );
}
