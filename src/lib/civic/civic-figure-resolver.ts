/**
 * Civic object -> figure key resolver.
 *
 * The pure mapping from a civic object's schema fields to the figure the
 * planner map renders for it (porchfest-two-feature-specs.md, Feature 1
 * deliverable 2). Lives beside the schema so the contract and the mapping
 * travel together. No side effects, no geometry imports: the figure
 * LIBRARY (key -> renderable geometry) is atlas-side in
 * src/lib/atlas/porchfest-figure-library.ts; this module only decides WHICH
 * key a submission gets.
 *
 * Determinism rules, most specific signal first, category default last:
 *
 *   musician    bandSize Solo -> musician-solo; DJ / electronic ->
 *               musician-dj; Duo / 3-5 members / 6+ members (or unset) ->
 *               musician-band.
 *   vendor      footprint mentioning a truck (or "Parking for truck" in
 *               vendorNeeds) -> food-truck; footprint mentioning a cart ->
 *               food-cart when foodType says they serve food, else
 *               vendor-cart; footprint mentioning a table (or "Extra table"
 *               in vendorNeeds) -> vendor-table; any foodType without a
 *               stronger signal -> food-grill; default vendor-tent.
 *   entertainer actType Dance -> entertainer-dance; Visual Art / Chalk ->
 *               entertainer-art; everything else -> entertainer-stage.
 *   other       marker (the amenity-post fallback discipline).
 *
 * The organizer override (`figureKey` planning column) wins over the
 * resolver when it holds a known key; an unknown stored value falls back to
 * the resolver rather than rendering nothing, matching the figure catalog's
 * "a new category never renders invisible" discipline.
 */

import {
  CIVIC_FIGURE_KEYS,
  type CivicFigureKey,
  type CivicObjectFields,
} from './civic-object-schema';

const FIGURE_KEY_SET: ReadonlySet<string> = new Set(CIVIC_FIGURE_KEYS);

export function isCivicFigureKey(value: unknown): value is CivicFigureKey {
  return typeof value === 'string' && FIGURE_KEY_SET.has(value);
}

function hasNeed(needs: string[] | undefined, need: string): boolean {
  return Array.isArray(needs) && needs.includes(need);
}

function resolveMusician(fields: Partial<CivicObjectFields>): CivicFigureKey {
  switch (fields.bandSize) {
    case 'Solo':
      return 'musician-solo';
    case 'DJ / electronic':
      return 'musician-dj';
    default:
      return 'musician-band';
  }
}

function resolveVendor(fields: Partial<CivicObjectFields>): CivicFigureKey {
  const footprint = fields.footprint ?? '';
  const servesFood = Array.isArray(fields.foodType) && fields.foodType.length > 0;
  if (/truck/i.test(footprint) || hasNeed(fields.vendorNeeds, 'Parking for truck')) {
    return 'food-truck';
  }
  if (/cart/i.test(footprint)) {
    return servesFood ? 'food-cart' : 'vendor-cart';
  }
  if (/table/i.test(footprint) || hasNeed(fields.vendorNeeds, 'Extra table')) {
    return 'vendor-table';
  }
  if (servesFood) return 'food-grill';
  return 'vendor-tent';
}

function resolveEntertainer(fields: Partial<CivicObjectFields>): CivicFigureKey {
  const acts = Array.isArray(fields.actType) ? fields.actType : [];
  if (acts.includes('Dance')) return 'entertainer-dance';
  if (acts.includes('Visual Art / Chalk')) return 'entertainer-art';
  return 'entertainer-stage';
}

/**
 * Deterministic category + discriminating-field resolution. Never consults
 * the override; callers wanting override-first semantics use
 * `effectiveCivicFigureKey`.
 */
export function resolveCivicFigureKey(
  fields: Partial<CivicObjectFields>,
): CivicFigureKey {
  switch (fields.category) {
    case 'musician':
      return resolveMusician(fields);
    case 'vendor':
      return resolveVendor(fields);
    case 'entertainer':
      return resolveEntertainer(fields);
    case 'other':
    default:
      return 'marker';
  }
}

/** Override-first figure key: the organizer's choice wins when valid. */
export function effectiveCivicFigureKey(
  fields: Partial<CivicObjectFields>,
): CivicFigureKey {
  return isCivicFigureKey(fields.figureKey)
    ? fields.figureKey
    : resolveCivicFigureKey(fields);
}
