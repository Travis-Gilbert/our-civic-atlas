/**
 * Porchfest planner phase 4 — task node types.
 *
 * NOTE: this module was reconstructed from the API surface that
 * `PlannerTaskLayer.tsx` consumes. The original implementation was
 * untracked working-tree WIP and was accidentally deleted during a
 * branch-switch operation; this file restores the contract that the
 * downstream icon-layer expects so the build can proceed. Phase 4's
 * full data-fetching, state, and mutation logic still needs to be
 * re-derived from the design docs in `docs/plans/porchfest-planner-
 * phase-3-hitl.md` (closest available source) and from the
 * `event-planner*.graphql` queries when the planner work resumes.
 */

/**
 * Task urgency band. Drives the priority dot fill on the planner
 * task icon (`PRIORITY_FILL` map in PlannerTaskLayer.tsx):
 *  - 0 → muted sand `#b3ad9e`  (no priority set)
 *  - 1 → gold       `#d8b05d`  (low)
 *  - 2 → amber      `#df8457`  (medium)
 *  - 3 → terracotta `#c14a2c`  (high)
 */
export type PlannerTaskPriority = 0 | 1 | 2 | 3;

/**
 * Where this task is anchored in the world. `placement` means the
 * task hangs off a `PlannerPlacement` (an instance of a `PlannerEvent`
 * at a specific spot); other values fall back to the task's own
 * geometry. Used by `buildLayerData` to decide whether to fan out
 * tasks sharing a placement with progressive pixel offsets.
 */
export type PlannerTaskGeoAnchorKind =
  | "placement"
  | "freeform"
  | "unanchored";

/**
 * Lifecycle status. Just a string passed through the icon cache key
 * in PlannerTaskLayer.tsx, so any short identifier is accepted. The
 * planner UI elsewhere likely maps these to badges / filters.
 */
export type PlannerTaskStatus =
  | "todo"
  | "in_progress"
  | "blocked"
  | "done"
  | "deferred";

/**
 * Single task node rendered on the planner deck.gl overlay. Field
 * inventory is derived from PlannerTaskLayer.tsx (the only
 * importer). When phase 4's full implementation is restored, this
 * type can grow additional fields without breaking the existing
 * icon-layer consumer.
 */
export interface PlannerTaskNode {
  /** Stable identifier; used as the planner-side React key and the
   *  outer `iconCache` cache key prefix. */
  readonly id: string;
  /** Display title rendered inside the SVG icon (truncated to
   *  10 chars on the compact variant, 24 chars on detail). */
  readonly title: string;
  /** Optional display name of the task's owner. First character is
   *  rendered as the owner-circle initial. Null when unassigned. */
  readonly ownerDisplay: string | null;
  /** Priority band; drives the priority-dot color. */
  readonly priority: PlannerTaskPriority;
  /** Lifecycle status; pass-through used in the icon cache key so
   *  status changes invalidate the cached SVG. */
  readonly status: PlannerTaskStatus;
  /** Completion percentage in [0, 1]. Clamped before use; drives the
   *  progress bar fill width inside the SVG icon. */
  readonly completionPct: number;
  /** IDs of child tasks. Used to decide whether the detail icon
   *  shows a `▾` chevron (indicating expandable children). */
  readonly childIds: readonly string[];
  /** How this task is anchored in space — drives placement-stacking
   *  in `buildLayerData`. */
  readonly geoAnchorKind: PlannerTaskGeoAnchorKind;
  /** When `geoAnchorKind === "placement"`, the id of the placement
   *  this task hangs off. Used to pixel-offset stacked tasks. */
  readonly effectivePlacementId: string | null;
  /** Resolved spatial geometry. The icon layer reads
   *  `effectiveGeometry.coordinates` as [lng, lat]. When null the
   *  task is unanchored and gets `[0, 0]` (off-canvas). */
  readonly effectiveGeometry: {
    readonly type: "Point";
    readonly coordinates: readonly [number, number];
  } | null;
}
