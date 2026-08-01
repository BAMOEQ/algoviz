'use client';

import type { ReactElement } from 'react';
import { SPEEDS, type Speed } from '@/lib/engine/player';

export interface SpeedControlProps {
  speed: Speed;
  onChange(speed: Speed): void;
}

export function SpeedControl({ speed, onChange }: SpeedControlProps): ReactElement {
  return (
    <select
      aria-label="Playback speed"
      value={speed}
      onChange={(event) => onChange(Number(event.target.value) as Speed)}
      className="border border-border bg-surface-1 px-2 py-1.5 font-mono text-xs text-text"
    >
      {SPEEDS.map((option) => (
        <option key={option} value={option}>
          {option}×
        </option>
      ))}
    </select>
  );
}
