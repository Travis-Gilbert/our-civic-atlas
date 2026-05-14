"use client";

/**
 * CosmosProvenancePanel — provenance lineage rendered with the MIT
 * open-source ``@cosmos.gl/graph`` engine (regl-backed, NOT luma.gl,
 * so it coexists with deck.gl 9.3 in the same bundle without the
 * version conflict that blocks @cosmograph/* + @cosmos.gl/graph 3.x).
 *
 * The component mirrors the prop shape of the prior sigma.js-backed
 * ``ProvenancePanel`` so swapping is a one-line import change at the
 * page level.
 *
 * Lifecycle:
 *   1. Mount: create a ``Graph`` against a div ref + pass initial
 *      config + per-event handlers. cosmos.gl owns the canvas inside.
 *   2. Data: every (nodes, edges) prop change rebuilds the three
 *      Float32Arrays (positions / colors / links) and pushes them
 *      with ``setPointPositions`` / ``setPointColors`` / ``setLinks``.
 *   3. Render: call ``render(1)`` for the first frame, then
 *      ``start()`` to let the force simulation settle, then
 *      ``fitView()`` on simulation end.
 *   4. Unmount: ``graph.destroy()`` releases the WebGL context —
 *      mandatory under React StrictMode.
 *
 * Domain mapping: cosmos.gl events deliver an integer ``pointIndex``,
 * not a node object. We stash the index → ProvenanceNode.id mapping
 * in a ref so the click handler can resolve back to the domain id.
 */

import { useEffect, useMemo, useRef } from "react";
import type {
  ProvenanceNode,
  ProvenanceEdge,
} from "@/lib/api/openFlintAtlas";

interface CosmosProvenancePanelProps {
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
  loading?: boolean;
  onNodeSelect?: (nodeId: string) => void;
}

/** Atlas semantic palette — same RGB values used elsewhere in the
    atlas so the provenance graph reads as part of the same family.
    Each tuple is [r, g, b, a] in the 0..1 range cosmos.gl expects. */
const LABEL_COLOR: Record<string, [number, number, number, number]> = {
  Place: [0x6b / 255, 0x7d / 255, 0x8c / 255, 1],
  Source: [0x7a / 255, 0x62 / 255, 0x94 / 255, 1],
  Event: [0xb8 / 255, 0x51 / 255, 0x3a / 255, 1],
  Artifact: [0xb8 / 255, 0x89 / 255, 0x3f / 255, 1],
  Candidate: [0xc0 / 255, 0x8a / 255, 0x3a / 255, 1],
  Person: [0x4a / 255, 0x8a / 255, 0x82 / 255, 1],
  Default: [0x7a / 255, 0x75 / 255, 0x68 / 255, 1],
};

