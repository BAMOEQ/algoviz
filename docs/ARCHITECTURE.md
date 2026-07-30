# AlgoViz — Data Structure & Algorithm Visualizer (Next.js)

> This document is the shared reference every implementation agent reads before starting its stage.

## Context

The target directory was empty; this is a greenfield build. The goal is a web app that teaches data
structures and algorithms by making their internal state visible and steppable.

Two primary surfaces:

1. **Free Play** (`/playground`) — user picks a structure, drives it with real operations, then runs
   algorithms on the structure they built.
2. **Data Structures** (`/data-structures`) — an index plus a thorough explainer page per structure,
   each with a live embedded visualizer.

Decisions locked in with the user:

| Decision | Choice |
|---|---|
| Coverage | Core set of 10 structures + their classic algorithms |
| Free Play model | Operation panel (typed ops, auto-layout) — structure is always valid by construction |
| Code view | Synchronized pseudocode with executing line highlighted + live variable panel |
| Backend | None. Client-side only, SSG, localStorage + URL-encoded sharing |
| Explainer format | Index + one page per structure, live embedded demos |
| Aesthetic | Technical dark-first (debugger/oscilloscope feel) |
| Execution | Staged for parallel cross-agent development (see Execution Plan) |

**Assumption to flag:** the user asked for two pages, but "algorithms" also need explaining. Rather
than a third top-level surface, each structure page owns the algorithms that operate on it (sorting
and binary search live on the Array page; BFS/DFS/Dijkstra/MST on the Graph page). If a standalone
`/algorithms` index is wanted later, the registry already has the data to generate it.

---

## Core architecture: the step-trace engine

This is the decision everything else hangs off. **Algorithms do not animate. They emit an array of
steps. The UI is a pure function of `steps[currentIndex]`.**

```ts
// lib/engine/types.ts
type Step = {
  line: number;                     // pseudocode line to highlight
  narration: string;                // plain-language description
  scene: SceneGraph;                // FULL visual state at this step
  vars: Record<string, Primitive>;  // watch panel
  callStack?: Frame[];              // for recursive algorithms
  metrics: { comparisons: number; swaps: number; reads: number; writes: number };
};
```

Steps carry **full snapshots, not diffs.** At our scale (≤ 60 array cells, ≤ 63 tree nodes, ≤ 40
graph nodes, ≤ 5000 steps) the memory cost is trivial, and it buys three things for free:
instant back-stepping, timeline scrubbing to any index, and trivially assertable tests.

### SceneGraph — the render-agnostic view model

Five shapes cover all ten structures. Renderers know nothing about BSTs or heaps, only these:

```ts
type SceneGraph =
  | { kind: 'linear'; cells: Cell[]; pointers: Pointer[] }        // array, stack, queue, heap-as-array
  | { kind: 'linked'; nodes: LNode[]; links: Link[] }             // singly/doubly linked list
  | { kind: 'tree';   nodes: TNode[]; edges: Edge[] }             // BST, heap-as-tree, trie
  | { kind: 'graph';  nodes: GNode[]; edges: Edge[]; directed: boolean; weighted: boolean }
  | { kind: 'table';  buckets: Bucket[] };                        // hash table

type Highlight = 'none' | 'active' | 'compare' | 'visited' | 'path' | 'inserted' | 'removed';
```

Every element carries a `Highlight` and a stable `id`. Stable ids are what let `motion` animate
nodes between steps instead of remounting them.

### Writing an algorithm

Implementations read like normal code with `t.step(...)` calls interleaved. Pseudocode lives beside
the implementation as a string array, so line numbers stay in sync by construction:

