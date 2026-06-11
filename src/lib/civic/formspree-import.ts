import {
  CIVIC_OBJECT_COLUMNS,
  IMPORT_FIELD_ALIASES,
  missingRequiredFields,
  type CivicCategory,
  type CivicFieldKey,
  type CivicObjectFields,
} from "./civic-object-schema";
import {
  PORCHFEST_EVENT_SLUG,
  porchfestApplicationDisplayName,
  type EventApplicationSubmitInputLike,
  type FlintConnection,
  type PorchfestApplicationFormState,
} from "./porchfest-application";

export interface FormspreeImportSubmitInput extends EventApplicationSubmitInputLike {
  readonly submittedAtMs?: number;
}

export interface FormspreeImportCandidate {
  readonly rowNumber: number;
  readonly raw: Record<string, string>;
  readonly civicObject: CivicObjectFields;
  readonly submitInput: FormspreeImportSubmitInput;
  readonly missingFields: CivicFieldKey[];
  readonly droppedKeys: string[];
}

export interface FormspreeImportOptions {
  readonly eventSlug?: string;
  readonly sourcePrefix?: string;
}

const SHARED_FIELD_ALIASES: Record<string, keyof PorchfestApplicationFormState> = {
  category: "category",
  applicationtype: "category",
  applicanttype: "category",
  type: "category",
  role: "category",
  applyingas: "category",
  name: "name",
  fullname: "name",
  contactname: "name",
  yourname: "name",
  email: "email",
  emailaddress: "email",
  contactemail: "email",
  phone: "phone",
  phonenumber: "phone",
  contactphone: "phone",
  city: "city",
  bio: "bio",
  biography: "bio",
  description: "bio",
  flintconnection: "flintConnection",
  flintbased: "flintConnection",
  accessneeds: "accessNeeds",
  accessibilityneeds: "accessNeeds",
};

const ID_KEYS = [
  "id",
  "submissionid",
  "submission_id",
  "formspreeid",
  "_id",
  "uuid",
];

const SUBMITTED_AT_KEYS = [
  "submittedat",
  "submitted_at",
  "createdat",
  "created_at",
  "receivedat",
  "received_at",
  "timestamp",
  "date",
  "_date",
];

const FIELD_KEY_BY_NORMALIZED = new Map<string, CivicFieldKey>(
  CIVIC_OBJECT_COLUMNS.flatMap((column) => [
    [normalizeHeader(column.key), column.key as CivicFieldKey],
    [normalizeHeader(column.name), column.key as CivicFieldKey],
  ]),
);

for (const [legacy, target] of Object.entries(IMPORT_FIELD_ALIASES)) {
  FIELD_KEY_BY_NORMALIZED.set(normalizeHeader(legacy), target);
}

export function parseFormspreeCsv(csv: string): Record<string, string>[] {
  const rows = parseCsvRows(csv);
  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.trim());
  return rows
    .slice(1)
    .filter((row) => row.some((value) => value.trim() !== ""))
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header) record[header] = row[index]?.trim() ?? "";
      });
      return record;
    });
}

export function mapFormspreeRowsToApplications(
  rows: readonly Record<string, string>[],
  options: FormspreeImportOptions = {},
): FormspreeImportCandidate[] {
  return rows.map((row, index) =>
    mapFormspreeRowToApplication(row, index + 2, options),
  );
}

export function mapFormspreeRowToApplication(
  row: Record<string, string>,
  rowNumber = 2,
  options: FormspreeImportOptions = {},
): FormspreeImportCandidate {
  const normalized = normalizeRow(row);
  const category = inferCategory(normalized);
  const submittedAtMs = parseSubmittedAtMs(normalized);
  const sourceKey = sourceKeyForRow(normalized, category, options.sourcePrefix ?? "formspree");
  const state = stateForRow(normalized, category);
  const civicObject = civicObjectForState(state, sourceKey, submittedAtMs);
  const submitInput = submitInputForState(
    state,
    sourceKey,
    submittedAtMs,
    options.eventSlug ?? PORCHFEST_EVENT_SLUG,
  );
  const droppedKeys = droppedKeysForRow(normalized);

  return {
    rowNumber,
    raw: row,
    civicObject,
    submitInput,
    missingFields: missingRequiredFields(civicObject),
    droppedKeys,
  };
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }

  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function normalizeRow(row: Record<string, string>): Map<string, string> {
  const normalized = new Map<string, string>();
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeHeader(key);
    if (!normalizedKey) continue;
    normalized.set(normalizedKey, value.trim());
  }
  return normalized;
}

