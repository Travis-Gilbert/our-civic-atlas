"use client";

/**
 * AtelierConflictMarkers - PT-402
 *
 * Renders terracotta conflict markers in 3D space at the geometry
 * coordinate of each `MergeConflict.targetNodeId`. Spec lines 128-146.
 *
 * Per spec line 130: "small terracotta marker on the building part
 * where the disagreement occurred." Per spec line 144: "The
 * terracotta markers stay visible as long as the atelier is open."
 *
 * Stage gating: per spec lines 128-146 + `animation-choreography.md`
 * Stage 5, markers appear DURING the merge_conflicts stage and stay
 * visible. Before that stage they're hidden. If the choreographer is
 * skipped, markers are visible immediately.
 *
 * Per spec line 146: when there are no conflicts (a fully consistent
 * set of evidence), no markers appear and the merge stage is a silent
 * half-second. The Whaley House fixture today has zero conflicts so
 * this component renders nothing; when the backend ships real merge
 * conflicts via `conflictsForReconstruction` (PT-104), markers light up.
 *
 * NodeId to part position (rough mapping per LostFlintGeometries body
 * box conventions):
 *   - :mass  -> centroid of body (mid-x, mid-y_height, mid-z_depth)
 *   - :facade -> front face midpoint (mid-x, mid-y_height, +z_depth/2)
 *   - :roof -> top of building (mid-x, +y_top, mid-z_depth)
 *   - :ground_floor -> front-bottom (mid-x, base, +z_depth/2)
 *   - :opening_grid -> front face mid (same as :facade)
 *   - :level / :site / :building -> centroid
 */

import { useMemo } from "react";
import { Html } from "@react-three/drei";

import type {
  AtelierDossier,
} from "@/lib/atlas/use-reconstruction-dossier";
import type { ChoreographerState } from "@/lib/atlas/atelier-choreographer";

type MergeConflict = AtelierDossier["conflicts"][number];

type AtelierConflictMarkersProps = {
  conflicts: readonly MergeConflict[];
  /** Building footprint in real-world meters. Markers position relative
   * to the building's local coordinate frame. */
  widthMeters: number;
  depthMeters: number;
  heightMeters: number;
  choreographyState?: ChoreographerState;
};

type MarkerPosition = [number, number, number];

function resolveMarkerPosition(
  targetNodeId: string,
  width: number,
  depth: number,
  height: number,
): MarkerPosition {
  // Strip the reconstruction-node-tree namespace prefix and trailing
  // part token to get the part kind. Format:
  //   reconstruction-node:<reconstructionId>:<part>
  const lastColon = targetNodeId.lastIndexOf(":");
  const partKind =
    lastColon >= 0 ? targetNodeId.slice(lastColon + 1) : targetNodeId;

  const halfH = height * 0.5;
  const halfD = depth * 0.5;

  switch (partKind) {
    case "facade":
    case "opening_grid":
      return [0, halfH, halfD];
    case "roof":
      return [0, height * 0.85, 0];
    case "ground_floor":
      return [0, height * 0.1, halfD];
    case "mass":
    case "level:0":
    case "building":
    case "site":
    default:
      return [0, halfH, 0];
  }
}

function markersVisible(state: ChoreographerState | undefined): boolean {
  if (!state) return true;
  if (state.skipped) return true;
  return (
    state.stage === "merge_conflicts" ||
    state.stage === "asset_generation" ||
    state.stage === "settled"
  );
}

export function AtelierConflictMarkers({
  conflicts,
  widthMeters,
  depthMeters,
  heightMeters,
  choreographyState,
}: AtelierConflictMarkersProps) {
  const visible = markersVisible(choreographyState);
  const positionedMarkers = useMemo(() => {
    return conflicts.map((conflict) => ({
      conflict,
      position: resolveMarkerPosition(
        conflict.targetNodeId,
        widthMeters,
        depthMeters,
        heightMeters,
      ),
    }));
  }, [conflicts, widthMeters, depthMeters, heightMeters]);

  if (!visible || positionedMarkers.length === 0) return null;

  return (
    <group>
      {positionedMarkers.map(({ conflict, position }) => (
        <group key={conflict.id} position={position}>
          <Html center distanceFactor={heightMeters * 1.5}>
            <button
              type="button"
              className="atelier-conflict-marker"
              title={`${conflict.fieldLabel}: ${conflict.resolvedValue} (${conflict.disagreements.length} disagreeing source${conflict.disagreements.length === 1 ? "" : "s"})`}
              aria-label={`Conflict: ${conflict.fieldLabel}`}
              onClick={(event) => {
                event.stopPropagation();
              }}
            />
          </Html>
        </group>
      ))}
    </group>
  );
}