```ts
export const bubbleSort: AlgorithmDef<number[]> = {
  id: 'bubble-sort',
  name: 'Bubble Sort',
  pseudocode: [
    'for i = 0 to n-1',              // 0
    '  for j = 0 to n-i-2',          // 1
    '    if a[j] > a[j+1]',          // 2
    '      swap(a[j], a[j+1])',      // 3
  ],
  run: (arr, t) => {
    for (let i = 0; i < arr.length; i++) {
      t.step(0, `Pass ${i + 1}`, { i });
      for (let j = 0; j < arr.length - i - 1; j++) {
        t.mark(j, 'compare').mark(j + 1, 'compare');
        t.step(2, `Compare ${arr[j]} and ${arr[j + 1]}`, { i, j }, { comparisons: 1 });
        if (arr[j] > arr[j + 1]) { /* swap */ t.step(3, `Swap`, { i, j }, { swaps: 1 }); }
      }
    }
  },
};
```

`Tracer.step()` calls the structure's `toScene()` to capture the snapshot, so no algorithm ever
touches rendering concerns.

### The registry — the extensibility spine

```ts
// lib/registry/types.ts
interface StructureDef<S> {
  id: string; name: string; slug: string; category: 'linear' | 'tree' | 'graph' | 'hash';
  create(): S;
  seed(): S;                         // example instance for explainer-page demos
  operations: OperationDef<S>[];     // declares its own inputs → drives the UI form
  algorithms: AlgorithmDef<S>[];
  toScene(state: S, marks: MarkSet): SceneGraph;
  complexity: ComplexityTable;       // rendered on the explainer page
}
```

Free Play builds its **entire UI** from this registry — the structure dropdown, the operation form
fields, the algorithm list. Explainer pages pull the Big-O table and demo from the same source.
**Adding an 11th structure is one file plus one MDX doc, with zero UI changes.**

---

## Scope: 10 structures and their algorithms

| Structure | Operations | Algorithms |
|---|---|---|
| **Array** (dynamic) | get, set, push, pop, insertAt, removeAt, resize | bubble, insertion, selection, merge, quick, heap sort; linear & binary search |
| **Linked List** (singly/doubly) | pushFront/Back, popFront/Back, insertAfter, remove, reverse | traversal, reversal, cycle detection (Floyd), middle-node |
| **Stack** | push, pop, peek | balanced-parens, postfix eval, DFS-with-stack |
| **Queue** (+ circular) | enqueue, dequeue, peek | BFS-with-queue, ring-buffer wraparound |
| **Hash Table** | put, get, delete, resize | separate chaining vs. open addressing, load factor & rehash |
| **BST** | insert, delete, search, min/max | in/pre/post/level-order, height, validate, successor |
| **Binary Heap** (min/max) | insert, extract, peek, buildHeap | sift-up, sift-down, heapify, heapsort |
| **Trie** | insert, search, startsWith, delete | prefix walk, autocomplete, word count |
| **Graph** (adj list) | addNode, addEdge, removeNode/Edge, toggle directed/weighted | BFS, DFS, Dijkstra, topological sort, cycle detection, connected components, Prim, Kruskal |
| **Union-Find** | makeSet, union, find | union-by-rank, path compression (visualized as tree flattening) |

Kruskal deliberately reuses the Union-Find structure — a nice cross-link between explainer pages.

---

## File layout

```
docs/ARCHITECTURE.md                   # this document
app/
  layout.tsx  page.tsx  globals.css
  playground/page.tsx
  data-structures/page.tsx
  data-structures/[slug]/page.tsx      # generateStaticParams from registry
content/data-structures/*.mdx          # 10 explainer docs
lib/
  engine/     types.ts  tracer.ts  player.ts        # FROZEN CONTRACT
  registry/   types.ts  index.ts                    # FROZEN CONTRACT
              linear.ts  tree.ts  graph.ts  hash.ts # family barrels, one owner each
  structures/ array.ts linked-list.ts stack.ts queue.ts hash-table.ts
              bst.ts heap.ts trie.ts graph.ts union-find.ts
  algorithms/ sorting.ts searching.ts tree-traversal.ts graph-search.ts
              shortest-path.ts mst.ts topological.ts
  layout/     tree-layout.ts  graph-layout.ts  linear-layout.ts
  share/      encode.ts                            # URL state <-> op log
components/
  viz/     SceneRenderer.tsx LinearView.tsx LinkedView.tsx TreeView.tsx
           GraphView.tsx TableView.tsx VizNode.tsx VizEdge.tsx
  player/  PlayerControls.tsx Timeline.tsx SpeedControl.tsx
  panels/  OperationPanel.tsx CodePane.tsx VariablePanel.tsx MetricsBar.tsx NarrationBar.tsx
  content/ ComplexityTable.tsx Demo.tsx StructureCard.tsx
```