function normalizeHeader(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function valueFor(row: Map<string, string>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = row.get(normalizeHeader(key));
    if (value) return value;
  }
  return "";
}

function inferCategory(row: Map<string, string>): CivicCategory {
  const raw = valueFor(row, [
    "category",
    "application type",
    "applicant type",
    "type",
    "role",
    "applying as",
  ]).toLowerCase();
  if (raw.includes("vendor") || raw.includes("food")) return "vendor";
  if (raw.includes("entertain") || raw.includes("perform")) return "entertainer";
  if (raw.includes("organization") || raw.includes("community") || raw.includes("other")) {
    return "other";
  }
  if (raw.includes("music") || raw.includes("band") || raw.includes("artist")) {
    return "musician";
  }
  if (valueFor(row, ["businessName", "business", "foodDescription", "food type"])) {
    return "vendor";
  }
  if (valueFor(row, ["actName", "actType", "actDescription"])) {
    return "entertainer";
  }
  if (valueFor(row, ["orgName", "organization", "proposal"])) return "other";
  return "musician";
}

function stateForRow(
  row: Map<string, string>,
  category: CivicCategory,
): PorchfestApplicationFormState {
  const state: Record<keyof PorchfestApplicationFormState, string> = {
    category,
    name: valueFor(row, ["name", "full name", "contact name", "your name"]),
    email: valueFor(row, ["email", "email address", "contact email"]).toLowerCase(),
    phone: valueFor(row, ["phone", "phone number", "contact phone"]),
    city: valueFor(row, ["city"]),
    bio: valueFor(row, ["bio", "biography", "description"]),
    flintConnection: flintConnectionFor(row),
    accessNeeds: valueFor(row, ["access needs", "accessibility needs"]),
    artistName: valueFor(row, ["artistName", "artist", "band", "band name"]),
    bandSize: valueFor(row, ["bandSize", "band size"]),
    genre: valueFor(row, ["genre"]),
    setLength: valueFor(row, ["setLength", "set length"]),
    canDoThirty: yesNoString(valueFor(row, ["canDoThirty", "can do thirty", "30 minute set"])),
    equipment: valueFor(row, ["equipment", "setup needs", "needs"]),
    ownPA: yesNoString(valueFor(row, ["ownPA", "own pa", "pa"])),
    musicLink: valueFor(row, ["musicLink", "music link", "link"]),
    musicLink2: valueFor(row, ["musicLink2", "second music link", "second link"]),
    porchfestHistory: valueFor(row, ["porchfestHistory", "history", "vendorHistory"]),
    businessName: valueFor(row, ["businessName", "business", "business name"]),
    foodDescription: valueFor(row, ["foodDescription", "food description", "what do you serve"]),
    foodType: valueFor(row, ["foodType", "food type"]),
    vendorLink: valueFor(row, ["vendorLink", "vendor link", "website"]),
    footprint: valueFor(row, ["footprint", "space footprint"]),
    vendorNeeds: valueFor(row, ["vendorNeeds", "vendor needs", "on-site needs"]),
    vendedBefore: yesNoString(valueFor(row, ["vendedBefore", "vendorHistory", "vended before"])),
    actName: valueFor(row, ["actName", "act name", "performer name"]),
    actType: valueFor(row, ["actType", "act type"]),
    actDescription: valueFor(row, ["actDescription", "act description"]),
    orgName: valueFor(row, ["orgName", "organization", "organization name"]),
    proposal: valueFor(row, ["proposal"]),
    workLink: valueFor(row, ["workLink", "work link"]),
    otherLinks: valueFor(row, ["otherLinks", "other links"]),
    history: valueFor(row, ["history"]),
  };

  applyKnownSchemaFields(row, state);
  fillCategoryFallbacks(state);
  return state as unknown as PorchfestApplicationFormState;
}

