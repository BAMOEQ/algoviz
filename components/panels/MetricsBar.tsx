import type { ReactElement } from 'react';
import type { Metrics } from '@/lib/engine/types';

export interface MetricsBarProps {
  metrics: Metrics;
}

const COUNTERS: ReadonlyArray<{ label: string; key: keyof Metrics }> = [
  { label: 'cmp', key: 'comparisons' },
  { label: 'swap', key: 'swaps' },
  { label: 'read', key: 'reads' },
  { label: 'write', key: 'writes' },
];

/**
 * The four running counters for the current step. Values are tabular so the row does not reflow
 * as the numbers grow during playback.
 */
export function MetricsBar({ metrics }: MetricsBarProps): ReactElement {
  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[13px]">
      {COUNTERS.map(({ label, key }) => (
        <div key={key} className="flex gap-2">
          <dt className="text-muted">{label}</dt>
          <dd className="text-text tabular-nums">{metrics[key]}</dd>
        </div>
      ))}
    </dl>
  );
}