**Layout is pure and separate from rendering.** `tree-layout.ts` implements Reingold–Tilford tidy
layout; `graph-layout.ts` runs `d3-force` to convergence **synchronously once, then freezes**
positions — deterministic output means reproducible screenshots and testable layouts. d3 is used
for math only; React renders all SVG.

**Family barrels exist purely to make parallel agent work conflict-free.** `lib/registry/index.ts`
is written once in Stage 0 and imports four arrays that each start empty; each agent appends only
to the barrel it owns, so no two agents ever write the same file.

---

## Tech stack

- **Next.js 16 App Router** (Turbopack), React 19.2, TypeScript `strict`, SSG (no server runtime needed)
- **Tailwind CSS v4** with CSS-variable design tokens (enables the light-mode toggle for free)
- **`motion`** (Framer Motion) — layout animation on SVG nodes keyed by stable id
- **`d3-force` + `d3-hierarchy`** — layout math only
- **MDX** via `@next/mdx` for explainer content, with `<Demo>` and `<ComplexityTable>` in scope
- **Vitest** for the engine (the bulk of testing), **Playwright** for two e2e smoke tests
- pnpm

---

## Visual design — technical dark-first

Tokens in `globals.css` as CSS variables, dark default with a light override under
`[data-theme='light']`.

```
surface-0  #0B0E14   canvas (24px dot grid, 4% opacity)
surface-1  #131722   panels
border     #232936   1px hairlines — no drop shadows anywhere
text       #E6EAF2   muted #8A94A6
```

Highlight palette — chosen to stay distinguishable against near-black and in the light theme:

```
active    cyan    #22D3EE      compare  amber   #FBBF24
visited   violet  #A78BFA      path     emerald #34D399
inserted  emerald #34D399      removed  rose    #FB7185
```

Type: **Inter** for prose, **JetBrains Mono** for every value, index, pointer label, and the code
pane. Node values are always monospace — it keeps digits aligned as they animate between cells.

Depth comes from stroke opacity and a soft outer `feGaussianBlur` glow on active nodes, never from
shadows. Transitions are 180ms `ease-out`; the *only* thing that moves is what the algorithm
touched.

**Highlights are never color-only** — `compare` also gets a dashed stroke, `visited` a fill tint
plus reduced opacity, `path` a thickened stroke. This keeps the visualization readable for
colorblind users and in screenshots.

---

## Free Play page layout

```
┌──────────────┬──────────────────────────────────┬───────────────┐
│ Structure ▾  │                                  │ 1  function.. │
│  BST         │           ( 50 )                 │ 2    if ...   │
│              │           /    \                 │ 3 ▸  compare  │  ← executing line
│ ── Ops ──    │       ( 30 )   ( 70 )            │ 4    ...      │
│ insert [42]  │        /                         │               │
│ delete [__]  │      (12)                        │ ── Vars ──    │
│ search [__]  │                                  │ node = 30     │
│              │  "Comparing 42 with 30"          │ depth = 1     │
│ ── Run ──    │                                  │               │
│ ▸ In-order   │  ◀◀  ◀  ▶  ▶  ▶▶   1x ▾          │ cmp 3  swap 0 │
│ ▸ Validate   │  ├────●──────────────┤ 3/9       │               │
└──────────────┴──────────────────────────────────┴───────────────┘
```

