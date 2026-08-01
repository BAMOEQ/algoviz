'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactElement } from 'react';
import type { Highlight, Primitive } from '@/lib/engine/types';
import { GLOW_FILTER_ID, HIGHLIGHT_STYLES } from './highlight';

export interface VizNodeProps {
  id: string;
  value: Primitive;
  highlight: Highlight;
  x: number;
  y: number;
  width: number;
  height: number;
  shape?: 'box' | 'circle';
  /** Small caption beneath the node — an index, a key, a pointer name. */
  label?: string;
}

/**
 * The single value-bearing primitive every view draws with, so all five views read as one system.
 *
 * `layoutId` is the stable element id, which is what lets `motion` animate a value moving between
 * positions instead of remounting it.
 */
export function VizNode({
  id,
  value,
  highlight,
  x,
  y,
  width,
  height,
  shape = 'box',
  label,
}: VizNodeProps): ReactElement {
  const reducedMotion = useReducedMotion();
  const style = HIGHLIGHT_STYLES[highlight];

  const cx = x + width / 2;
  const cy = y + height / 2;

  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <motion.g
      layoutId={id}
      initial={{ opacity: 0, scale: style.enterScale }}
      animate={{ opacity: style.opacity, scale: 1 }}
      transition={transition}
      filter={style.glow ? `url(#${GLOW_FILTER_ID})` : undefined}
    >
      {shape === 'circle' ? (
        <circle
          cx={cx}
          cy={cy}
          r={Math.min(width, height) / 2}
          className={style.className}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
        />
      ) : (
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={3}
          className={style.className}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.strokeDasharray}
        />
      )}

      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-text font-mono text-[17px] tabular-nums"
      >
        {value === null ? '·' : String(value)}
      </text>

      {label !== undefined && (
        <text
          x={cx}
          y={y + height + 18}
          textAnchor="middle"
          className="fill-faint font-mono text-[11px] tabular-nums"
        >
          {label}
        </text>
      )}
    </motion.g>
  );
}
