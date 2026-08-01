'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { CodePane } from '@/components/panels/CodePane';
import { MetricsBar } from '@/components/panels/MetricsBar';
import { NarrationBar } from '@/components/panels/NarrationBar';
import { PlayerControls } from '@/components/player/PlayerControls';
import { Timeline } from '@/components/player/Timeline';
import { SceneRenderer } from '@/components/viz/SceneRenderer';
import { usePlayer } from '@/lib/engine/player';
import type { Metrics, Step } from '@/lib/engine/types';
import { getStructure } from '@/lib/registry';

const ZERO_METRICS: Metrics = { comparisons: 0, swaps: 0, reads: 0, writes: 0 };

export interface DemoProps {
  /** Structure slug, e.g. "binary-search-tree". */
  structure: string;
  /** Algorithm to preload. Defaults to the structure's first registered algorithm. */
  algorithm?: string;
  /** Hide the pseudocode pane for a compact inline demo. */
  compact?: boolean;
}

/**
 * A steppable visualizer embedded in an explainer page, preloaded from the structure's `seed()`.
 *
 * It is the same engine and the same views as Free Play, just scoped to one algorithm — so a demo
 * can never disagree with the real thing.
 */
export function Demo({ structure: slug, algorithm, compact = false }: DemoProps): ReactElement {
  const structure = useMemo(() => getStructure(slug), [slug]);

  const seeded = useMemo(() => structure?.seed(), [structure]);

  const chosen = useMemo(() => {
    if (!structure) return null;
    if (algorithm) return structure.algorithms.find((entry) => entry.id === algorithm) ?? null;
    return structure.algorithms[0] ?? null;
  }, [structure, algorithm]);

  const [showTrace, setShowTrace] = useState(false);

  const trace = useMemo(() => {
    if (!structure || !chosen || !showTrace) return null;
    return structure.runAlgorithm(chosen.id, seeded);
  }, [structure, chosen, seeded, showTrace]);

  const steps: readonly Step[] = trace?.steps ?? [];
  const player = usePlayer(steps);
  const { current, index, playing, atStart, atEnd, seek, next, prev, toggle } = player;

  if (!structure) {
    return (
      <p className="border border-border bg-surface-1 p-4 font-mono text-sm text-muted">
        No structure is registered for &quot;{slug}&quot; yet.
      </p>
    );
  }

  const scene = current?.scene ?? structure.scene(seeded);

  return (
    <figure className="my-6 flex flex-col border border-border bg-surface-1">
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-2">
        <span className="panel-label">{structure.name}</span>
        {chosen && (
          <button
            type="button"
            onClick={() => setShowTrace(true)}
            disabled={showTrace}
            className="border border-border-strong px-2.5 py-1 font-mono text-xs text-text transition-colors duration-(--dur-fast) hover:bg-surface-2 disabled:border-border disabled:text-faint"
          >
            {showTrace ? chosen.name : `▸ Run ${chosen.name}`}
          </button>
        )}
      </div>

      <div className="flex flex-col lg:flex-row">
        <div className="dot-grid flex min-h-56 flex-1 items-center justify-center bg-surface-0 p-6">
          <SceneRenderer scene={scene} />
        </div>

        {!compact && chosen && showTrace && (
          <div className="shrink-0 border-t border-border p-4 lg:w-64 lg:border-t-0 lg:border-l">
            <CodePane pseudocode={chosen.pseudocode} activeLine={current ? current.line : null} />
          </div>
        )}
      </div>

      <figcaption className="border-t border-border px-4 py-3">
        <NarrationBar
          narration={current?.narration ?? `Seeded ${structure.name.toLowerCase()}. Run the algorithm to step through it.`}
          truncated={trace?.truncated ?? false}
        />
      </figcaption>

      {showTrace && steps.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-2.5">
          <PlayerControls
            playing={playing}
            atStart={atStart}
            atEnd={atEnd}
            onFirst={() => seek(0)}
            onPrev={prev}
            onToggle={toggle}
            onNext={next}
            onLast={() => seek(steps.length - 1)}
          />
          <Timeline steps={steps} index={index} onSeek={seek} />
          <MetricsBar metrics={current?.metrics ?? ZERO_METRICS} />
        </div>
      )}
    </figure>
  );
}