- Left rail and right rail collapse to bottom sheets under 1024px; the visualization always wins
  the space.
- Operations mutate the structure and each produce a short trace (an insert animates too).
- Running an algorithm loads a longer trace into the player; the structure is restored on reset.
- Every applied operation is appended to an **op log**. That log — not a node dump — is what gets
  saved to localStorage and base64url-encoded into the share URL. Replaying ops guarantees the
  restored structure is always valid, and keeps URLs short.

---

## Explainer page anatomy (`/data-structures/[slug]`)

Each MDX doc follows a fixed spine so all ten pages feel like one system:

1. **What it is** — one-paragraph mental model, plus the invariant that defines it
2. **Live demo** — `<Demo structure="bst" />`, preloaded via `seed()`, fully steppable inline
3. **How operations work** — one subsection per op, each with its own small stepped demo
4. **Complexity** — `<ComplexityTable>` rendered from the registry, average vs. worst case, and space
5. **Algorithms on this structure** — the pseudocode + narration for each registered algorithm
6. **When to use it / when not to** — including the realistic tradeoff against neighboring structures
7. **Common pitfalls** — off-by-one on resize, forgetting to rebalance, hash collision handling
8. **Try it in Free Play** — deep link carrying the seeded structure in the URL

The index page is a filterable card grid (by category and by Big-O of the primary operation), each
card showing a tiny static SVG glyph of the structure.

---

# Execution plan — staged for cross-agent development

## Rules every agent follows

1. **Read `docs/ARCHITECTURE.md` first.** It is this document.
2. **The contract is frozen.** No agent modifies `lib/engine/types.ts`, `lib/engine/tracer.ts`,
   `lib/registry/types.ts`, `lib/registry/index.ts`, `app/globals.css`, or
   `components/viz/SceneRenderer.tsx`. If a stage genuinely needs a contract change, it **stops and
   escalates to the integrator** rather than editing — a unilateral contract edit silently breaks
   every sibling agent.
3. **Own your files, touch nothing else.** The ownership table below is exhaustive. Every stage
   writes only files listed under it.
4. **TDD.** Write the golden-trace test before the implementation. `pnpm test` green before handoff.
5. **Copy the reference slice.** Stage 0 ships Array + bubble sort + `LinearView` fully working.
   That is the worked example — mirror its shape rather than inventing a new one.
6. **One branch per stage**, isolated worktree, merged by the integrator at each wave boundary.

## Dependency graph

```
             ┌──────────────────────────────┐
             │ STAGE 0 — Foundation (solo)  │   blocking, nothing starts until merged
             │ contracts + reference slice  │
             └──────────────┬───────────────┘
                            │
      ┌──────────┬──────────┼──────────┬──────────┐
      ▼          ▼          ▼          ▼          ▼
  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐  ┌───────┐    WAVE 1
  │  1A   │  │  1B   │  │  1C   │  │  1D   │  │  1E   │    5 agents,
  │Linear │  │ Trees │  │Graphs │  │ Hash  │  │Content│    fully parallel
  │       │  │       │  │       │  │+Sorts │  │ infra │
  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘  └───┬───┘
      └──────────┴─────┬────┴──────────┴──────────┘
                       ▼
             ┌─────────┴─────────┐
             ▼                   ▼                          WAVE 2
        ┌─────────┐         ┌─────────┐                     2 agents,
        │   2A    │         │   2B    │                     parallel
        │ 10 MDX  │         │ Polish  │
        │  docs   │         │ + a11y  │
        └────┬────┘         └────┬────┘
             └────────┬──────────┘
                      ▼
             ┌────────────────────┐                         WAVE 3
             │ STAGE 3 — Integrate│                         solo
             │ e2e, deploy, verify│
             └────────────────────┘
```

## File ownership — no two stages write the same file

