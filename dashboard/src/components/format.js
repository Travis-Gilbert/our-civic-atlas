// Client-side formatting helpers for the dashboard page. (The loaders' _lib.js
// is Node-only and never bundled, so these small helpers are duplicated here
// for the browser side.)

export const CATEGORY_LABELS = {
  musician: "Musicians",
  vendor: "Vendors",
  entertainer: "Entertainers",
  sponsor: "Sponsors",
};
const CATEGORY_ORDER = ["musician", "vendor", "entertainer", "sponsor"];

export function labelFor(category) {
  if (CATEGORY_LABELS[category]) return CATEGORY_LABELS[category];
  if (!category) return "Uncategorized";
  return String(category)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function categorySortKey(category) {
  const i = CATEGORY_ORDER.indexOf(category);
  return i === -1 ? CATEGORY_ORDER.length + 1 : i;
}

/** cents -> "$1,234" (whole dollars; PorchFest figures are not penny-precise). */
export function formatMoney(cents, currency = "USD") {
  const dollars = (Number(cents) || 0) / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
}

/** ISO -> "Jun 12, 2026, 3:04 PM UTC" for the freshness stamp. */
export function formatTimestamp(iso) {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";
  return (
    d.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }) + " UTC"
  );
}

/** ISO -> "Jun 12" short date for milestone rows. */
export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Merge two category-count arrays into joined rows for mapped-progress. */
export function joinCategoryCounts(appliedRows, placedRows) {
  const applied = new Map(
    (appliedRows ?? []).map((r) => [r.category, r.count]),
  );
  const placed = new Map((placedRows ?? []).map((r) => [r.category, r.count]));
  const categories = new Set([...applied.keys(), ...placed.keys()]);
  return [...categories]
    .map((category) => {
      const total = applied.get(category) ?? 0;
      const placedCount = placed.get(category) ?? 0;
      return {
        category,
        label: labelFor(category),
        applied: total,
        placed: placedCount,
        // Cap at 1: more placements than applications (extra pins, amenities)
        // should read as "fully mapped", not >100%.
        fraction: total > 0 ? Math.min(placedCount / total, 1) : 0,
      };
    })
    .sort(
      (a, b) =>
        categorySortKey(a.category) - categorySortKey(b.category) ||
        b.applied - a.applied,
    );
}
