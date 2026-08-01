import { arrayStructure } from '@/lib/structures/array';
import { linkedListStructure } from '@/lib/structures/linked-list';
import { queueStructure } from '@/lib/structures/queue';
import { stackStructure } from '@/lib/structures/stack';
import type { StructureHandle } from './types';

export const linearStructures: readonly StructureHandle[] = [
  arrayStructure,
  stackStructure,
  queueStructure,
  linkedListStructure,
];
