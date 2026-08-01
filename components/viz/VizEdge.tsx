'use client';

import type { ReactElement } from 'react';
import type { Highlight } from '@/lib/engine/types';
import { HIGHLIGHT_STYLES } from './highlight';

export interface VizEdgeProps {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  highlight: Highlight;
  directed?: boolean;
  weight?: number;
  label?: string;
}

export const ARROWHEAD_MARKER_ID = 'algoviz-arrowhead';

/**
 * The shared edge primitive for the linked, tree, and graph views.
 *
 * Weight labels sit on a small plate so they stay legible where an edge crosses the dot grid.
 */
export function VizEdge({
  x1,
  y1,
  x2,
  y2,
  highlight,
  directed = false,
  weight,
  label,
}: VizEdgeProps): ReactElement {
  const style = HIGHLIGHT_STYLES[highlight];
  const caption = label ?? (weight !== undefined ? String(weight) : undefined);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  return (
    <g opacity={style.opacity}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className={highlight === 'none' ? 'stroke-border-strong' : style.className}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        markerEnd={directed ? `url(#${ARROWHEAD_MARKER_ID})` : undefined}
      />

      {caption !== undefined && (
        <>
          <rect
            x={midX - 12}
            y={midY - 9}
            width={24}
            height={18}
            rx={3}
            className="fill-surface-1 stroke-border"
            strokeWidth={1}
          />
          <text
            x={midX}
            y={midY}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-muted font-mono text-[11px] tabular-nums"
          >
            {caption}
          </text>
        </>
      )}
    </g>
  );
}