| Stage | Owns (exclusive write access) |
|---|---|
| **0** | `docs/ARCHITECTURE.md`, all config, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `lib/engine/*`, `lib/registry/types.ts`, `lib/registry/index.ts`, `lib/layout/linear-layout.ts`, `lib/structures/array.ts`, `lib/algorithms/sorting.ts` *(bubble only)*, `components/viz/SceneRenderer.tsx`, `components/viz/LinearView.tsx`, `components/viz/VizNode.tsx`, `components/viz/VizEdge.tsx`, `components/player/*`, `components/panels/*`, `app/playground/page.tsx` |
| **1A** | `lib/structures/{stack,queue,linked-list}.ts`, `lib/algorithms/searching.ts`, `components/viz/LinkedView.tsx`, `lib/registry/linear.ts` |
| **1B** | `lib/structures/{bst,heap,trie}.ts`, `lib/algorithms/tree-traversal.ts`, `lib/layout/tree-layout.ts`, `components/viz/TreeView.tsx`, `lib/registry/tree.ts` |
| **1C** | `lib/structures/{graph,union-find}.ts`, `lib/algorithms/{graph-search,shortest-path,mst,topological}.ts`, `lib/layout/graph-layout.ts`, `components/viz/GraphView.tsx`, `lib/registry/graph.ts` |
| **1D** | `lib/structures/hash-table.ts`, `lib/algorithms/sorting.ts` *(the other five)*, `components/viz/TableView.tsx`, `lib/registry/hash.ts` |
| **1E** | `app/data-structures/page.tsx`, `app/data-structures/[slug]/page.tsx`, `components/content/*`, MDX config |
| **2A** | `content/data-structures/*.mdx` (10 files) |
| **2B** | `lib/share/encode.ts`, theme toggle, a11y + responsive passes across existing components |
| **3** | `e2e/*`, `README.md`, CI config |

Stage 1D writing `sorting.ts` while Stage 0 created it is the one deliberate seam: Stage 0 ships it
containing bubble sort only, then hands the file over to 1D at the wave boundary. No overlap in time.

Stage 2B is the only stage that edits files another stage created. It runs *after* wave 1 merges,
so those files are settled — but it is scoped to a11y attributes, responsive classes, and theme
tokens, not logic.

---

## Stage detail

### Stage 0 — Foundation (blocking, solo)

Nothing else can start until this merges. Its job is to make the contract real and prove it with one
complete vertical slice.

**Deliverables**

1. ~~`git init`; commit this document at `docs/ARCHITECTURE.md`.~~ **Done.**
2. ~~Next.js + TS strict + Tailwind v4 + Vitest + Playwright scaffold; pnpm.~~ **Done** — see
   *Scaffold status* below.
3. `app/globals.css` — the full token set from the Visual Design section.
4. `lib/engine/types.ts` — `Step`, `SceneGraph`, `Highlight`, `Metrics`, `Frame`. **Frozen after this.**
5. `lib/engine/tracer.ts` — `trace()`, `Tracer` with `.step()`, `.mark()`, metric accumulation, and
   the 5000-step abort guard.
6. `lib/engine/player.ts` — `usePlayer(steps)`: play/pause, speed 0.25×–4×, step ±1, scrub, reset.
7. `lib/registry/types.ts` + `index.ts` + four empty family barrels.
8. `components/viz/SceneRenderer.tsx` — dispatches on `scene.kind` to the five views; four of them
   are stubs rendering a "not yet implemented" placeholder.
9. **Reference slice:** Array structure + bubble sort + `LinearView` + `OperationPanel` +
   `CodePane` + `VariablePanel` + `MetricsBar` + `NarrationBar` + player controls, all wired into
   `/playground` and working end to end.
10. Tests: golden trace for bubble sort, player hook behavior, registry step-integrity test.

**Acceptance:** on `/playground` a user can push values into an array, run bubble sort, step forward
and backward through every step, and see the pseudocode line, variables, metrics, and cell
highlights agree at each index.

