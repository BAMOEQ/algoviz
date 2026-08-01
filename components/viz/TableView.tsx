'use client';

import type { ReactElement } from 'react';
import type { SceneGraph } from '@/lib/engine/types';
import { HIGHLIGHT_STYLES } from './highlight';
import { VizNode } from './VizNode';

type TableScene = Extract<SceneGraph, { kind: 'table' }>;

const SLOT_WIDTH = 44;
const SLOT_HEIGHT = 34;
const ENTRY_WIDTH = 84;
const ENTRY_GAP = 10;
const ROW_GAP = 6;

/**
 * Hash tables. Each row is one slot; entries chain to the right of it, which makes a collision
 * read as a longer row rather than as a different colour.
 */
export function TableView({ scene }: { scene: TableScene }): ReactElement {
  if (scene.buckets.length === 0) {
    return <p className="text-sm text-muted">Put a key to fill the table.</p>;
  }

  const longestChain = Math.max(1, ...scene.buckets.map((bucket) => bucket.entries.length));
  const width = SLOT_WIDTH + ENTRY_GAP + longestChain * (ENTRY_WIDTH + ENTRY_GAP);
  const height = scene.buckets.length * (SLOT_HEIGHT + ROW_GAP);

  return (
    <svg
      viewBox={`-6 -6 ${width + 12} ${height + 12}`}
      className="h-full max-h-[28rem] w-full"
      role="img"
      aria-label={`Hash table with ${scene.buckets.length} slots`}
    >
      {scene.buckets.map((bucket) => {
        const y = bucket.index * (SLOT_HEIGHT + ROW_GAP);
        const slotStyle = HIGHLIGHT_STYLES[bucket.highlight];

        return (
          <g key={bucket.id}>
            <rect
              x={0}
              y={y}
              width={SLOT_WIDTH}
              height={SLOT_HEIGHT}
              rx={3}
              className={
                bucket.highlight === 'none' ? 'fill-surface-2 stroke-border' : slotStyle.className
              }
              strokeWidth={slotStyle.strokeWidth}
              strokeDasharray={slotStyle.strokeDasharray}
              opacity={slotStyle.opacity}
            />
            <text
              x={SLOT_WIDTH / 2}
              y={y + SLOT_HEIGHT / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-muted font-mono text-[12px] tabular-nums"
            >
              {bucket.index}
            </text>

            {bucket.entries.length === 0 && (
              <line
                x1={SLOT_WIDTH + ENTRY_GAP}
                y1={y + SLOT_HEIGHT / 2}
                x2={SLOT_WIDTH + ENTRY_GAP + 14}
                y2={y + SLOT_HEIGHT / 2}
                className="stroke-faint"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
            )}

            {bucket.entries.map((entry, position) => {
              const x = SLOT_WIDTH + ENTRY_GAP + position * (ENTRY_WIDTH + ENTRY_GAP);

              return (
                <g key={entry.id}>
                  {position > 0 && (
                    <line
                      x1={x - ENTRY_GAP}
                      y1={y + SLOT_HEIGHT / 2}
                      x2={x}
                      y2={y + SLOT_HEIGHT / 2}
                      className="stroke-border-strong"
                      strokeWidth={1}
                    />
                  )}
                  <VizNode
                    id={entry.id}
                    value={`${entry.key}: ${entry.value}`}
                    highlight={entry.highlight}
                    x={x}
                    y={y}
                    width={ENTRY_WIDTH}
                    height={SLOT_HEIGHT}
                  />
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
