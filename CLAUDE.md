# AlgoViz

Data structure & algorithm visualizer. **Read `docs/ARCHITECTURE.md` before writing any code** — it
defines the step-trace engine, the `SceneGraph` contract, the registry, the visual design tokens,
and the staged execution plan.

## Rules for every implementation agent

1. **The contract is frozen.** Do not modify:
   - `lib/engine/types.ts`, `lib/engine/tracer.ts`
   - `lib/registry/types.ts`, `lib/registry/index.ts`
   - `app/globals.css`
   - `components/viz/SceneRenderer.tsx`

   If your stage genuinely needs a contract change, **stop and escalate**. A unilateral edit
   silently breaks every agent working in parallel.

2. **Own your files, touch nothing else.** See the file-ownership table in `docs/ARCHITECTURE.md`.
   Register your structures only in the family barrel you own (`lib/registry/{linear,tree,graph,hash}.ts`)
   — never in `lib/registry/index.ts`.

3. **TDD.** Write the golden-trace test before the implementation.

4. **Mirror the reference slice.** Stage 0 ships Array + bubble sort + `LinearView` working end to
   end. Copy its shape; do not invent a new one.

5. **Algorithms never animate.** They emit `Step[]` via the `Tracer`. The UI is a pure function of
   `steps[currentIndex]`. Never reach for `setTimeout` or animate from inside an algorithm.

6. **Layout is pure and deterministic.** Same input → same coordinates, every time. Layout functions
   live in `lib/layout/` and never render.

## Commands

```bash
pnpm dev          # dev server
pnpm test         # vitest (engine, invariants, layout, registry step-integrity)
pnpm typecheck    # tsc --noEmit
pnpm lint
pnpm test:e2e     # playwright
pnpm verify       # typecheck + lint + test + build — run before any handoff
```

## Conventions

- TypeScript `strict`. No `any` in `lib/`.
- Import alias `@/` maps to the repo root.
- Every visual element carries a stable `id` — that is what lets `motion` animate rather than
  remount.
- Highlights are never color-only; pair every color with a stroke or opacity change.
- Input caps are hard limits: array ≤ 60, tree ≤ 63 nodes, graph ≤ 40 nodes, 5000 steps.
