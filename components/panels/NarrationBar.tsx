import type { ReactElement } from 'react';

export interface NarrationBarProps {
  narration: string;
  truncated?: boolean;
}

/**
 * The plain-language description of the current step, and the one non-mono element on the canvas.
 *
 * It is a polite live region so a screen-reader user follows the algorithm as it steps.
 */
export function NarrationBar({ narration, truncated = false }: NarrationBarProps): ReactElement {
  return (
    <div aria-live="polite" aria-atomic="true" className="flex flex-col gap-1">
      <p className="text-[15px] text-text">{narration}</p>
      {truncated && (
        <p className="font-mono text-xs text-hl-compare">
          Trace truncated at 5000 steps — reduce the input size.
        </p>
      )}
    </div>
  );
}