function applyKnownSchemaFields(
  row: Map<string, string>,
  state: Record<keyof PorchfestApplicationFormState, string>,
): void {
  for (const [key, value] of row.entries()) {
    if (!value) continue;
    const field = FIELD_KEY_BY_NORMALIZED.get(key);
    if (!field || field === "sourceId" || field === "submittedAt") continue;
    const stateKey = schemaFieldToStateKey(field);
    if (!stateKey) continue;
    if (stateKey === "category") continue;
    if (stateKey === "canDoThirty" || stateKey === "ownPA") {
      state[stateKey] = yesNoString(value);
      continue;
    }
    if (stateKey === "flintConnection") {
      state[stateKey] = flintConnectionForValue(value);
      continue;
    }
    if (stateKey === "porchfestHistory") {
      state[stateKey] = porchfestHistoryFor(value) ?? "";
      continue;
    }
    if (stateKey === "vendedBefore") {
      state[stateKey] = yesNoString(value);
      continue;
    }
    state[stateKey] = value;
  }
}

function schemaFieldToStateKey(field: CivicFieldKey): keyof PorchfestApplicationFormState | null {
  if (field === "flintBased") return "flintConnection";
  if (field === "vendedBefore") return "vendedBefore";
  return defaultStateKeys.has(field)
    ? (field as keyof PorchfestApplicationFormState)
    : null;
}

const defaultStateKeys = new Set<string>([
  "category",
  "name",
  "email",
  "phone",
  "city",
  "bio",
  "flintConnection",
  "accessNeeds",
  "artistName",
  "bandSize",
  "genre",
  "setLength",
  "canDoThirty",
  "equipment",
  "ownPA",
  "musicLink",
  "musicLink2",
  "porchfestHistory",
  "businessName",
  "foodDescription",
  "foodType",
  "vendorLink",
  "footprint",
  "vendorNeeds",
  "vendedBefore",
  "actName",
  "actType",
  "actDescription",
  "orgName",
  "proposal",
  "workLink",
  "otherLinks",
  "history",
]);

function fillCategoryFallbacks(
  state: Record<keyof PorchfestApplicationFormState, string>,
): void {
  if (state.category === "musician" && !state.artistName) state.artistName = state.name;
  if (state.category === "vendor" && !state.businessName) state.businessName = state.name;
  if (state.category === "entertainer" && !state.actName) state.actName = state.name;
  if (state.category === "other" && !state.orgName) state.orgName = state.name;
}

function civicObjectForState(
  state: PorchfestApplicationFormState,
  sourceKey: string,
  submittedAtMs: number | undefined,
): CivicObjectFields {
  const base = categoryFieldsForState(state);
  return {
    ...base,
    sourceId: sourceKey,
    ...(submittedAtMs ? { submittedAt: new Date(submittedAtMs).toISOString() } : {}),
  };
}

function categoryFieldsForState(state: PorchfestApplicationFormState): CivicObjectFields {
  const shared = {
    category: state.category,
    name: state.name.trim(),
    email: state.email.trim().toLowerCase(),
    phone: optional(state.phone),
    city: optional(state.city),
    bio: optional(state.bio),
    flintBased: state.flintConnection,
    accessNeeds: optional(state.accessNeeds),
    status: "submitted" as const,
  };

  if (state.category === "musician") {
    return {
      ...shared,
      category: "musician",
      artistName: state.artistName.trim(),
      genre: state.genre.trim(),
      musicLink: state.musicLink.trim(),
      musicLink2: optional(state.musicLink2),
      bandSize: optional(state.bandSize) as CivicObjectFields["bandSize"],
      porchfestHistory: porchfestHistoryFor(state.porchfestHistory),
      canDoThirty: yesNoOptional(state.canDoThirty),
      equipment: splitList(state.equipment),
      ownPA: yesNoOptional(state.ownPA),
      setLength: optional(state.setLength),
    };
  }
  if (state.category === "vendor") {
    return {
      ...shared,
      category: "vendor",
      businessName: state.businessName.trim(),
      foodDescription: state.foodDescription.trim(),
      foodType: splitList(state.foodType),
      vendorLink: optional(state.vendorLink),
      footprint: optional(state.footprint),
      vendorNeeds: splitList(state.vendorNeeds),
      vendedBefore: yesNoString(state.vendedBefore) as CivicObjectFields["vendedBefore"],
    };
  }
  if (state.category === "entertainer") {
    return {
      ...shared,
      category: "entertainer",
      actName: state.actName.trim(),
      actType: splitList(state.actType),
      actDescription: state.actDescription.trim(),
      workLink: optional(state.workLink),
    };
  }
  return {
    ...shared,
    category: "other",
    orgName: state.orgName.trim(),
    proposal: state.proposal.trim(),
    otherLinks: optional(state.otherLinks) ?? optional(state.workLink),
  };
}

