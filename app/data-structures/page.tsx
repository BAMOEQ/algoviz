import type { Metadata } from 'next';
import Link from 'next/link';
import { StructureIndex } from './StructureIndex';
import { structures } from '@/lib/registry';

export const metadata: Metadata = {
  title: 'Data Structures — AlgoViz',
  description: 'Every structure AlgoViz can visualize, with its complexity and its algorithms.',
};

export default function DataStructuresIndex() {
  const cards = structures.map((structure) => ({
    id: structure.id,
    name: structure.name,
    slug: structure.slug,
    category: structure.category,
    summary: structure.summary,
    complexity: structure.complexity,
    algorithms: structure.algorithms.length,
  }));

  return (
    <main className="dot-grid flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-2.5">
        <Link href="/" className="panel-label transition-colors duration-(--dur-fast) hover:text-text">
          ← algoviz
        </Link>
        <span className="panel-label text-faint">data structures</span>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-14">
        <section className="flex flex-col gap-4">
          <h1 className="font-mono text-3xl leading-none font-medium tracking-tight">
            data structures
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-muted">
            {cards.length} structures, each with a live demo you can step through, the complexity
            table the code actually implements, and the classic algorithms that run on it.
          </p>
        </section>

        <StructureIndex cards={cards} />
      </div>
    </main>
  );
}
