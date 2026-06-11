/**
 * Feature 1 acceptance, resolver half: the civic object -> figure key
 * mapping is deterministic, discriminating fields beat category defaults,
 * the organizer override wins when valid, and an unknown override falls
 * back to the resolver instead of rendering nothing.
 *
 * Pure module, no Yjs, no GL: this is the unit-test surface the spec asked
 * for ("No side effects, unit-testable on its own").
 *
 * Run: npm run validate:figure-resolver
 */

import {
  CIVIC_FIGURE_KEYS,
  type CivicFigureKey,
  type CivicObjectFields,
} from '../src/lib/civic/civic-object-schema';
import {
  effectiveCivicFigureKey,
  isCivicFigureKey,
  resolveCivicFigureKey,
} from '../src/lib/civic/civic-figure-resolver';

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}`);
    if (detail !== undefined) console.error(`      ${JSON.stringify(detail)}`);
  }
}

function expectKey(
  label: string,
  fields: Partial<CivicObjectFields>,
  want: CivicFigureKey,
) {
  const got = resolveCivicFigureKey(fields);
  check(label, got === want, { want, got });
}

console.log('1. musician discrimination by bandSize');
expectKey('Solo -> musician-solo', { category: 'musician', bandSize: 'Solo' }, 'musician-solo');
expectKey('DJ / electronic -> musician-dj', { category: 'musician', bandSize: 'DJ / electronic' }, 'musician-dj');
expectKey('Duo -> musician-band', { category: 'musician', bandSize: 'Duo' }, 'musician-band');
expectKey('3-5 members -> musician-band', { category: 'musician', bandSize: '3-5 members' }, 'musician-band');
expectKey('6+ members -> musician-band', { category: 'musician', bandSize: '6+ members' }, 'musician-band');
expectKey('unset bandSize -> musician-band', { category: 'musician' }, 'musician-band');
expectKey(
  'unset bandSize + electronic genre -> musician-dj (spec genre discriminator)',
  { category: 'musician', genre: 'Electronic / House' },
  'musician-dj',
);
expectKey(
  'explicit bandSize beats genre',
  { category: 'musician', bandSize: 'Duo', genre: 'DJ sets' },
  'musician-band',
);

console.log('2. vendor discrimination by footprint / needs / foodType');
expectKey('truck footprint -> food-truck', { category: 'vendor', footprint: 'Food truck, 20 ft' }, 'food-truck');
expectKey('Parking for truck need -> food-truck', { category: 'vendor', vendorNeeds: ['Parking for truck'] }, 'food-truck');
expectKey(
  'truck beats foodType (precedence)',
  { category: 'vendor', footprint: 'truck', foodType: ['BBQ / Grill'] },
  'food-truck',
);
expectKey(
  'cart serving food -> food-cart',
  { category: 'vendor', footprint: 'push cart', foodType: ['Ice Cream / Frozen Treats'] },
  'food-cart',
);
expectKey('cart without food -> vendor-cart', { category: 'vendor', footprint: 'small cart' }, 'vendor-cart');
expectKey('table footprint -> vendor-table', { category: 'vendor', footprint: 'one 6ft table' }, 'vendor-table');
expectKey('Extra table need -> vendor-table', { category: 'vendor', vendorNeeds: ['Extra table'] }, 'vendor-table');
expectKey('foodType alone -> food-grill', { category: 'vendor', foodType: ['BBQ / Grill'], footprint: '10x10' }, 'food-grill');
expectKey('bare vendor -> vendor-tent', { category: 'vendor' }, 'vendor-tent');

console.log('3. entertainer discrimination by actType');
expectKey('Dance -> entertainer-dance', { category: 'entertainer', actType: ['Dance'] }, 'entertainer-dance');
expectKey('Visual Art / Chalk -> entertainer-art', { category: 'entertainer', actType: ['Visual Art / Chalk'] }, 'entertainer-art');
expectKey('Comedy -> entertainer-stage', { category: 'entertainer', actType: ['Comedy / Stand-up'] }, 'entertainer-stage');
expectKey('unset actType -> entertainer-stage', { category: 'entertainer' }, 'entertainer-stage');
expectKey(
  'Dance beats Visual Art (precedence)',
  { category: 'entertainer', actType: ['Visual Art / Chalk', 'Dance'] },
  'entertainer-dance',
);

console.log('4. other + missing category fall back to the marker');
expectKey('other -> marker', { category: 'other' }, 'marker');
expectKey('missing category -> marker', {}, 'marker');

console.log('5. override semantics');
const solo: Partial<CivicObjectFields> = { category: 'musician', bandSize: 'Solo' };
check(
  'valid override wins over the resolver',
  effectiveCivicFigureKey({ ...solo, figureKey: 'food-truck' }) === 'food-truck',
);
check(
  'resolver itself never consults the override',
  resolveCivicFigureKey({ ...solo, figureKey: 'food-truck' }) === 'musician-solo',
);
check(
  'unknown stored override falls back to the resolver',
  effectiveCivicFigureKey({
    ...solo,
    figureKey: 'sasquatch' as CivicObjectFields['figureKey'],
  }) === 'musician-solo',
);
check('isCivicFigureKey accepts every catalog key', CIVIC_FIGURE_KEYS.every(isCivicFigureKey));
check('isCivicFigureKey rejects junk', !isCivicFigureKey('sasquatch') && !isCivicFigureKey(undefined));

console.log('6. determinism: same fields, same key, across the catalog domain');
const fixtures: Partial<CivicObjectFields>[] = [
  { category: 'musician', bandSize: 'Solo' },
  { category: 'musician', bandSize: 'DJ / electronic' },
  { category: 'vendor', footprint: 'truck' },
  { category: 'vendor', foodType: ['Pizza'] },
  { category: 'entertainer', actType: ['Dance'] },
  { category: 'other' },
];
for (const fields of fixtures) {
  const first = resolveCivicFigureKey(fields);
  const second = resolveCivicFigureKey(fields);
  check(
    `stable for ${JSON.stringify(fields)}`,
    first === second && isCivicFigureKey(first),
    { first, second },
  );
}

if (failures > 0) {
  console.error(`\nvalidate-figure-resolver: ${failures} failure(s)`);
  process.exit(1);
}
console.log('\nvalidate-figure-resolver: all checks passed');
