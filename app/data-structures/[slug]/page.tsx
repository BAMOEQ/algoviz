import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import { ComplexityTable } from '@/components/content/ComplexityTable';
import { Demo } from '@/components/content/Demo';
import { getStructure, structures } from '@/lib/registry';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return structures.map((structure) => ({ slug: structure.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const structure = getStructure(slug);

  if (!structure) return { title: 'Not found — AlgoViz' };

  return {
    title: `${structure.name} — AlgoViz`,
    description: structure.summary,
  };
}

/**
 * Loads the hand-written explainer for a structure, if one exists.
 *
 * A missing doc is not an error: the page degrades to a registry-generated stub so adding a
 * structure never breaks the build while its prose is still being written.
 */
async function loadExplainer(slug: string): Promise<React.ComponentType | null> {
  try {
    const mdx = await import(`@/content/data-structures/${slug}.mdx`);
    return mdx.default as React.ComponentType;
  } catch {
    return null;
  }
}

export default async function StructurePage({ params }: PageProps): Promise<ReactElement> {
  const { slug } = await params;
  const structure = getStructure(slug);

  if (!structure) notFound();

  const Explainer = await loadExplainer(slug);

  return (
    <main className="dot-grid flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-2.5">
        <Link
          href="/data-structures"
          className="panel-label transition-colors duration-(--dur-fast) hover:text-text"
        >
          ← data structures
        </Link>
        <span className="panel-label text-faint">{structure.category}</span>
      </header>

      <article className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-14">
        <header className="flex flex-col gap-4">
          <h1 className="font-mono text-3xl leading-none font-medium tracking-tight">
            {structure.name}
          </h1>
          <p className="text-lg leading-relaxed text-muted">{structure.summary}</p>
        </header>

        {Explainer ? (
          <div className="prose-algoviz flex flex-col gap-5">
            <Explainer />
          </div>
        ) : (
          <StubExplainer slug={slug} />
        )}

        <section className="flex flex-col gap-4">
          <h2 className="panel-label border-b border-border pb-2">Complexity</h2>
          <ComplexityTable structure={slug} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="panel-label border-b border-border pb-2">
            Algorithms on this structure
          </h2>

          {structure.algorithms.length === 0 ? (
            <p className="text-sm text-muted">No algorithms are registered for this structure yet.</p>
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

        <section className="flex flex-col gap-3 border-t border-border pt-8">
          <h2 className="panel-label">Try it in Free Play</h2>
          <p className="text-sm leading-relaxed text-muted">
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
      </article>
    </main>
  );
}

/** Registry-generated fallback shown until a hand-written MDX explainer lands. */
function StubExplainer({ slug }: { slug: string }): ReactElement {
  const structure = getStructure(slug);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="panel-label border-b border-border pb-2">Live demo</h2>
        <Demo structure={slug} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="panel-label border-b border-border pb-2">Operations</h2>
        <ul className="flex flex-col gap-2">
          {structure?.operations.map((operation) => (
            <li key={operation.id} className="flex flex-wrap items-baseline gap-x-3 font-mono text-[13px]">
              <span className="text-text">{operation.name}</span>
              <span className="text-faint">
                {operation.fields.length === 0
                  ? 'no arguments'
                  : operation.fields.map((field) => field.label.toLowerCase()).join(', ')}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="font-mono text-xs text-faint">
        The full explainer for this structure has not been written yet — everything above is
        generated from the registry, so it always matches the code.
      </p>
    </div>
  );
}
