import { autocomplete, prefixWalk, wordCount } from '@/lib/algorithms/trie-algorithms';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const TRIE_MAX_WORDS = 20;
export const TRIE_MAX_LENGTH = 12;

/**
 * The trie is stored as the set of words it contains and the node tree is derived on demand. That
 * keeps every operation valid by construction — there is no way to leave a dangling branch behind
 * after a delete — and node ids stay stable because a node's id is its own prefix.
 */
export interface TrieState {
  words: string[];
}

export function trieNodeId(prefix: string): string {
  return `trie-${prefix}`;
}

export interface TriePrefixNode {
  prefix: string;
  char: string;
  isWord: boolean;
}

/** Every distinct prefix in the trie, including the empty root, in insertion-stable order. */
export function triePrefixes(state: TrieState): TriePrefixNode[] {
  const seen = new Map<string, TriePrefixNode>();
  seen.set('', { prefix: '', char: '·', isWord: false });

  for (const word of state.words) {
    for (let i = 1; i <= word.length; i++) {
      const prefix = word.slice(0, i);
      const existing = seen.get(prefix);
      const isWord = (existing?.isWord ?? false) || prefix === word;
      seen.set(prefix, { prefix, char: word[i - 1], isWord });
    }
  }

  return [...seen.values()];
}

function normalize(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed === '' ? null : trimmed;
}

