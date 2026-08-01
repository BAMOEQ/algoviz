import type { ReactElement } from 'react';
import { getStructure } from '@/lib/registry';
import type { ComplexityTable as ComplexityTableData } from '@/lib/registry/types';

export interface ComplexityTableProps {
  /** Structure slug — the table is read from the registry so it can never drift from the code. */
  structure?: string;
  table?: ComplexityTableData;
}

export function ComplexityTable({ structure, table }: ComplexityTableProps): ReactElement {
  const data = table ?? (structure ? getStructure(structure)?.complexity : undefined);

  if (!data) {
    return <p className="text-sm text-muted">No complexity table is registered for this structure.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left font-mono text-[13px]">
        <thead>
          <tr className="border-b border-border">
            <th className="panel-label py-2 pr-4 font-normal">Operation</th>
            <th className="panel-label py-2 pr-4 font-normal">Average</th>
            <th className="panel-label py-2 font-normal">Worst</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row) => (
            <tr key={row.operation} className="border-b border-border/60">
              <td className="py-2 pr-4 text-muted">{row.operation}</td>
              <td className="py-2 pr-4 text-text tabular-nums">{row.average}</td>
              <td className="py-2 text-text tabular-nums">{row.worst}</td>
            </tr>
          ))}
          <tr>
            <td className="py-2 pr-4 text-muted">space</td>
            <td className="py-2 pr-4 text-text tabular-nums" colSpan={2}>
              {data.space}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
