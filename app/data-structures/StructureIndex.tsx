'use client';

import { useMemo, useState, type ReactElement } from 'react';
import { StructureCard, type StructureCardData } from '@/components/content/StructureCard';
import type { Category } from '@/lib/registry/types';

export type { StructureCardData };

const CATEGORIES: Array<{ id: Category | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'linear', label: 'Linear' },
  { id: 'tree', label: 'Trees' },
  { id: 'graph', label: 'Graphs' },
  { id: 'hash', label: 'Hashing' },
];

/** Rank a primary-operation complexity so the grid can sort by how fast the structure's core op is. */
function costRank(notation: string): number {
  const normalized = notation.replace(/\s+/g, '').toLowerCase();
  if (normalized.startsWith('o(1)')) return 0;
  if (normalized.includes('α(')) return 1;
  if (normalized.includes('logn')) return 2;
  if (normalized.includes('o(l')) return 2;
  if (normalized.includes('nlogn')) return 4;
  if (normalized.includes('o(n')) return 3;
  return 5;
}

export function StructureIndex({ cards }: { cards: readonly StructureCardData[] }): ReactElement {
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [sortByCost, setSortByCost] = useState(false);

  const visible = useMemo(() => {
    const filtered = category === 'all' ? [...cards] : cards.filter((card) => card.category === category);

    if (sortByCost) {
      filtered.sort(
        (a, b) =>
          costRank(a.complexity.rows[0]?.average ?? '') - costRank(b.complexity.rows[0]?.average ?? '') ||
          a.name.localeCompare(b.name),
      );
    }

    return filtered;
  }, [cards, category, sortByCost]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-y border-border py-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {CATEGORIES.map((option) => {
            const active = option.id === category;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(option.id)}
                className={`border px-2.5 py-1 font-mono text-xs transition-colors duration-(--dur-fast) ${
                  active
                    ? 'border-hl-active text-hl-active'
                    : 'border-border text-muted hover:border-border-strong hover:text-text'
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          aria-pressed={sortByCost}
          onClick={() => setSortByCost((current) => !current)}
          className={`border px-2.5 py-1 font-mono text-xs transition-colors duration-(--dur-fast) ${
            sortByCost
              ? 'border-hl-active text-hl-active'
              : 'border-border text-muted hover:border-border-strong hover:text-text'
          }`}
        >
          Sort by primary cost
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="font-mono text-sm text-muted">No structures in this category yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((card) => (
            <StructureCard key={card.id} structure={card} />
          ))}
        </div>
      )}
    </div>
  );
}
