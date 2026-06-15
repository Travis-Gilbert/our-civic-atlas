// Money loader: sponsorship pipeline and money collected against the goal.
//
// Source order:
//   - Preferred: Google Sheets API, read-only, one-way.
//   - Local seed: CSV export of the same sponsorship sheet.
//   - Fallback: read-only Postgres Square billing rows.
//
// The browser receives only aggregate JSON. The sponsor rows, Google
// credentials, database URL, and CSV path stay server-side at build time.

import { readFile } from "node:fs/promises";

import { parse } from "csv-parse/sync";
import { google } from "googleapis";

import { openDb, withTenant, GOAL_CENTS, nowIso } from "./_lib.js";

const SPONSORSHIP_SHEET_ID =
  process.env.PORCHFEST_SPONSORSHIP_SHEET_ID ?? null;
const SPONSORSHIP_SHEET_RANGE =
  process.env.PORCHFEST_SPONSORSHIP_SHEET_RANGE ?? "Sponsorship!A:J";
const SPONSORSHIP_CSV_PATH =
  process.env.PORCHFEST_SPONSORSHIP_CSV_PATH ?? null;
const SPONSORSHIP_CSV_BASE64 =
  process.env.PORCHFEST_SPONSORSHIP_CSV_BASE64 ?? null;
const SPONSORSHIP_API_KEY =
  process.env.PORCHFEST_GOOGLE_SHEETS_API_KEY ?? null;
const SERVICE_ACCOUNT_JSON =
  process.env.PORCHFEST_GOOGLE_SERVICE_ACCOUNT_JSON ?? null;

const SHEETS_READONLY_SCOPE =
  "https://www.googleapis.com/auth/spreadsheets.readonly";

const FIELD_ALIASES = {
  sponsorName: ["Name of Sponsor", "Sponsor", "Sponsor Name", "Name"],
  amountAsked: ["Amount Asked", "Asked"],
  amountPromised: ["Amount Promised", "Promised", "Amount Pledged"],
  amountCollected: ["Amount Collected", "Collected", "Paid"],
  porchSponsored: ["Porch Sponsored", "Porch"],
  moneyCollected: ["Money Collected?", "Money Collected", "Collected?"],
  dateCollected: ["Date Money Collected", "Date Collected", "Collected Date"],
};

