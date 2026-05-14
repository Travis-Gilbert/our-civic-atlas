"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Skeleton } from "antd";
import { SigmaContainer, useLoadGraph, useRegisterEvents } from "@react-sigma/core";
import "@react-sigma/core/lib/style.css";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { ProvenanceNode, ProvenanceEdge } from "@/lib/api/openFlintAtlas";

/* ------------------------------------------------------------------ */
/*  Node styling by label                                              */
/* ------------------------------------------------------------------ */

const LABEL_COLOR: Record<string, string> = {
  Source: "#52c41a",
  Place: "#1890ff",
  Event: "#faad14",
  Claim: "#d9a23b",
  Dataset: "#7c5cbf",
  MetricRecord: "#e07856",
};

const LABEL_SIZE: Record<string, number> = {
  Source: 8,
  Place: 6,
  Event: 5,
  Claim: 5,
  Dataset: 7,
  MetricRecord: 5,
};

const DEFAULT_COLOR = "#8c8c8c";
const DEFAULT_SIZE = 4;
const EDGE_COLOR = "#d9d9d9";

const EDGE_TYPE_LABEL: Record<string, string> = {
  PUBLISHES: "publishes",
  DESCRIBES_PLACE: "describes",
  CONTAINS_RECORD: "contains",
  SUPPORTS: "supports",
  ABOUT: "about",
  USES_SOURCE: "sourced from",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  public_read_model_metric: "Public data metric",
  official_record: "Official record",
  third_party_verified: "Third-party verified",
  community_reported: "Community reported",
  inferred: "Inferred from data",
};

const STATUS_LABEL: Record<string, { text: string; color: string }> = {
  source_only: { text: "Source only", color: "var(--ctx-ink-mute)" },
  accepted: { text: "Reviewed", color: "#52c41a" },
  pending: { text: "Pending review", color: "#faad14" },
  rejected: { text: "Rejected", color: "#dc5050" },
  needs_review: { text: "Needs review", color: "#e07856" },
};

/* ------------------------------------------------------------------ */
/*  Node label extraction                                              */
/* ------------------------------------------------------------------ */

function nodeDisplayLabel(node: ProvenanceNode): string {
  const props = node.properties;
  for (const key of ["name", "title", "label", "metric_label", "statement", "source_id", "place_id", "event_id"]) {
    const val = props[key];
    if (typeof val === "string" && val.length > 0) return val;
  }
  if (node.labels.length > 0) return node.labels[0];
  return node.id;
}

function primaryLabel(node: ProvenanceNode): string {
  for (const lbl of node.labels) {
    if (lbl in LABEL_COLOR) return lbl;
  }
  return "";
}

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const GraphIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <circle cx="3" cy="3" r="1.5" />
    <circle cx="11" cy="3" r="1.5" />
    <circle cx="7" cy="11" r="1.5" />
    <path d="M4.2 4L6 9.5" />
    <path d="M9.8 4L8 9.5" />
  </svg>
);

const CloseIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M3 3l8 8M11 3l-8 8" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Connected edges helper                                             */
/* ------------------------------------------------------------------ */

type ConnectedEdge = {
  edgeType: string;
  direction: "outgoing" | "incoming";
  neighborId: string;
  neighborLabel: string;
  neighborDisplayName: string;
};

function getConnectedEdges(
  nodeId: string,
  nodes: ProvenanceNode[],
  edges: ProvenanceEdge[],
): ConnectedEdge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const result: ConnectedEdge[] = [];

  for (const edge of edges) {
    if (edge.source === nodeId) {
      const neighbor = nodeMap.get(edge.target);
      if (neighbor) {
        result.push({
          edgeType: edge.type,
          direction: "outgoing",
          neighborId: edge.target,
          neighborLabel: primaryLabel(neighbor) || neighbor.labels[0] || "Node",
          neighborDisplayName: nodeDisplayLabel(neighbor),
        });
      }
    } else if (edge.target === nodeId) {
      const neighbor = nodeMap.get(edge.source);
      if (neighbor) {
        result.push({
          edgeType: edge.type,
          direction: "incoming",
          neighborId: edge.source,
          neighborLabel: primaryLabel(neighbor) || neighbor.labels[0] || "Node",
          neighborDisplayName: nodeDisplayLabel(neighbor),
        });
      }
    }
  }

  return result;
}

