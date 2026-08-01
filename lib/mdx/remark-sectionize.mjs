/**
 * Splits an explainer document into slides at every `##`.
 *
 * The split happens in the compiler rather than at runtime so the deck never has to parse markdown:
 * it receives plain `<section>` elements and groups nothing.
 *
 * This module is plain JavaScript on purpose. Turbopack cannot serialize a function into loader
 * options, so `next.config.ts` names the plugin by path and Node imports it directly at build time
 * — which rules out TypeScript source. Types are declared here as JSDoc so importers still get a
 * checked boundary and there is no second copy to drift.
 *
 * @typedef {object} MdastNode
 * @property {string} type
 * @property {number} [depth]
 * @property {string} [value]
 * @property {MdastNode[]} [children]
 *
 * @typedef {object} MdastRoot
 * @property {'root'} type
 * @property {MdastNode[]} children
 *
 * @typedef {object} JsxAttribute
 * @property {'mdxJsxAttribute'} type
 * @property {string} name
 * @property {string} value
 *
 * @typedef {object} JsxFlowElement
 * @property {'mdxJsxFlowElement'} type
 * @property {string} name
 * @property {JsxAttribute[]} attributes
 * @property {MdastNode[]} children
 *
 * The slice of vfile the plugin needs: the stem of `array.mdx` is the structure's slug.
 * @typedef {{ stem?: string | null }} SectionizeFile
 */

/** Section title for anything written above the first `##`. */
const PREAMBLE_LABEL = 'Overview';

/**
 * @param {MdastNode} node
 * @returns {boolean}
 */
function isSlideBoundary(node) {
  return node.type === 'heading' && node.depth === 2;
}

/**
 * Flattens a heading's inline children — text, code, emphasis — into its plain-text label.
 * @param {MdastNode} node
 * @returns {string}
 */
export function headingText(node) {
  if (typeof node.value === 'string') return node.value;
  return (node.children ?? []).map(headingText).join('');
}

/**
 * @param {string} label
 * @returns {string}
 */
export function slugify(label) {
  return (
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  );
}

/**
 * @param {string} name
 * @param {string} value
 * @returns {JsxAttribute}
 */
function attribute(name, value) {
  return { type: 'mdxJsxAttribute', name, value };
}

/**
 * @param {string} name
 * @param {JsxAttribute[]} attributes
 * @param {MdastNode[]} children
 * @returns {JsxFlowElement}
 */
function element(name, attributes, children) {
  return { type: 'mdxJsxFlowElement', name, attributes, children };
}

/**
 * Groups a document's top-level nodes into one bucket per `##`, preserving order.
 * @param {readonly MdastNode[]} nodes
 * @returns {Array<{ label: string, nodes: MdastNode[] }>}
 */
function groupIntoSlides(nodes) {
  /** @type {Array<{ label: string, nodes: MdastNode[] }>} */
  const slides = [];

  for (const node of nodes) {
    if (isSlideBoundary(node) || slides.length === 0) {
      slides.push({
        label: isSlideBoundary(node) ? headingText(node) : PREAMBLE_LABEL,
        nodes: [],
      });
    }

    slides[slides.length - 1].nodes.push(node);
  }

  return slides;
}

/**
 * Wraps each `##` section in `<section id data-label>` and the whole run in `<SlideDeck slug>`.
 * Both names resolve through `mdx-components.tsx`.
 *
 * @returns {(tree: MdastRoot, file: SectionizeFile) => void}
 */
export function remarkSectionize() {
  return function transform(tree, file) {
    if (tree.children.length === 0) return;

    /** @type {Map<string, number>} */
    const used = new Map();

    const sections = groupIntoSlides(tree.children).map((slide) => {
      const base = slugify(slide.label);
      const seen = (used.get(base) ?? 0) + 1;
      used.set(base, seen);

      return element(
        'section',
        [
          attribute('id', seen === 1 ? base : `${base}-${seen}`),
          attribute('data-label', slide.label),
        ],
        slide.nodes,
      );
    });

    tree.children = [element('SlideDeck', [attribute('slug', file.stem ?? '')], sections)];
  };
}

export default remarkSectionize;
