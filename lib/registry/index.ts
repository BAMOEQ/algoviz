import { graphStructures } from './graph';
import { hashStructures } from './hash';
import { linearStructures } from './linear';
import { treeStructures } from './tree';
import type { Category, StructureHandle } from './types';

export const structures: readonly StructureHandle[] = [
  ...linearStructures,
  ...treeStructures,
  ...graphStructures,
  ...hashStructures,
];

export function getStructure(slug: string): StructureHandle | undefined {
  return structures.find((structure) => structure.slug === slug);
}

export function structuresByCategory(category: Category): readonly StructureHandle[] {
  return structures.filter((structure) => structure.category === category);
}

export { defineStructure } from './types';
export type {
  AlgorithmDef,
  AlgorithmHandle,
  Category,
  ComplexityRow,
  ComplexityTable,
  OperationDef,
  OperationField,
  OperationHandle,
  StructureDef,
  StructureHandle,
} from './types';
