import Link from "next/link";

/*
 * Landing page.
 *
 * The hero is the product's own output: a real bubble-sort trace rendered as a
 * waveform. Tick height and tick color both encode what the step did, so the
 * shape stays readable without relying on color alone.
 *
 * The trace is generated locally here rather than imported from
 * `lib/algorithms/sorting.ts`, which does not exist yet — that file is owned by
 * a later task. Swap this generator for real tracer output once it lands.
 */

type TickKind = "pass" | "compare" | "swap";

const HERO_INPUT = [5, 2, 9, 1, 7, 3];

function bubbleSortTicks(input: readonly number[]): TickKind[] {
  const a = [...input];
  const ticks: TickKind[] = [];

  for (let i = 0; i < a.length; i++) {
    ticks.push("pass");
    for (let j = 0; j < a.length - i - 1; j++) {
      ticks.push("compare");
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        ticks.push("swap");
      }
    }
  }

  return ticks;
}

const TICK_STYLE: Record<TickKind, { height: string; className: string }> = {
  pass: { height: "26%", className: "bg-faint/45" },
  compare: { height: "62%", className: "bg-hl-compare" },
  swap: { height: "100%", className: "bg-hl-removed" },
};

function TraceRibbon({ ticks }: { ticks: readonly TickKind[] }) {
  return (
    <div
      className="flex h-24 items-end gap-px border-y border-border bg-surface-1/40 px-px"
      aria-hidden="true"
    >
      {ticks.map((kind, i) => (
        <div
          key={i}
          className={`min-w-px flex-1 ${TICK_STYLE[kind].className}`}
          style={{ height: TICK_STYLE[kind].height }}
        />
      ))}
    </div>
  );
}

function LegendSwatch({
  className,
  height,
  label,
}: {
  className: string;
  height: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex h-3 w-1 items-end">
        <span className={`w-full ${className}`} style={{ height }} />
      </span>
      <span className="font-mono text-[11px] tracking-wide text-muted">{label}</span>
    </span>
  );
}

const PIPELINE = [
  {
    stage: "emit",
    body: "An algorithm never animates. It runs to completion and emits an array of steps, each one carrying a full snapshot of the structure.",
  },
  {
    stage: "snapshot",
    body: "Because a step holds the whole scene rather than a diff, stepping backward is free and scrubbing to step 400 is exact. Nothing is replayed.",
  },
  {
    stage: "read",
    body: "The pseudocode line, the watch variables, the counters, and the highlighted cells all come from that one step. They cannot disagree.",
  },
];

export default function Home() {
  const ticks = bubbleSortTicks(HERO_INPUT);
  const swaps = ticks.filter((tick) => tick === "swap").length;
  const comparisons = ticks.filter((tick) => tick === "compare").length;

  return (
    <main className="dot-grid flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-2.5">
        <span className="panel-label">algoviz</span>
        <span className="panel-label text-faint">stage 0 · foundation</span>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16 sm:py-24">
        <section className="flex flex-col gap-6">
          <h1 className="font-mono text-4xl leading-none font-medium tracking-tight sm:text-5xl">
            algoviz
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted">
            A data structure is easy to draw and hard to watch. This is an instrument for
            watching one — drive a real structure with real operations, run an algorithm over
            it, then step through the result one line at a time.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <span className="panel-label">
              trace · bubble sort · [{HERO_INPUT.join(" ")}]
            </span>
            <span className="font-mono text-[11px] tracking-wide text-faint tabular-nums">
              {ticks.length} steps · {comparisons} comparisons · {swaps} swaps
            </span>
          </div>

          <TraceRibbon ticks={ticks} />

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <LegendSwatch {...TICK_STYLE.swap} label="swap" />
            <LegendSwatch {...TICK_STYLE.compare} label="compare" />
            <LegendSwatch {...TICK_STYLE.pass} label="pass boundary" />
            <span className="font-mono text-[11px] text-faint">
              every step of the sort, left to right
            </span>
          </div>
        </section>

        <section className="grid gap-px border border-border bg-border sm:grid-cols-3">
          {PIPELINE.map(({ stage, body }) => (
            <article key={stage} className="flex flex-col gap-3 bg-surface-0 p-5">
              <h2 className="panel-label text-hl-active">{stage}</h2>
              <p className="text-sm leading-relaxed text-muted">{body}</p>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-3">
            <Link
              href="/playground"
              className="border border-border-strong bg-surface-1 px-4 py-2.5 font-mono text-sm text-text transition-colors duration-(--dur-fast) hover:bg-surface-2"
            >
              Open Free Play →
            </Link>
            <Link
              href="/data-structures"
              className="border border-border px-4 py-2.5 font-mono text-sm text-muted transition-colors duration-(--dur-fast) hover:border-border-strong hover:text-text"
            >
              Browse data structures →
            </Link>
          </div>
          <p className="font-mono text-xs leading-relaxed text-faint">
            Coverage today: the array is live, with bubble sort traced end to end. The other
            nine structures and their algorithms land in the next wave.
          </p>
        </section>
      </div>
    </main>
  );
}
