"use client";

/**
 * Import / export panel for the PorchFest planner (Feature 2 surface).
 *
 * Presentation only: file-kind detection, the CSV preview plan, the commit
 * step, and both exporters live in the headless core (planner-import.ts,
 * kml-event-layer-rules.ts, civic-export.ts) so the validators prove them
 * without a browser. This file owns the state machine between them: idle
 * (drop hint, file picker, export buttons, last-result line), preview
 * (counts and per-collision choice, nothing written yet), and committing.
 *
 * Files arrive two ways and funnel through one beginImport path: the file
 * input here, or a drop anywhere on the planner map (the client stashes
 * {name, text} and passes it down as `droppedFile`; the panel consumes it
 * exactly once via onConsumeDroppedFile, so a parent re-render can never
 * replay the same file into a second preview).
 *
 * Store split, kept deliberately: CSV submissions commit to the Yjs civic
 * store (civicApi), geometry features commit as GraphQL placements through
 * onCreateEventFeature. The two paths never cross.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import {
  buildCsvImportPlan,
  commitCsvImportPlan,
  detectImportKind,
  parseGeoJsonEventFeatures,
  type CivicStoreWriter,
  type CollisionResolution,
  type CsvImportCollision,
  type CsvImportPlan,
  type ExistingCivicRow,
} from "@/lib/civic/planner-import";
import {
  collectKmlPlacemarks,
  type KmlEventFeature,
} from "@/lib/civic/kml-event-layer-rules";
import {
  civicRowsToCsv,
  downloadTextFile,
  placedCivicRowsToGeoJson,
} from "@/lib/civic/civic-export";

export interface PlannerImportPanelProps {
  civicRows: ExistingCivicRow[];
  civicApi: CivicStoreWriter | null;
  onCreateEventFeature: (feature: KmlEventFeature) => Promise<boolean>;
  droppedFile: { name: string; text: string } | null;
  onConsumeDroppedFile: () => void;
  onToast: (message: string) => void;
  embedded?: boolean;
}

type PanelState =
  | { readonly phase: "idle" }
  | {
      readonly phase: "csv-preview";
      readonly fileName: string;
      readonly plan: CsvImportPlan;
    }
  | {
      readonly phase: "geometry-preview";
      readonly fileName: string;
      readonly features: readonly KmlEventFeature[];
    }
  | { readonly phase: "committing"; readonly fileName: string };

/**
 * React list key for a collision row. Resolution state is keyed by
 * existingRowId (the commit contract), but one stored row can match several
 * file rows, so the list key needs the candidate row number too.
 */
function collisionKey(collision: CsvImportCollision): string {
  return `${collision.existingRowId}:${collision.candidate.rowNumber}`;
}

/** Geometry preview rollup: feature count per category + geometry type. */
function geometryBreakdown(features: readonly KmlEventFeature[]): Array<{
  category: string;
  geometryType: string;
  count: number;
}> {
  const counts = new Map<
    string,
    { category: string; geometryType: string; count: number }
  >();
  for (const feature of features) {
    const key = `${feature.category}|${feature.geometry.type}`;
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, {
        category: feature.category,
        geometryType: feature.geometry.type,
        count: 1,
      });
    }
  }
  return [...counts.values()].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      a.geometryType.localeCompare(b.geometryType),
  );
}

