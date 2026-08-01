import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { Edge, GNode } from '@/lib/engine/types';

export interface GraphNodeBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GraphLayout {
  boxes: GraphNodeBox[];
  width: number;
  height: number;
}

export interface GraphLayoutOptions {
  nodeSize?: number;
  /** Simulation ticks run synchronously before positions are frozen. */
  ticks?: number;
  linkDistance?: number;
}

interface SimNode extends SimulationNodeDatum {
  id: string;
}

const CANVAS = 640;

/**
 * Force-directed layout, run to convergence **synchronously once and then frozen**.
 *
 * Determinism matters more than prettiness here: algorithm playback must change highlights only,
 * never geometry, or the graph would jitter on every step. d3-force seeds coincident nodes with
 * `Math.random`, so nodes are pre-placed on a deterministic circle and the simulation is ticked a
 * fixed number of times rather than being allowed to run on a timer.
 */
export function layoutGraph(
  nodes: readonly GNode[],
  edges: readonly Edge[],
  options?: GraphLayoutOptions,
): GraphLayout {
  const nodeSize = options?.nodeSize ?? 48;
  const ticks = options?.ticks ?? 300;
  const linkDistance = options?.linkDistance ?? 110;

  if (nodes.length === 0) {
    return { boxes: [], width: 0, height: 0 };
  }

  if (nodes.length === 1) {
    return {
      boxes: [{ id: nodes[0].id, x: 0, y: 0, width: nodeSize, height: nodeSize }],
      width: nodeSize,
      height: nodeSize,
    };
  }

  /* Deterministic seed placement: evenly spaced on a circle, so no two nodes ever coincide and
   * d3's random jiggle never fires. */
  const radius = Math.min(CANVAS / 2 - nodeSize, 40 + nodes.length * 18);
  const simNodes: SimNode[] = nodes.map((node, index) => {
    const angle = (index / nodes.length) * Math.PI * 2;
    return {
      id: node.id,
      x: CANVAS / 2 + radius * Math.cos(angle),
      y: CANVAS / 2 + radius * Math.sin(angle),
      vx: 0,
      vy: 0,
    };
  });

  const simLinks: Array<SimulationLinkDatum<SimNode>> = edges
    .filter((edge) => edge.from !== edge.to)
    .map((edge) => ({ source: edge.from, target: edge.to }));

  const simulation = forceSimulation(simNodes)
    .force('link', forceLink<SimNode, SimulationLinkDatum<SimNode>>(simLinks).id((d) => d.id).distance(linkDistance))
    .force('charge', forceManyBody().strength(-320))
    .force('center', forceCenter(CANVAS / 2, CANVAS / 2))
    .stop();

  simulation.tick(ticks);

  const xs = simNodes.map((node) => node.x ?? 0);
  const ys = simNodes.map((node) => node.y ?? 0);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  /* Round to whole pixels so tiny float drift cannot produce different snapshots across runs. */
  const boxes = simNodes.map((node) => ({
    id: node.id,
    x: Math.round((node.x ?? 0) - minX),
    y: Math.round((node.y ?? 0) - minY),
    width: nodeSize,
    height: nodeSize,
  }));

  return {
    boxes,
    width: Math.round(maxX - minX) + nodeSize,
    height: Math.round(maxY - minY) + nodeSize,
  };
}
