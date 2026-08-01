import { graphStructure } from '@/lib/structures/graph';
import { unionFindStructure } from '@/lib/structures/union-find';
import type { StructureHandle } from './types';

export const graphStructures: readonly StructureHandle[] = [graphStructure, unionFindStructure];
