import type {
  Frame,
  Highlight,
  MarkKey,
  MarkSet,
  Metrics,
  Primitive,
  SceneGraph,
  Step,
} from '@/lib/engine/types';

export const MAX_STEPS = 5000;

export interface Tracer {
  mark(key: MarkKey, highlight: Highlight): this; // chainable
  clearMarks(): this;
  step(
    line: number,
    narration: string,
    vars?: Record<string, Primitive>,
    delta?: Partial<Metrics>,
    callStack?: Frame[],
  ): void;
}

export interface TraceResult { steps: Step[]; truncated: boolean }

/** Module-private sentinel used to unwind `run` once MAX_STEPS is exceeded. */
class TruncatedError extends Error {}

const ZERO_METRICS: Metrics = { comparisons: 0, swaps: 0, reads: 0, writes: 0 };

export function trace<S>(
  state: S,
  toScene: (state: S, marks: MarkSet) => SceneGraph,
  run: (state: S, t: Tracer) => void,
): TraceResult {
  const steps: Step[] = [];
  let marks = new Map<MarkKey, Highlight>();
  let totals: Metrics = { ...ZERO_METRICS };
  let truncated = false;

  const tracer: Tracer = {
    mark(key, highlight) {
      marks.set(key, highlight);
      return this;
    },
    clearMarks() {
      marks = new Map();
      return this;
    },
    step(line, narration, vars, delta, callStack) {
      if (steps.length >= MAX_STEPS) {
        truncated = true;
        throw new TruncatedError();
      }

      totals = {
        comparisons: totals.comparisons + (delta?.comparisons ?? 0),
        swaps: totals.swaps + (delta?.swaps ?? 0),
        reads: totals.reads + (delta?.reads ?? 0),
        writes: totals.writes + (delta?.writes ?? 0),
      };

      const scene = toScene(state, marks);
      marks = new Map();

      const newStep: Step = {
        line,
        narration,
        scene,
        vars: vars ?? {},
        metrics: { ...totals },
        ...(callStack !== undefined ? { callStack } : {}),
      };

      steps.push(newStep);
    },
  };

  try {
    run(state, tracer);
  } catch (err) {
    if (err instanceof TruncatedError) {
      truncated = true;
    } else {
      throw err;
    }
  }

  return { steps, truncated };
}
