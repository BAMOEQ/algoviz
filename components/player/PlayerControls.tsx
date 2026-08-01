'use client';

import type { ReactElement } from 'react';

export interface PlayerControlsProps {
  playing: boolean;
  atStart: boolean;
  atEnd: boolean;
  onFirst(): void;
  onPrev(): void;
  onToggle(): void;
  onNext(): void;
  onLast(): void;
}

export function PlayerControls({
  playing,
  atStart,
  atEnd,
  onFirst,
  onPrev,
  onToggle,
  onNext,
  onLast,
}: PlayerControlsProps): ReactElement {
  const controls = [
    { glyph: '◀◀', label: 'First step', onClick: onFirst, disabled: atStart },
    { glyph: '◀', label: 'Step back', onClick: onPrev, disabled: atStart },
    {
      glyph: playing ? '❚❚' : '▶',
      label: playing ? 'Pause' : 'Play',
      onClick: onToggle,
      disabled: false,
    },
    { glyph: '▶', label: 'Step forward', onClick: onNext, disabled: atEnd },
    { glyph: '▶▶', label: 'Last step', onClick: onLast, disabled: atEnd },
  ];

  return (
    <div className="flex border border-border">
      {controls.map((control) => (
        <button
          key={control.label}
          type="button"
          aria-label={control.label}
          disabled={control.disabled}
          onClick={control.onClick}
          className="size-8 border-border font-mono text-xs text-text transition-colors duration-(--dur-fast) not-first:border-l hover:bg-surface-2 disabled:text-faint disabled:hover:bg-transparent"
        >
          {control.glyph}
        </button>
      ))}
    </div>
  );
}
