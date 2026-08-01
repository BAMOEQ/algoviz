'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CodePane } from '@/components/panels/CodePane';
import { MetricsBar } from '@/components/panels/MetricsBar';
import { NarrationBar } from '@/components/panels/NarrationBar';
import { OperationPanel } from '@/components/panels/OperationPanel';
import { VariablePanel } from '@/components/panels/VariablePanel';
import { PlayerControls } from '@/components/player/PlayerControls';
import { SpeedControl } from '@/components/player/SpeedControl';
import { Timeline } from '@/components/player/Timeline';
import { SceneRenderer } from '@/components/viz/SceneRenderer';
import { usePlayer } from '@/lib/engine/player';
import type { Metrics, Primitive, Step } from '@/lib/engine/types';
import { getStructure, structures } from '@/lib/registry';
import type { StructureHandle } from '@/lib/registry/types';
import {
  decodeSession,
  encodeSession,
  loadSession,
  saveSession,
  type LoggedOperation,
} from '@/lib/share/encode';

const ZERO_METRICS: Metrics = { comparisons: 0, swaps: 0, reads: 0, writes: 0 };
const DEFAULT_SLUG = 'array';

function PanelSection({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`flex flex-col gap-3 p-4 ${className}`}>
      <h2 className="panel-label border-b border-border pb-2">{label}</h2>
      {children}
    </section>
  );
}

/** Rebuild a structure by replaying its op log — the log is the source of truth, not a node dump. */
function replay(
  structure: StructureHandle,
  seeded: boolean,
  ops: readonly LoggedOperation[],
): unknown {
  let state = seeded ? structure.seed() : structure.create();

  for (const entry of ops) {
    if (structure.validateOperation(entry.op, state, entry.args) !== null) continue;
    state = structure.runOperation(entry.op, state, entry.args).state;
  }

  return state;
}

