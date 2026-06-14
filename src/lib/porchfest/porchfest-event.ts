/**
 * Canonical PorchFest 2026 event facts shared across surfaces.
 *
 * The date and site centroid lived only in marketing copy
 * (porchfest-public layout: "Friday July 17, 2026") and the planner bounds.
 * Centralizing them here gives the weather card, the planner, and the
 * workspace one source of truth instead of three scattered literals.
 */

/** Festival day as an ISO calendar date in the event's local time zone. */
export const PORCHFEST_EVENT_DATE = "2026-07-17";

/** America/Detroit: the event's wall-clock zone, used for forecast lookups. */
export const PORCHFEST_EVENT_TZ = "America/Detroit";

/**
 * Event site centroid for point forecasts. This is the Carriage Town bounds
 * center the planner map frames ([-83.702, 43.0205] in [lng, lat]).
 */
export const PORCHFEST_EVENT_SITE = { lat: 43.0205, lon: -83.702 } as const;

/** Human label for the festival day, e.g. "Friday, July 17". */
export const PORCHFEST_EVENT_DATE_LABEL = "Friday, July 17";

/** Last day public PorchFest applications are open. */
export const PORCHFEST_APPLICATION_CLOSE_LABEL = "June 24";
