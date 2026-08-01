import type { MDXComponents } from 'mdx/types';
import { ComplexityTable } from '@/components/content/ComplexityTable';
import { Demo } from '@/components/content/Demo';
import { SlideDeck } from '@/components/content/SlideDeck';

/**
 * Components every explainer doc gets in scope, plus the prose styling for raw markdown elements.
 * Keeping the styling here rather than in each doc is what makes all ten pages feel like one system.
 *
 * `SlideDeck` is never written in a doc — `remarkSectionize` wraps every explainer in one, so the
 * name has to resolve here.
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Demo,
    ComplexityTable,
    SlideDeck,

    // Each `##` opens a slide, so this heading is that slide's title rather than a run-in header.
    h2: (props) => (
      <h2
        className="border-b border-border pb-3 font-mono text-xl tracking-tight text-text"
        {...props}
      />
    ),
    h3: (props) => <h3 className="mt-5 font-mono text-[15px] text-text" {...props} />,
    p: (props) => <p className="text-[15px] leading-relaxed text-muted" {...props} />,
    ul: (props) => <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-muted" {...props} />,
    ol: (props) => <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[15px] text-muted" {...props} />,
    li: (props) => <li className="leading-relaxed" {...props} />,
    strong: (props) => <strong className="font-medium text-text" {...props} />,
    code: (props) => (
      <code className="border border-border bg-surface-1 px-1 py-0.5 font-mono text-[13px] text-text" {...props} />
    ),
    a: (props) => (
      <a className="text-hl-active underline underline-offset-2" {...props} />
    ),
    blockquote: (props) => (
      <blockquote className="border-l-2 border-hl-compare pl-4 text-[15px] text-muted italic" {...props} />
    ),
    ...components,
  };
}
