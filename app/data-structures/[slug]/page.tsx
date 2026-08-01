import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import { Demo } from '@/components/content/Demo';
import { SlideDeck } from '@/components/content/SlideDeck';
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

/**
 * A structure page is a fixed faceplate over one moving panel: the identity and the rail stay put
 * while the deck steps through the explainer. `remarkSectionize` has already turned the doc into
 * slides, so the page only has to hold the frame.
 */
export default async function StructurePage({ params }: PageProps): Promise<ReactElement> {
  const { slug } = await params;
  const structure = getStructure(slug);

  if (!structure) notFound();

  const Explainer = await loadExplainer(slug);

  return (
    <main className="flex h-dvh min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-6 py-2.5">
        <Link
          href="/data-structures"
          className="panel-label transition-colors duration-(--dur-fast) hover:text-text"
        >
          ← data structures
        </Link>
        <span className="panel-label text-faint">{structure.category}</span>
      </header>

      <div className="shrink-0 border-b border-border bg-surface-1 px-6 py-5">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2">
          <h1 className="font-mono text-2xl leading-none font-medium tracking-tight">
            {structure.name}
          </h1>
          <p className="text-[15px] leading-relaxed text-muted">{structure.summary}</p>
        </div>
      </div>

      {Explainer ? (
        <Explainer />
      ) : (
        <SlideDeck slug={slug}>
          <StubSlide slug={slug} />
        </SlideDeck>
      )}
    </main>
  );
}

/**
 * Registry-generated fallback shown until a hand-written MDX explainer lands. It is shaped like a
 * sectionized slide so the deck treats it exactly like doc content.
 */
function StubSlide({ slug }: { slug: string }): ReactElement {
  const structure = getStructure(slug);

  return (
    <section id="overview" data-label="Overview">
      <h2 className="border-b border-border pb-3 font-mono text-xl tracking-tight text-text">
        {structure?.name ?? slug}
      </h2>

      <Demo structure={slug} />

      <h3 className="mt-2 font-mono text-[15px] text-text">Operations</h3>
      <ul className="flex flex-col gap-2">
        {structure?.operations.map((operation) => (
          <li
            key={operation.id}
            className="flex flex-wrap items-baseline gap-x-3 font-mono text-[13px]"
          >
            <span className="text-text">{operation.name}</span>
            <span className="text-faint">
              {operation.fields.length === 0
                ? 'no arguments'
                : operation.fields.map((field) => field.label.toLowerCase()).join(', ')}
            </span>
          </li>
        ))}
      </ul>

      <p className="font-mono text-xs text-faint">
        The full explainer for this structure has not been written yet — everything above is
        generated from the registry, so it always matches the code.
      </p>
    </section>
  );
}
