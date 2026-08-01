import { bstStructure } from '@/lib/structures/bst';
import { heapStructure } from '@/lib/structures/heap';
import { trieStructure } from '@/lib/structures/trie';
import type { StructureHandle } from './types';

export const treeStructures: readonly StructureHandle[] = [
  bstStructure,
  heapStructure,
  trieStructure,
];
