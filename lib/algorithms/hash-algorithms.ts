import type { AlgorithmDef } from '@/lib/registry/types';
import {
  bucketId,
  entryId,
  hashKey,
  loadFactor,
  rehashInto,
  LOAD_FACTOR_LIMIT,
  type HashTableState,
} from '@/lib/structures/hash-table';

export const probeComparison: AlgorithmDef<HashTableState> = {
  id: 'probe-comparison',
  name: 'Collision Walk',
  description: 'Looks up every stored key and counts the work each collision strategy costs.',
  pseudocode: [
    'for each key in the table',
    '  slot = hash(key)',
    '  while the slot is not the key',
    '    chaining: step along the list',
    '    open addressing: probe the next slot',
    '  record the number of steps',
  ],
  run: (state, t) => {
    const keys = state.buckets.flat().map((entry) => entry.key);

    if (keys.length === 0) {
      t.step(0, 'The table is empty — there is nothing to look up.', {});
      return;
    }

    t.step(
      0,
      `Looking up all ${keys.length} key(s) using ${state.strategy === 'chaining' ? 'separate chaining' : 'open addressing'}.`,
      { keys: keys.length, strategy: state.strategy },
    );

    let totalSteps = 0;
    let worst = 0;

    for (const key of keys) {
      const home = hashKey(key, state.buckets.length);
      let steps = 0;

      t.mark(bucketId(home), 'active');
      t.step(1, `hash("${key}") = slot ${home}.`, { key, slot: home }, { reads: 1 });

      if (state.strategy === 'chaining') {
        const bucket = state.buckets[home];
        for (let position = 0; position < bucket.length; position++) {
          steps += 1;
          t.mark(bucketId(home), 'active').mark(entryId(home, position), 'compare');
          t.step(3, `Step ${steps} along the chain: "${bucket[position].key}".`, { key, steps }, { comparisons: 1 });
          if (bucket[position].key === key) break;
        }
      } else {
        for (let probe = 0; probe < state.buckets.length; probe++) {
          const slot = (home + probe) % state.buckets.length;
          steps += 1;

          t.mark(bucketId(slot), 'compare');
          t.step(4, `Probe ${steps}: slot ${slot}.`, { key, steps }, { comparisons: 1 });

          if (state.buckets[slot][0]?.key === key) break;
        }
      }

      totalSteps += steps;
      worst = Math.max(worst, steps);

      t.mark(bucketId(home), 'path');
      t.step(5, `"${key}" took ${steps} step(s).`, { key, steps });
    }

    const average = (totalSteps / keys.length).toFixed(2);
    for (let i = 0; i < state.buckets.length; i++) t.mark(bucketId(i), 'visited');
    t.step(
      5,
      `${state.strategy === 'chaining' ? 'Chaining' : 'Open addressing'} averaged ${average} step(s) per lookup, worst case ${worst}.`,
      { average: Number(average), worst, strategy: state.strategy },
    );
  },
};

export const loadFactorRehash: AlgorithmDef<HashTableState> = {
  id: 'load-factor-rehash',
  name: 'Load Factor & Rehash',
  description: 'Shows why a table doubles: the load factor crosses its threshold and every key moves.',
  pseudocode: [
    'load = size / capacity',
    'if load > threshold',
    '  capacity = capacity * 2',
    '  for each entry: reinsert at hash(key) mod capacity',
  ],
  run: (state, t) => {
    if (state.size === 0) {
      t.step(0, 'The table is empty — its load factor is 0.', { load: 0 });
      return;
    }

    const before = loadFactor(state);
    const oldCapacity = state.buckets.length;

    for (let i = 0; i < oldCapacity; i++) t.mark(bucketId(i), 'visited');
    t.step(
      0,
      `${state.size} entry(s) in ${oldCapacity} slots — load factor ${before.toFixed(2)}.`,
      { size: state.size, capacity: oldCapacity, load: Number(before.toFixed(2)) },
      { reads: state.size },
    );

    t.step(
      1,
      before > LOAD_FACTOR_LIMIT
        ? `${before.toFixed(2)} is over the ${LOAD_FACTOR_LIMIT} threshold — the table must grow.`
        : `${before.toFixed(2)} is under the ${LOAD_FACTOR_LIMIT} threshold, but growing anyway shows what a rehash costs.`,
      { load: Number(before.toFixed(2)), threshold: LOAD_FACTOR_LIMIT },
      { comparisons: 1 },
    );

    const entries = state.buckets.flat().map((entry) => entry.key);
    const oldSlots = new Map(entries.map((key) => [key, hashKey(key, oldCapacity)]));

    const newCapacity = oldCapacity * 2;
    rehashInto(state, newCapacity);

    t.step(2, `Capacity doubled to ${newCapacity} slots.`, { capacity: newCapacity });

    let moved = 0;
    for (const key of entries) {
      const from = oldSlots.get(key) as number;
      const to = hashKey(key, newCapacity);
      if (from !== to) moved += 1;

      t.mark(bucketId(to), from === to ? 'visited' : 'inserted');
      t.step(
        3,
        from === to
          ? `"${key}" hashes to slot ${to} in the bigger table too — it stays put.`
          : `"${key}" moves from slot ${from} to slot ${to}.`,
        { key, from, to },
        { writes: 1 },
      );
    }

    for (let i = 0; i < state.buckets.length; i++) t.mark(bucketId(i), 'visited');
    t.step(
      3,
      `Rehash complete: ${moved} of ${entries.length} key(s) changed slot. Load factor is now ${loadFactor(state).toFixed(2)}.`,
      { moved, total: entries.length, load: Number(loadFactor(state).toFixed(2)) },
    );
  },
};
