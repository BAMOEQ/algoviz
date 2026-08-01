import type { Highlight } from '@/lib/engine/types';

/**
 * The shared highlight vocabulary for every view.
 *
 * Highlights are never color-only: each one pairs its hue with a stroke, dash, opacity, or scale
 * cue so the visualization stays readable for colorblind users and in screenshots.
 */
export interface HighlightStyle {
  /** Tailwind classes for fill + stroke. */
  className: string;
  strokeWidth: number;
  /** SVG dash pattern, or undefined for a solid stroke. */
  strokeDasharray?: string;
  /** Element opacity, 1 unless the highlight dims the element. */
  opacity: number;
  /** Whether this highlight gets the soft outer glow filter. */
  glow: boolean;
  /** Scale the node animates in from. 1 means no scale-in. */
  enterScale: number;
}

export const HIGHLIGHT_STYLES: Record<Highlight, HighlightStyle> = {
  none: {
    className: 'fill-surface-1 stroke-border-strong',
    strokeWidth: 1,
    opacity: 1,
    glow: false,
    enterScale: 1,
  },
  active: {
    className: 'fill-surface-2 stroke-hl-active',
    strokeWidth: 2,
    opacity: 1,
    glow: true,
    enterScale: 1,
  },
  compare: {
    className: 'fill-hl-compare/10 stroke-hl-compare',
    strokeWidth: 2,
    strokeDasharray: '4 2',
    opacity: 1,
    glow: false,
    enterScale: 1,
  },
  visited: {
    className: 'fill-hl-visited/18 stroke-hl-visited',
    strokeWidth: 1,
    opacity: 0.72,
    glow: false,
    enterScale: 1,
  },
  path: {
    className: 'fill-hl-path/10 stroke-hl-path',
    strokeWidth: 3,
    opacity: 1,
    glow: false,
    enterScale: 1,
  },
  inserted: {
    className: 'fill-hl-inserted/12 stroke-hl-inserted',
    strokeWidth: 2,
    opacity: 1,
    glow: false,
    enterScale: 0.9,
  },
  removed: {
    className: 'fill-hl-removed/10 stroke-hl-removed',
    strokeWidth: 1,
    strokeDasharray: '2 2',
    opacity: 0.35,
    glow: false,
    enterScale: 1,
  },
};

/** Text color for a value sitting inside a highlighted node. */
export function valueClassName(highlight: Highlight): string {
  return highlight === 'none' ? 'fill-text' : 'fill-text';
}

export const GLOW_FILTER_ID = 'algoviz-node-glow';