export default function Playground() {
  const [slug, setSlug] = useState(DEFAULT_SLUG);
  const structure = useMemo(() => getStructure(slug) ?? getStructure(DEFAULT_SLUG), [slug]);

  const [state, setState] = useState<unknown>(() => structure?.create() ?? null);
  const [opLog, setOpLog] = useState<LoggedOperation[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [steps, setSteps] = useState<readonly Step[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAlgorithmId, setActiveAlgorithmId] = useState<string | null>(null);
  const [shareLabel, setShareLabel] = useState('Copy share link');

  const player = usePlayer(steps);
  const { current, index, playing, speed, atStart, atEnd, seek, next, prev, toggle, play } = player;

  /*
   * Operations auto-play so the mutation animates; algorithms load paused at step 0 so you can
   * step through them deliberately. `usePlayer` resets to paused whenever the steps identity
   * changes, so the play call has to happen after that reset, not in the operation handler.
   */
  const autoPlayRef = useRef(false);

  useEffect(() => {
    if (!autoPlayRef.current) return;
    autoPlayRef.current = false;
    if (steps.length > 1) play();
  }, [steps, play]);

  /*
   * Restore from the share URL if there is one, otherwise from the last saved session.
   *
   * This is a genuine one-time bootstrap from external systems (the URL and localStorage), neither
   * of which exists during the server render, so the state cannot be seeded lazily without a
   * hydration mismatch. It runs once and never re-subscribes.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get('s');

    const restored = encoded !== null ? decodeSession(encoded) : loadSession();
    if (restored === null) {
      const requested = params.get('structure');
      const wantsSeed = params.get('seed') === '1';
      const target = requested !== null ? getStructure(requested) : undefined;

      if (target) {
        setSlug(target.slug);
        setSeeded(wantsSeed);
        setState(wantsSeed ? target.seed() : target.create());
      }
      return;
    }

    const target = getStructure(restored.slug);
    if (!target) return;

    setSlug(target.slug);
    setSeeded(restored.seeded);
    setOpLog(restored.ops);
    setState(replay(target, restored.seeded, restored.ops));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    saveSession({ slug, seeded, ops: opLog });
  }, [slug, seeded, opLog]);

  const activeAlgorithm = useMemo(
    () => structure?.algorithms.find((algorithm) => algorithm.id === activeAlgorithmId) ?? null,
    [structure, activeAlgorithmId],
  );

  const scene = useMemo(() => {
    if (current) return current.scene;
    return structure ? structure.scene(state) : null;
  }, [current, structure, state]);

  const selectStructure = useCallback((nextSlug: string) => {
    const nextStructure = getStructure(nextSlug);
    if (!nextStructure) return;

    setSlug(nextSlug);
    setState(nextStructure.create());
    setOpLog([]);
    setSeeded(false);
    setSteps([]);
    setTruncated(false);
    setError(null);
    setActiveAlgorithmId(null);
  }, []);

  const runOperation = useCallback(
    (operationId: string, args: Record<string, Primitive>) => {
      if (!structure) return;

      const message = structure.validateOperation(operationId, state, args);
      if (message) {
        setError(message);
        return;
      }

      const { result, state: nextState } = structure.runOperation(operationId, state, args);

      setError(null);
      setState(nextState);
      setOpLog((log) => [...log, { op: operationId, args }]);
      autoPlayRef.current = true;
      setSteps(result.steps);
      setTruncated(result.truncated);
      setActiveAlgorithmId(null);
    },
    [structure, state],
  );

  const runAlgorithm = useCallback(
    (algorithmId: string) => {
      if (!structure) return;

      /* Algorithms run against a clone, so the structure the user built is never disturbed. */
      const result = structure.runAlgorithm(algorithmId, state);

      setError(null);
      setSteps(result.steps);
      setTruncated(result.truncated);
      setActiveAlgorithmId(algorithmId);
    },
    [structure, state],
  );

  const loadSeed = useCallback(() => {
    if (!structure) return;

    setSeeded(true);
    setOpLog([]);
    setState(structure.seed());
    setSteps([]);
    setTruncated(false);
    setError(null);
    setActiveAlgorithmId(null);
  }, [structure]);

  const copyShareLink = useCallback(async () => {
    const encoded = encodeSession({ slug, seeded, ops: opLog });
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;

    try {
      await navigator.clipboard.writeText(url);
      setShareLabel('Link copied');
    } catch {
      window.history.replaceState(null, '', url);
      setShareLabel('Link in address bar');
    }

    window.setTimeout(() => setShareLabel('Copy share link'), 2000);
  }, [slug, seeded, opLog]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (steps.length === 0) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          prev();
          break;
        case 'ArrowRight':
          event.preventDefault();
          next();
          break;
        case ' ':
          event.preventDefault();
          toggle();
          break;
        case 'Home':
          event.preventDefault();
          seek(0);
          break;
        case 'End':
          event.preventDefault();
          seek(steps.length - 1);
          break;
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steps.length, prev, next, toggle, seek]);

  if (!structure) {
    return (
      <main className="flex h-screen items-center justify-center">
        <p className="font-mono text-sm text-muted">No structures are registered yet.</p>
      </main>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-2.5">
        <Link
          href="/"
          className="panel-label transition-colors duration-(--dur-fast) hover:text-text"
        >
          ← algoviz
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSeed}
            className="panel-label border border-border px-2 py-1 transition-colors duration-(--dur-fast) hover:border-border-strong hover:text-text"
          >
            load example
          </button>
          <button
            type="button"
            onClick={copyShareLink}
            className="panel-label border border-border px-2 py-1 transition-colors duration-(--dur-fast) hover:border-border-strong hover:text-text"
          >
            {shareLabel}
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="flex shrink-0 flex-col overflow-y-auto border-border bg-surface-1 lg:w-70 lg:border-r">
          <OperationPanel
            structures={structures}
            selectedSlug={slug}
            onSelectStructure={selectStructure}
            operations={structure.operations}
            onRunOperation={runOperation}
            algorithms={structure.algorithms}
            onRunAlgorithm={runAlgorithm}
            error={error}
            disabled={playing}
          />
        </aside>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="dot-grid flex min-h-64 flex-1 items-center justify-center overflow-auto p-8">
            {scene && <SceneRenderer scene={scene} />}
          </div>

          <div className="shrink-0 border-t border-border px-6 py-3.5">
            <NarrationBar
              narration={current?.narration ?? 'Run an operation to build a structure.'}
              truncated={truncated}
            />
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-4 border-t border-border px-6 py-3">
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
            <SpeedControl speed={speed} onChange={player.setSpeed} />
            <Timeline steps={steps} index={index} onSeek={seek} />
          </div>
        </section>

        <aside className="flex shrink-0 flex-col overflow-y-auto border-border bg-surface-1 lg:w-75 lg:border-l">
          <PanelSection label="Pseudocode">
            <CodePane
              pseudocode={activeAlgorithm?.pseudocode ?? []}
              activeLine={activeAlgorithm && current ? current.line : null}
            />
          </PanelSection>

          <PanelSection label="Variables" className="border-t border-border">
            <VariablePanel vars={current?.vars ?? {}} callStack={current?.callStack} />
          </PanelSection>

          <PanelSection label="Metrics" className="border-t border-border">
            <MetricsBar metrics={current?.metrics ?? ZERO_METRICS} />
          </PanelSection>
        </aside>
      </main>
    </div>
  );
}
