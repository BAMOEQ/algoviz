'use client';

import {
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
} from 'react';
import type { Metrics, Step } from '@/lib/engine/types';

export interface TimelineProps {
  steps: readonly Step[];
  index: number;
  onSeek(index: number): void;
  /** Maximum tick columns before steps are bucketed. Roughly one column per pixel of width. */
  maxColumns?: number;
}

/** What a step did, derived by differencing its running totals against the previous step's. */
export type TickKind = 'none' | 'io' | 'compare' | 'swap';

/** Highest wins when several steps share a bucket — a lone swap must never be hidden by reads. */
const PRIORITY: Record<TickKind, number> = { none: 0, io: 1, compare: 2, swap: 3 };

/** Height is the non-color cue: the ribbon stays readable without relying on hue. */
const TICK_STYLE: Record<TickKind, { height: string; className: string }> = {
  none: { height: '26%', className: 'bg-faint/40' },
  io: { height: '40%', className: 'bg-hl-active' },
  compare: { height: '62%', className: 'bg-hl-compare' },
  swap: { height: '100%', className: 'bg-hl-removed' },
};

const ZERO: Metrics = { comparisons: 0, swaps: 0, reads: 0, writes: 0 };

export function deriveTickKinds(steps: readonly Step[]): TickKind[] {
  let previous = ZERO;

  return steps.map((step) => {
    const { metrics } = step;
    const kind: TickKind =
      metrics.swaps > previous.swaps
        ? 'swap'
        : metrics.comparisons > previous.comparisons
          ? 'compare'
          : metrics.reads > previous.reads || metrics.writes > previous.writes
            ? 'io'
            : 'none';

    previous = metrics;
    return kind;
  });
}

/**
 * Collapse `kinds` into at most `maxColumns` columns, keeping the highest-priority kind in each
 * bucket. Bucketing is a correctness requirement, not an optimization: at 5000 steps roughly eight
 * steps share a column, and a swap that vanished into a bucket of reads would misreport the trace.
 */
export function bucketTicks(
  kinds: readonly TickKind[],
  maxColumns: number,
): Array<{ kind: TickKind; startIndex: number }> {
  if (kinds.length === 0) return [];
  if (kinds.length <= maxColumns) {
    return kinds.map((kind, startIndex) => ({ kind, startIndex }));
  }

  const columns: Array<{ kind: TickKind; startIndex: number }> = [];

  for (let column = 0; column < maxColumns; column++) {
    const start = Math.floor((column * kinds.length) / maxColumns);
    const end = Math.floor(((column + 1) * kinds.length) / maxColumns);

    let winner: TickKind = 'none';
    for (let i = start; i < end; i++) {
      const candidate = kinds[i];
      if (PRIORITY[candidate] > PRIORITY[winner]) winner = candidate;
    }

    columns.push({ kind: winner, startIndex: start });
  }

  return columns;
}

/**
 * The trace ribbon — one tick per step, colored and sized by what that step did, so the shape of
 * the whole algorithm is legible before playback starts. It is also the primary keyboard control
 * for the app.
 */
export function Timeline({ steps, index, onSeek, maxColumns = 600 }: TimelineProps): ReactElement {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const total = steps.length;
  const columns = bucketTicks(deriveTickKinds(steps), maxColumns);
  const playheadColumn = total === 0 ? 0 : Math.floor((index * columns.length) / total);

  function seekToClientX(clientX: number): void {
    const track = trackRef.current;
    if (!track || total === 0) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    onSeek(Math.min(Math.round(ratio * (total - 1)), total - 1));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekToClientX(event.clientX);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    if (dragging.current) seekToClientX(event.clientX);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    dragging.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (total === 0) return;

    const moves: Record<string, number | undefined> = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: total - 1,
    };

    const target = moves[event.key];
    if (target === undefined) return;

    event.preventDefault();
    onSeek(Math.min(Math.max(target, 0), total - 1));
  }

  return (
    <div className="flex min-w-48 flex-1 items-center gap-3">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Trace position"
        aria-valuemin={0}
        aria-valuemax={Math.max(total - 1, 0)}
        aria-valuenow={index}
        aria-valuetext={total === 0 ? 'No trace' : `Step ${index + 1} of ${total}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
        className="relative flex h-7 flex-1 cursor-pointer items-end gap-px"
      >
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            data-kind={column.kind}
            className={`min-w-px flex-1 ${TICK_STYLE[column.kind].className} ${
              columnIndex > playheadColumn ? 'opacity-45' : ''
            }`}
            style={{ height: TICK_STYLE[column.kind].height }}
          />
        ))}

        {total > 0 && (
          <div
            data-testid="timeline-playhead"
            className="pointer-events-none absolute inset-y-0 w-0.5 bg-hl-active"
            style={{ left: `${columns.length <= 1 ? 0 : (playheadColumn / columns.length) * 100}%` }}
          />
        )}
      </div>

      <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
        {total === 0 ? '0 / 0' : `${index + 1} / ${total}`}
      </span>
    </div>
  );
}
