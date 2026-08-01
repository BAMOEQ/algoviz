'use client';

import type { ReactElement } from 'react';
import type { SceneGraph } from '@/lib/engine/types';
import { layoutLinear } from '@/lib/layout/linear-layout';
import { HIGHLIGHT_STYLES } from './highlight';
import { VizNode } from './VizNode';

type LinkedScene = Extract<SceneGraph, { kind: 'linked' }>;

const NODE_SIZE = 56;
const GAP = 40;
const TERMINATOR_WIDTH = 34;
const BACK_LANE = 30;

/**
 * Singly and doubly linked lists. Forward links run between node edges; back links bow beneath the
 * row so a doubly linked list reads as two distinct chains rather than one doubled line.
 */
export function LinkedView({ scene }: { scene: LinkedScene }): ReactElement {
  if (scene.nodes.length === 0) {
    return <p className="text-sm text-muted">Push a value to start.</p>;
  }

  const layout = layoutLinear(
    scene.nodes.map((node, index) => ({
      id: node.id,
      value: node.value,
      index,
      highlight: node.highlight,
    })),
    { cellSize: NODE_SIZE, gap: GAP },
  );

  const boxById = new Map(layout.boxes.map((box) => [box.id, box]));
  const centerY = NODE_SIZE / 2;
  const width = layout.width + TERMINATOR_WIDTH;

  return (
    <svg
      viewBox={`-8 -14 ${width + 16} ${NODE_SIZE + BACK_LANE + 40}`}
      className="h-full max-h-80 w-full"
      role="img"
      aria-label={`Linked list with ${scene.nodes.length} nodes`}
    >
      {scene.links.map((link) => {
        const from = boxById.get(link.from);
        if (!from) return null;

        const style = HIGHLIGHT_STYLES[link.highlight];
        const stroke = link.highlight === 'none' ? 'stroke-border-strong' : style.className;
        const isBackLink = link.id.startsWith('back-');

        if (link.to === null) {
          /* Null terminator: a short stub ending in a cross bar. */
          const x1 = from.x + from.width;
          const x2 = x1 + TERMINATOR_WIDTH - 10;
          return (
            <g key={link.id}>
              <line x1={x1} y1={centerY} x2={x2} y2={centerY} className={stroke} strokeWidth={style.strokeWidth} />
              <line
                x1={x2}
                y1={centerY - 8}
                x2={x2}
                y2={centerY + 8}
                className="stroke-faint"
                strokeWidth={1.5}
              />
              <text x={x2 + 4} y={centerY + 20} className="fill-faint font-mono text-[10px]">
                null
              </text>
            </g>
          );
        }

        const to = boxById.get(link.to);
        if (!to) return null;

        if (isBackLink) {
          const startX = from.x + 8;
          const endX = to.x + to.width - 8;
          const lane = NODE_SIZE + BACK_LANE;
          return (
            <path
              key={link.id}
              d={`M ${startX} ${NODE_SIZE} C ${startX} ${lane}, ${endX} ${lane}, ${endX} ${NODE_SIZE}`}
              fill="none"
              className={link.highlight === 'none' ? 'stroke-border' : stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
            />
          );
        }

        /* A forward link that runs backwards is the tail's cycle edge — bow it over the top. */
        if (to.x < from.x) {
          const startX = from.x + from.width / 2;
          const endX = to.x + to.width / 2;
          return (
            <path
              key={link.id}
              d={`M ${startX} 0 C ${startX} ${-BACK_LANE - 10}, ${endX} ${-BACK_LANE - 10}, ${endX} 0`}
              fill="none"
              className={link.highlight === 'none' ? 'stroke-hl-compare' : stroke}
              strokeWidth={Math.max(style.strokeWidth, 1.5)}
              strokeDasharray={style.strokeDasharray}
            />
          );
        }

        return (
          <g key={link.id}>
            <line
              x1={from.x + from.width}
              y1={centerY}
              x2={to.x}
              y2={centerY}
              className={stroke}
              strokeWidth={style.strokeWidth}
              strokeDasharray={style.strokeDasharray}
            />
            <path
              d={`M ${to.x - 7} ${centerY - 4} L ${to.x} ${centerY} L ${to.x - 7} ${centerY + 4}`}
              fill="none"
              className={stroke}
              strokeWidth={style.strokeWidth}
            />
          </g>
        );
      })}

      {scene.nodes.map((node, index) => {
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
            label={node.label ?? (index === 0 ? 'head' : undefined)}
          />
        );
      })}
    </svg>
  );
}