export const trieStructure: StructureHandle = defineStructure<TrieState>({
  id: 'trie',
  name: 'Trie',
  slug: 'trie',
  category: 'tree',
  summary: 'A prefix tree where a word’s path spells it out, so shared prefixes are stored once.',
  create: () => ({ words: [] }),
  seed: () => ({ words: ['cat', 'car', 'card', 'dog', 'do'] }),
  clone: (state) => ({ words: [...state.words] }),

  operations: [
    {
      id: 'insert',
      name: 'Insert',
      fields: [{ name: 'word', label: 'Word', type: 'string', placeholder: 'card' }],
      validate: (state, args) => {
        const word = normalize(args.word);
        if (word === null) return 'Enter a word to insert.';
        if (!/^[a-z]+$/.test(word)) return 'Words may contain letters only.';
        if (word.length > TRIE_MAX_LENGTH) return `Words may be at most ${TRIE_MAX_LENGTH} letters.`;
        if (state.words.includes(word)) return `"${word}" is already in the trie.`;
        if (state.words.length >= TRIE_MAX_WORDS) return `Trie is full — ${TRIE_MAX_WORDS} words maximum.`;
        return null;
      },
      run: (state, args, t) => {
        const word = normalize(args.word) as string;
        const before = new Set(triePrefixes(state).map((node) => node.prefix));

        state.words.push(word);

        for (let i = 1; i <= word.length; i++) {
          const prefix = word.slice(0, i);
          for (let seen = 1; seen < i; seen++) t.mark(trieNodeId(word.slice(0, seen)), 'visited');
          t.mark(trieNodeId(prefix), before.has(prefix) ? 'active' : 'inserted');
          t.step(
            0,
            before.has(prefix)
              ? `"${prefix}" already exists — reusing that branch.`
              : `Creating a node for "${prefix}".`,
            { prefix },
            before.has(prefix) ? { reads: 1 } : { writes: 1 },
          );
        }

        t.mark(trieNodeId(word), 'path');
        t.step(0, `Marked "${word}" as a complete word.`, { word }, { writes: 1 });
      },
    },
    {
      id: 'search',
      name: 'Search',
      fields: [{ name: 'word', label: 'Word', type: 'string', placeholder: 'car' }],
      validate: (state, args) => {
        if (normalize(args.word) === null) return 'Enter a word to search for.';
        if (state.words.length === 0) return 'Trie is empty — insert a word first.';
        return null;
      },
      run: (state, args, t) => {
        const word = normalize(args.word) as string;
        const prefixes = new Set(triePrefixes(state).map((node) => node.prefix));

        for (let i = 1; i <= word.length; i++) {
          const prefix = word.slice(0, i);

          for (let seen = 1; seen < i; seen++) t.mark(trieNodeId(word.slice(0, seen)), 'visited');

          if (!prefixes.has(prefix)) {
            t.step(0, `No node for "${prefix}" — "${word}" is not in the trie.`, { word }, { comparisons: 1 });
            return;
          }

          t.mark(trieNodeId(prefix), 'compare');
          t.step(0, `Followed "${word[i - 1]}" to "${prefix}".`, { prefix }, { comparisons: 1, reads: 1 });
        }

        const isWord = state.words.includes(word);
        for (let seen = 1; seen <= word.length; seen++) t.mark(trieNodeId(word.slice(0, seen)), isWord ? 'path' : 'visited');
        t.step(
          0,
          isWord
            ? `"${word}" is in the trie.`
            : `"${word}" is a prefix here, but it was never inserted as a word.`,
          { word, found: isWord },
        );
      },
    },
    {
      id: 'startsWith',
      name: 'Starts with',
      fields: [{ name: 'prefix', label: 'Prefix', type: 'string', placeholder: 'ca' }],
      validate: (state, args) => {
        if (normalize(args.prefix) === null) return 'Enter a prefix.';
        if (state.words.length === 0) return 'Trie is empty — insert a word first.';
        return null;
      },
      run: (state, args, t) => {
        const prefix = normalize(args.prefix) as string;
        const matches = state.words.filter((word) => word.startsWith(prefix));

        for (let i = 1; i <= prefix.length; i++) {
          t.mark(trieNodeId(prefix.slice(0, i)), 'compare');
          t.step(0, `Walking to "${prefix.slice(0, i)}".`, { prefix: prefix.slice(0, i) }, { reads: 1 });
        }

        for (const word of matches) {
          for (let i = 1; i <= word.length; i++) t.mark(trieNodeId(word.slice(0, i)), 'path');
        }
        t.step(
          0,
          matches.length === 0
            ? `No words start with "${prefix}".`
            : `${matches.length} word(s) start with "${prefix}": ${matches.join(', ')}.`,
          { prefix, matches: matches.length },
        );
      },
    },
    {
      id: 'delete',
      name: 'Delete',
      fields: [{ name: 'word', label: 'Word', type: 'string' }],
      validate: (state, args) => {
        const word = normalize(args.word);
        if (word === null) return 'Enter a word to delete.';
        if (!state.words.includes(word)) return `"${word}" is not in the trie.`;
        return null;
      },
      run: (state, args, t) => {
        const word = normalize(args.word) as string;

        for (let i = 1; i <= word.length; i++) t.mark(trieNodeId(word.slice(0, i)), 'removed');
        t.step(0, `Unmarking "${word}" as a word.`, { word }, { reads: 1 });

        state.words = state.words.filter((candidate) => candidate !== word);
        const surviving = new Set(triePrefixes(state).map((node) => node.prefix));
        const pruned = [];
        for (let i = 1; i <= word.length; i++) {
          const prefix = word.slice(0, i);
          if (!surviving.has(prefix)) pruned.push(prefix);
        }

        t.step(
          0,
          pruned.length === 0
            ? `Removed "${word}". Every node it used is shared with another word, so none were pruned.`
            : `Removed "${word}" and pruned ${pruned.length} node(s) no other word needed.`,
          { word, pruned: pruned.length },
          { writes: 1 },
        );
      },
    },
  ],

  algorithms: [prefixWalk, autocomplete, wordCount],

  toScene: (state, marks) => {
    const prefixes = triePrefixes(state);

    const nodes = prefixes.map((node) => ({
      id: trieNodeId(node.prefix),
      value: node.char,
      highlight: marks.get(trieNodeId(node.prefix)) ?? 'none',
      label: node.isWord ? '●' : undefined,
    }));

    const edges = prefixes
      .filter((node) => node.prefix !== '')
      .map((node) => {
        const parentPrefix = node.prefix.slice(0, -1);
        return {
          id: `edge-${node.prefix}`,
          from: trieNodeId(parentPrefix),
          to: trieNodeId(node.prefix),
          highlight: marks.get(`edge-${node.prefix}`) ?? 'none',
        };
      });

    return { kind: 'tree', nodes, edges };
  },

  complexity: {
    rows: [
      { operation: 'insert', average: 'O(L)', worst: 'O(L)' },
      { operation: 'search', average: 'O(L)', worst: 'O(L)' },
      { operation: 'starts with', average: 'O(L)', worst: 'O(L)' },
      { operation: 'delete', average: 'O(L)', worst: 'O(L)' },
      { operation: 'autocomplete', average: 'O(L + k)', worst: 'O(L + k)' },
    ],
    space: 'O(total characters)',
  },
});
