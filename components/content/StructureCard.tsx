import Link from 'next/link';
import type { ReactElement } from 'react';
import type { Category, ComplexityTable } from '@/lib/registry/types';

/**
 * The presentational slice of a structure. Deliberately narrower than `StructureHandle` so the
 * card can be rendered from data passed across the server/client boundary, where the handle's
 * methods would not survive serialization.
 */
export interface StructureCardData {
  id: string;
  name: string;
  slug: string;
  category: Category;
  summary: string;
  complexity: ComplexityTable;
  algorithms: number;
}

/** A tiny static glyph per family, drawn from the same vocabulary as the real views. */
function CategoryGlyph({ category }: { category: Category }): ReactElement {
  const stroke = 'stroke-faint';

  return (
    <svg viewBox="0 0 64 32" className="h-8 w-16" aria-hidden="true">
      {category === 'linear' &&
        [0, 1, 2, 3].map((i) => (
          <rect
            key={i}
            x={i * 15 + 2}
            y={9}
            width={13}
            height={13}
            rx={2}
            className={`fill-none ${stroke}`}
            strokeWidth={1}
          />
        ))}

      {category === 'tree' && (
        <>
          <line x1={32} y1={11} x2={19} y2={24} className={stroke} strokeWidth={1} />
          <line x1={32} y1={11} x2={45} y2={24} className={stroke} strokeWidth={1} />
          <circle cx={32} cy={8} r={5} className={`fill-none ${stroke}`} strokeWidth={1} />
          <circle cx={17} cy={25} r={5} className={`fill-none ${stroke}`} strokeWidth={1} />
          <circle cx={47} cy={25} r={5} className={`fill-none ${stroke}`} strokeWidth={1} />
        </>
      )}

      {category === 'graph' && (
        <>
          <line x1={13} y1={10} x2={32} y2={24} className={stroke} strokeWidth={1} />
          <line x1={32} y1={24} x2={51} y2={10} className={stroke} strokeWidth={1} />
          <line x1={13} y1={10} x2={51} y2={10} className={stroke} strokeWidth={1} />
          <circle cx={13} cy={9} r={5} className={`fill-none ${stroke}`} strokeWidth={1} />
          <circle cx={51} cy={9} r={5} className={`fill-none ${stroke}`} strokeWidth={1} />
          <circle cx={32} cy={25} r={5} className={`fill-none ${stroke}`} strokeWidth={1} />
        </>
      )}

      {category === 'hash' &&
        [0, 1, 2].map((i) => (
          <g key={i}>
            <rect
              x={2}
              y={i * 10 + 2}
              width={11}
              height={8}
              rx={1}
              className={`fill-none ${stroke}`}
              strokeWidth={1}
            />
            {i !== 1 && (
              <rect
                x={18}
                y={i * 10 + 2}
                width={20}
                height={8}
                rx={1}
                className={`fill-none ${stroke}`}
                strokeWidth={1}
              />
            )}
          </g>
        ))}
    </svg>
  );
}

export function StructureCard({ structure }: { structure: StructureCardData }): ReactElement {
  const primary = structure.complexity.rows[0];

  return (
    <Link
      href={`/data-structures/${structure.slug}`}
      className="group flex flex-col gap-3 border border-border bg-surface-1 p-4 transition-colors duration-(--dur-fast) hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-mono text-[15px] text-text">{structure.name}</h2>
        <CategoryGlyph category={structure.category} />
      </div>

      <p className="flex-1 text-sm leading-relaxed text-muted">{structure.summary}</p>

      <dl className="flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 font-mono text-[11px]">
        <div className="flex gap-1.5">
          <dt className="text-faint">{primary?.operation ?? 'primary'}</dt>
          <dd className="text-hl-active">{primary?.average ?? '—'}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-faint">algorithms</dt>
          <dd className="text-muted tabular-nums">{structure.algorithms}</dd>
        </div>
      </dl>
    </Link>
  );
}
