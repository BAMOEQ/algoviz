'use client';

import { useState, type ReactElement } from 'react';
import type { Primitive } from '@/lib/engine/types';
import type { AlgorithmHandle, OperationHandle, StructureHandle } from '@/lib/registry/types';

export interface OperationPanelProps {
  structures: readonly StructureHandle[];
  selectedSlug: string;
  onSelectStructure(slug: string): void;
  operations: readonly OperationHandle[];
  onRunOperation(operationId: string, args: Record<string, Primitive>): void;
  algorithms: readonly AlgorithmHandle[];
  onRunAlgorithm(algorithmId: string): void;
  /** Validation message from the last attempt. Cleared as soon as the user edits any field. */
  error?: string | null;
  /** True while an algorithm trace is playing. */
  disabled?: boolean;
}

type FormValues = Record<string, Record<string, string>>;

/**
 * The left rail: structure picker, operation forms, algorithm list.
 *
 * Every control here is derived from the registry — the dropdown from `structures`, one input per
 * declared `OperationField`, one button per algorithm. It holds no structure-specific knowledge,
 * which is what lets an eleventh structure appear with zero UI changes.
 */
export function OperationPanel({
  structures,
  selectedSlug,
  onSelectStructure,
  operations,
  onRunOperation,
  algorithms,
  onRunAlgorithm,
  error = null,
  disabled = false,
}: OperationPanelProps): ReactElement {
  const [values, setValues] = useState<FormValues>({});
  const [dismissedError, setDismissedError] = useState(false);

  const visibleError = dismissedError ? null : error;

  function setField(operationId: string, fieldName: string, value: string): void {
    setDismissedError(true);
    setValues((current) => ({
      ...current,
      [operationId]: { ...current[operationId], [fieldName]: value },
    }));
  }

  function submit(operation: OperationHandle): void {
    const raw = values[operation.id] ?? {};
    const args: Record<string, Primitive> = {};

    for (const field of operation.fields) {
      const entered = raw[field.name] ?? '';
      if (entered === '') {
        args[field.name] = null;
        continue;
      }
      args[field.name] = field.type === 'number' ? Number(entered) : entered;
    }

    setDismissedError(false);
    onRunOperation(operation.id, args);
  }

  return (
    <div className="flex flex-col">
      <section className="flex flex-col gap-3 p-4">
        <h2 className="panel-label border-b border-border pb-2">Structure</h2>
        <select
          aria-label="Structure"
          value={selectedSlug}
          disabled={disabled}
          onChange={(event) => onSelectStructure(event.target.value)}
          className="w-full border border-border bg-surface-2 px-2.5 py-2 font-mono text-sm text-text disabled:text-faint"
        >
          {structures.map((structure) => (
            <option key={structure.slug} value={structure.slug}>
              {structure.name}
            </option>
          ))}
        </select>
      </section>

      <section className="flex flex-col gap-3 border-t border-border p-4">
        <h2 className="panel-label border-b border-border pb-2">Operations</h2>

        {operations.map((operation) => (
          <form
            key={operation.id}
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submit(operation);
            }}
          >
            <div className="flex min-w-0 flex-1 gap-2">
              {operation.fields.map((field) => (
                <input
                  key={field.name}
                  aria-label={`${operation.name} ${field.label}`}
                  type={field.type === 'number' ? 'number' : 'text'}
                  placeholder={field.placeholder}
                  disabled={disabled}
                  value={values[operation.id]?.[field.name] ?? ''}
                  onChange={(event) => setField(operation.id, field.name, event.target.value)}
                  className="min-w-0 flex-1 border border-border bg-surface-2 px-2 py-1.5 font-mono text-sm text-text placeholder:text-faint disabled:text-faint"
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={disabled}
              className="shrink-0 border border-border-strong px-2.5 py-1.5 font-mono text-xs whitespace-nowrap text-text transition-colors duration-(--dur-fast) hover:bg-surface-2 disabled:text-faint disabled:hover:bg-transparent"
            >
              {operation.name}
            </button>
          </form>
        ))}

        {visibleError && (
          <p role="alert" className="font-mono text-xs leading-relaxed text-hl-removed">
            {visibleError}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3 border-t border-border p-4">
        <h2 className="panel-label border-b border-border pb-2">Run</h2>
        {algorithms.map((algorithm) => (
          <button
            key={algorithm.id}
            type="button"
            disabled={disabled}
            onClick={() => onRunAlgorithm(algorithm.id)}
            className="flex w-full items-center gap-2 border border-border px-2.5 py-2 text-left font-mono text-sm text-text transition-colors duration-(--dur-fast) hover:bg-surface-2 disabled:text-faint disabled:hover:bg-transparent"
          >
            <span className="text-hl-active">▸</span>
            {algorithm.name}
          </button>
        ))}
      </section>
    </div>
  );
}
