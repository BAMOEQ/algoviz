import type { ReactElement } from 'react';
import type { Frame, Primitive } from '@/lib/engine/types';

export interface VariablePanelProps {
  vars: Record<string, Primitive>;
  callStack?: readonly Frame[];
}

function ValueCell({ value }: { value: Primitive }): ReactElement {
  if (value === null) {
    return <dd className="text-faint">null</dd>;
  }
  return <dd className="text-text tabular-nums">{String(value)}</dd>;
}

function VarRows({ vars }: { vars: Record<string, Primitive> }): ReactElement {
  return (
    <dl className="flex flex-col gap-1.5 font-mono text-[13px]">
      {Object.entries(vars).map(([name, value]) => (
        <div key={name} className="flex justify-between gap-4">
          <dt className="text-muted">{name}</dt>
          <ValueCell value={value} />
        </div>
      ))}
    </dl>
  );
}

/**
 * The watch panel: the current step's variables, plus the call stack for recursive algorithms.
 *
 * Frames are listed innermost-first, matching how a debugger presents them — the frame you are
 * executing in reads first.
 */
export function VariablePanel({ vars, callStack }: VariablePanelProps): ReactElement {
  const names = Object.keys(vars);
  const frames = callStack ?? [];

  return (
    <div className="flex flex-col gap-4">
      {names.length === 0 ? (
        <p className="text-sm text-muted">No variables yet.</p>
      ) : (
        <VarRows vars={vars} />
      )}

      {frames.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="panel-label">Call stack</h3>
          <ol className="flex flex-col gap-2">
            {[...frames].reverse().map((frame) => (
              <li key={frame.id} className="flex flex-col gap-1 border-l-2 border-border pl-2">
                <span className="font-mono text-[13px] text-text">{frame.label}</span>
                <VarRows vars={frame.vars} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
