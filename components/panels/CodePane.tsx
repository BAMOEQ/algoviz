import type { ReactElement } from 'react';

export interface CodePaneProps {
  pseudocode: readonly string[];
  activeLine: number | null;
}

/**
 * The executing pseudocode line, synchronized to the current step.
 *
 * The active line is never marked by color alone: it carries a left border, a gutter marker, and
 * `aria-current="step"` alongside the background tint.
 */
export function CodePane({ pseudocode, activeLine }: CodePaneProps): ReactElement {
  if (pseudocode.length === 0) {
    return <p className="text-sm text-muted">Run an algorithm to see its code.</p>;
  }

  return (
    <ol className="flex flex-col">
      {pseudocode.map((line, index) => {
        const active = index === activeLine;

        return (
          <li
            key={index}
            aria-current={active ? 'step' : undefined}
            className={`flex gap-3 py-1 pr-2 pl-2 font-mono text-[13px] border-l-2 ${
              active
                ? 'border-hl-active bg-surface-2 text-text'
                : 'border-transparent text-muted'
            }`}
          >
            <span className="w-4 shrink-0 text-right text-faint tabular-nums">
              {active ? '▸' : index + 1}
            </span>
            <span className="whitespace-pre">{line}</span>
          </li>
        );
      })}
    </ol>
  );
}