#### Scaffold status — deliverables 1 & 2 complete

Already on disk and committed; `pnpm verify` passes clean:

| | |
|---|---|
| Runtime | Node 22.23.1, pnpm 11.18.0 (via corepack) |
| Framework | Next.js 16.2.12 (Turbopack), React 19.2.4, TypeScript 5.9 strict |
| Styling | Tailwind CSS v4 |
| Animation / layout | `motion` 12.43, `d3-force` 3.0, `d3-hierarchy` 3.1 |
| Content | `@next/mdx` 16.2 (`pageExtensions` includes md/mdx) |
| Test | Vitest 4.1 + jsdom + Testing Library; Playwright 1.62 |
| Scripts | `dev build start lint typecheck test test:watch test:e2e verify` |

Directory skeleton is created with `.gitkeep` placeholders; `CLAUDE.md` at the repo root encodes the
contract rules so every agent loads them automatically.

`lib/toolchain.test.tsx` is a scaffolding smoke test proving the vitest + jsdom + RTL wiring. Delete
it once the engine's real tests land.

**Remaining for Stage 0:** deliverables 3–10 (tokens, engine, registry, reference slice).

### Wave 1 — five agents in parallel

Each agent implements structures per the `StructureDef` contract, an SVG view per its `SceneGraph`
kind, and registers everything in its own family barrel.

- **1A — Linear structures.** Stack, queue (incl. circular/ring-buffer wraparound), singly and
  doubly linked list. `LinkedView` with pointer arrows and null-terminator rendering. Linear and
  binary search. Stack/queue reuse `LinearView` — 1A must not modify it; if it needs a variant, it
  passes props the contract already exposes or escalates.
- **1B — Trees.** BST (insert / delete incl. the two-child case / search / min / max / successor /
  validate), binary heap (sift-up, sift-down, buildHeap, extract, both min and max), trie (insert /
  search / prefix / delete / autocomplete). Reingold–Tilford tidy layout in `tree-layout.ts` — must
  produce zero overlapping node boxes and be deterministic. `TreeView` renders all three.
- **1C — Graphs.** Graph with adjacency list, directed/undirected and weighted/unweighted toggles;
  union-find with union-by-rank and path compression (rendered as a tree that visibly flattens).
  BFS, DFS, Dijkstra, topological sort, cycle detection, connected components, Prim, Kruskal.
  Kruskal imports the union-find structure — the one intentional intra-stage dependency, which is
  why both live in 1C. `graph-layout.ts` runs d3-force to convergence once with a fixed seed, then
  freezes; algorithm playback changes highlights only, never geometry.
