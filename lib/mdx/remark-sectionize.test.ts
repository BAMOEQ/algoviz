import { describe, expect, it } from 'vitest';
import {
  remarkSectionize,
  type JsxFlowElement,
  type MdastNode,
  type MdastRoot,
} from '@/lib/mdx/remark-sectionize.mjs';

function heading(depth: number, text: string): MdastNode {
  return { type: 'heading', depth, children: [{ type: 'text', value: text }] };
}

function paragraph(text: string): MdastNode {
  return { type: 'paragraph', children: [{ type: 'text', value: text }] };
}

function root(...children: MdastNode[]): MdastRoot {
  return { type: 'root', children };
}

/** Runs the plugin the way unified would, and returns the injected `<SlideDeck>` element. */
function sectionize(tree: MdastRoot, stem = 'array'): JsxFlowElement {
  remarkSectionize()(tree, { stem });
  const [deck] = tree.children;
  return deck as JsxFlowElement;
}

function attribute(element: JsxFlowElement, name: string): string | undefined {
  return element.attributes.find((entry) => entry.name === name)?.value;
}

function slides(deck: JsxFlowElement): JsxFlowElement[] {
  return deck.children as JsxFlowElement[];
}

describe('remarkSectionize', () => {
  it('wraps everything from one h2 to the next in a labelled section', () => {
    const tree = root(
      heading(2, 'What it is'),
      paragraph('An array is a block of memory.'),
      heading(3, 'Access'),
      paragraph('Arithmetic.'),
      heading(2, 'Complexity'),
      paragraph('O(1) indexing.'),
    );

    const deck = sectionize(tree);
    const [first, second] = slides(deck);

    expect(deck.name).toBe('SlideDeck');
    expect(slides(deck)).toHaveLength(2);

    expect(first.name).toBe('section');
    expect(attribute(first, 'data-label')).toBe('What it is');
    expect(attribute(first, 'id')).toBe('what-it-is');
    // The h3 belongs to its parent section, not to a section of its own.
    expect(first.children).toHaveLength(4);

    expect(attribute(second, 'data-label')).toBe('Complexity');
    expect(second.children).toHaveLength(2);
  });

  it('carries the file stem onto the deck so it can render registry slides', () => {
    const deck = sectionize(root(heading(2, 'What it is')), 'binary-search-tree');

    expect(attribute(deck, 'slug')).toBe('binary-search-tree');
  });

  it('reads a label through inline formatting', () => {
    const tree = root({
      type: 'heading',
      depth: 2,
      children: [
        { type: 'text', value: 'Why ' },
        { type: 'inlineCode', value: 'push' },
        { type: 'emphasis', children: [{ type: 'text', value: ' amortizes' }] },
      ],
    });

    const [slide] = slides(sectionize(tree));

    expect(attribute(slide, 'data-label')).toBe('Why push amortizes');
    expect(attribute(slide, 'id')).toBe('why-push-amortizes');
  });

  it('keeps content that precedes the first h2 in an opening section', () => {
    const tree = root(paragraph('A preamble.'), heading(2, 'What it is'), paragraph('Body.'));

    const [first, second] = slides(sectionize(tree));

    expect(attribute(first, 'data-label')).toBe('Overview');
    expect(attribute(first, 'id')).toBe('overview');
    expect(first.children).toHaveLength(1);
    expect(attribute(second, 'data-label')).toBe('What it is');
  });

  it('disambiguates ids when two headings slug the same', () => {
    const tree = root(heading(2, 'Trade-offs'), heading(2, 'Trade offs!'));

    const [first, second] = slides(sectionize(tree));

    expect(attribute(first, 'id')).toBe('trade-offs');
    expect(attribute(second, 'id')).toBe('trade-offs-2');
  });

  it('leaves a document with no headings as a single section', () => {
    const tree = root(paragraph('Just prose.'));

    expect(slides(sectionize(tree))).toHaveLength(1);
  });

  it('leaves an empty document alone rather than emitting an empty deck', () => {
    const tree = root();
    remarkSectionize()(tree, { stem: 'array' });

    expect(tree.children).toHaveLength(0);
  });
});
