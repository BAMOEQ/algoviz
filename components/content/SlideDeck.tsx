'use client';

import { motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { InitCode } from '@/components/content/InitCode';
import { getStructure } from '@/lib/registry';
import type { StructureHandle } from '@/lib/registry';

export interface SlideDeckProps {
  /** Structure slug, injected by `remarkSectionize` from the doc's filename. */
  slug?: string;
  /** The `<section id data-label>` elements the sectionize plugin produced. */
  children?: ReactNode;
}

interface Slide {
  id: string;
  label: string;
  content: ReactNode;
}

/** Horizontal travel a swipe must cover before it counts as a page turn. */
const SWIPE_THRESHOLD_PX = 48;

/** Where a left/right arrow means something other than "turn the page". */
const ARROW_KEYS_OWNED_ELSEWHERE =
  '[data-slide-panels], [role="tablist"], input, textarea, select, [contenteditable="true"]';

/**
 * The registry slides are plain JSX rather than MDX, so they restate the two prose styles from
 * `mdx-components.tsx` — a doc slide and a generated slide have to be indistinguishable.
 */
const SLIDE_TITLE = 'border-b border-border pb-3 font-mono text-xl tracking-tight text-text';
const SLIDE_PROSE = 'text-[15px] leading-relaxed text-muted';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function subscribeToHash(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

function readHash(): string {
  return window.location.hash.slice(1);
}

/** The prerendered HTML has no URL fragment, so it always opens on the first slide. */
function readHashOnServer(): string {
  return '';
}

/**
 * Reads the sections the compiler produced. Anything without a label is not a slide, and fragments
 * are looked through — MDX hands the sections over as a flat array, but a hand-written caller
 * naturally wraps them in one.
 */
function readDocSlides(children: ReactNode): Slide[] {
  return Children.toArray(children).flatMap<Slide>((child) => {
    if (!isValidElement(child)) return [];

    if (child.type === Fragment) {
      return readDocSlides((child.props as { children?: ReactNode }).children);
    }

    const props = child.props as { id?: string; 'data-label'?: string };
    const label = props['data-label'];
    if (!label || !props.id) return [];

    return [{ id: props.id, label, content: child }];
  });
}

/**
 * The two closing slides every structure gets, generated from the registry so they always agree
 * with the code — the same reason the complexity table is not hand-written in the docs.
 */
function readRegistrySlides(structure: StructureHandle | undefined): Slide[] {
  if (!structure) return [];

  return [
    {
      id: 'in-code',
      label: 'In code',
      content: (
        <section>
          <h2 className={SLIDE_TITLE}>In code</h2>
          <p className={SLIDE_PROSE}>
            The same {structure.name.toLowerCase()} the demo is seeded with, built with what the
            language actually gives you.
          </p>
          <InitCode slug={structure.slug} />
        </section>
      ),
    },
    {
      // Not "Algorithms": nearly every doc already has a section under that name, discussing what
      // the algorithms do. This slide is the code they run.
      id: 'pseudocode',
      label: 'Pseudocode',
      content: (
        <section>
          <h2 className={SLIDE_TITLE}>Pseudocode</h2>
          <p className={SLIDE_PROSE}>
            The exact lines the visualizer highlights as it steps — one block per algorithm
            registered on this structure.
          </p>

          {structure.algorithms.length === 0 ? (
            <p className={SLIDE_PROSE}>No algorithms are registered for this structure yet.</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {structure.algorithms.map((algorithm) => (
                <li key={algorithm.id} className="flex flex-col gap-2">
                  <h3 className="font-mono text-[15px] text-text">{algorithm.name}</h3>
                  {algorithm.description && (
                    <p className="text-sm leading-relaxed text-muted">{algorithm.description}</p>
                  )}
                  <ol className="border border-border bg-surface-1 p-3">
                    {algorithm.pseudocode.map((line, index) => (
                      <li key={index} className="flex gap-3 font-mono text-[13px] text-muted">
                        <span className="w-4 shrink-0 text-right text-faint tabular-nums">
                          {index + 1}
                        </span>
                        <span className="whitespace-pre">{line}</span>
                      </li>
                    ))}
                  </ol>
                </li>
              ))}
            </ul>
          )}
        </section>
      ),
    },
    {
      id: 'free-play',
      label: 'Free play',
      content: (
        <section>
          <h2 className={SLIDE_TITLE}>Try it in Free Play</h2>
          <p className={SLIDE_PROSE}>
            Build a {structure.name.toLowerCase()} with real operations and run any of these
            algorithms over the structure you built.
          </p>
          <Link
            href={`/playground?structure=${structure.slug}&seed=1`}
            className="self-start border border-border-strong bg-surface-1 px-4 py-2.5 font-mono text-sm text-text transition-colors duration-(--dur-fast) hover:bg-surface-2"
          >
            Open {structure.name} in Free Play →
          </Link>
        </section>
      ),
    },
  ];
}

/**
 * The explainer as a trace.
 *
 * Every other surface in this app is `steps[currentIndex]` — a frozen sequence you scrub with a
 * rail and a pair of step buttons. A structure page is the same instrument with ideas in place of
 * swaps, so the controls, the counter and the glyphs deliberately match the algorithm player.
 *
 * Every slide stays mounted (hidden, not unmounted) for three reasons: the static HTML keeps the
 * whole explainer for crawlers, a demo you stepped through is still where you left it when you come
 * back, and the incoming panel can animate from a real starting position.
 */
export function SlideDeck({ slug, children }: SlideDeckProps): ReactElement | null {
  const structure = useMemo(() => (slug ? getStructure(slug) : undefined), [slug]);

  const slides = useMemo(
    () => [...readDocSlides(children), ...readRegistrySlides(structure)],
    [children, structure],
  );

  const total = slides.length;
  const reduceMotion = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  // Until the reader picks a slide, the URL picks it: `#complexity` opens on that slide rather
  // than scrolling to it. Reading the hash through a store rather than an effect keeps the
  // prerendered HTML (which has no hash) and the first client render in agreement.
  const [selected, setSelected] = useState<number | null>(null);
  const hash = useSyncExternalStore(subscribeToHash, readHash, readHashOnServer);

  const clamp = (target: number): number => Math.min(Math.max(target, 0), Math.max(total - 1, 0));

  const fromHash = slides.findIndex((slide) => slide.id === hash);
  const active = clamp(selected ?? (fromHash >= 0 ? fromHash : 0));

  function go(target: number, focusRail = false): void {
    const next = clamp(target);
    setSelected(next);

    if (focusRail) {
      railRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
    }
  }

  // One scroll container serves every panel, so without this a slide reached from a scrolled-down
  // one would open halfway through its own text.
  useEffect(() => {
    if (panelsRef.current) panelsRef.current.scrollTop = 0;
  }, [active]);

  // Mirror the current slide into the URL without a jump: assigning `location.hash` would scroll
  // the panel to an element that is already in view. `replaceState` also keeps the deck out of
  // the back stack, so Back still leaves the page rather than walking the slides.
  useEffect(() => {
    if (selected === null) return;
    const slide = slides[selected];
    if (slide) window.history.replaceState(null, '', `#${slide.id}`);
  }, [selected, slides]);

  // Arrow keys work from the page itself — where a reader who just arrived, or who just clicked ▶,
  // actually is. Slide content is off limits: the demo's timeline slider binds the same arrows and
  // must keep them, and the rail runs the standard tab-list handler below.
  useEffect(() => {
    function handleKey(event: KeyboardEvent): void {
      const origin = event.target as Element | null;
      if (origin?.closest?.(ARROW_KEYS_OWNED_ELSEWHERE)) return;

      const moves: Record<string, number | undefined> = {
        ArrowLeft: active - 1,
        ArrowRight: active + 1,
      };

      const target = moves[event.key];
      if (target === undefined) return;

      event.preventDefault();
      setSelected(clamp(target));
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });

  function handleRailKeyDown(event: ReactKeyboardEvent<HTMLDivElement>): void {
    const moves: Record<string, number | undefined> = {
      ArrowLeft: active - 1,
      ArrowRight: active + 1,
      Home: 0,
      End: total - 1,
    };

    const target = moves[event.key];
    if (target === undefined) return;

    event.preventDefault();
    go(target, true);
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>): void {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: ReactTouchEvent<HTMLDivElement>): void {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start === null) return;

    const travel = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(travel) < SWIPE_THRESHOLD_PX) return;

    go(travel < 0 ? active + 1 : active - 1);
  }

  if (total === 0) return null;

  const upcoming = slides[active + 1];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={railRef}
        role="tablist"
        aria-label="Explainer sections"
        aria-orientation="horizontal"
        onKeyDown={handleRailKeyDown}
        className="flex shrink-0 overflow-x-auto border-b border-border bg-surface-1"
      >
        {slides.map((slide, index) => {
          const selected = index === active;

          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              id={`slide-tab-${slide.id}`}
              aria-controls={`slide-panel-${slide.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => go(index)}
              className={`panel-label shrink-0 border-b-2 px-4 py-2.5 whitespace-nowrap transition-colors duration-(--dur-fast) not-first:border-l not-first:border-l-border ${
                selected
                  ? 'border-b-hl-active text-text'
                  : 'border-b-transparent hover:bg-surface-2 hover:text-text'
              }`}
            >
              {slide.label}
            </button>
          );
        })}
      </div>

      <div
        ref={panelsRef}
        data-slide-panels
        className="dot-grid min-h-0 flex-1 overflow-y-auto"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slide, index) => (
          <motion.div
            key={slide.id}
            role="tabpanel"
            id={`slide-panel-${slide.id}`}
            aria-labelledby={`slide-tab-${slide.id}`}
            hidden={index !== active}
            initial={false}
            // Travel only, no fade: an opacity ramp would leave the incoming text mid-transparent
            // for a beat, and the panel swap already carries the change.
            animate={{ x: index === active ? 0 : index < active ? -16 : 16 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-3xl px-6 py-10 [&>section]:flex [&>section]:flex-col [&>section]:gap-4"
          >
            {slide.content}
          </motion.div>
        ))}
      </div>

      {/* The right padding keeps the theme toggle, which is fixed to the viewport corner, off the
          end of this row. */}
      <div className="flex shrink-0 items-center gap-4 border-t border-border bg-surface-1 py-2.5 pr-20 pl-4">
        <div className="flex border border-border">
          <button
            type="button"
            aria-label="Previous slide"
            disabled={active === 0}
            onClick={() => go(active - 1)}
            className="size-8 font-mono text-xs text-text transition-colors duration-(--dur-fast) hover:bg-surface-2 disabled:text-faint disabled:hover:bg-transparent"
          >
            ◀
          </button>
          <button
            type="button"
            aria-label="Next slide"
            disabled={active === total - 1}
            onClick={() => go(active + 1)}
            className="size-8 border-l border-border font-mono text-xs text-text transition-colors duration-(--dur-fast) hover:bg-surface-2 disabled:text-faint disabled:hover:bg-transparent"
          >
            ▶
          </button>
        </div>

        <span className="font-mono text-xs text-muted tabular-nums">
          {pad(active + 1)} / {pad(total)}
        </span>

        {upcoming && (
          <span className="ml-auto hidden truncate font-mono text-xs text-faint sm:block">
            {`next: ${upcoming.label} →`}
          </span>
        )}
      </div>
    </div>
  );
}
