import { trace } from '@/lib/engine/tracer';
import type { TraceResult, Tracer } from '@/lib/engine/tracer';
import type { MarkSet, Primitive, SceneGraph } from '@/lib/engine/types';

export type Category = 'linear' | 'tree' | 'graph' | 'hash';

export interface OperationField {
  name: string;
  label: string;
  type: 'number' | 'string';
  placeholder?: string;
  required?: boolean; // default true
}

export interface OperationDef<S> {
  id: string;
  name: string; // imperative button label, e.g. "Push"
  fields: OperationField[];
  /** Return an error message to reject the operation, or null to allow it. */
  validate?(state: S, args: Record<string, Primitive>): string | null;
  run(state: S, args: Record<string, Primitive>, t: Tracer): void;
}

export interface AlgorithmDef<S> {
  id: string;
  name: string;
  description?: string;
  pseudocode: string[];
  run(state: S, t: Tracer): void;
}

export interface ComplexityRow {
  operation: string;
  average: string;
  worst: string;
}
export interface ComplexityTable {
  rows: ComplexityRow[];
  space: string;
}

export interface StructureDef<S> {
  id: string;
  name: string;
  slug: string;
  category: Category;
  summary: string; // one sentence, used on index cards
  create(): S;
  seed(): S; // example instance for explainer demos
  clone(state: S): S; // used to restore state after an algorithm run
  operations: OperationDef<S>[];
  algorithms: AlgorithmDef<S>[];
  toScene(state: S, marks: MarkSet): SceneGraph;
  complexity: ComplexityTable;
}

export interface AlgorithmHandle {
  id: string;
  name: string;
  description?: string;
  pseudocode: readonly string[];
}
export interface OperationHandle {
  id: string;
  name: string;
  fields: readonly OperationField[];
}

export interface StructureHandle {
  id: string;
  name: string;
  slug: string;
  category: Category;
  summary: string;
  complexity: ComplexityTable;
  operations: readonly OperationHandle[];
  algorithms: readonly AlgorithmHandle[];
  create(): unknown;
  seed(): unknown;
  clone(state: unknown): unknown;
  scene(state: unknown, marks?: MarkSet): SceneGraph;
  /** Applies the operation to a clone; returns the trace and the resulting state. */
  runOperation(
    operationId: string,
    state: unknown,
    args: Record<string, Primitive>,
  ): { result: TraceResult; state: unknown };
  /** Runs the algorithm on a clone; the caller's state is untouched. */
  runAlgorithm(algorithmId: string, state: unknown): TraceResult;
  validateOperation(operationId: string, state: unknown, args: Record<string, Primitive>): string | null;
}

const EMPTY_MARKS: MarkSet = new Map();

/**
 * Closes over `S`. This is the only place the `unknown -> S` narrowing happens, and it happens by
 * cast, never `any` and never `@ts-expect-error` — the registry and the UI only ever see the
 * erased `StructureHandle`, so a heterogeneous registry never needs `any` in `lib/`.
 */
export function defineStructure<S>(def: StructureDef<S>): StructureHandle {
  function findOperation(operationId: string): OperationDef<S> {
    const operation = def.operations.find((op) => op.id === operationId);
    if (!operation) {
      throw new Error(`Unknown operation "${operationId}" on structure "${def.id}"`);
    }
    return operation;
  }

  function findAlgorithm(algorithmId: string): AlgorithmDef<S> {
    const algorithm = def.algorithms.find((alg) => alg.id === algorithmId);
    if (!algorithm) {
      throw new Error(`Unknown algorithm "${algorithmId}" on structure "${def.id}"`);
    }
    return algorithm;
  }

  return {
    id: def.id,
    name: def.name,
    slug: def.slug,
    category: def.category,
    summary: def.summary,
    complexity: def.complexity,
    operations: def.operations.map((op) => ({ id: op.id, name: op.name, fields: op.fields })),
    algorithms: def.algorithms.map((alg) => ({
      id: alg.id,
      name: alg.name,
      description: alg.description,
      pseudocode: alg.pseudocode,
    })),
    create: () => def.create(),
    seed: () => def.seed(),
    clone: (state) => def.clone(state as S),
    scene: (state, marks) => def.toScene(state as S, marks ?? EMPTY_MARKS),
    runOperation: (operationId, state, args) => {
      const operation = findOperation(operationId);
      const error = operation.validate ? operation.validate(state as S, args) : null;
      if (error) {
        throw new Error(`Operation "${operationId}" on structure "${def.id}" rejected: ${error}`);
      }
      const working = def.clone(state as S);
      const result = trace(working, def.toScene, (s, t) => operation.run(s, args, t));
      return { result, state: working };
    },
    runAlgorithm: (algorithmId, state) => {
      const algorithm = findAlgorithm(algorithmId);
      const working = def.clone(state as S);
      return trace(working, def.toScene, (s, t) => algorithm.run(s, t));
    },
    validateOperation: (operationId, state, args) => {
      const operation = findOperation(operationId);
      return operation.validate ? operation.validate(state as S, args) : null;
    },
  };
}
