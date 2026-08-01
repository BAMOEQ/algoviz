import { loadFactorRehash, probeComparison } from '@/lib/algorithms/hash-algorithms';
import { defineStructure } from '@/lib/registry/types';
import type { StructureHandle } from '@/lib/registry/types';

export const HASH_MAX_ENTRIES = 40;
export const LOAD_FACTOR_LIMIT = 0.75;

export type CollisionStrategy = 'chaining' | 'open-addressing';

export interface HashEntry {
  key: string;
  value: number;
}

export interface HashTableState {
  /** One bucket per slot. Chaining puts many entries in a bucket; open addressing at most one. */
  buckets: HashEntry[][];
  strategy: CollisionStrategy;
  size: number;
}

/** djb2, kept small and deterministic so the same key always lands in the same slot. */
export function hashKey(key: string, capacity: number): number {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % capacity;
}

export function loadFactor(state: HashTableState): number {
  return state.buckets.length === 0 ? 0 : state.size / state.buckets.length;
}

export function bucketId(index: number): string {
  return `bucket-${index}`;
}

export function entryId(index: number, position: number): string {
  return `entry-${index}-${position}`;
}

function emptyBuckets(capacity: number): HashEntry[][] {
  return Array.from({ length: capacity }, () => []);
}

/** Rehash into a table of `capacity` slots, honouring the current collision strategy. */
export function rehashInto(state: HashTableState, capacity: number): void {
  const entries = state.buckets.flat();
  state.buckets = emptyBuckets(capacity);
  state.size = 0;

  for (const entry of entries) {
    insertEntry(state, entry.key, entry.value);
  }
}

/** Returns the slot the entry ended up in, or -1 when open addressing found no free slot. */
export function insertEntry(state: HashTableState, key: string, value: number): number {
  const capacity = state.buckets.length;
  const home = hashKey(key, capacity);

  if (state.strategy === 'chaining') {
    const bucket = state.buckets[home];
    const existing = bucket.find((entry) => entry.key === key);
    if (existing) {
      existing.value = value;
      return home;
    }
    bucket.push({ key, value });
    state.size += 1;
    return home;
  }

  for (let probe = 0; probe < capacity; probe++) {
    const slot = (home + probe) % capacity;
    const bucket = state.buckets[slot];

    if (bucket.length === 0) {
      bucket.push({ key, value });
      state.size += 1;
      return slot;
    }
    if (bucket[0].key === key) {
      bucket[0].value = value;
      return slot;
    }
  }

  return -1;
}

function normalizeKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export const hashTableStructure: StructureHandle = defineStructure<HashTableState>({
  id: 'hash-table',
  name: 'Hash Table',
  slug: 'hash-table',
  category: 'hash',
  summary: 'Keys mapped to slots by a hash function, with a rule for what to do when two collide.',
  create: () => ({ buckets: emptyBuckets(8), strategy: 'chaining', size: 0 }),
  seed: () => {
    const state: HashTableState = { buckets: emptyBuckets(8), strategy: 'chaining', size: 0 };
    for (const [key, value] of [
      ['ada', 1815],
      ['alan', 1912],
      ['grace', 1906],
      ['edsger', 1930],
      ['barbara', 1945],
    ] as Array<[string, number]>) {
      insertEntry(state, key, value);
    }
    return state;
  },
  clone: (state) => ({
    buckets: state.buckets.map((bucket) => bucket.map((entry) => ({ ...entry }))),
    strategy: state.strategy,
    size: state.size,
  }),

  operations: [
    {
      id: 'put',
      name: 'Put',
      fields: [
        { name: 'key', label: 'Key', type: 'string', placeholder: 'ada' },
        { name: 'value', label: 'Value', type: 'number', placeholder: '1815' },
      ],
      validate: (state, args) => {
        const key = normalizeKey(args.key);
        if (key === null) return 'Enter a key.';
        if (typeof args.value !== 'number' || !Number.isFinite(args.value)) return 'Value must be a number.';
        if (state.size >= HASH_MAX_ENTRIES) return `Table is full — ${HASH_MAX_ENTRIES} entries maximum.`;
        return null;
      },
      run: (state, args, t) => {
        const key = normalizeKey(args.key) as string;
        const value = args.value as number;
        const home = hashKey(key, state.buckets.length);

        t.mark(bucketId(home), 'active');
        t.step(0, `hash("${key}") = slot ${home}.`, { key, slot: home }, { reads: 1 });

        if (state.strategy === 'open-addressing') {
          let probe = 0;
          while (probe < state.buckets.length) {
            const slot = (home + probe) % state.buckets.length;
            const bucket = state.buckets[slot];

            if (bucket.length === 0 || bucket[0].key === key) break;

            t.mark(bucketId(slot), 'compare');
            t.step(0, `Slot ${slot} is taken by "${bucket[0].key}" — probing the next one.`, { slot, probe }, { comparisons: 1 });
            probe += 1;
          }
        } else if (state.buckets[home].length > 0) {
          t.mark(bucketId(home), 'compare');
          t.step(
            0,
            `Slot ${home} already holds ${state.buckets[home].length} entry(s) — chaining onto it.`,
            { slot: home },
            { comparisons: 1 },
          );
        }

        const slot = insertEntry(state, key, value);

        if (slot === -1) {
          t.step(0, 'No free slot was found — the table needs to grow first.', { key });
          return;
        }

        t.mark(bucketId(slot), 'inserted');
        t.step(
          0,
          `Stored "${key}" = ${value} in slot ${slot}. Load factor is ${loadFactor(state).toFixed(2)}.`,
          { key, slot, load: Number(loadFactor(state).toFixed(2)) },
          { writes: 1 },
        );

        if (loadFactor(state) > LOAD_FACTOR_LIMIT) {
          const capacity = state.buckets.length * 2;
          rehashInto(state, capacity);

          for (let i = 0; i < state.buckets.length; i++) t.mark(bucketId(i), 'visited');
          t.step(
            0,
            `Load factor passed ${LOAD_FACTOR_LIMIT} — doubled to ${capacity} slots and rehashed every key.`,
            { capacity, load: Number(loadFactor(state).toFixed(2)) },
            { writes: state.size },
          );
        }
      },
    },
    {
      id: 'get',
      name: 'Get',
      fields: [{ name: 'key', label: 'Key', type: 'string' }],
      validate: (state, args) => {
        if (normalizeKey(args.key) === null) return 'Enter a key to look up.';
        if (state.size === 0) return 'Table is empty — put a key first.';
        return null;
      },
      run: (state, args, t) => {
        const key = normalizeKey(args.key) as string;
        const home = hashKey(key, state.buckets.length);

        t.mark(bucketId(home), 'active');
        t.step(0, `hash("${key}") = slot ${home}.`, { key, slot: home }, { reads: 1 });

        if (state.strategy === 'chaining') {
          const bucket = state.buckets[home];
          for (let position = 0; position < bucket.length; position++) {
            t.mark(bucketId(home), 'active').mark(entryId(home, position), 'compare');
            t.step(0, `Is "${bucket[position].key}" the key we want?`, { position }, { comparisons: 1 });

            if (bucket[position].key === key) {
              t.mark(entryId(home, position), 'path');
              t.step(0, `Found "${key}" = ${bucket[position].value} after ${position + 1} comparison(s).`, {
                key,
                value: bucket[position].value,
              });
              return;
            }
          }

          t.step(0, `"${key}" is not in the table.`, { key });
          return;
        }

        for (let probe = 0; probe < state.buckets.length; probe++) {
          const slot = (home + probe) % state.buckets.length;
          const bucket = state.buckets[slot];

          t.mark(bucketId(slot), 'compare');
          t.step(0, `Probing slot ${slot}.`, { slot, probe }, { comparisons: 1 });

          if (bucket.length === 0) break;
          if (bucket[0].key === key) {
            t.mark(bucketId(slot), 'path').mark(entryId(slot, 0), 'path');
            t.step(0, `Found "${key}" = ${bucket[0].value} after ${probe + 1} probe(s).`, {
              key,
              value: bucket[0].value,
              probes: probe + 1,
            });
            return;
          }
        }

        t.step(0, `"${key}" is not in the table.`, { key });
      },
    },
    {
      id: 'delete',
      name: 'Delete',
      fields: [{ name: 'key', label: 'Key', type: 'string' }],
      validate: (state, args) => {
        const key = normalizeKey(args.key);
        if (key === null) return 'Enter a key to delete.';
        if (!state.buckets.some((bucket) => bucket.some((entry) => entry.key === key))) {
          return `"${key}" is not in the table.`;
        }
        return null;
      },
      run: (state, args, t) => {
        const key = normalizeKey(args.key) as string;
        const slot = state.buckets.findIndex((bucket) => bucket.some((entry) => entry.key === key));

        t.mark(bucketId(slot), 'removed');
        t.step(0, `Found "${key}" in slot ${slot}.`, { key, slot }, { reads: 1 });

        state.buckets[slot] = state.buckets[slot].filter((entry) => entry.key !== key);
        state.size -= 1;

        if (state.strategy === 'open-addressing') {
          /* Open addressing cannot simply blank a slot — later probes would stop early — so the
           * cluster after the hole is reinserted. */
          const capacity = state.buckets.length;
          const displaced: HashEntry[] = [];

          for (let probe = 1; probe < capacity; probe++) {
            const next = (slot + probe) % capacity;
            if (state.buckets[next].length === 0) break;
            displaced.push(...state.buckets[next]);
            state.buckets[next] = [];
            state.size -= 1;
          }

          for (const entry of displaced) insertEntry(state, entry.key, entry.value);

          t.step(
            0,
            displaced.length === 0
              ? `Removed "${key}".`
              : `Removed "${key}" and reinserted ${displaced.length} entry(s) that probed past it.`,
            { key, reinserted: displaced.length },
            { writes: 1 + displaced.length },
          );
          return;
        }

        t.step(0, `Removed "${key}". Load factor is ${loadFactor(state).toFixed(2)}.`, { key }, { writes: 1 });
      },
    },
    {
      id: 'resize',
      name: 'Resize',
      fields: [],
      validate: (state) => (state.buckets.length >= 64 ? 'Table is already at its maximum size.' : null),
      run: (state, _args, t) => {
        const capacity = state.buckets.length * 2;

        t.step(0, `Growing from ${state.buckets.length} to ${capacity} slots — every key must be rehashed.`, {
          from: state.buckets.length,
          to: capacity,
        });

        rehashInto(state, capacity);

        for (let i = 0; i < state.buckets.length; i++) t.mark(bucketId(i), 'inserted');
        t.step(0, `Rehashed ${state.size} entry(s). Load factor is now ${loadFactor(state).toFixed(2)}.`, {
          capacity,
          load: Number(loadFactor(state).toFixed(2)),
        }, { writes: state.size });
      },
    },
    {
      id: 'toggleStrategy',
      name: 'Toggle strategy',
      fields: [],
      run: (state, _args, t) => {
        state.strategy = state.strategy === 'chaining' ? 'open-addressing' : 'chaining';

        t.step(
          0,
          state.strategy === 'chaining'
            ? 'Switching to separate chaining — colliding keys share a slot in a list.'
            : 'Switching to open addressing — colliding keys probe forward for the next free slot.',
          { strategy: state.strategy },
        );

        const capacity = Math.max(state.buckets.length, state.size * 2);
        rehashInto(state, capacity);

        for (let i = 0; i < state.buckets.length; i++) t.mark(bucketId(i), 'visited');
        t.step(0, `Rebuilt the table with ${state.strategy}.`, { strategy: state.strategy }, { writes: state.size });
      },
    },
  ],

  algorithms: [probeComparison, loadFactorRehash],

  toScene: (state, marks) => ({
    kind: 'table',
    buckets: state.buckets.map((bucket, index) => ({
      id: bucketId(index),
      index,
      highlight: marks.get(bucketId(index)) ?? 'none',
      entries: bucket.map((entry, position) => ({
        id: entryId(index, position),
        key: entry.key,
        value: entry.value,
        highlight: marks.get(entryId(index, position)) ?? 'none',
      })),
    })),
  }),

  complexity: {
    rows: [
      { operation: 'put', average: 'O(1)', worst: 'O(n)' },
      { operation: 'get', average: 'O(1)', worst: 'O(n)' },
      { operation: 'delete', average: 'O(1)', worst: 'O(n)' },
      { operation: 'resize', average: 'O(n)', worst: 'O(n)' },
    ],
    space: 'O(n)',
  },
});