export function CosmosProvenancePanel({
  nodes,
  edges,
  loading,
  onNodeSelect,
}: CosmosProvenancePanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any | null>(null);
  const idAtIndexRef = useRef<string[]>([]);
  const onSelectRef = useRef(onNodeSelect);

  /* Keep the latest callback in a ref so the imperative click handler
     bound at Graph construction time doesn't go stale. */
  useEffect(() => {
    onSelectRef.current = onNodeSelect;
  }, [onNodeSelect]);

  /* Build the Float32Arrays from the current node + edge props.
     Memoized so we don't re-allocate on every render. */
  const buffers = useMemo(() => {
    const N = nodes.length;
    const E = edges.length;
    const positions = new Float32Array(N * 2);
    const colors = new Float32Array(N * 4);
    const ids: string[] = new Array(N);
    const indexById = new Map<string, number>();

    // Cheap deterministic initial layout: ring of radius 100.
    for (let i = 0; i < N; i += 1) {
      const node = nodes[i];
      ids[i] = node.id;
      indexById.set(node.id, i);
      const theta = (i / Math.max(N, 1)) * Math.PI * 2;
      positions[i * 2] = Math.cos(theta) * 100;
      positions[i * 2 + 1] = Math.sin(theta) * 100;

      const primary = (node.labels || [])[0] ?? "Default";
      const [r, g, b, a] = LABEL_COLOR[primary] ?? LABEL_COLOR.Default;
      colors[i * 4] = r;
      colors[i * 4 + 1] = g;
      colors[i * 4 + 2] = b;
      colors[i * 4 + 3] = a;
    }

    const links = new Float32Array(E * 2);
    let writtenEdges = 0;
    for (let i = 0; i < E; i += 1) {
      const sIdx = indexById.get(edges[i].source);
      const tIdx = indexById.get(edges[i].target);
      if (sIdx == null || tIdx == null) continue;
      links[writtenEdges * 2] = sIdx;
      links[writtenEdges * 2 + 1] = tIdx;
      writtenEdges += 1;
    }
    // Trim links to the number of resolved edges.
    const trimmedLinks = links.subarray(0, writtenEdges * 2);

    return { positions, colors, links: trimmedLinks, ids };
  }, [nodes, edges]);

  /* Mount the Graph once per container. */
  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;
    const container = containerRef.current;

    let cancelled = false;
    let graph: unknown = null;

    (async () => {
      const { Graph } = await import("@cosmos.gl/graph");
      if (cancelled || !containerRef.current) return;

      idAtIndexRef.current = buffers.ids;
      const instance = new Graph(container, {
        backgroundColor: "rgba(0,0,0,0)",
        pointSize: 6.5,
        linkColor: "rgba(42, 36, 25, 0.18)",
        fitViewOnInit: true,
        enableSimulation: true,
        simulationGravity: 0.18,
        simulationRepulsion: 1.4,
        simulationLinkSpring: 1.2,
        simulationLinkDistance: 10,
        simulationFriction: 0.85,
        onPointClick: (index: number) => {
          const id = idAtIndexRef.current[index];
          if (id && onSelectRef.current) onSelectRef.current(id);
        },
        onSimulationEnd: () => {
          (instance as { fitView: (d?: number) => void }).fitView(400);
        },
      });

      graph = instance;
      graphRef.current = instance;

      (instance as {
        setPointPositions: (a: Float32Array) => void;
        setPointColors: (a: Float32Array) => void;
        setLinks: (a: Float32Array) => void;
        render: (alpha?: number) => void;
        start: (alpha?: number) => void;
      }).setPointPositions(buffers.positions);
      (instance as { setPointColors: (a: Float32Array) => void })
        .setPointColors(buffers.colors);
      (instance as { setLinks: (a: Float32Array) => void })
        .setLinks(buffers.links);
      (instance as { render: (alpha?: number) => void }).render(1);
      (instance as { start: (alpha?: number) => void }).start(1);
    })();

    return () => {
      cancelled = true;
      if (graph) {
        try {
          (graph as { destroy: () => void }).destroy();
        } catch {
          // best-effort; the canvas is about to be unmounted anyway
        }
        graphRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length === 0]);

  /* Push buffer updates without re-mounting the Graph. */
  useEffect(() => {
    const instance = graphRef.current as
      | {
          setPointPositions: (a: Float32Array) => void;
          setPointColors: (a: Float32Array) => void;
          setLinks: (a: Float32Array) => void;
          render: (alpha?: number) => void;
          start: (alpha?: number) => void;
        }
      | null;
    if (!instance) return;
    idAtIndexRef.current = buffers.ids;
    instance.setPointPositions(buffers.positions);
    instance.setPointColors(buffers.colors);
    instance.setLinks(buffers.links);
    instance.render(1);
    instance.start(0.4);
  }, [buffers]);

  if (loading) {
    return (
      <div className="px-5 py-4">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.14em] mb-2"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          Provenance
        </p>
        <p className="text-[12px]" style={{ color: "var(--ctx-ink-mute)" }}>
          Loading lineage…
        </p>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="px-5 py-4">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.14em] mb-2"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          Provenance
        </p>
        <p
          className="text-[12px] leading-[1.5]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          No provenance data available for the current view.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-full"
      data-cosmos-provenance-panel="true"
    >
      <div className="px-5 pt-4 pb-2 shrink-0">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          Provenance
        </p>
        <p
          className="font-mono text-[10px] tracking-[0.02em] mt-1"
          style={{ color: "var(--ctx-ink-faint)" }}
        >
          {nodes.length} nodes · {edges.length} edges · cosmos.gl
        </p>
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-[280px] relative"
        style={{ width: "100%" }}
      />
    </div>
  );
}
