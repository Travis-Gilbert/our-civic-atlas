/**
 * Acceptance guard for private Formspree export reconciliation.
 *
 * Proves the importer can parse legacy CSV rows, preserve Formspree source
 * identity/timestamps, infer the four Civic Atlas categories, and surface
 * incomplete rows without committing private operational data.
 *
 * Run: npm run validate:formspree-import
 */

import {
  mapFormspreeRowsToApplications,
  parseFormspreeCsv,
} from '../src/lib/civic/formspree-import';

let failures = 0;

function check(label: string, ok: boolean, detail?: unknown): void {
  if (ok) {
    console.log(`  ok  ${label}`);
  } else {
    failures += 1;
    console.error(`FAIL  ${label}`);
    if (detail !== undefined) {
      console.error(`      ${JSON.stringify(detail)}`);
    }
  }
}

function sameArray(actual: unknown, expected: string[]): boolean {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    expected.every((value, index) => actual[index] === value)
  );
}

function csvLine(cells: readonly string[]): string {
  return cells
    .map((cell) => {
      if (!/[",\r\n]/.test(cell)) return cell;
      return `"${cell.replaceAll('"', '""')}"`;
    })
    .join(',');
}

const csv = [
  csvLine([
    'Submission ID',
    'Submitted At',
    'Application Type',
    'Contact Name',
    'Email Address',
    'Phone Number',
    'City',
    'Bio',
    'Flint Based',
    'Artist',
    'Genre',
    'Music Link',
    'Band Size',
    'History',
    'Can Do Thirty',
    'Own PA',
    'Equipment',
    'Business Name',
    'Food Description',
    'Food Type',
    'Vendor Needs',
    'Vended Before',
    'Unexpected Column',
  ]),
  csvLine([
    'sub-001',
    '2026-04-12T14:30:00.000Z',
    'Musician',
    'Tess Harmon',
    'TESS@example.com',
    '(810) 555-0142',
    'Flint, MI',
    'Two-piece porch-folk act, fiddle and guitar.',
    'Yes, Flint',
    'The Mason Street Two',
    'Folk',
    'https://example.com/mason',
    'Duo',
    'Returning',
    'Yes',
    'No',
    'Power outlet; Extra chairs',
    '',
    '',
    '',
    '',
    '',
    'kept for review',
  ]),
  csvLine([
    'sub-002',
    '1783879200',
    'Food Vendor',
    'Ray Delgado',
    'ray@example.com',
    '',
    'Flint, MI',
    '',
    'Nearby',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'Coney Ray',
    'Flint-style coneys and loose burgers.',
    'Coney / Hot Dogs, Burgers / Fries',
    'Power outlet; Waste disposal',
    'Returning',
    '',
  ]),
  csvLine([
    'sub-003',
    '',
    'Performer',
    '',
    'missing-name@example.com',
    '',
    '',
    '',
    'No',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]),
].join('\n');

async function main(): Promise<void> {
  console.log('1. parse synthetic Formspree CSV');
  const rows = parseFormspreeCsv(csv);
  check('three data rows parsed', rows.length === 3, rows.length);
  check(
    'quoted comma remains inside the musician bio',
    rows[0]?.Bio === 'Two-piece porch-folk act, fiddle and guitar.',
    rows[0]?.Bio,
  );

  console.log('2. map rows to civic-object and GraphQL submit inputs');
  const candidates = mapFormspreeRowsToApplications(rows);
  const [musician, vendor, incomplete] = candidates;

  check('first row number preserves CSV source line', musician?.rowNumber === 2);
  check('second row number preserves CSV source line', vendor?.rowNumber === 3);
  check('Formspree id becomes source key', musician?.submitInput.sourceKey === 'formspree:sub-001');
  check('explicit Formspree timestamp is preserved', musician?.submitInput.submittedAtMs === 1776004200000, musician?.submitInput.submittedAtMs);
  check('civic object carries ISO submittedAt', musician?.civicObject.submittedAt === '2026-04-12T14:30:00.000Z', musician?.civicObject.submittedAt);
  check('email is normalized', musician?.submitInput.contactEmail === 'tess@example.com', musician?.submitInput.contactEmail);
  check('musician category is inferred', musician?.submitInput.category === 'musician', musician?.submitInput.category);
  check('raw category did not overwrite normalized category', incomplete?.submitInput.category === 'entertainer', incomplete?.submitInput.category);
  check('musician equipment splits semicolon list', sameArray(musician?.civicObject.equipment, ['Power outlet', 'Extra chairs']), musician?.civicObject.equipment);
  check('musician yes/no fields normalize to civic strings', musician?.civicObject.canDoThirty === 'yes' && musician.civicObject.ownPA === 'no', musician?.civicObject);
  check('unknown populated column is reported', musician?.droppedKeys.includes('unexpectedcolumn') === true, musician?.droppedKeys);

  check('vendor category inferred from Formspree label', vendor?.submitInput.category === 'vendor', vendor?.submitInput.category);
  check('numeric seconds timestamp is upgraded to milliseconds', vendor?.submitInput.submittedAtMs === 1783879200000, vendor?.submitInput.submittedAtMs);
  check('vendor payload keeps business name', vendor?.submitInput.categoryPayload.businessName === 'Coney Ray', vendor?.submitInput.categoryPayload);
  check('vendor food types split comma list', sameArray(vendor?.civicObject.foodType, ['Coney / Hot Dogs', 'Burgers / Fries']), vendor?.civicObject.foodType);
  check('vendor needs split semicolon list', sameArray(vendor?.civicObject.vendorNeeds, ['Power outlet', 'Waste disposal']), vendor?.civicObject.vendorNeeds);
  check('vendor vended-before alias normalizes', vendor?.civicObject.vendedBefore === 'yes', vendor?.civicObject.vendedBefore);

  check('incomplete row still gets stable source key', incomplete?.submitInput.sourceKey === 'formspree:sub-003', incomplete?.submitInput.sourceKey);
  check('incomplete row reports required fields', incomplete?.missingFields.includes('actName') === true && incomplete.missingFields.includes('actDescription'), incomplete?.missingFields);

  if (failures > 0) {
    console.error(`\nvalidate-formspree-import: ${failures} failure(s)`);
    process.exit(1);
  }
  console.log('\nvalidate-formspree-import: all checks passed');
  process.exit(0);
}

main().catch((error) => {
  console.error('validate-formspree-import crashed:', error);
  process.exit(1);
});
