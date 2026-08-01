import { describe, expect, it } from 'vitest';
import type { SceneGraph, Step } from '@/lib/engine/types';
import { structures } from '@/lib/registry';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

/**
 * The kind of scene element an id belongs to. Used to catch id reuse across steps: the same id
 * showing up as a node in one step and an edge in the next is a stability bug, even though the
 * registry is currently empty and this can only be exercised via the guard test below.
 */
type ElementKind = 'cell' | 'pointer' | 'node' | 'link' | 'edge' | 'bucket' | 'entry';

function idsWithKind(scene: SceneGraph): Array<{ id: string; kind: ElementKind }> {
  switch (scene.kind) {
    case 'linear':
      return [
        ...scene.cells.map((c) => ({ id: c.id, kind: 'cell' as const })),
        ...scene.pointers.map((p) => ({ id: p.id, kind: 'pointer' as const })),
      ];
    case 'linked':
      return [
        ...scene.nodes.map((n) => ({ id: n.id, kind: 'node' as const })),
        ...scene.links.map((l) => ({ id: l.id, kind: 'link' as const })),
      ];
    case 'tree':
      return [
        ...scene.nodes.map((n) => ({ id: n.id, kind: 'node' as const })),
        ...scene.edges.map((e) => ({ id: e.id, kind: 'edge' as const })),
      ];
    case 'graph':
      return [
        ...scene.nodes.map((n) => ({ id: n.id, kind: 'node' as const })),
        ...scene.edges.map((e) => ({ id: e.id, kind: 'edge' as const })),
      ];
    case 'table':
      return scene.buckets.flatMap((b) => [
        { id: b.id, kind: 'bucket' as const },
        ...b.entries.map((e) => ({ id: e.id, kind: 'entry' as const })),
      ]);
  }
}

function assertStepIsWellFormed(step: Step, pseudocodeLength: number, label: string, index: number): void {
  expect(Number.isInteger(step.line), `${label}: step ${index} line must be an integer`).toBe(true);
  expect(step.line, `${label}: step ${index} line must be >= 0`).toBeGreaterThanOrEqual(0);
  expect(step.line, `${label}: step ${index} line must be < pseudocode.length`).toBeLessThan(pseudocodeLength);
  expect(typeof step.narration, `${label}: step ${index} narration must be a string`).toBe('string');
  expect(step.narration.length, `${label}: step ${index} narration must be non-empty`).toBeGreaterThan(0);
}

/**
 * Walks every algorithm of every structure in a registry and checks the cross-agent invariants
 * from the Task 4 brief. Both the "real registry" test and the "hand-built bad handle" guard test
 * call this exact function, so the empty-registry case is proven to run through the same code path
 * that would catch a real violation once Wave 1 populates the barrels.
 */
function walkRegistry(handles: readonly StructureHandle[]): void {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const handle of handles) {
    const structureLabel = `structure "${handle.id}"`;

    expect(seenIds.has(handle.id), `duplicate structure id "${handle.id}"`).toBe(false);
    seenIds.add(handle.id);
    expect(seenSlugs.has(handle.slug), `duplicate structure slug "${handle.slug}"`).toBe(false);
    seenSlugs.add(handle.slug);

    const seedState = handle.seed();
    const beforeScene = handle.scene(seedState);
    const expectedKind = beforeScene.kind;

    for (const algorithm of handle.algorithms) {
      const algoLabel = `${structureLabel} algorithm "${algorithm.id}"`;
      expect(algorithm.pseudocode.length, `${algoLabel}: pseudocode must be non-empty`).toBeGreaterThan(0);

      const { steps } = handle.runAlgorithm(algorithm.id, seedState);
      const idKind = new Map<string, ElementKind>();

      steps.forEach((step, index) => {
        assertStepIsWellFormed(step, algorithm.pseudocode.length, algoLabel, index);
        expect(step.scene.kind, `${algoLabel}: step ${index} scene.kind must match toScene()`).toBe(expectedKind);

        const idsThisStep = new Set<string>();
        for (const { id, kind } of idsWithKind(step.scene)) {
          expect(idsThisStep.has(id), `${algoLabel}: step ${index} duplicate element id "${id}"`).toBe(false);
          idsThisStep.add(id);

          const priorKind = idKind.get(id);
          if (priorKind === undefined) {
            idKind.set(id, kind);
          } else {
            expect(
              kind,
              `${algoLabel}: step ${index} id "${id}" was "${priorKind}" in an earlier step, now "${kind}"`,
            ).toBe(priorKind);
          }
        }
      });
    }

    // Running every algorithm above must never have mutated the shared seed state.
    const afterScene = handle.scene(seedState);
    expect(afterScene, `${structureLabel}: running an algorithm mutated the caller's state`).toEqual(beforeScene);
  }
}

describe('registry step-integrity', () => {
  it('holds for the real registry (a no-op until Wave 1 populates the barrels)', () => {
    expect(() => walkRegistry(structures)).not.toThrow();
  });

  it('rejects a hand-built structure whose algorithm emits an out-of-range step line', () => {
    const badHandle = defineStructure<number[]>({
      id: 'fake-bad-structure',
      name: 'Fake Bad Structure',
      slug: 'fake-bad-structure',
      category: 'linear',
      summary: 'Deliberately broken structure for the step-integrity guard test.',
      create: () => [],
      seed: () => [1, 2, 3],
      clone: (state) => [...state],
      operations: [],
      algorithms: [
        {
          id: 'broken',
          name: 'Broken',
          pseudocode: ['the only real line'],
          run: (_state, t) => {
            t.step(5, 'line 5 does not exist in a 1-line pseudocode array');
          },
        },
      ],
      toScene: (state) => ({
        kind: 'linear',
        cells: state.map((value, index) => ({ id: `c${index}`, value, index, highlight: 'none' as const })),
        pointers: [],
      }),
      complexity: { rows: [], space: 'O(1)' },
    });

    expect(() => walkRegistry([badHandle])).toThrow();
  });
});