- **1D — Hashing and sorting.** Hash table with both separate chaining and open addressing, load
  factor tracking, and an animated rehash. `TableView` renders buckets and collision chains.
  Insertion, selection, merge, quick, and heap sort added to `sorting.ts` (heapsort self-contained
  on a plain array — it must not import 1B's heap structure).
- **1E — Content infrastructure.** MDX pipeline, `/data-structures` filterable card grid,
  `/data-structures/[slug]` template with `generateStaticParams` off the registry, `<Demo>`,
  `<ComplexityTable>`, `<StructureCard>`. Depends only on the registry contract, not on any
  sibling's output — it builds and tests against Array as its single concrete case, and the other
  nine light up automatically as barrels fill.

**Acceptance per agent:** `pnpm test` green, `pnpm exec tsc --noEmit` clean, every registered
structure driveable end to end on `/playground`, invariant fuzz tests passing.

### Wave 2 — two agents in parallel

- **2A — Content.** All ten MDX explainer docs following the fixed eight-part spine. Accuracy
  matters more than length: every complexity claim must match the registry table, and every
  "try it in Free Play" link must resolve to a real seeded structure.
- **2B — Polish.** Share URLs (base64url op log) + localStorage session save/restore, light theme
  toggle, `prefers-reduced-motion` handling, full keyboard control (←/→ step, space play/pause,
  Home/End), `aria-live` narration region, responsive rail collapse under 1024px, empty and error
  states, input caps with the "trace truncated" notice.

### Stage 3 — Integration (solo)

Two Playwright smoke tests, cross-page deep links verified, README, Vercel deploy, and the full
manual verification checklist below.

---

## Testing strategy

The engine is where the value and the risk both live, so it carries the test weight.

- **Golden traces** — `bubbleSort([3,1,2])` produces an exact step count, exact final array, and
  `comparisons === 3`. Cheap to write, catches any behavioral drift.
- **Invariants under fuzzing** — 1000 random ops against a BST leave in-order traversal sorted;
  against a heap leave the heap property intact; against a hash table match a reference `Map`.
- **Layout purity** — tree layout produces no overlapping node boxes and is deterministic across
  runs; graph force layout converges to identical coordinates given the same seed.
- **Step integrity** — one generic test loops the **entire registry** and asserts every `Step.line`
  is a valid index into that algorithm's `pseudocode` array. Written in Stage 0, it automatically
  guards every algorithm any later agent adds. This is the main cross-agent safety net.
- **Component tests** (light) — `PlayerControls` advances the index; `SceneRenderer` dispatches to
  the right view per `kind`.
- **Playwright smoke** (2 tests) — build a BST in Free Play and run in-order traversal to completion;
  load `/data-structures/binary-search-tree` and step its embedded demo.

---

## Known risks and their mitigations

| Risk | Mitigation |
|---|---|
| Step explosion (quicksort on 500 elements → 100k steps, browser stalls) | Hard input caps: array ≤ 60, tree ≤ 63 nodes, graph ≤ 40 nodes. Tracer aborts at 5000 steps and surfaces a "trace truncated — reduce input size" notice. |
| Snapshot memory | Caps above bound it to a few MB worst case. Revisit only if a real structure exceeds it. |
| **Parallel agents drift on the contract** | Contract files are frozen and unowned after Stage 0; the registry-wide step-integrity test fails loudly on any desync; family barrels mean zero shared-file writes. |
| **An agent reinvents the reference slice's patterns** | Stage 0 ships one complete working example; each wave-1 prompt points at it explicitly as the shape to mirror. |
| Ten MDX docs is the largest single time sink | Content is decoupled from code and isolated in wave 2. A missing doc degrades to a registry-generated stub, it does not break the build. |
| Graph layout jitter between steps | Positions computed once per structure mutation, frozen during algorithm playback. |
| Animation nausea / accessibility | `prefers-reduced-motion` → instant transitions. Full keyboard control. Narration in `aria-live="polite"` so screen readers follow the algorithm. |

---

## Verification

Run at every wave boundary before merging, and all green before Stage 3 is claimed complete:

```bash
pnpm test          # vitest — engine, invariants, layout, registry-wide step integrity
pnpm test:e2e      # playwright smoke
pnpm lint && pnpm exec tsc --noEmit
pnpm build         # must produce 10 static [slug] pages + playground
```

Manual end-to-end check on `pnpm dev`:

1. `/playground` → BST → insert 50, 30, 70, 12 → tree renders correctly with no overlaps.
2. Run in-order traversal → step forward through every step; pseudocode line, narration, variable
   panel, and node highlights all agree at each one.
3. Step backward to 0 → visualization returns exactly to its initial state.
4. Scrub the timeline to a random index → state is correct without replaying (proves snapshots).
5. Copy the share URL, open in a new tab → identical structure restored.
6. Switch to Graph → build a weighted graph → Dijkstra highlights the correct shortest path.
7. `/data-structures` → open Binary Search Tree → embedded demo steps inline; complexity table
   matches the registry; "Try it in Free Play" deep link carries the seeded tree over.
8. Toggle light theme and enable OS reduced-motion → both render correctly, no motion.
9. Tab through `/playground` with keyboard only → every control reachable and operable.
