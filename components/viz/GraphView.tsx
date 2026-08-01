'use client';

import { useMemo, type ReactElement } from 'react';
import type { SceneGraph } from '@/lib/engine/types';
import { layoutGraph } from '@/lib/layout/graph-layout';
import { VizEdge } from './VizEdge';
import { VizNode } from './VizNode';

type GraphScene = Extract<SceneGraph, { kind: 'graph' }>;

const NODE_SIZE = 48;

/** Shorten an edge so its arrowhead stops at the node's rim rather than under it. */
function trim(x1: number, y1: number, x2: number, y2: number, radius: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;

  return {
    x1: x1 + ux * radius,
    y1: y1 + uy * radius,
    x2: x2 - ux * radius,
    y2: y2 - uy * radius,
  };
}

export function GraphView({ scene }: { scene: GraphScene }): ReactElement {
  /* Geometry depends only on the graph's shape, never on highlights — so playback changes colour
   * without ever moving a node. */
  const topology = scene.nodes.map((node) => node.id).join(',') + '|' + scene.edges.map((edge) => `${edge.from}>${edge.to}`).join(',');

  const layout = useMemo(
    () => layoutGraph(scene.nodes, scene.edges, { nodeSize: NODE_SIZE }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topology],
  );

  if (scene.nodes.length === 0) {
    return <p className="text-sm text-muted">Add a node to start building a graph.</p>;
  }

  const boxById = new Map(layout.boxes.map((box) => [box.id, box]));
  const pad = 30;

  return (
    <svg
      viewBox={`${-pad} ${-pad} ${layout.width + pad * 2} ${layout.height + pad * 2}`}
      className="h-full max-h-[28rem] w-full"
      role="img"
      aria-label={`Graph with ${scene.nodes.length} nodes and ${scene.edges.length} edges`}
    >
      {scene.edges.map((edge) => {
        const from = boxById.get(edge.from);
        const to = boxById.get(edge.to);
        if (!from || !to) return null;

        const points = trim(
          from.x + from.width / 2,
          from.y + from.height / 2,
          to.x + to.width / 2,
          to.y + to.height / 2,
          NODE_SIZE / 2 + (scene.directed ? 6 : 0),
        );

        return (
          <VizEdge
            key={edge.id}
            id={edge.id}
            x1={points.x1}
            y1={points.y1}
            x2={points.x2}
            y2={points.y2}
            highlight={edge.highlight}
            directed={scene.directed}
            weight={scene.weighted ? edge.weight : undefined}
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