function field(row, key) {
  for (const name of FIELD_ALIASES[key] ?? []) {
    const value = row[name];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function parseCents(value) {
  if (typeof value === "number") return Math.round(value * 100);
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const negative = raw.includes("(") && raw.includes(")");
  const cleaned = raw.replace(/[^0-9.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return 0;
  const number = Number.parseFloat(cleaned);
  if (!Number.isFinite(number)) return 0;
  return Math.round((negative ? -Math.abs(number) : number) * 100);
}

function isCollected(value) {
  return ["1", "true", "yes", "y", "paid", "collected", "x"].includes(
    String(value ?? "").trim().toLowerCase(),
  );
}

function rowsFromValues(values) {
  const [headers = [], ...body] = values ?? [];
  const normalizedHeaders = headers.map((header) => String(header ?? "").trim());
  return body
    .map((cells) =>
      Object.fromEntries(
        normalizedHeaders.map((header, index) => [
          header,
          String(cells[index] ?? "").trim(),
        ]),
      ),
    )
    .filter((row) => Object.values(row).some((value) => value !== ""));
}

function parseCsvRows(csvText) {
  return parse(csvText, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

function hasValue(row, key) {
  return String(field(row, key)).trim() !== "";
}

function isSummaryOnlyRow(row) {
  return (
    !hasValue(row, "sponsorName") &&
    hasValue(row, "amountAsked") &&
    ![
      "amountPromised",
      "amountCollected",
      "porchSponsored",
      "moneyCollected",
      "dateCollected",
    ].some((key) => hasValue(row, key))
  );
}

function sponsorshipRollup(rows, source) {
  const activeRows = rows.filter(
    (row) =>
      !isSummaryOnlyRow(row) &&
      [
        "sponsorName",
        "amountAsked",
        "amountPromised",
        "amountCollected",
        "porchSponsored",
      ].some((key) => hasValue(row, key)),
  );

  let askedCents = 0;
  let promisedCents = 0;
  let collectedCents = 0;
  let askedCount = 0;
  let promisedCount = 0;
  let collectedCount = 0;
  let porchesSponsored = 0;
  let latestCollectionDate = null;

  for (const row of activeRows) {
    const asked = parseCents(field(row, "amountAsked"));
    const promised = parseCents(field(row, "amountPromised"));
    const collected = parseCents(field(row, "amountCollected"));
    const collectedByFlag = isCollected(field(row, "moneyCollected"));

    askedCents += asked;
    promisedCents += promised;
    collectedCents += collected;
    if (asked > 0) askedCount += 1;
    if (promised > 0) promisedCount += 1;
    if (collected > 0 || collectedByFlag) collectedCount += 1;
    if (String(field(row, "porchSponsored")).trim() !== "") porchesSponsored += 1;

    const dateCollected = String(field(row, "dateCollected")).trim();
    const parsedDate = Date.parse(dateCollected);
    if (Number.isFinite(parsedDate)) {
      const iso = new Date(parsedDate).toISOString();
      if (!latestCollectionDate || iso > latestCollectionDate) {
        latestCollectionDate = iso;
      }
    }
  }

  return {
    status: "live",
    source,
    raisedCents: collectedCents,
    goalCents: GOAL_CENTS,
    currency: "USD",
    paidCount: collectedCount,
    sponsorship: {
      sponsorRows: activeRows.length,
      askedCount,
      promisedCount,
      collectedCount,
      askedCents,
      promisedCents,
      collectedCents,
      openPromisedCents: Math.max(promisedCents - collectedCents, 0),
      porchesSponsored,
      latestCollectionDate,
    },
    asOf: nowIso(),
  };
}

async function googleSheetsAuth() {
  if (SPONSORSHIP_API_KEY) return SPONSORSHIP_API_KEY;
  const options = { scopes: [SHEETS_READONLY_SCOPE] };
  if (SERVICE_ACCOUNT_JSON) {
    options.credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
  }
  const auth = new google.auth.GoogleAuth(options);
  return await auth.getClient();
}

async function loadFromGoogleSheets() {
  if (!SPONSORSHIP_SHEET_ID) return null;
  const sheets = google.sheets({
    version: "v4",
    auth: await googleSheetsAuth(),
  });
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPONSORSHIP_SHEET_ID,
    range: SPONSORSHIP_SHEET_RANGE,
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  const rows = rowsFromValues(response.data.values ?? []);
  if (rows.length === 0) {
    throw new Error("Google Sheets sponsorship range returned zero rows");
  }
  return sponsorshipRollup(rows, "google-sheets");
}

async function loadFromCsv() {
  const csvText = SPONSORSHIP_CSV_BASE64
    ? Buffer.from(SPONSORSHIP_CSV_BASE64, "base64").toString("utf8")
    : SPONSORSHIP_CSV_PATH
      ? await readFile(SPONSORSHIP_CSV_PATH, "utf8")
      : null;
  if (!csvText) return null;
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) {
    throw new Error("Sponsorship CSV returned zero rows");
  }
  return sponsorshipRollup(
    rows,
    SPONSORSHIP_CSV_BASE64 ? "sponsorship-csv-env" : "sponsorship-csv",
  );
}

async function load() {
  try {
    const sheet = await loadFromGoogleSheets();
    if (sheet) return sheet;
  } catch (error) {
    console.warn(
      `money: Google Sheets sponsorship path failed (${error.message}); trying next source`,
    );
  }

  try {
    const csv = await loadFromCsv();
    if (csv) return csv;
  } catch (error) {
    console.warn(
      `money: sponsorship CSV path failed (${error.message}); trying ledger fallback`,
    );
  }

  const sql = openDb();

  if (!sql) {
    return {
      status: "pending",
      reason:
        "No read-only database configured (PORCHFEST_READONLY_DATABASE_URL unset).",
      raisedCents: 0,
      goalCents: GOAL_CENTS,
      currency: "USD",
      paidCount: 0,
      asOf: nowIso(),
    };
  }

  try {
    const rows = await withTenant(sql, (tx) =>
      tx`
        select
          coalesce(sum(amount_cents), 0)::bigint as raised_cents,
          count(*)::int                          as paid_count,
          coalesce(max(currency), 'USD')         as currency
        from event_application_billing_requests
        where paid_at is not null
      `,
    );
    const row = rows[0] ?? {};
    return {
      status: "live",
      raisedCents: Number(row.raised_cents ?? 0),
      goalCents: GOAL_CENTS,
      currency: row.currency ?? "USD",
      paidCount: Number(row.paid_count ?? 0),
      asOf: nowIso(),
    };
  } catch (error) {
    // Degrade honestly rather than fail the build: a money hiccup must not
    // take down the deploy. The page surfaces the reason.
    return {
      status: "pending",
      reason: `Money ledger read failed: ${error.message}`,
      raisedCents: 0,
      goalCents: GOAL_CENTS,
      currency: "USD",
      paidCount: 0,
      asOf: nowIso(),
    };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

process.stdout.write(JSON.stringify(await load()));
