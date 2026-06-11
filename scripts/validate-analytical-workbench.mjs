import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const {
  getAnalyticalCards,
  getAnalyticalCardsForScope,
} = await import("../src/lib/atlas/analytical-workbench.ts");

const requiredIds = [
  "memory-events-by-decade",
  "memory-building-presence-intervals",
  "safety-traffic-observations",
  "safety-corridor-records",
  "safety-injury-severity",
  "sources-freshness-histogram",
  "sources-trust-tiers",
  "sources-coverage-summary",
  "interventions-project-timeline",
  "interventions-status-distribution",
  "interventions-funding-status",
  "interventions-event-surface-categories",
];

const cards = getAnalyticalCards();
const ids = new Set(cards.map((card) => card.id));

for (const id of requiredIds) {
  assert(ids.has(id), `missing analytical card ${id}`);
}

for (const card of cards) {
  assert(card.rendererBoundaryId === "analytics", `${card.id} targets analytics`);
  assert(card.mobileStrategy === "compact", `${card.id} has compact mobile strategy`);
  assert(card.scope.modes.length > 0, `${card.id} declares mode scope`);
  assert(card.encoding.fields.length > 0, `${card.id} declares read fields`);
  assert(
    card.selections.reads.every((selection) => selection.endsWith("Filter") || selection.endsWith("Facet")),
    `${card.id} declares known read selections`,
  );
  assert(
    card.selections.writes.every((selection) => selection.endsWith("Filter") || selection.endsWith("Facet")),
    `${card.id} declares known write selections`,
  );
  if (card.layer.kind === "layerView") {
    assert(card.scope.requiresLayerPresent, `${card.id} hides when layer is absent`);
  }
}

const safetyCards = getAnalyticalCardsForScope({
  activeMode: "safety",
  availableLayerIds: ["layer:traffic:flint-downtown"],
});
assert(
  safetyCards.some((card) => card.id === "safety-traffic-observations"),
  "safety mode surfaces traffic cards when the traffic layer is present",
);
assert(
  !safetyCards.some((card) => card.id.startsWith("memory-")),
  "safety mode hides memory cards",
);

const memoryCardsWithoutPlace = getAnalyticalCardsForScope({
  activeMode: "memory",
  availableLayerIds: ["layer:reconstruction:flint:historical"],
});
assert(
  memoryCardsWithoutPlace.some((card) => card.id === "memory-events-by-decade"),
  "memory mode surfaces the timeline card",
);
assert(
  !memoryCardsWithoutPlace.some((card) => card.id === "memory-building-presence-intervals"),
  "place-scoped memory card hides without a selected place",
);

const memoryCardsWithPlace = getAnalyticalCardsForScope({
  activeMode: "memory",
  selectedPlaceId: "place:carriage-town",
  availableLayerIds: ["layer:reconstruction:flint:historical"],
});
assert(
  memoryCardsWithPlace.some((card) => card.id === "memory-building-presence-intervals"),
  "place-scoped memory card appears with a selected place",
);

assertFileContains(
  "src/lib/atlas/atlas-data.ts",
  "loadLayerViewIntoAtlasTables",
  "generalized LayerView DuckDB loader exists",
);
assertFileContains(
  "src/components/atlas/CardRenderer.tsx",
  "vg.intervalX",
  "card renderer writes the shared time filter",
);
assertFileContains(
  "src/components/atlas/AnalyticalWorkbenchPanel.tsx",
  "getAnalyticalCardsForScope",
  "panel scopes cards through the registry",
);

console.log(`Validated analytical workbench registry: ${cards.length} cards.`);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFileContains(relativePath, needle, message) {
  const content = fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
  assert(content.includes(needle), message);
}
