/**
 * Printable day-of layout for the porchfest.
 *
 * Server-rendered HTML; opens in a new tab with @media print CSS so
 * the browser's native Save-As-PDF produces a clean multi-page
 * artifact. No Puppeteer, no canvas-to-PNG — just SVG dots
 * positioned via a Web Mercator projection over the carriage town
 * bounding box.
 *
 * Pages (page-break-before forces each):
 *   1. Overview map with all placements color-coded by category +
 *      legend
 *   2. Per-category placement lists (vendors first, then music,
 *      then amenities)
 *   3. Task list grouped by owner
 *
 * Phase 4 (out of scope today) can add a per-block close-up page
 * and assign-per-volunteer tear-offs.
 */

import { getTheseusClient } from "@/lib/api/graphql/client";
import {
  EventLayersDocument,
  EventPlacementsDocument,
  EventTasksListDocument,
  type EventLayersQuery,
  type EventPlacementsQuery,
  type EventTasksListQuery,
} from "@/lib/api/graphql/generated/graphql";

type Placement = EventPlacementsQuery["placements"][number];
type EventTask = EventTasksListQuery["eventTasks"][number];

const TENANT_SLUG = "flint";

// Carriage Town bounding box used both for the SVG aspect ratio and
// for the lat/lng -> px projection. The numbers come from the
// PlannerClient default bounds; keeping them in sync means the print
// view shows the same patch of the world as the on-screen planner.
const BOUNDS = {
  west: -83.7125,
  east: -83.6925,
  south: 43.0145,
  north: 43.0265,
} as const;

const SVG_WIDTH = 720;
const SVG_HEIGHT = 540;

// Same RGB triples as AtlasEventPlannerLayer, rendered as CSS so the
// printed pins read identical to the live map.
const CATEGORY_COLOR: Record<string, string> = {
  vendor: "rgb(99, 56, 142)",
  music: "rgb(217, 162, 59)",
  parking: "rgb(0, 81, 134)",
  restroom: "rgb(56, 132, 95)",
  kid_zone: "rgb(0, 81, 134)",
  food_court: "rgb(50, 110, 158)",
  rest_area: "rgb(50, 110, 158)",
  after_party: "rgb(120, 30, 60)",
  amenity: "rgb(120, 120, 130)",
  pending_placement: "rgb(160, 160, 160)",
};

const CATEGORY_LABEL: Record<string, string> = {
  vendor: "Vendors",
  music: "Music",
  parking: "Parking",
  restroom: "Restrooms",
  kid_zone: "Kid Zone",
  food_court: "Food",
  rest_area: "Rest Area",
  after_party: "After Party",
  amenity: "Other",
};

// Web Mercator projection helpers. Lat/lng in degrees -> normalized
// 0..1 coords (Mercator), then to SVG px within BOUNDS. This is the
// simplest projection that matches MapLibre at city scale.
function mercatorX(lng: number): number {
  return (lng + 180) / 360;
}
function mercatorY(lat: number): number {
  const rad = (lat * Math.PI) / 180;
  return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2;
}
function projectToSvg(lng: number, lat: number): [number, number] {
  const xn = mercatorX(lng);
  const yn = mercatorY(lat);
  const x0 = mercatorX(BOUNDS.west);
  const x1 = mercatorX(BOUNDS.east);
  const y0 = mercatorY(BOUNDS.north);
  const y1 = mercatorY(BOUNDS.south);
  const px = ((xn - x0) / (x1 - x0)) * SVG_WIDTH;
  const py = ((yn - y0) / (y1 - y0)) * SVG_HEIGHT;
  return [px, py];
}

async function fetchPrintData(eventSlug: string) {
  const client = getTheseusClient();
  const [layersResult, placementsResult, tasksResult] = await Promise.all([
    client
      .query<EventLayersQuery>(EventLayersDocument, { tenantSlug: TENANT_SLUG })
      .toPromise(),
    client
      .query<EventPlacementsQuery>(EventPlacementsDocument, {
        tenantSlug: TENANT_SLUG,
        eventSlug,
      })
      .toPromise(),
    client
      .query<EventTasksListQuery>(EventTasksListDocument, {
        tenantSlug: TENANT_SLUG,
        eventSlug,
      })
      .toPromise(),
  ]);

  return {
    layer:
      layersResult.data?.eventLayers.find((l) => l.slug === eventSlug) ?? null,
    placements: placementsResult.data?.placements ?? [],
    tasks: tasksResult.data?.eventTasks ?? [],
  };
}