export function PlannerImportPanel({
  civicRows,
  civicApi,
  onCreateEventFeature,
  droppedFile,
  onConsumeDroppedFile,
  onToast,
  embedded = false,
}: PlannerImportPanelProps) {
  const [state, setState] = useState<PanelState>({ phase: "idle" });
  // Per-collision choice, keyed by existingRowId to match the commit
  // contract. Absent entries commit as skip, so an untouched preview can
  // never overwrite an existing row.
  const [resolutions, setResolutions] = useState<
    ReadonlyMap<string, CollisionResolution>
  >(() => new Map());
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const beginImport = useCallback(
    (fileName: string, text: string) => {
      const kind = detectImportKind(fileName, text);
      if (!kind) {
        onToast(`${fileName}: not a recognizable CSV, KML, or GeoJSON file.`);
        return;
      }
      if (kind === "csv") {
        const plan = buildCsvImportPlan(text, civicRows);
        if (plan.recordCount === 0) {
          onToast(`${fileName}: no records found.`);
          return;
        }
        setResolutions(new Map());
        setState({ phase: "csv-preview", fileName, plan });
        return;
      }
      // collectKmlPlacemarks throws on a parsererror document, so a corrupt
      // file surfaces as its own toast instead of "no importable features".
      let features;
      try {
        features =
          kind === "kml"
            ? collectKmlPlacemarks(
                new DOMParser().parseFromString(text, "text/xml"),
              )
            : parseGeoJsonEventFeatures(text);
      } catch (error) {
        onToast(
          `${fileName}: ${error instanceof Error ? error.message : "could not parse the file."}`,
        );
        return;
      }
      if (features.length === 0) {
        onToast(`${fileName}: no importable features found.`);
        return;
      }
      setState({ phase: "geometry-preview", fileName, features });
    },
    [civicRows, onToast],
  );

  // Map-drop arrivals. Consume before previewing: the parent slot clears
  // first, so this effect re-running (civicRows changes rebuild beginImport)
  // exits on the null guard instead of replaying the file.
  useEffect(() => {
    if (!droppedFile) return;
    onConsumeDroppedFile();
    beginImport(droppedFile.name, droppedFile.text);
  }, [droppedFile, onConsumeDroppedFile, beginImport]);

  const handleFileChosen = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      // Reset so choosing the same file again still fires a change event.
      event.target.value = "";
      if (!file) return;
      void file.text().then(
        (text) => beginImport(file.name, text),
        () => onToast(`${file.name}: could not read the file.`),
      );
    },
    [beginImport, onToast],
  );

  const setResolution = useCallback(
    (existingRowId: string, resolution: CollisionResolution) => {
      setResolutions((current) => {
        const next = new Map(current);
        next.set(existingRowId, resolution);
        return next;
      });
    },
    [],
  );

  const cancelPreview = useCallback(() => {
    setResolutions(new Map());
    setState({ phase: "idle" });
  }, []);

  const confirmCsv = useCallback(() => {
    if (state.phase !== "csv-preview") return;
    if (!civicApi) {
      onToast("Civic store is still loading; try again in a moment.");
      return;
    }
    const { plan, fileName } = state;
    // CRDT writes are synchronous; the committing phase exists for parity
    // with the async geometry path and paints only if React yields.
    setState({ phase: "committing", fileName });
    const outcome = commitCsvImportPlan(civicApi, plan, resolutions);
    setResult(
      `${fileName}: ${outcome.inserted} added, ${outcome.updated} updated, ${outcome.skipped} skipped.`,
    );
    setState({ phase: "idle" });
  }, [state, civicApi, resolutions, onToast]);

  const confirmGeometry = useCallback(async () => {
    if (state.phase !== "geometry-preview") return;
    const { features, fileName } = state;
    setState({ phase: "committing", fileName });
    // Sequential on purpose: each feature is a createPlacement mutation and
    // the client refetches per success, so a parallel burst would gain
    // nothing and make the success count ambiguous mid-flight.
    let created = 0;
    for (const feature of features) {
      const ok = await onCreateEventFeature(feature);
      if (ok) created += 1;
    }
    if (created < features.length) {
      onToast(
        `${features.length - created} of ${features.length} features failed to import.`,
      );
    }
    setResult(
      `${fileName}: ${created} of ${features.length} features added to the map.`,
    );
    setState({ phase: "idle" });
  }, [state, onCreateEventFeature, onToast]);

  const exportCsv = useCallback(() => {
    downloadTextFile(
      "porchfest-civic-objects.csv",
      civicRowsToCsv(civicRows),
      "text/csv",
    );
  }, [civicRows]);

  const exportGeoJson = useCallback(() => {
    downloadTextFile(
      "porchfest-placed.geojson",
      JSON.stringify(placedCivicRowsToGeoJson(civicRows), null, 2),
      "application/geo+json",
    );
  }, [civicRows]);

  // Fallback-categorized geometry features carry a review note from the
  // shared rules; surface the count so the default never passes silently.
  const reviewCount =
    state.phase === "geometry-preview"
      ? state.features.filter((feature) => feature.note != null).length
      : 0;

  return (
    <section
      className={
        embedded ? "pointer-events-auto" : "planner-panel pointer-events-auto p-4"
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="planner-kicker">Import / Export</p>
        {state.phase !== "idle" ? (
          <span className="planner-muted truncate text-[11px]">
            {state.fileName}
          </span>
        ) : null}
      </div>

      {state.phase === "idle" ? (
        <>
          <p className="planner-ink-soft mt-2 text-[12px] leading-4">
            Drop a CSV, KML, or GeoJSON file anywhere on the map, or pick one
            here. Nothing is written until you confirm a preview.
          </p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="planner-control mt-2 min-h-[28px] w-full px-2 py-1.5 text-[12px]"
          >
            Choose file
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.kml,.geojson,.json"
            className="hidden"
            onChange={handleFileChosen}
            aria-label="Choose a file to import"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={exportCsv}
              className="planner-tile planner-ink flex-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportGeoJson}
              className="planner-tile planner-ink flex-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
            >
              Export GeoJSON
            </button>
          </div>
          {result ? (
            <p className="planner-ink-soft mt-2 text-[11px] leading-4" role="status">
              {result}
            </p>
          ) : null}
        </>
      ) : null}

      {state.phase === "csv-preview" ? (
        <div className="mt-2">
          <p className="planner-ink text-[13px] leading-5">
            {state.plan.recordCount} records ·{" "}
            {state.plan.newCandidates.length} new ·{" "}
            {state.plan.collisions.length}{" "}
            {state.plan.collisions.length === 1 ? "collision" : "collisions"}
          </p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {Object.entries(state.plan.perCategory)
              .filter(([, count]) => count > 0)
              .map(([category, count]) => (
                <li
                  key={category}
                  className="flex items-center justify-between text-[12px]"
                >
                  <span className="planner-ink-soft text-[10px] uppercase tracking-wide">
                    {category}
                  </span>
                  <span className="planner-ink tabular-nums">{count}</span>
                </li>
              ))}
          </ul>
          {state.plan.issueCount > 0 ? (
            <p className="planner-note mt-2 px-2 py-1 leading-4">
              {state.plan.issueCount}{" "}
              {state.plan.issueCount === 1 ? "record is" : "records are"}{" "}
              missing required intake fields. They import anyway, flagged for
              organizer review in the workspace.
            </p>
          ) : null}
          {state.plan.collisions.length > 0 ? (
            <div className="mt-2">
              <p className="planner-kicker">Collisions</p>
              <ul className="mt-1 flex max-h-44 flex-col gap-1 overflow-y-auto">
                {state.plan.collisions.map((collision) => {
                  const inFileDuplicate =
                    collision.existingRowId.startsWith("pending:");
                  const choice =
                    resolutions.get(collision.existingRowId) ?? "skip";
                  return (
                    <li
                      key={collisionKey(collision)}
                      className="planner-tile px-2 py-1.5"
                    >
                      <p className="planner-ink truncate text-[12px]">
                        {collision.candidate.civicObject.email ||
                          `Row ${collision.candidate.rowNumber}`}
                      </p>
                      <p className="planner-muted truncate text-[11px]">
                        matches {collision.existingTitle}
                      </p>
                      {inFileDuplicate ? (
                        <p className="planner-faint mt-1 text-[10px] uppercase tracking-wide">
                          Skipped: duplicate inside this file
                        </p>
                      ) : (
                        <div className="mt-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setResolution(collision.existingRowId, "skip")
                            }
                            aria-pressed={choice === "skip"}
                            className={`planner-control min-h-[24px] flex-1 px-2 py-0.5 text-[11px] ${
                              choice === "skip" ? "is-active" : ""
                            }`}
                          >
                            Skip
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setResolution(collision.existingRowId, "update")
                            }
                            aria-pressed={choice === "update"}
                            className={`planner-control min-h-[24px] flex-1 px-2 py-0.5 text-[11px] ${
                              choice === "update" ? "is-active" : ""
                            }`}
                          >
                            Update
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmCsv}
              disabled={!civicApi}
              className="planner-button flex-1 px-3 py-1.5 text-[13px] disabled:cursor-not-allowed"
            >
              Confirm import
            </button>
            <button
              type="button"
              onClick={cancelPreview}
              className="planner-control flex-1 px-3 py-1.5 text-[13px]"
            >
              Cancel
            </button>
          </div>
          {!civicApi ? (
            <p className="planner-faint mt-1 text-[11px]">
              Waiting for the civic store to load.
            </p>
          ) : null}
        </div>
      ) : null}

      {state.phase === "geometry-preview" ? (
        <div className="mt-2">
          <p className="planner-ink text-[13px] leading-5">
            {state.features.length}{" "}
            {state.features.length === 1 ? "feature" : "features"} detected
          </p>
          <ul className="mt-1 flex max-h-44 flex-col gap-0.5 overflow-y-auto">
            {geometryBreakdown(state.features).map((entry) => (
              <li
                key={`${entry.category}-${entry.geometryType}`}
                className="flex items-center justify-between gap-2 text-[12px]"
              >
                <span className="planner-ink-soft truncate">
                  <span className="text-[10px] uppercase tracking-wide">
                    {entry.category}
                  </span>
                  <span className="planner-faint"> · {entry.geometryType}</span>
                </span>
                <span className="planner-ink tabular-nums">{entry.count}</span>
              </li>
            ))}
          </ul>
          {reviewCount > 0 ? (
            <p className="planner-note mt-2 px-2 py-1 leading-4">
              {reviewCount}{" "}
              {reviewCount === 1 ? "feature" : "features"} matched no folder or
              label rule and defaulted to vendor; review the category after
              import.
            </p>
          ) : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void confirmGeometry()}
              className="planner-button flex-1 px-3 py-1.5 text-[13px]"
            >
              Confirm import
            </button>
            <button
              type="button"
              onClick={cancelPreview}
              className="planner-control flex-1 px-3 py-1.5 text-[13px]"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {state.phase === "committing" ? (
        <p className="planner-ink-soft mt-2 text-[12px]" role="status">
          Importing {state.fileName}...
        </p>
      ) : null}
    </section>
  );
}