/* ------------------------------------------------------------------ */
/*  Node detail drawer                                                 */
/* ------------------------------------------------------------------ */

function NodeDetailDrawer({
  node,
  connectedEdges,
  onClose,
  onNavigate,
}: {
  node: ProvenanceNode;
  connectedEdges: ConnectedEdge[];
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
}) {
  const label = primaryLabel(node) || node.labels[0] || "Node";
  const props = node.properties;
  const status = typeof props.status === "string" ? STATUS_LABEL[props.status] : null;
  const confidence = typeof props.confidence_basis === "string"
    ? CONFIDENCE_LABEL[props.confidence_basis] ?? props.confidence_basis
    : null;

  return (
    <div
      className="shrink-0 border-t overflow-y-auto"
      style={{
        maxHeight: 280,
        borderColor: "var(--ctx-rule-soft)",
        background: "var(--ctx-paper)",
      }}
    >
      {/* Drawer header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b sticky top-0"
        style={{ borderColor: "var(--ctx-rule-soft)", background: "var(--ctx-paper)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-[8px] h-[8px] rounded-full shrink-0"
            style={{ background: LABEL_COLOR[label] ?? DEFAULT_COLOR }}
          />
          <span
            className="font-mono text-[10px] uppercase tracking-[0.06em] shrink-0"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {label}
          </span>
          <span
            className="text-[13px] leading-none truncate"
            style={{ color: "var(--ctx-ink)" }}
          >
            {nodeDisplayLabel(node)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 cursor-pointer"
          style={{ background: "none", border: "none", color: "var(--ctx-ink-mute)" }}
          aria-label="Close detail"
        >
          <CloseIcon className="w-[12px] h-[12px]" />
        </button>
      </div>

      {/* Properties */}
      <div className="px-4 py-3">
        {/* Status + confidence row */}
        {(status || confidence) && (
          <div className="flex items-center gap-3 mb-3">
            {status && (
              <span
                className="font-mono text-[10px] tracking-[0.06em] px-1.5 py-0.5 rounded-[3px]"
                style={{
                  color: status.color,
                  background: `color-mix(in srgb, ${status.color} 10%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${status.color} 20%, transparent)`,
                }}
              >
                {status.text}
              </span>
            )}
            {confidence && (
              <span
                className="font-mono text-[10px] tracking-[0.04em]"
                style={{ color: "var(--ctx-ink-mute)" }}
              >
                {confidence}
              </span>
            )}
          </div>
        )}

        {/* Claim statement */}
        {typeof props.statement === "string" && (
          <p
            className="text-[13px] leading-[1.55] mb-3"
            style={{ color: "var(--ctx-ink)" }}
          >
            {props.statement}
          </p>
        )}

        {/* Caveat */}
        {typeof props.caveat === "string" && (
          <div
            className="text-[12px] leading-[1.5] mb-3 px-3 py-2 rounded-[4px]"
            style={{
              color: "var(--ctx-ink-soft)",
              background: "color-mix(in srgb, var(--ctx-ink-mute) 6%, transparent)",
              borderLeft: "2px solid var(--ctx-ink-mute)",
            }}
          >
            <span
              className="font-mono text-[9px] uppercase tracking-[0.14em] block mb-1"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Caveat
            </span>
            {props.caveat}
          </div>
        )}

        {/* Source-specific: trust tier, freshness, public use */}
        {label === "Source" && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
            {typeof props.trust_tier === "string" && (
              <span className="font-mono text-[10px] tracking-[0.04em]" style={{ color: "var(--ctx-ink-soft)" }}>
                Trust: {props.trust_tier.replace(/_/g, " ")}
              </span>
            )}
            {typeof props.last_checked === "string" && (
              <span className="font-mono text-[10px] tracking-[0.04em]" style={{ color: "var(--ctx-ink-soft)" }}>
                Checked: {props.last_checked}
              </span>
            )}
            {typeof props.public_use === "string" && (
              <span className="font-mono text-[10px] tracking-[0.04em]" style={{ color: "var(--ctx-ink-soft)" }}>
                Use: {props.public_use.replace(/_/g, " ")}
              </span>
            )}
          </div>
        )}

        {/* MetricRecord-specific */}
        {label === "MetricRecord" && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
            {typeof props.metric_key === "string" && (
              <span className="font-mono text-[10px] tracking-[0.04em]" style={{ color: "var(--ctx-ink-soft)" }}>
                Key: {props.metric_key}
              </span>
            )}
            {typeof props.category === "string" && (
              <span className="font-mono text-[10px] tracking-[0.04em]" style={{ color: "var(--ctx-ink-soft)" }}>
                Category: {props.category}
              </span>
            )}
            {props.release_year != null && (
              <span className="font-mono text-[10px] tracking-[0.04em]" style={{ color: "var(--ctx-ink-soft)" }}>
                Year: {String(props.release_year)}
              </span>
            )}
          </div>
        )}

        {/* Connected relationships: the "why" */}
        {connectedEdges.length > 0 && (
          <div>
            <span
              className="font-mono text-[9px] uppercase tracking-[0.14em] block mb-2"
              style={{ color: "var(--ctx-ink-mute)" }}
            >
              Relationships
            </span>
            <div className="flex flex-col gap-1">
              {connectedEdges.map((ce, i) => (
                <button
                  key={`${ce.edgeType}-${ce.neighborId}-${i}`}
                  type="button"
                  onClick={() => onNavigate(ce.neighborId)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-[3px] text-left cursor-pointer transition-colors"
                  style={{
                    background: "transparent",
                    border: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "color-mix(in srgb, var(--ctx-ink-mute) 8%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span
                    className="w-[6px] h-[6px] rounded-full shrink-0"
                    style={{ background: LABEL_COLOR[ce.neighborLabel] ?? DEFAULT_COLOR }}
                  />
                  <span
                    className="font-mono text-[10px] tracking-[0.04em] shrink-0"
                    style={{ color: "var(--ctx-ink-mute)" }}
                  >
                    {ce.direction === "outgoing"
                      ? EDGE_TYPE_LABEL[ce.edgeType] ?? ce.edgeType.toLowerCase()
                      : `${EDGE_TYPE_LABEL[ce.edgeType] ?? ce.edgeType.toLowerCase()} (from)`}
                  </span>
                  <span
                    className="text-[12px] truncate"
                    style={{ color: "var(--ctx-ink-soft)" }}
                  >
                    {ce.neighborDisplayName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Graph builder                                                      */
/* ------------------------------------------------------------------ */

function buildGraph(nodes: ProvenanceNode[], edges: ProvenanceEdge[]): Graph {
  const g = new Graph();

  for (const node of nodes) {
    const lbl = primaryLabel(node);
    g.addNode(node.id, {
      label: nodeDisplayLabel(node),
      size: LABEL_SIZE[lbl] ?? DEFAULT_SIZE,
      color: LABEL_COLOR[lbl] ?? DEFAULT_COLOR,
      x: Math.random(),
      y: Math.random(),
    });
  }

  const nodeSet = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!nodeSet.has(edge.source) || !nodeSet.has(edge.target)) continue;
    if (edge.source === edge.target) continue;
    const key = `${edge.source}->${edge.target}`;
    if (g.hasEdge(key)) continue;
    g.addEdgeWithKey(key, edge.source, edge.target, {
      label: edge.type,
      color: EDGE_COLOR,
      size: 1,
    });
  }

  if (g.order > 1) {
    forceAtlas2.assign(g, { iterations: 50 });
  }

  return g;
}

/* ------------------------------------------------------------------ */
/*  Inner component (must be inside SigmaContainer)                    */
/* ------------------------------------------------------------------ */

function GraphEvents({ onNodeSelect }: { onNodeSelect?: (id: string) => void }) {
  const registerEvents = useRegisterEvents();
  const loadGraph = useLoadGraph();

  useEffect(() => {
    registerEvents({
      clickNode: (event) => {
        onNodeSelect?.(event.node);
      },
    });
  }, [registerEvents, onNodeSelect]);

  void loadGraph;

  return null;
}

/* ------------------------------------------------------------------ */
/*  ProvenancePanel                                                    */
/* ------------------------------------------------------------------ */

export type ProvenancePanelProps = {
  nodes: ProvenanceNode[];
  edges: ProvenanceEdge[];
  loading?: boolean;
  onNodeSelect?: (nodeId: string) => void;
};

export function ProvenancePanel({
  nodes,
  edges,
  loading,
  onNodeSelect,
}: ProvenancePanelProps) {
  const graph = useMemo(() => buildGraph(nodes, edges), [nodes, edges]);

  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);

  const detailNode = useMemo(
    () => (detailNodeId ? nodes.find((n) => n.id === detailNodeId) ?? null : null),
    [detailNodeId, nodes],
  );

  const detailEdges = useMemo(
    () => (detailNodeId ? getConnectedEdges(detailNodeId, nodes, edges) : []),
    [detailNodeId, nodes, edges],
  );

  const handleNodeClick = useCallback(
    (id: string) => {
      setDetailNodeId(id);
      onNodeSelect?.(id);
    },
    [onNodeSelect],
  );

  const handleDetailClose = useCallback(() => setDetailNodeId(null), []);

  const handleDetailNavigate = useCallback(
    (neighborId: string) => {
      setDetailNodeId(neighborId);
      onNodeSelect?.(neighborId);
    },
    [onNodeSelect],
  );

  useEffect(() => {
    if (nodes.length === 0) setDetailNodeId(null);
  }, [nodes]);

  /* -- Loading state ------------------------------------------------ */
  if (loading) {
    return (
      <div className="px-5 py-6">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  /* -- Empty state -------------------------------------------------- */
  if (nodes.length === 0) {
    return (
      <div className="px-5 py-6">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.14em] mb-3"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          Provenance
        </p>
        <p
          className="text-[13px] leading-[1.55]"
          style={{ color: "var(--ctx-ink-soft)" }}
        >
          No provenance data available for the current view.
        </p>
      </div>
    );
  }

  const allLabels = Object.keys(LABEL_COLOR) as (keyof typeof LABEL_COLOR)[];
  const presentLabels = allLabels.filter((l) =>
    nodes.some((n) => n.labels.includes(l)),
  );

  /* -- Graph view --------------------------------------------------- */
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="px-5 py-4 border-b shrink-0"
        style={{ borderColor: "var(--ctx-rule-soft)" }}
      >
        <div className="flex items-center gap-2 mb-2">
          <GraphIcon
            className="w-[14px] h-[14px]"
            style={{ color: "var(--ctx-ink-mute)" }}
          />
          <p
            className="font-mono text-[10px] uppercase tracking-[0.14em] m-0"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            Provenance
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span
            className="font-mono text-[10px] tracking-[0.06em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {nodes.length} node{nodes.length !== 1 ? "s" : ""}
          </span>
          <span
            className="font-mono text-[10px] tracking-[0.06em]"
            style={{ color: "var(--ctx-ink-mute)" }}
          >
            {edges.length} edge{edges.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div
        className="px-5 py-2.5 border-b shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1"
        style={{ borderColor: "var(--ctx-rule-soft)" }}
      >
        {presentLabels.map((label) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{ background: LABEL_COLOR[label] }}
            />
            <span
              className="font-mono text-[10px] uppercase tracking-[0.06em]"
              style={{ color: "var(--ctx-ink-soft)" }}
            >
              {label}
            </span>
          </span>
        ))}
      </div>

      {/* Canvas graph area */}
      <div className="flex-1 min-h-0 relative" style={{ background: "var(--ctx-paper)" }}>
        <SigmaContainer
          graph={graph}
          style={{ width: "100%", height: "100%" }}
          settings={{
            renderLabels: true,
            labelSize: 10,
            labelColor: { color: "var(--ctx-ink-soft)" },
            defaultEdgeColor: EDGE_COLOR,
            defaultNodeColor: DEFAULT_COLOR,
            labelRenderedSizeThreshold: 4,
          }}
        >
          <GraphEvents onNodeSelect={handleNodeClick} />
        </SigmaContainer>
      </div>

      {/* Node detail drawer */}
      {detailNode && (
        <NodeDetailDrawer
          node={detailNode}
          connectedEdges={detailEdges}
          onClose={handleDetailClose}
          onNavigate={handleDetailNavigate}
        />
      )}
    </div>
  );
}
