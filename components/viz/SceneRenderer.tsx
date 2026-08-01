'use client';

import type { ReactElement } from 'react';
import type { SceneGraph } from '@/lib/engine/types';
import { ARROWHEAD_MARKER_ID } from './VizEdge';
import { GLOW_FILTER_ID } from './highlight';
import { LinearView } from './LinearView';
import { GraphView } from './GraphView';
import { LinkedView } from './LinkedView';
import { TableView } from './TableView';
import { TreeView } from './TreeView';

/**
 * Shared SVG definitions every view can reference: the soft outer glow for active nodes, and the
 * arrowhead for directed edges. Defined once here rather than per-view so the five views cannot
 * drift apart.
 */
function VizDefs(): ReactElement {
  return (
    <svg width={0} height={0} aria-hidden="true" className="absolute">
      <defs>
        <filter id={GLOW_FILTER_ID} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <marker
          id={ARROWHEAD_MARKER_ID}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="fill-border-strong" />
        </marker>
      </defs>
    </svg>
  );
}

/**
 * FROZEN CONTRACT — dispatches a scene to its view. Renderers know nothing about BSTs or heaps,
 * only the five `SceneGraph` kinds.
 */
export function SceneRenderer({ scene }: { scene: SceneGraph }): ReactElement {
  return (
    <>
      <VizDefs />
      {renderScene(scene)}
    </>
  );
}

function renderScene(scene: SceneGraph): ReactElement {
  switch (scene.kind) {
    case 'linear':
      return <LinearView scene={scene} />;
    case 'linked':
      return <LinkedView scene={scene} />;
    case 'tree':
      return <TreeView scene={scene} />;
    case 'graph':
      return <GraphView scene={scene} />;
    case 'table':
      return <TableView scene={scene} />;
    default: {
      const exhaustive: never = scene;
      return exhaustive;
    }
  }
}