export default async function PrintEventPage({
  params,
}: {
  params: Promise<{ event: string }> | { event: string };
}) {
  const resolved =
    "then" in (params as object)
      ? await (params as Promise<{ event: string }>)
      : (params as { event: string });
  const eventSlug = resolved.event;
  const { layer, placements, tasks } = await fetchPrintData(eventSlug);

  const placementsByCategory = new Map<string, Placement[]>();
  for (const placement of placements) {
    const bucket = placementsByCategory.get(placement.category) ?? [];
    bucket.push(placement);
    placementsByCategory.set(placement.category, bucket);
  }
  const sortedCategories = [...placementsByCategory.keys()].sort();

  const tasksByOwner = new Map<string, EventTask[]>();
  for (const task of tasks) {
    const owner = task.ownerDisplay || "Unassigned";
    const bucket = tasksByOwner.get(owner) ?? [];
    bucket.push(task);
    tasksByOwner.set(owner, bucket);
  }
  const sortedOwners = [...tasksByOwner.keys()].sort();

  return (
    <>
      {/*
        The print CSS lives inline so the route stays a single file
        and doesn't fight the global atlas.css. Screen-mode preview
        still works; print mode strips the page background and tells
        the browser to break between sections.
      */}
      <style>{`
        body { background: white; color: #111; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
        .print-page { padding: 32px; max-width: 8.5in; margin: 0 auto; }
        .print-section { page-break-before: always; }
        .print-section:first-of-type { page-break-before: avoid; }
        h1, h2, h3 { margin: 0 0 12px; color: #222; }
        h1 { font-size: 28px; }
        h2 { font-size: 20px; }
        h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; }
        .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; font-size: 12px; }
        .legend-swatch { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
        .placement-list { columns: 2; column-gap: 24px; font-size: 12px; line-height: 1.5; }
        .placement-list li { break-inside: avoid; }
        .task-block { margin-bottom: 18px; break-inside: avoid; }
        .task-block ul { padding-left: 18px; font-size: 12px; line-height: 1.5; }
        @media print {
          body { background: white; }
          .no-print { display: none; }
        }
      `}</style>

      <div className="print-page">
        <section className="print-section">
          <p className="no-print" style={{ fontSize: "12px", color: "#666" }}>
            <em>Tip: use your browser&apos;s Print → Save as PDF to export.</em>
          </p>
          <h1>{layer?.title ?? eventSlug}</h1>
          {layer?.startsAt ? (
            <p style={{ fontSize: "14px", color: "#555" }}>
              {new Date(layer.startsAt).toLocaleString()}
              {layer.endsAt
                ? ` – ${new Date(layer.endsAt).toLocaleString()}`
                : ""}
            </p>
          ) : null}

          <h2 style={{ marginTop: "20px" }}>Overview map</h2>
          <svg
            width={SVG_WIDTH}
            height={SVG_HEIGHT}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            style={{
              background: "#f4ecdc",
              border: "1px solid #c8b990",
              borderRadius: "6px",
            }}
            aria-label="Placement map"
          >
            <rect
              width={SVG_WIDTH}
              height={SVG_HEIGHT}
              fill="#f4ecdc"
            />
            {placements
              .filter((p) => {
                const geom = p.geometry as {
                  type?: string;
                  coordinates?: number[];
                } | null;
                return (
                  geom?.type === "Point" &&
                  Array.isArray(geom?.coordinates) &&
                  geom.coordinates.length >= 2
                );
              })
              .map((p) => {
                const geom = p.geometry as {
                  coordinates: number[];
                };
                const [lng, lat] = geom.coordinates;
                const [x, y] = projectToSvg(lng, lat);
                const color =
                  CATEGORY_COLOR[
                    p.status === "pending_placement"
                      ? "pending_placement"
                      : p.category
                  ] ?? CATEGORY_COLOR.amenity;
                return (
                  <g key={p.id}>
                    <circle
                      cx={x}
                      cy={y}
                      r={5}
                      fill={color}
                      stroke="#3a2814"
                      strokeWidth={0.5}
                    />
                    {p.category === "music" ? (
                      <text
                        x={x + 6}
                        y={y + 3}
                        fontSize={9}
                        fill="#3a2814"
                        style={{ pointerEvents: "none" }}
                      >
                        {p.label}
                      </text>
                    ) : null}
                  </g>
                );
              })}
          </svg>
          <div className="legend">
            {sortedCategories.map((cat) => (
              <span key={cat}>
                <span
                  className="legend-swatch"
                  style={{ background: CATEGORY_COLOR[cat] ?? "#aaa" }}
                />
                {CATEGORY_LABEL[cat] ?? cat}{" "}
                <span style={{ color: "#777" }}>
                  ({placementsByCategory.get(cat)?.length ?? 0})
                </span>
              </span>
            ))}
          </div>
        </section>

        <section className="print-section">
          <h2>Placements by category</h2>
          {sortedCategories.map((cat) => {
            const items = placementsByCategory.get(cat) ?? [];
            return (
              <div key={cat} className="task-block">
                <h3>
                  <span
                    className="legend-swatch"
                    style={{ background: CATEGORY_COLOR[cat] ?? "#aaa" }}
                  />
                  {CATEGORY_LABEL[cat] ?? cat} ({items.length})
                </h3>
                <ul className="placement-list">
                  {items
                    .slice()
                    .sort((a, b) => a.label.localeCompare(b.label))
                    .map((p) => (
                      <li key={p.id}>
                        {p.label}
                        {p.sublabel ? (
                          <em style={{ color: "#666" }}> — {p.sublabel}</em>
                        ) : null}
                      </li>
                    ))}
                </ul>
              </div>
            );
          })}
        </section>

        <section className="print-section">
          <h2>Tasks by owner</h2>
          {sortedOwners.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#777" }}>
              No tasks recorded yet.
            </p>
          ) : (
            sortedOwners.map((owner) => {
              const ownerTasks = tasksByOwner.get(owner) ?? [];
              return (
                <div key={owner} className="task-block">
                  <h3>
                    {owner}{" "}
                    <span style={{ color: "#777" }}>({ownerTasks.length})</span>
                  </h3>
                  <ul>
                    {ownerTasks.map((task) => (
                      <li key={task.id}>
                        <strong>{task.title}</strong>
                        {task.dueAt ? (
                          <span style={{ color: "#777" }}>
                            {" "}
                            — due {new Date(task.dueAt).toLocaleDateString()}
                          </span>
                        ) : null}
                        {task.status !== "open" ? (
                          <span style={{ color: "#777" }}> [{task.status}]</span>
                        ) : null}
                        {task.notes ? (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "#555",
                              marginTop: "2px",
                            }}
                          >
                            {task.notes}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </section>
      </div>
    </>
  );
}
