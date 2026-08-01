import { useEffect, useRef, useState } from 'react';
import type { Step } from '@/lib/engine/types';

export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];
export const BASE_INTERVAL_MS = 600;

export interface Player {
  index: number; // current step index, always clamped to [0, total-1] (0 when empty)
  current: Step | undefined; // steps[index]
  total: number; // steps.length
  playing: boolean;
  speed: Speed;
  atStart: boolean;
  atEnd: boolean;
  play(): void;
  pause(): void;
  toggle(): void;
  next(): void; // +1, clamped at the last step
  prev(): void; // -1, clamped at 0
  seek(index: number): void; // clamped
  reset(): void; // index 0, paused
  setSpeed(speed: Speed): void;
}

function clampIndex(target: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.max(target, 0), total - 1);
}

export function usePlayer(steps: readonly Step[]): Player {
  // Reset to index 0 / paused whenever a new `steps` array identity arrives.
  // Adjusting state during render (rather than in an effect) avoids an extra
  // commit where a stale interval could tick against the old array.
  const [prevSteps, setPrevSteps] = useState(steps);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState<Speed>(1);

  if (steps !== prevSteps) {
    setPrevSteps(steps);
    setIndex(0);
    setPlaying(false);
  }

  const total = steps.length;
  const current = steps[index];
  const atStart = index === 0;
  const atEnd = total === 0 || index === total - 1;

  // Kept in sync after every render so the interval effect below can read
  // the latest index without needing `index` itself in its dependency
  // array (which would re-arm the timer, and lose the remaining interval,
  // on every single step).
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // The interval effect re-arms only on play/pause, speed, or steps-array
  // changes — never on index changes. `current` is a plain closure variable
  // seeded from indexRef at arm time and then mutated synchronously by the
  // interval callback itself on every tick, so it stays correct even when
  // several ticks land in the same React batch (e.g. tests that advance
  // fake timers past multiple intervals at once) — unlike reading React
  // state or a ref that only resyncs after a commit, this local variable
  // never goes stale between ticks.
  useEffect(() => {
    if (!playing || total === 0) return;
    const intervalMs = BASE_INTERVAL_MS / speed;
    let current = indexRef.current;
    const id = setInterval(() => {
      current = Math.min(current + 1, total - 1);
      setIndex(current);
      if (current === total - 1) {
        setPlaying(false);
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [playing, speed, total]);

  function play() {
    if (total === 0) return;
    if (index >= total - 1) {
      setIndex(0);
    }
    setPlaying(true);
  }

  function pause() {
    setPlaying(false);
  }

  function toggle() {
    if (playing) {
      pause();
    } else {
      play();
    }
  }

  function next() {
    setPlaying(false);
    setIndex(clampIndex(index + 1, total));
  }

  function prev() {
    setPlaying(false);
    setIndex(clampIndex(index - 1, total));
  }

  function seek(target: number) {
    setPlaying(false);
    setIndex(clampIndex(target, total));
  }

  function reset() {
    setPlaying(false);
    setIndex(0);
  }

  function setSpeed(newSpeed: Speed) {
    setSpeedState(newSpeed);
  }

  return {
    index,
    current,
    total,
    playing,
    speed,
    atStart,
    atEnd,
    play,
    pause,
    toggle,
    next,
    prev,
    seek,
    reset,
    setSpeed,
  };
}
