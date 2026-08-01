# AlgoViz

A data structure and algorithm visualizer. Drive a real structure with real operations, run a
classic algorithm over it, then step through the result one line at a time — with the pseudocode,
the watch variables, the counters, and the highlighted elements all read from the same step.

Ten structures, roughly forty algorithms, no backend.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

| | |
|---|---|
| `/` | Landing page — the hero is a real bubble-sort trace rendered as a waveform |
| `/playground` | Free Play: pick a structure, drive it, run algorithms over what you built |
| `/data-structures` | Filterable index of every registered structure |
| `/data-structures/[slug]` | Explainer per structure, with a live steppable demo |

## The one idea

**Algorithms do not animate. They emit an array of steps, and the UI is a pure function of
`steps[currentIndex]`.**

```ts
type Step = {
  line: number;                     // pseudocode line to highlight
  narration: string;                // plain-language description
  scene: SceneGraph;                // FULL visual state at this step
  vars: Record<string, Primitive>;  // watch panel
  callStack?: Frame[];              // for recursive algorithms
  metrics: Metrics;                 // comparisons, swaps, reads, writes
};
```

Steps carry **full snapshots, not diffs**. At this scale the memory cost is trivial and it buys
three things for free: instant back-stepping, timeline scrubbing to any index without replaying, and
tests that assert on exact traces.

An algorithm is ordinary code with `t.step(...)` calls interleaved, and its pseudocode lives beside
it as a string array so line numbers stay in sync by construction:

```ts
export const bubbleSort: AlgorithmDef<ArrayState> = {
  id: 'bubble-sort',
  name: 'Bubble Sort',
  pseudocode: ['for i = 0 to n-1', '  for j = 0 to n-i-2', '    if a[j] > a[j+1]', '      swap(...)'],
  run: (state, t) => {
    /* ... */
    t.mark(j, 'compare').mark(j + 1, 'compare');
    t.step(2, `Compare ${a} and ${b}.`, { i, j }, { comparisons: 1 });
  },
};
```

`Tracer.step()` calls the structure's `toScene()` to capture the snapshot, so no algorithm ever
touches rendering.

## Architecture

```
app/            landing, playground, data-structures index + [slug]
content/        ten MDX explainers
lib/
  engine/       types.ts  tracer.ts  player.ts        FROZEN CONTRACT
  registry/     types.ts  index.ts                    FROZEN CONTRACT
                linear.ts tree.ts graph.ts hash.ts    family barrels
  structures/   ten StructureDefs
  algorithms/   sorting, searching, traversals, graph search, paths, MST, ...
  layout/       linear · tree (Reingold–Tilford) · graph (d3-force, frozen)
  share/        op-log encoding for URLs and localStorage
components/
  viz/          SceneRenderer + five views + VizNode/VizEdge
  player/       PlayerControls · Timeline (trace ribbon) · SpeedControl
  panels/       OperationPanel · CodePane · VariablePanel · MetricsBar · NarrationBar
  content/      Demo · ComplexityTable · StructureCard
```

**The registry is the extensibility spine.** Free Play builds its entire UI from it — the structure
dropdown, the operation form fields, the algorithm list — and the explainer pages read complexity
tables and demos from the same source. Adding an eleventh structure is one file plus one MDX doc,
with zero UI changes.

**Five scene kinds cover all ten structures** (`linear`, `linked`, `tree`, `graph`, `table`), so
renderers know nothing about BSTs or heaps. **Layout is pure and deterministic** and lives apart from
rendering: same input, same coordinates, every time. The graph's force layout runs to convergence
once and then freezes, so algorithm playback changes highlights only, never geometry.

A structure is authored generically over its own state type and then erased, so the registry can
hold ten different structures without a single `any` in `lib/`:

```ts
export function defineStructure<S>(def: StructureDef<S>): StructureHandle;
```

## Design

Technical dark-first — a debugger, not a marketing page. Tokens live in `app/globals.css` as CSS
variables with a light override under `[data-theme='light']`.

Highlights are **never color-only**: `compare` also gets a dashed stroke, `visited` a fill tint plus
reduced opacity, `path` a thickened stroke. That keeps the visualization readable for colorblind
users and in screenshots.

The signature element is the **trace ribbon** — the timeline renders one tick per step, sized and
colored by what that step did, so an algorithm's shape is legible as a waveform before you press
play.

## Commands

```bash
pnpm dev          # dev server
pnpm test         # vitest — engine, structures, layout, registry step integrity
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm test:e2e     # playwright smoke tests
pnpm verify       # typecheck + lint + test + build
```

## Testing

The engine carries the test weight, because that is where both the value and the risk live.

- **Golden traces** — exact step counts, exact final state, exact counters.
- **Step integrity** — one generic test walks the *entire* registry and asserts every `Step.line` is
  a valid index into that algorithm's pseudocode, that scene element ids are unique and stable, and
  that running an algorithm never mutates the caller's state. It automatically covers every
  algorithm added later.
- **Layout purity** — deterministic coordinates, no overlapping boxes.
- **Component tests** — the panels and the player controls.
- **Playwright** — build a BST and traverse it; step an embedded demo on an explainer page.

## Sharing

Every applied operation is appended to an **op log**. That log — not a node dump — is what goes into
localStorage and into the base64url share URL. Replaying operations guarantees the restored
structure is valid by construction, and keeps URLs short.

## Limits

Hard input caps keep traces bounded: array ≤ 60 cells, tree ≤ 63 nodes, graph ≤ 40 nodes. The tracer
aborts at 5000 steps and the UI surfaces a "trace truncated" notice rather than stalling the browser.

## Accessibility

Narration sits in an `aria-live` region so a screen reader follows the algorithm. The trace ribbon is
a real slider with full keyboard control (←/→ step, Home/End jump), and the playground binds ←/→,
space, Home and End globally. `prefers-reduced-motion` collapses every transition to zero.
