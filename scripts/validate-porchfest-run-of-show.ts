import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import porchfestFixture from '../src/data/open-flint-atlas/fixtures/porchfest-2026.json';
import {
  RUN_OF_SHOW_DURATION_MINUTES,
  RUN_OF_SHOW_PHASES,
  RUN_OF_SHOW_PUBLIC_END_MINUTE,
  RUN_OF_SHOW_PUBLIC_START_MINUTE,
  activeRunOfShowPerformances,
  buildRunOfShowPerformances,
  buildRunOfShowTrips,
  formatRunOfShowClock,
  isTaskActiveAtRunOfShowTime,
  parseRunOfShowTimeWindow,
  runOfShowForecastHourKey,
} from '../src/lib/porchfest/run-of-show';

let failures = 0;

function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`  ok  ${label}`);
    return;
  }
  failures += 1;
  console.error(`FAIL  ${label}`);
  if (detail !== undefined) console.error(`      ${JSON.stringify(detail)}`);
}

type FixturePlacement = {
  readonly category: string;
  readonly sublabel?: string;
  readonly label: string;
  readonly geometry: Record<string, unknown>;
  readonly notes?: string;
};

type Fixture = {
  readonly event_layer: { readonly slug: string };
  readonly placements: readonly FixturePlacement[];
};

const fixture = porchfestFixture as Fixture;
const placements = fixture.placements.map((placement, index) => ({
  id: `${fixture.event_layer.slug}-${index}`,
  category: placement.category,
  label: placement.label,
  sublabel: placement.sublabel ?? null,
  notes: placement.notes ?? null,
  geometry: placement.geometry,
}));

const explicitRows = [
  {
    rowId: 'row-one',
    title: 'North Porch Trio',
    fields: {
      sourceId: 'porchfest-2026-12',
      category: 'musician',
      artistName: 'North Porch Trio',
      setTime: '5:00-5:45',
    },
  },
  {
    rowId: 'row-two',
    title: 'Queen Street Brass',
    fields: {
      sourceId: 'porchfest-2026-15',
      category: 'musician',
      artistName: 'Queen Street Brass',
      setTime: '6:00 PM - 6:45 PM',
    },
  },
];

const parsed = parseRunOfShowTimeWindow('5:30-6:15');
check('uses 9 AM to 11 PM run-of-show coverage', RUN_OF_SHOW_DURATION_MINUTES === 14 * 60);
check(
  'keeps 5 PM to 10 PM as the public festival core',
  RUN_OF_SHOW_PUBLIC_START_MINUTE === 8 * 60 && RUN_OF_SHOW_PUBLIC_END_MINUTE === 13 * 60,
);
check(
  'phase labels disambiguate AM and PM across the long day',
  RUN_OF_SHOW_PHASES[0]?.label === '9 AM' &&
    RUN_OF_SHOW_PHASES.at(-1)?.label === '11 PM' &&
    RUN_OF_SHOW_PHASES.some((phase) => phase.label === '5 PM'),
  RUN_OF_SHOW_PHASES.map((phase) => phase.label),
);
check('parses festival wall-clock windows', parsed?.startMinute === 510 && parsed.endMinute === 555, parsed);
check('formats the run-of-show day start', formatRunOfShowClock(0, { meridiem: true }) === '9:00 AM');
check('formats evening act labels with meridiem', formatRunOfShowClock(480, { meridiem: true }) === '5:00 PM');
check(
  'builds event-day Open-Meteo local hour keys',
  runOfShowForecastHourKey(480) === '2026-07-17T17:00',
  runOfShowForecastHourKey(480),
);

const explicit = buildRunOfShowPerformances({ placements, civicRows: explicitRows });
check('explicit set times create performances', explicit.length === 2, explicit);
check(
  '5:00 active set comes from explicit row',
  activeRunOfShowPerformances(explicit, 480).map((p) => p.actName).join(',') === 'North Porch Trio',
);
check(
  '6:00 active set changes from the same clock',
  activeRunOfShowPerformances(explicit, 540).map((p) => p.actName).join(',') === 'Queen Street Brass',
);

const draft = buildRunOfShowPerformances({ placements, civicRows: [] });
const activeFive = activeRunOfShowPerformances(draft, 480).map((p) => p.placementId).sort();
const activeSix = activeRunOfShowPerformances(draft, 540).map((p) => p.placementId).sort();
const activeSeven = activeRunOfShowPerformances(draft, 600).map((p) => p.placementId).sort();
check('fixture fallback produces draft stage performances', draft.some((p) => p.source === 'draft_stage'));
check(
  'draft fallback fills the 5 PM to 10 PM festival core',
  draft.every(
    (performance) =>
      performance.startMinute >= RUN_OF_SHOW_PUBLIC_START_MINUTE &&
      performance.endMinute <= RUN_OF_SHOW_PUBLIC_END_MINUTE,
  ),
  draft,
);
check(
  'draft 5/6/7 PM active sets differ',
  activeFive.join('|') !== activeSix.join('|') && activeSix.join('|') !== activeSeven.join('|'),
  { activeFive, activeSix, activeSeven },
);

const trips = buildRunOfShowTrips(draft);
check('draft schedule produces expected pedestrian trips', trips.length > 0);
check(
  'trips carry path and timestamp arrays for TripsLayer',
  trips.every((trip) => trip.path.length === trip.timestamps.length),
);

check(
  'task due near cursor highlights',
  isTaskActiveAtRunOfShowTime(
    {
      id: 'task-one',
      title: 'Stage setup',
      status: 'To do',
      dueAt: '2026-07-17T17:05:00-04:00',
    },
    485,
  ),
);
check(
  'done task does not highlight',
  !isTaskActiveAtRunOfShowTime(
    {
      id: 'task-two',
      title: 'Closed task',
      status: 'Done',
      dueAt: '2026-07-17T17:05:00-04:00',
    },
    485,
  ),
);

const plannerClientSource = readFileSync(
  join(process.cwd(), 'src/app/porchfest/PorchfestPlannerClient.tsx'),
  'utf8',
);
const weatherSource = readFileSync(
  join(process.cwd(), 'src/lib/porchfest/use-porchfest-weather.ts'),
  'utf8',
);
const weatherPushIndex = plannerClientSource.indexOf(
  'if (weatherVisible) layers.push(...weather.layers);',
);
const meshLayerIndex = plannerClientSource.indexOf(
  '...buildPorchfestAffordanceMeshLayers({',
);
const flowLayerIndex = plannerClientSource.indexOf(
  '...buildPorchfestFlowLayers({',
);
check(
  'forecast weather renders below planner meshes',
  weatherPushIndex > -1 && meshLayerIndex > -1 && weatherPushIndex < meshLayerIndex,
  { weatherPushIndex, meshLayerIndex },
);
check(
  'forecast weather renders below storytelling flows',
  weatherPushIndex > -1 && flowLayerIndex > -1 && weatherPushIndex < flowLayerIndex,
  { weatherPushIndex, flowLayerIndex },
);
check(
  'precipitation raster remains below washout opacity',
  weatherSource.includes('opacity: 0.18'),
);

if (failures > 0) {
  console.error(`\nvalidate-porchfest-run-of-show: ${failures} failure(s)`);
  process.exit(1);
}

console.log('\nvalidate-porchfest-run-of-show: all checks passed');
