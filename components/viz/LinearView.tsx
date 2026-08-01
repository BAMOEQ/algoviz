'use client';

import type { ReactElement } from 'react';
import type { SceneGraph } from '@/lib/engine/types';
import { layoutLinear } from '@/lib/layout/linear-layout';
import { VizNode } from './VizNode';

type LinearScene = Extract<SceneGraph, { kind: 'linear' }>;

const POINTER_LANE = 34;
const INDEX_LANE = 26;

/**
 * Arrays, stacks, queues, and heap-as-array. Coordinates come from `layoutLinear` — this component
 * never computes a position itself.
 */
export function LinearView({ scene }: { scene: LinearScene }): ReactElement {
  const layout = layoutLinear(scene.cells);

  if (scene.cells.length === 0) {
    return <p className="text-sm text-muted">Push a value to start.</p>;
  }

  const boxById = new Map(layout.boxes.map((box) => [box.id, box]));

  return (
    <svg
      viewBox={`0 ${-POINTER_LANE} ${layout.width} ${layout.height + POINTER_LANE + INDEX_LANE}`}
      className="h-full max-h-80 w-full"
      role="img"
      aria-label={`Linear structure with ${scene.cells.length} cells`}
    >
      {scene.cells.map((cell) => {
        const box = boxById.get(cell.id);
        if (!box) return null;

        return (
          <VizNode
            key={cell.id}
            id={cell.id}
            value={cell.value}
            highlight={cell.highlight}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            label={cell.label ?? String(cell.index)}
          />
        );
      })}

      {scene.pointers.map((pointer) => {
        const cell = scene.cells[pointer.index];
        const box = cell ? boxById.get(cell.id) : undefined;
        if (!box) return null;

        const cx = box.x + box.width / 2;

        return (
          <g key={pointer.id}>
            <text
              x={cx}
              y={-18}
              textAnchor="middle"
              className="fill-hl-active font-mono text-[11px]"
            >
              {pointer.label}
            </text>
            <line x1={cx} y1={-12} x2={cx} y2={-3} className="stroke-hl-active" strokeWidth={1.5} />
          </g>
        );
      })}
    </svg>
  );
}
