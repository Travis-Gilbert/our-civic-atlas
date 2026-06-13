import porchfestFixture from '../src/data/open-flint-atlas/fixtures/porchfest-2026.json';
import {
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
check('parses festival wall-clock windows', parsed?.startMinute === 210 && parsed.endMinute === 255, parsed);
check('formats cursor labels from the festival start', formatRunOfShowClock(180) === '5:00');
check(
  'builds event-day Open-Meteo local hour keys',
  runOfShowForecastHourKey(180) === '2026-07-17T17:00',
  runOfShowForecastHourKey(180),
);

const explicit = buildRunOfShowPerformances({ placements, civicRows: explicitRows });
check('explicit set times create performances', explicit.length === 2, explicit);
check(
  '5:00 active set comes from explicit row',
  activeRunOfShowPerformances(explicit, 180).map((p) => p.actName).join(',') === 'North Porch Trio',
);
check(
  '6:00 active set changes from the same clock',
  activeRunOfShowPerformances(explicit, 240).map((p) => p.actName).join(',') === 'Queen Street Brass',
);

const draft = buildRunOfShowPerformances({ placements, civicRows: [] });
const activeFive = activeRunOfShowPerformances(draft, 180).map((p) => p.placementId).sort();
const activeSix = activeRunOfShowPerformances(draft, 240).map((p) => p.placementId).sort();
const activeSeven = activeRunOfShowPerformances(draft, 300).map((p) => p.placementId).sort();
check('fixture fallback produces draft stage performances', draft.some((p) => p.source === 'draft_stage'));
check(
  'draft 5/6/7 active sets differ',
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
    185,
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
    185,
  ),
);

if (failures > 0) {
  console.error(`\nvalidate-porchfest-run-of-show: ${failures} failure(s)`);
  process.exit(1);
}

console.log('\nvalidate-porchfest-run-of-show: all checks passed');
