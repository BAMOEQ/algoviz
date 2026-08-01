export type Primitive = string | number | boolean | null;

export type Highlight =
  | 'none' | 'active' | 'compare' | 'visited' | 'path' | 'inserted' | 'removed';

export type MarkKey = string | number;
export type MarkSet = ReadonlyMap<MarkKey, Highlight>;

export interface Cell { id: string; value: Primitive; index: number; highlight: Highlight; label?: string }
export interface Pointer { id: string; label: string; index: number; highlight?: Highlight }

export interface LNode { id: string; value: Primitive; highlight: Highlight; label?: string }
export interface Link { id: string; from: string; to: string | null; highlight: Highlight; label?: string }

export interface TNode { id: string; value: Primitive; highlight: Highlight; label?: string }
export interface Edge { id: string; from: string; to: string; highlight: Highlight; weight?: number; label?: string }

export interface GNode { id: string; value: Primitive; highlight: Highlight; label?: string }

export interface BucketEntry { id: string; key: Primitive; value: Primitive; highlight: Highlight }
export interface Bucket { id: string; index: number; entries: BucketEntry[]; highlight: Highlight }

export type SceneGraph =
  | { kind: 'linear'; cells: Cell[]; pointers: Pointer[] }
  | { kind: 'linked'; nodes: LNode[]; links: Link[] }
  | { kind: 'tree'; nodes: TNode[]; edges: Edge[] }
  | { kind: 'graph'; nodes: GNode[]; edges: Edge[]; directed: boolean; weighted: boolean }
  | { kind: 'table'; buckets: Bucket[] };

export interface Metrics { comparisons: number; swaps: number; reads: number; writes: number }
export interface Frame { id: string; label: string; vars: Record<string, Primitive> }

export interface Step {
  line: number;
  narration: string;
  scene: SceneGraph;
  vars: Record<string, Primitive>;
  callStack?: Frame[];
  metrics: Metrics;
}
