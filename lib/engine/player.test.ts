import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Step } from '@/lib/engine/types';
import { BASE_INTERVAL_MS, SPEEDS, usePlayer } from '@/lib/engine/player';

function makeStep(line: number, narration = `step ${line}`): Step {
  return {
    line,
    narration,
    scene: { kind: 'linear', cells: [], pointers: [] },
    vars: {},
    metrics: { comparisons: 0, swaps: 0, reads: 0, writes: 0 },
  };
}

function makeSteps(n: number): Step[] {
  return Array.from({ length: n }, (_, i) => makeStep(i));
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePlayer', () => {
  describe('empty steps', () => {
    it('reports empty-state defaults and play() does nothing', () => {
      const { result } = renderHook(() => usePlayer([]));

      expect(result.current.index).toBe(0);
      expect(result.current.current).toBeUndefined();
      expect(result.current.total).toBe(0);
      expect(result.current.atStart).toBe(true);
      expect(result.current.atEnd).toBe(true);

      act(() => {
        result.current.play();
      });
      expect(result.current.playing).toBe(false);

      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 5);
      });
      expect(result.current.index).toBe(0);
      expect(result.current.playing).toBe(false);
    });
  });

  describe('next / prev', () => {
    it('steps forward and clamps at the last step', () => {
      const steps = makeSteps(3);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.next());
      expect(result.current.index).toBe(1);

      act(() => result.current.next());
      expect(result.current.index).toBe(2);
      expect(result.current.atEnd).toBe(true);

      act(() => result.current.next());
      expect(result.current.index).toBe(2);
    });

    it('steps backward and clamps at 0', () => {
      const steps = makeSteps(3);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.seek(2));
      act(() => result.current.prev());
      expect(result.current.index).toBe(1);

      act(() => result.current.prev());
      expect(result.current.index).toBe(0);
      expect(result.current.atStart).toBe(true);

      act(() => result.current.prev());
      expect(result.current.index).toBe(0);
    });

    it('pauses first when next/prev is called while playing', () => {
      const steps = makeSteps(5);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.play());
      expect(result.current.playing).toBe(true);

      act(() => result.current.next());
      expect(result.current.playing).toBe(false);
      expect(result.current.index).toBe(1);

      act(() => result.current.play());
      act(() => result.current.prev());
      expect(result.current.playing).toBe(false);
    });
  });

  describe('seek', () => {
    it('clamps below zero to 0', () => {
      const steps = makeSteps(5);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.seek(-5));
      expect(result.current.index).toBe(0);
    });

    it('clamps above the last index to the last index', () => {
      const steps = makeSteps(5);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.seek(9999));
      expect(result.current.index).toBe(4);
    });

    it('pauses first when seeking while playing', () => {
      const steps = makeSteps(5);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.play());
      act(() => result.current.seek(3));
      expect(result.current.playing).toBe(false);
      expect(result.current.index).toBe(3);
    });
  });

  describe('play', () => {
    it('advances one step every BASE_INTERVAL_MS / speed at speed 1', () => {
      const steps = makeSteps(5);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.play());
      expect(result.current.playing).toBe(true);
      expect(result.current.index).toBe(0);

      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS);
      });
      expect(result.current.index).toBe(1);

      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS);
      });
      expect(result.current.index).toBe(2);
    });

    it('auto-pauses when it reaches the last step', () => {
      const steps = makeSteps(3);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.play());
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 2);
      });
      expect(result.current.index).toBe(2);
      expect(result.current.playing).toBe(false);

      // Further ticks must not fire — the interval was torn down.
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 3);
      });
      expect(result.current.index).toBe(2);
      expect(result.current.playing).toBe(false);
    });

    it('restarts from 0 and plays when called again at the end', () => {
      const steps = makeSteps(3);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.play());
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 2);
      });
      expect(result.current.index).toBe(2);
      expect(result.current.playing).toBe(false);

      act(() => result.current.play());
      expect(result.current.index).toBe(0);
      expect(result.current.playing).toBe(true);

      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS);
      });
      expect(result.current.index).toBe(1);
    });
  });

  describe('speed', () => {
    it('exposes the declared SPEEDS tuple', () => {
      expect(SPEEDS).toEqual([0.25, 0.5, 1, 2, 4]);
    });

    it('re-arms the interval at the new cadence without losing position, mid-playback', () => {
      const steps = makeSteps(10);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.play());
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS); // index 0 -> 1 at speed 1 (600ms)
      });
      expect(result.current.index).toBe(1);

      act(() => result.current.setSpeed(4));
      expect(result.current.speed).toBe(4);
      // Position must be unchanged immediately after the speed change.
      expect(result.current.index).toBe(1);

      // At speed 4 the new cadence is 600/4 = 150ms.
      act(() => {
        vi.advanceTimersByTime(149);
      });
      expect(result.current.index).toBe(1); // not yet — proves the old 600ms cadence is gone too

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.index).toBe(2); // fires right at 150ms, the new cadence

      act(() => {
        vi.advanceTimersByTime(150);
      });
      expect(result.current.index).toBe(3);
    });

    it('setSpeed while paused does not start playback', () => {
      const steps = makeSteps(5);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.setSpeed(2));
      expect(result.current.speed).toBe(2);
      expect(result.current.playing).toBe(false);

      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 10);
      });
      expect(result.current.index).toBe(0);
    });
  });

  describe('toggle', () => {
    it('flips playing on and off', () => {
      const steps = makeSteps(3);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.toggle());
      expect(result.current.playing).toBe(true);

      act(() => result.current.toggle());
      expect(result.current.playing).toBe(false);
    });
  });

  describe('reset', () => {
    it('returns to index 0 and pauses', () => {
      const steps = makeSteps(5);
      const { result } = renderHook(() => usePlayer(steps));

      act(() => result.current.play());
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 2);
      });
      expect(result.current.index).toBe(2);

      act(() => result.current.reset());
      expect(result.current.index).toBe(0);
      expect(result.current.playing).toBe(false);

      // The old interval must be gone — no further ticks.
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 3);
      });
      expect(result.current.index).toBe(0);
    });
  });

  describe('new steps identity', () => {
    it('resets to index 0 and pauses when a new steps array arrives', () => {
      const stepsA = makeSteps(5);
      const { result, rerender } = renderHook(({ steps }) => usePlayer(steps), {
        initialProps: { steps: stepsA },
      });

      act(() => result.current.play());
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 2);
      });
      expect(result.current.index).toBe(2);
      expect(result.current.playing).toBe(true);

      const stepsB = makeSteps(4);
      rerender({ steps: stepsB });

      expect(result.current.index).toBe(0);
      expect(result.current.playing).toBe(false);
      expect(result.current.total).toBe(4);

      // The old interval from stepsA must be gone — no stray tick moves the index.
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 3);
      });
      expect(result.current.index).toBe(0);
    });

    it('does not reset when the same steps array identity is passed again', () => {
      const steps = makeSteps(5);
      const { result, rerender } = renderHook(({ steps }) => usePlayer(steps), {
        initialProps: { steps },
      });

      act(() => result.current.seek(3));
      rerender({ steps });
      expect(result.current.index).toBe(3);
    });
  });

  describe('unmount', () => {
    it('clears the interval — no timer fires and no act warning after unmount', () => {
      const steps = makeSteps(5);
      const { result, unmount } = renderHook(() => usePlayer(steps));

      act(() => result.current.play());
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS);
      });
      expect(result.current.index).toBe(1);

      unmount();

      // If the interval leaked, this would call setState on an unmounted
      // component and React would emit an act(...) warning.
      act(() => {
        vi.advanceTimersByTime(BASE_INTERVAL_MS * 10);
      });
    });
  });
});