function submitInputForState(
  state: PorchfestApplicationFormState,
  sourceKey: string,
  submittedAtMs: number | undefined,
  eventSlug: string,
): FormspreeImportSubmitInput {
  return {
    eventSlug,
    category: state.category,
    displayName: porchfestApplicationDisplayName(state),
    contactName: optional(state.name) ?? null,
    contactEmail: state.email.trim().toLowerCase(),
    contactPhone: optional(state.phone) ?? null,
    city: optional(state.city) ?? null,
    bio: optional(state.bio) ?? null,
    flintBased: state.flintConnection === "yes",
    accessNeeds: optional(state.accessNeeds) ?? null,
    categoryPayload: categoryPayloadForState(state),
    sourceKey,
    submittedAtMs,
  };
}

function categoryPayloadForState(state: PorchfestApplicationFormState): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    flintConnection: state.flintConnection,
  };
  const civicObject = categoryFieldsForState(state);
  for (const column of CIVIC_OBJECT_COLUMNS) {
    if (column.scope === "shared" || column.scope === "planning") continue;
    if (column.scope !== state.category) continue;
    const value = civicObject[column.key as keyof CivicObjectFields];
    if (value === undefined || value === null || value === "") continue;
    payload[column.key] = value;
  }
  return payload;
}

function droppedKeysForRow(row: Map<string, string>): string[] {
  const known = new Set([
    ...Object.keys(SHARED_FIELD_ALIASES),
    "sourcekey",
    "sourceid",
    ...ID_KEYS.map(normalizeHeader),
    ...SUBMITTED_AT_KEYS.map(normalizeHeader),
  ]);
  return Array.from(row.entries())
    .filter(([key, value]) => value && !known.has(key) && !FIELD_KEY_BY_NORMALIZED.has(key))
    .map(([key]) => key);
}

function sourceKeyForRow(
  row: Map<string, string>,
  category: CivicCategory,
  prefix: string,
): string {
  const explicit = valueFor(row, ["sourceId", "source id", "sourceKey", "source key"]);
  if (explicit) return explicit;
  const submissionId = valueFor(row, ID_KEYS);
  if (submissionId) return `${prefix}:${submissionId}`;
  const email = valueFor(row, ["email", "email address", "contact email"]).toLowerCase();
  return `${prefix}:${category}:${email}`;
}

function parseSubmittedAtMs(row: Map<string, string>): number | undefined {
  const raw = valueFor(row, SUBMITTED_AT_KEYS);
  if (!raw) return undefined;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric < 10_000_000_000 ? numeric * 1_000 : Math.trunc(numeric);
  }
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function flintConnectionFor(row: Map<string, string>): FlintConnection {
  const raw = valueFor(row, ["flintConnection", "flint based", "flintBased"]);
  return flintConnectionForValue(raw);
}

function flintConnectionForValue(value: string): FlintConnection {
  const raw = value.toLowerCase();
  if (raw.includes("near")) return "nearby";
  if (raw.includes("outside") || raw.includes("no")) return "outside";
  if (raw.includes("yes") || raw.includes("flint") || raw === "true") return "yes";
  return "outside";
}

function yesNoString(value: string): "" | "yes" | "no" {
  const normalized = value.trim().toLowerCase();
  if (["yes", "true", "1", "y", "returning"].includes(normalized)) return "yes";
  if (["no", "false", "0", "n", "first"].includes(normalized)) return "no";
  return "";
}

function yesNoOptional(value: string): "yes" | "no" | undefined {
  const normalized = yesNoString(value);
  return normalized === "" ? undefined : normalized;
}

function porchfestHistoryFor(value: string): CivicObjectFields["porchfestHistory"] {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes("return") || normalized === "yes") return "returning";
  if (normalized.includes("first") || normalized === "no") return "first";
  return undefined;
}

function splitList(value: string): string[] {
  return value
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}
