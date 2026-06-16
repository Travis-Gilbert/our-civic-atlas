/**
 * Confirmed 2026 PorchFest participants.
 *
 * The organizer-confirmed roster of porches playing this year, sourced from
 * "Participating Porches 2026 - Porches & Contacts.csv" (received 2026-06-15).
 * The planner highlights these and dims the rest so the confirmed set reads at
 * a glance against the full pool of applications.
 *
 * Why a typed constant and not the `status` planning field: the confirmed list
 * is event truth the organizer hands over directly, and not every matching
 * civic object in the live store carries an `accepted` status yet. Keying the
 * highlight off this roster delivers the requested view today; the durable home
 * is the civic `status` field once the store is reconciled against this list.
 *
 * Match keys are email (the store's dedup key) and street address (mirrored
 * onto each placement from the nearest Carriage Town building). Names are
 * intentionally not matched: they vary too much to join without false hits.
 */

export interface ParticipatingPorch {
  readonly name: string;
  readonly address: string;
  /** Empty when the roster row carried no contact email (address still matches). */
  readonly email: string;
  readonly note: string;
}

export const PARTICIPATING_PORCHES_2026: readonly ParticipatingPorch[] = [
  {
    name: "Arrowhead Vets Club",
    address: "402 Water Street",
    email: "june6019bug@yahoo.com",
    note: "Deb is contact, stage is programmed",
  },
  {
    name: "Derek Dohrman",
    address: "307 Mason Street",
    email: "dohrman.derek@gmail.com",
    note: "Two performers, jacksonville porch",
  },
  {
    name: "Cade Surface",
    address: "410 Mason Street",
    email: "csurface@crim.org",
    note: "",
  },
  {
    name: "Joel Rydecki",
    address: "417 Mason Street",
    email: "isaacrydermusic@gmail.com",
    note: "Plays own porch, usually happy to share equipment for another performer",
  },
  {
    name: "Troy Hemstreet",
    address: "515 Mason Street",
    email: "flinttroy26@hotmail.com",
    note: "One performer confirmed",
  },
  {
    name: "Joel Arnold",
    address: "518 Mason Street",
    email: "joellarnold15@gmail.com",
    note: "",
  },
  {
    name: "Phoenix Dempster",
    address: "519 Mason Street",
    email: "dempste4@msu.edu",
    note: "One performer confirmed",
  },
  {
    name: "Jeff Skigh",
    address: "411 First Avenue",
    email: "jeffskigh@icloud.com",
    note: "",
  },
  {
    name: "John-Paul DeMers",
    address: "418 First Avenue",
    email: "jpdd91@gmail.com",
    note: "Two bands confirmed; schedule later, leading into mainstage",
  },
  {
    name: "Bob Sims",
    address: "422 First Avenue",
    email: "robsims49@gmail.com",
    note: "Plays own porch",
  },
  {
    name: "Erik McIntyre",
    address: "425 First Avenue",
    email: "erikmcintyremusic@proton.me",
    note: "Plays own porch",
  },
  {
    name: "Yasmin Ladha",
    address: "434 First Avenue",
    email: "yazladha@gmail.com",
    note: "",
  },
  {
    name: "Lindsay Decker",
    address: "426 First Avenue",
    email: "Lindsayjdecker@gmail.com",
    note: "",
  },
  {
    name: "Figga tha kidd",
    address: "224 Second Avenue",
    email: "figgadakid@gmail.com",
    note: "Plays own porch",
  },
  {
    name: "Peoples Plaza",
    address: "503 Garland Street",
    email: "doerr.emily@gmail.com",
    note: "Emily is contact and programming",
  },
  {
    name: "Jason Nicholson",
    address: "321 Second Avenue",
    email: "jasonlee_nicholson@yahoo.com",
    note: "Sponsor likely is FIM porch",
  },
  {
    name: "Mainstage",
    address: "307 Mason Street",
    email: "",
    note: "One performer confirmed",
  },
] as const;

/**
 * USPS-style suffix canonicalization so "402 Water Street" matches a stored
 * "402 Water St" (the mirror may abbreviate). Only suffixes present in the
 * Carriage Town roster are mapped; unknown tokens pass through unchanged.
 */
const STREET_SUFFIXES: Readonly<Record<string, string>> = {
  street: "st",
  st: "st",
  avenue: "ave",
  ave: "ave",
  av: "ave",
  boulevard: "blvd",
  blvd: "blvd",
  drive: "dr",
  dr: "dr",
  road: "rd",
  rd: "rd",
  court: "ct",
  ct: "ct",
  lane: "ln",
  ln: "ln",
  place: "pl",
  pl: "pl",
  terrace: "ter",
  ter: "ter",
  parkway: "pkwy",
  pkwy: "pkwy",
  circle: "cir",
  cir: "cir",
};

export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

/**
 * Lowercase, drop the city/state tail after the first comma, strip punctuation,
 * collapse whitespace, and canonicalize the street suffix. Returns "" when there
 * is nothing to match on.
 */
export function normalizeAddress(value: string | null | undefined): string {
  if (!value) return "";
  const firstSegment = value.split(",")[0] ?? value;
  const cleaned = firstSegment
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned === "") return "";
  return cleaned
    .split(" ")
    .map((token) => STREET_SUFFIXES[token] ?? token)
    .join(" ");
}

const PARTICIPATING_EMAILS: ReadonlySet<string> = new Set(
  PARTICIPATING_PORCHES_2026.map((porch) => normalizeEmail(porch.email)).filter(
    (email) => email !== "",
  ),
);

const PARTICIPATING_ADDRESSES: ReadonlySet<string> = new Set(
  PARTICIPATING_PORCHES_2026.map((porch) =>
    normalizeAddress(porch.address),
  ).filter((address) => address !== ""),
);

/**
 * True when a civic object's contact email or mirrored address matches the
 * confirmed roster. Email is checked first (exact, deduped); address is the
 * fallback for rows whose email differs or is absent (e.g. "Mainstage").
 */
export function isParticipatingPorch(input: {
  readonly email?: string | null;
  readonly address?: string | null;
}): boolean {
  const email = normalizeEmail(input.email);
  if (email !== "" && PARTICIPATING_EMAILS.has(email)) return true;
  const address = normalizeAddress(input.address);
  return address !== "" && PARTICIPATING_ADDRESSES.has(address);
}
