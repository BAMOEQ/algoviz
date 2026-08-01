import type { AlgorithmDef } from '@/lib/registry/types';
import { triePrefixes, trieNodeId, type TrieState } from '@/lib/structures/trie';

/** The prefix the demo algorithms explore: the longest one shared by at least two words. */
function busiestPrefix(state: TrieState): string {
  const counts = new Map<string, number>();

  for (const word of state.words) {
    for (let i = 1; i <= word.length; i++) {
      const prefix = word.slice(0, i);
      counts.set(prefix, (counts.get(prefix) ?? 0) + 1);
    }
  }

  let best = '';
  for (const [prefix, count] of counts) {
    if (count < 2) continue;
    if (prefix.length > best.length) best = prefix;
  }

  return best === '' ? (state.words[0]?.slice(0, 1) ?? '') : best;
}

export const prefixWalk: AlgorithmDef<TrieState> = {
  id: 'prefix-walk',
  name: 'Prefix Walk',
  description: 'Follows one character at a time down the shared branch of the trie.',
  pseudocode: [
    'node = root',
    'for each character c in prefix',
    '  if node has no child c',
    '    return no match',
    '  node = node.children[c]',
    'return node',
  ],
  run: (state, t) => {
    const prefix = busiestPrefix(state);

    if (prefix === '') {
      t.step(0, 'The trie is empty — there is nothing to walk.', {});
      return;
    }

    const known = new Set(triePrefixes(state).map((node) => node.prefix));

    t.mark(trieNodeId(''), 'active');
    t.step(0, `Starting at the root, walking "${prefix}".`, { prefix });

    for (let i = 1; i <= prefix.length; i++) {
      const current = prefix.slice(0, i);

      for (let seen = 1; seen < i; seen++) t.mark(trieNodeId(prefix.slice(0, seen)), 'visited');
      t.mark(trieNodeId(current), 'compare');
      t.step(2, `Does the current node have a child "${prefix[i - 1]}"?`, { char: prefix[i - 1] }, { comparisons: 1 });

      if (!known.has(current)) {
        t.step(3, `No child "${prefix[i - 1]}" — the walk stops here.`, { prefix: current });
        return;
      }

      for (let seen = 1; seen <= i; seen++) t.mark(trieNodeId(prefix.slice(0, seen)), 'visited');
      t.mark(trieNodeId(current), 'active');
      t.step(4, `Moved to "${current}".`, { prefix: current }, { reads: 1 });
    }

    for (let i = 1; i <= prefix.length; i++) t.mark(trieNodeId(prefix.slice(0, i)), 'path');
    t.step(5, `Reached the node for "${prefix}" in ${prefix.length} step(s).`, { prefix });
  },
};

export const autocomplete: AlgorithmDef<TrieState> = {
  id: 'autocomplete',
  name: 'Autocomplete',
  description: 'Walks to a prefix, then collects every complete word beneath it.',
  pseudocode: [
    'node = walk(prefix)',
    'if node is null: return []',
    'collect(node)',
    'collect(node)',
    '  if node is a word: emit it',
    '  for each child: collect(child)',
  ],
  run: (state, t) => {
    const prefix = busiestPrefix(state);

    if (prefix === '') {
      t.step(1, 'The trie is empty — there is nothing to complete.', {});
      return;
    }

    for (let i = 1; i <= prefix.length; i++) t.mark(trieNodeId(prefix.slice(0, i)), 'visited');
    t.step(0, `Walked to "${prefix}". Now collecting everything below it.`, { prefix });

    const matches = state.words.filter((word) => word.startsWith(prefix)).sort();
    const found: string[] = [];

    for (const word of matches) {
      found.push(word);

      for (let i = 1; i <= prefix.length; i++) t.mark(trieNodeId(prefix.slice(0, i)), 'visited');
      for (let i = prefix.length + 1; i <= word.length; i++) t.mark(trieNodeId(word.slice(0, i)), 'active');
      t.mark(trieNodeId(word), 'path');

      t.step(4, `"${word}" is a complete word — added to the suggestions.`, {
        word,
        found: found.length,
      }, { reads: 1 });
    }

    for (const word of matches) {
      for (let i = 1; i <= word.length; i++) t.mark(trieNodeId(word.slice(0, i)), 'path');
    }
    t.step(
      2,
      found.length === 0
        ? `Nothing completes "${prefix}".`
        : `${found.length} suggestion(s) for "${prefix}": ${found.join(', ')}.`,
      { prefix, suggestions: found.length },
    );
  },
};

export const wordCount: AlgorithmDef<TrieState> = {
  id: 'word-count',
  name: 'Word Count',
  description: 'Counts terminal nodes, and shows how many nodes the shared prefixes save.',
  pseudocode: [
    'count = 0',
    'for each node in trie',
    '  if node is a word',
    '    count = count + 1',
    'return count',
  ],
  run: (state, t) => {
    const prefixes = triePrefixes(state);

    if (state.words.length === 0) {
      t.step(4, 'The trie is empty — the word count is 0.', { count: 0 });
      return;
    }

    let count = 0;
    const seen: string[] = [];

    for (const node of prefixes) {
      if (node.prefix === '') continue;
      seen.push(node.prefix);

      for (const id of seen) t.mark(trieNodeId(id), 'visited');
      t.mark(trieNodeId(node.prefix), node.isWord ? 'path' : 'compare');
      t.step(
        2,
        node.isWord
          ? `"${node.prefix}" is a terminal node — count is now ${count + 1}.`
          : `"${node.prefix}" is only a prefix, not a word.`,
        { prefix: node.prefix, count: node.isWord ? count + 1 : count },
        { comparisons: 1 },
      );

      if (node.isWord) count += 1;
    }

    const characters = state.words.reduce((total, word) => total + word.length, 0);
    const nodes = prefixes.length - 1;

    for (const word of state.words) {
      for (let i = 1; i <= word.length; i++) t.mark(trieNodeId(word.slice(0, i)), 'path');
    }
    t.step(
      4,
      `${count} word(s) stored in ${nodes} node(s) — sharing prefixes saved ${characters - nodes} node(s).`,
      { count, nodes, saved: characters - nodes },
    );
  },
};
