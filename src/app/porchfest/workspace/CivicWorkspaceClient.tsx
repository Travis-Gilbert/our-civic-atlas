"use client";

/**
 * Planning workspace surface (Phase 4): embedded BlockSuite over the civic
 * Yjs store, with one-way capture-ledger ingestion on boot.
 *
 * The editor ships as a prebuilt static bundle (public/civic-editor/*,
 * built by npm run build:civic-editor) because BlockSuite 0.22's raw-TS
 * publishing model cannot pass through the Next build without contaminating
 * the atlas pipeline. The bundle is loaded via a module script tag and the
 * window bridge, so neither webpack nor turbopack tries to resolve it.
 *
 * Visual register: this route inherits the porchfest chrome (atlas.css +
 * porchfest.css via the layout). The BlockSuite surface itself renders with
 * the stock affine light theme for the BUILD slice; the civic-register
 * theming pass is design-gated and tracked in the planner folder.
 */

import {
  type FormEvent,
  type TouchEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useMutation, useQuery } from "urql";
import {
  CloudDownload,
  CloudUpload,
  Download,
  Map as MapIcon,
  Undo2,
} from "lucide-react";

import {
  EventApplicationsDocument,
  ExportCivicRowsToGoogleSheetDocument,
  GoogleWorkspaceConnectionDocument,
  RequestEventApplicationBillingDocument,
  SyncGoogleSheetCivicRowsDocument,
  type EventApplicationsQuery,
} from "@/lib/api/graphql/generated/graphql";
import { PlannerClientProvider } from "@/lib/api/graphql/PlannerClientProvider";
import { PorchfestForecastCard } from "@/components/atlas/PorchfestForecastCard";
import {
  loadCivicBridge,
  type CivicStoreApi,
  type CivicDocSummary,
  type CivicWorkspaceMounted,
} from "@/lib/civic/civic-editor-loader";
import { useNetworkStatus } from "@/lib/atlas/use-network-status";
import {
  mapEventApplicationToCivicFields,
  type EventApplicationLedgerRow,
} from "@/lib/civic/civic-ledger-ingest";
import {
  CIVIC_OBJECT_COLUMNS,
  PLANNING_STATUSES,
  type CivicColumnSpec,
  type CivicObjectFields,
  type PlanningStatus,
} from "@/lib/civic/civic-object-schema";
import {
  civicRowsToCsv,
  downloadTextFile,
  placedCivicRowsToGeoJson,
} from "@/lib/civic/civic-export";

const EVENT_SLUG = "porchfest-2026";
const APPLICATION_LEDGER_REFRESH_MS = 15_000;
const GOOGLE_SHEET_REFRESH_MS = 60_000;

type EventApplicationRow = EventApplicationsQuery["eventApplications"][number];
type CivicWorkspaceRow = ReturnType<CivicStoreApi["list"]>[number];
type MobileWorkspaceView = "table" | "kanban";
type MobileColumnKey =
  | "category"
  | "name"
  | "email"
  | "phone"
  | "city"
  | "feePaid"
  | "setTime"
  | "location";

interface MobileColumnDef {
  readonly key: MobileColumnKey;
  readonly label: string;
}

interface MobileDetailField {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly href?: string;
}

interface MobileDetailSection {
  readonly title: string;
  readonly fields: readonly MobileDetailField[];
}

const MOBILE_COLUMN_DEFS: readonly MobileColumnDef[] = [
  { key: "category", label: "Category" },
  { key: "name", label: "Contact" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "city", label: "City" },
  { key: "feePaid", label: "Fee" },
  { key: "setTime", label: "Set time" },
  { key: "location", label: "Map" },
];

const DEFAULT_MOBILE_COLUMNS: readonly MobileColumnKey[] = [
  "category",
  "name",
  "city",
  "feePaid",
  "location",
];

type MountState =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "error"; message: string };

type BillingNotice =
  | { kind: "idle" }
  | { kind: "success"; message: string; link?: string }
  | { kind: "error"; message: string };

type GoogleSyncNotice =
  | { kind: "idle"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

interface BillingSnapshot {
  billingRef?: string;
  paymentLinkUrl?: string;
  amountCents?: number;
}

function parseAmountCents(value: string): number | null {
  const normalized = value.trim().replace(/[$,]/g, "");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function googleFieldsToCivicFields(row: {
  sourceId: string;
  fields: unknown;
}): CivicObjectFields | null {
  const fields = objectValue(row.fields);
  if (!fields) return null;
  return {
    category: "other",
    ...(fields as Partial<CivicObjectFields>),
    sourceId: row.sourceId,
  } as CivicObjectFields;
}

function rowsForGoogleExport(rows: readonly CivicWorkspaceRow[]) {
  return rows.map((row) => {
    const sourceId = row.fields.sourceId ?? `civic-row:${row.rowId}`;
    return {
      sourceId,
      fields: {
        ...row.fields,
        sourceId,
      },
    };
  });
}

function exportDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDollarAmount(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function billingSnapshot(
  planningPayload: Record<string, unknown>,
): BillingSnapshot | null {
  const square = objectValue(planningPayload.square);
  if (!square) return null;
  const paymentLinkUrl = square.paymentLinkUrl;
  const billingRef = square.billingRequestId;
  const amountCents = square.amountCents;
  return {
    billingRef: typeof billingRef === "string" ? billingRef : undefined,
    paymentLinkUrl:
      typeof paymentLinkUrl === "string" ? paymentLinkUrl : undefined,
    amountCents: typeof amountCents === "number" ? amountCents : undefined,
  };
}

function applicationOptionLabel(row: EventApplicationRow): string {
  return [row.displayName, row.category, row.status].filter(Boolean).join(" · ");
}

function statusLabel(value: string): string {
  return value
    .split(/[-_]/g)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function rowStatus(row: CivicWorkspaceRow): PlanningStatus {
  const status = row.fields.status;
  return PLANNING_STATUSES.includes(status as PlanningStatus)
    ? (status as PlanningStatus)
    : "submitted";
}

function mobileRowTitle(row: CivicWorkspaceRow): string {
  return row.title.trim() || "Untitled application";
}

function fieldValue(row: CivicWorkspaceRow, key: MobileColumnKey): string {
  if (key === "location") return row.fields.location ? "Placed" : "Unplaced";
  const value = row.fields[key as keyof CivicObjectFields];
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return typeof value === "string" && value.trim() !== "" ? value : "—";
}

function detailSectionTitle(column: CivicColumnSpec): string {
  switch (column.scope) {
    case "shared":
      return "Application";
    case "planning":
      return "Planning";
    case "musician":
      return "Music";
    case "vendor":
      return "Vendor";
    case "entertainer":
      return "Entertainment";
    case "sponsor":
      return "Sponsorship";
    default:
      return "Proposal";
  }
}

function columnAppliesToRow(
  column: CivicColumnSpec,
  row: CivicWorkspaceRow,
): boolean {
  if (column.scope === "shared" || column.scope === "planning") return true;
  if (row.fields.category === column.scope) return true;
  return row.fields.category === "something_else" && column.scope === "other";
}

function externalLinkHref(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function detailValue(
  row: CivicWorkspaceRow,
  column: CivicColumnSpec,
): string | null {
  const key = column.key as keyof CivicObjectFields;
  const value = row.fields[key];
  if (column.key === "location") {
    return value ? "Placed on map" : null;
  }
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : null;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return column.key === "feePaid" || column.key === "paymentToBand"
      ? formatDollarAmount(value)
      : String(value);
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (column.type === "date") {
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? trimmed : date.toLocaleString();
  }
  return trimmed;
}

function mobileDetailSections(row: CivicWorkspaceRow): MobileDetailSection[] {
  const sections = new Map<string, MobileDetailField[]>();
  for (const column of CIVIC_OBJECT_COLUMNS) {
    if (!columnAppliesToRow(column, row)) continue;
    const value = detailValue(row, column);
    if (!value) continue;
    const title = detailSectionTitle(column);
    const fields = sections.get(title) ?? [];
    fields.push({
      key: column.key,
      label: column.name,
      value,
      href: column.type === "link" ? externalLinkHref(value) : undefined,
    });
    sections.set(title, fields);
  }
  return Array.from(sections, ([title, fields]) => ({ title, fields }));
}

function MobileWorkspaceSurface({
  rows,
  online,
  view,
  activeLane,
  visibleColumns,
  selectedRow,
  onViewChange,
  onLaneChange,
  onToggleColumn,
  onOpenRow,
  onCloseRow,
  onStatusChange,
}: {
  readonly rows: readonly CivicWorkspaceRow[];
  readonly online: boolean;
  readonly view: MobileWorkspaceView;
  readonly activeLane: PlanningStatus;
  readonly visibleColumns: ReadonlySet<MobileColumnKey>;
  readonly selectedRow: CivicWorkspaceRow | null;
  readonly onViewChange: (view: MobileWorkspaceView) => void;
  readonly onLaneChange: (status: PlanningStatus) => void;
  readonly onToggleColumn: (key: MobileColumnKey) => void;
  readonly onOpenRow: (rowId: string) => void;
  readonly onCloseRow: () => void;
  readonly onStatusChange: (rowId: string, status: PlanningStatus) => void;
}) {
  const visibleDefs = MOBILE_COLUMN_DEFS.filter((column) =>
    visibleColumns.has(column.key),
  );

  return (
    <section className="civic-mobile-workspace" aria-label="Applications">
      <div className="civic-mobile-toolbar">
        <div className="civic-mobile-segment" role="tablist" aria-label="View">
          <button
            type="button"
            role="tab"
            aria-selected={view === "table"}
            data-active={view === "table" || undefined}
            onClick={() => onViewChange("table")}
          >
            Table
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === "kanban"}
            data-active={view === "kanban" || undefined}
            onClick={() => onViewChange("kanban")}
          >
            Status
          </button>
        </div>
        <span className="civic-mobile-sync" data-online={online || undefined}>
          {online ? "Online" : "Offline"}
        </span>
      </div>
      <details className="civic-mobile-columns">
        <summary>Columns</summary>
        <div>
          {MOBILE_COLUMN_DEFS.map((column) => (
            <label key={column.key}>
              <input
                type="checkbox"
                checked={visibleColumns.has(column.key)}
                onChange={() => onToggleColumn(column.key)}
              />
              <span>{column.label}</span>
            </label>
          ))}
        </div>
      </details>
      {view === "table" ? (
        <MobileApplicationsTable
          rows={rows}
          visibleColumns={visibleDefs}
          onOpenRow={onOpenRow}
          onStatusChange={onStatusChange}
        />
      ) : (
        <MobileStatusLanes
          rows={rows}
          activeLane={activeLane}
          onLaneChange={onLaneChange}
          onOpenRow={onOpenRow}
          onStatusChange={onStatusChange}
        />
      )}
      {selectedRow ? (
        <MobileApplicationDetailSheet
          row={selectedRow}
          onClose={onCloseRow}
          onStatusChange={onStatusChange}
        />
      ) : null}
    </section>
  );
}

function MobileApplicationsTable({
  rows,
  visibleColumns,
  onOpenRow,
  onStatusChange,
}: {
  readonly rows: readonly CivicWorkspaceRow[];
  readonly visibleColumns: readonly MobileColumnDef[];
  readonly onOpenRow: (rowId: string) => void;
  readonly onStatusChange: (rowId: string, status: PlanningStatus) => void;
}) {
  if (rows.length === 0) {
    return <p className="civic-mobile-empty">No applications loaded.</p>;
  }

  return (
    <div className="civic-mobile-table-frame">
      <table className="civic-mobile-table">
        <thead>
          <tr>
            <th scope="col">Application</th>
            <th scope="col">Status</th>
            {visibleColumns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const title = mobileRowTitle(row);
            return (
              <tr key={row.rowId}>
                <th scope="row">
                  <button
                    type="button"
                    className="civic-mobile-title-button"
                    onClick={() => onOpenRow(row.rowId)}
                    aria-label={`Open application for ${title}`}
                  >
                    {title}
                  </button>
                </th>
                <td>
                  <select
                    value={rowStatus(row)}
                    aria-label={`Status for ${title}`}
                    onChange={(event) =>
                      onStatusChange(
                        row.rowId,
                        event.target.value as PlanningStatus,
                      )
                    }
                  >
                    {PLANNING_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>
                </td>
                {visibleColumns.map((column) => (
                  <td key={column.key}>{fieldValue(row, column.key)}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MobileStatusLanes({
  rows,
  activeLane,
  onLaneChange,
  onOpenRow,
  onStatusChange,
}: {
  readonly rows: readonly CivicWorkspaceRow[];
  readonly activeLane: PlanningStatus;
  readonly onLaneChange: (status: PlanningStatus) => void;
  readonly onOpenRow: (rowId: string) => void;
  readonly onStatusChange: (rowId: string, status: PlanningStatus) => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const laneRows = rows.filter((row) => rowStatus(row) === activeLane);
  const counts = useMemo(() => {
    const map = new Map<PlanningStatus, number>();
    for (const status of PLANNING_STATUSES) map.set(status, 0);
    for (const row of rows) {
      const status = rowStatus(row);
      map.set(status, (map.get(status) ?? 0) + 1);
    }
    return map;
  }, [rows]);

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    if (start == null) return;
    const end = event.changedTouches[0]?.clientX;
    if (end == null || Math.abs(end - start) < 48) return;
    const current = PLANNING_STATUSES.indexOf(activeLane);
    const nextIndex = end < start ? current + 1 : current - 1;
    const next = PLANNING_STATUSES[nextIndex];
    if (next) onLaneChange(next);
  };

  return (
    <section
      className="civic-mobile-lanes"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="civic-mobile-lane-tabs" role="tablist" aria-label="Status lanes">
        {PLANNING_STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={activeLane === status}
            data-active={activeLane === status || undefined}
            onClick={() => onLaneChange(status)}
          >
            <span>{statusLabel(status)}</span>
            <span>{counts.get(status) ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="civic-mobile-lane-stack">
        {laneRows.length > 0 ? (
          laneRows.map((row) => {
            const title = mobileRowTitle(row);
            return (
              <article key={row.rowId} className="civic-mobile-card">
                <div>
                  <h2>{title}</h2>
                  <p>{fieldValue(row, "category")} · {fieldValue(row, "city")}</p>
                  <button
                    type="button"
                    className="civic-mobile-open-button"
                    onClick={() => onOpenRow(row.rowId)}
                    aria-label={`Open application for ${title}`}
                  >
                    Open
                  </button>
                </div>
                <select
                  value={rowStatus(row)}
                  aria-label={`Status for ${title}`}
                  onChange={(event) =>
                    onStatusChange(row.rowId, event.target.value as PlanningStatus)
                  }
                >
                  {PLANNING_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </article>
            );
          })
        ) : (
          <p className="civic-mobile-empty">No applications in this status.</p>
        )}
      </div>
    </section>
  );
}

function MobileApplicationDetailSheet({
  row,
  onClose,
  onStatusChange,
}: {
  readonly row: CivicWorkspaceRow;
  readonly onClose: () => void;
  readonly onStatusChange: (rowId: string, status: PlanningStatus) => void;
}) {
  const sections = mobileDetailSections(row);
  const title = mobileRowTitle(row);
  return (
    <div className="civic-mobile-detail-backdrop" onClick={onClose}>
      <section
        className="civic-mobile-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Application details for ${title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="civic-mobile-detail-header">
          <div>
            <p>{statusLabel(rowStatus(row))}</p>
            <h2>{title}</h2>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <label className="civic-mobile-detail-status">
          <span>Status</span>
          <select
            value={rowStatus(row)}
            onChange={(event) =>
              onStatusChange(row.rowId, event.target.value as PlanningStatus)
            }
          >
            {PLANNING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <div className="civic-mobile-detail-scroll">
          {sections.length > 0 ? (
            sections.map((section) => (
              <section key={section.title} className="civic-mobile-detail-group">
                <h3>{section.title}</h3>
                <dl>
                  {section.fields.map((field) => (
                    <div key={field.key}>
                      <dt>{field.label}</dt>
                      <dd>
                        {field.href ? (
                          <a
                            href={field.href}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {field.value}
                          </a>
                        ) : (
                          field.value
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))
          ) : (
            <p className="civic-mobile-empty">No application details recorded.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function WorkspaceInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MountState>({ kind: "loading" });
  const mountedRef = useRef(false);
  const apiRef = useRef<CivicWorkspaceMounted | null>(null);
  const [docs, setDocs] = useState<CivicDocSummary[]>([]);
  const [currentDocId, setCurrentDocId] = useState("");
  const [mobileRows, setMobileRows] = useState<CivicWorkspaceRow[]>([]);
  const [mobileView, setMobileView] = useState<MobileWorkspaceView>("table");
  // Desktop database view (the BlockSuite block's active view). The segment
  // control on the Applications strip drives it through the bridge; the native
  // BlockSuite switcher is hidden in civic-editor-theme.css.
  const [dbView, setDbView] = useState<MobileWorkspaceView>("table");
  const [activeMobileLane, setActiveMobileLane] =
    useState<PlanningStatus>("submitted");
  const [selectedMobileRowId, setSelectedMobileRowId] = useState<string | null>(
    null,
  );
  const [visibleMobileColumns, setVisibleMobileColumns] = useState<
    ReadonlySet<MobileColumnKey>
  >(() => new Set(DEFAULT_MOBILE_COLUMNS));
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] = useState("");
  const [billingAmount, setBillingAmount] = useState("");
  const [billingNotice, setBillingNotice] = useState<BillingNotice>({
    kind: "idle",
  });
  const [googleNotice, setGoogleNotice] = useState<GoogleSyncNotice>({
    kind: "idle",
    message: "Google sync ready",
  });
  const [lastGoogleSyncAt, setLastGoogleSyncAt] = useState<string | null>(null);
  const googleSyncInFlightRef = useRef(false);
  const networkOnline = useNetworkStatus();

  const [applicationsResult, reexecuteApplications] = useQuery({
    query: EventApplicationsDocument,
    variables: { eventSlug: EVENT_SLUG },
  });
  const [billingResult, requestBilling] = useMutation(
    RequestEventApplicationBillingDocument,
  );
  const [googleConnectionResult, reexecuteGoogleConnection] = useQuery({
    query: GoogleWorkspaceConnectionDocument,
    variables: { eventSlug: EVENT_SLUG },
    requestPolicy: "cache-and-network",
  });
  const [, syncGoogleSheet] = useMutation(SyncGoogleSheetCivicRowsDocument);
  const [googleExportResult, exportCivicRowsToGoogleSheet] = useMutation(
    ExportCivicRowsToGoogleSheetDocument,
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      reexecuteApplications({ requestPolicy: "network-only" });
    }, APPLICATION_LEDGER_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [reexecuteApplications]);

  const applications = useMemo(
    () => applicationsResult.data?.eventApplications ?? [],
    [applicationsResult.data?.eventApplications],
  );

  useEffect(() => {
    if (!selectedApplicationId && applications.length > 0) {
      setSelectedApplicationId(applications[0]?.id ?? "");
    }
  }, [applications, selectedApplicationId]);

  const selectedApplication = useMemo(
    () => applications.find((row) => row.id === selectedApplicationId) ?? null,
    [applications, selectedApplicationId],
  );
  const selectedBilling = selectedApplication
    ? billingSnapshot(selectedApplication.planningPayload)
    : null;
  const selectedMobileRow = useMemo(
    () => mobileRows.find((row) => row.rowId === selectedMobileRowId) ?? null,
    [mobileRows, selectedMobileRowId],
  );
  const amountCents = parseAmountCents(billingAmount);
  const currentDoc = useMemo(
    () => docs.find((doc) => doc.id === currentDocId) ?? null,
    [docs, currentDocId],
  );
  const googleConnection =
    googleConnectionResult.data?.googleWorkspaceConnection ?? null;
  const googleSheetsConfigured = Boolean(googleConnection?.sheetsConfigured);
  const googleStatusDetail =
    googleConnectionResult.error?.message ?? googleConnection?.message ?? undefined;
  const googleStatus = googleConnectionResult.fetching
    ? "Checking Google Workspace"
    : googleSheetsConfigured
      ? "Google Sheets sync ready"
      : "Google Sheets sync needs backend configuration";
  const googleNoticeMessage =
    googleNotice.message && (googleNotice.kind !== "idle" || googleSheetsConfigured)
      ? googleNotice.message
      : null;
  const lastGoogleSyncLabel = lastGoogleSyncAt
    ? new Date(lastGoogleSyncAt).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

  const toggleMobileColumn = (key: MobileColumnKey) => {
    setVisibleMobileColumns((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleMobileStatusChange = (
    rowId: string,
    status: PlanningStatus,
  ) => {
    const mounted = apiRef.current;
    if (!mounted) return;
    mounted.api.update(rowId, "status", status);
    setMobileRows(mounted.api.list());
  };

  useEffect(() => {
    if (!selectedMobileRowId) return;
    if (mobileRows.some((row) => row.rowId === selectedMobileRowId)) return;
    setSelectedMobileRowId(null);
  }, [mobileRows, selectedMobileRowId]);

  async function handleBillingRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApplication) {
      setBillingNotice({ kind: "error", message: "Choose an application." });
      return;
    }
    if (!amountCents) {
      setBillingNotice({ kind: "error", message: "Enter a valid amount." });
      return;
    }

    setBillingNotice({ kind: "idle" });
    const result = await requestBilling({
      input: {
        eventApplicationId: selectedApplication.id,
        amountCents,
        currency: "USD",
        description: `PorchFest 2026 application: ${selectedApplication.displayName}`,
        redirectUrl: `${window.location.origin}/porchfest/workspace`,
        idempotencyKey: `${EVENT_SLUG}:${selectedApplication.id}:${amountCents}:usd`,
      },
    });

    if (result.error) {
      setBillingNotice({
        kind: "error",
        message: result.error.message,
      });
      return;
    }

    const payload = result.data?.requestEventApplicationBilling;
    const billing = payload?.billing;
    if (!billing) {
      setBillingNotice({
        kind: "error",
        message: "Billing request returned no record.",
      });
      return;
    }

    const mounted = apiRef.current;
    const localRow = mounted?.api
      .list()
      .find((row) => row.fields.sourceId === selectedApplication.sourceKey);
    if (mounted && localRow) {
      mounted.api.update(localRow.rowId, "billingRef", billing.id);
      mounted.api.update(localRow.rowId, "feePaid", billing.amountCents / 100);
      mounted.api.update(
        localRow.rowId,
        "status",
        payload.application?.status ?? "payment_requested",
      );
    }

    reexecuteApplications({ requestPolicy: "network-only" });
    setBillingNotice({
      kind: "success",
      message: `${payload.created ? "Created" : "Ready"} ${formatCurrency(
        billing.amountCents,
      )} link.`,
      link: billing.paymentLinkUrl ?? undefined,
    });
  }

  const runGoogleSheetImport = useCallback(
    async (mode: "auto" | "manual") => {
      if (googleSyncInFlightRef.current) return;
      const mounted = apiRef.current;
      if (!mounted || state.kind !== "ready") return;
      if (!googleSheetsConfigured) {
        if (mode === "manual") {
          setGoogleNotice({
            kind: "error",
            message:
              googleConnection?.message ?? "Google Sheets sync is not configured",
          });
        }
        return;
      }

      googleSyncInFlightRef.current = true;
      if (mode === "manual") {
        setGoogleNotice({ kind: "idle", message: "Syncing from Google" });
      }
      try {
        const result = await syncGoogleSheet({
          input: {
            eventSlug: EVENT_SLUG,
            targetKind: "applications",
          },
        });
        if (result.error) {
          setGoogleNotice({
            kind: "error",
            message: result.error.message,
          });
          return;
        }
        const payload = result.data?.syncGoogleSheetCivicRows;
        if (!payload) {
          setGoogleNotice({
            kind: "error",
            message: "Google sync returned no rows.",
          });
          return;
        }
        const rows = payload.rows.flatMap((row) => {
          const fields = googleFieldsToCivicFields(row);
          return fields ? [fields] : [];
        });
        const hydrated = mounted.api.hydrateExternalRows(rows);
        if (rows.length > 0) {
          setMobileRows(mounted.api.list());
        }
        setLastGoogleSyncAt(payload.importedAt ?? new Date().toISOString());
        setGoogleNotice({
          kind: "success",
          message: `Google imported ${payload.rowCount} row(s): ${hydrated.inserted} new, ${hydrated.updated} updated.`,
        });
        reexecuteGoogleConnection({ requestPolicy: "network-only" });
      } finally {
        googleSyncInFlightRef.current = false;
      }
    },
    [
      googleConnection?.message,
      googleSheetsConfigured,
      reexecuteGoogleConnection,
      state.kind,
      syncGoogleSheet,
    ],
  );

  const handleExportToGoogleSheet = async () => {
    const mounted = apiRef.current;
    if (!mounted) return;
    if (!googleSheetsConfigured) {
      setGoogleNotice({
        kind: "error",
        message:
          googleConnection?.message ?? "Google Sheets export is not configured",
      });
      return;
    }
    const rows = rowsForGoogleExport(mounted.api.list());
    const confirmed = window.confirm(
      `Update the configured Google Sheet with ${rows.length} workspace row(s)?`,
    );
    if (!confirmed) return;

    setGoogleNotice({ kind: "idle", message: "Updating Google Sheet" });
    const result = await exportCivicRowsToGoogleSheet({
      input: {
        eventSlug: EVENT_SLUG,
        targetKind: "applications",
        rows,
        dryRun: false,
      },
    });
    if (result.error) {
      setGoogleNotice({
        kind: "error",
        message: result.error.message,
      });
      return;
    }
    const payload = result.data?.exportCivicRowsToGoogleSheet;
    if (!payload) {
      setGoogleNotice({
        kind: "error",
        message: "Google export returned no result.",
      });
      return;
    }
    setGoogleNotice({
      kind: "success",
      message: `Updated ${payload.rowCount} row(s) in Google Sheets.`,
    });
    reexecuteGoogleConnection({ requestPolicy: "network-only" });
  };

  const handleDownloadCsv = () => {
    const mounted = apiRef.current;
    if (!mounted) return;
    downloadTextFile(
      `${EVENT_SLUG}-applications-${exportDateStamp()}.csv`,
      civicRowsToCsv(mounted.api.list()),
      "text/csv;charset=utf-8",
    );
  };

  const handleDownloadGeoJson = () => {
    const mounted = apiRef.current;
    if (!mounted) return;
    downloadTextFile(
      `${EVENT_SLUG}-placed-${exportDateStamp()}.geojson`,
      `${JSON.stringify(placedCivicRowsToGeoJson(mounted.api.list()), null, 2)}\n`,
      "application/geo+json;charset=utf-8",
    );
  };

  // Mount the editor bundle once.
  useEffect(() => {
    if (mountedRef.current || !containerRef.current) return;
    mountedRef.current = true;
    let disposed = false;
    let offChange: (() => void) | undefined;

    let offDocs: (() => void) | undefined;
    let offHistory: (() => void) | undefined;
    loadCivicBridge()
      .then((bridge) => bridge.mount(containerRef.current as HTMLElement))
      .then((mounted) => {
        if (disposed) {
          mounted.destroy();
          return;
        }
        apiRef.current = mounted;
        const refresh = () => {
          setMobileRows(mounted.api.list());
          setState({ kind: "ready" });
        };
        offChange = mounted.api.onChange(refresh);
        const refreshDocs = () => {
          const list = mounted.docs();
          setDocs(list);
          // A deletion arriving over sync can orphan the open doc; fall
          // back to the applications doc (always first in the rail) rather
          // than leave the editor on a disposed store.
          if (!list.some((doc) => doc.id === mounted.currentDocId())) {
            const fallback = list[0]?.id;
            if (fallback) mounted.openDoc(fallback);
          }
          setCurrentDocId(mounted.currentDocId());
        };
        offDocs = mounted.onDocsChanged(refreshDocs);
        const refreshHistory = () => setCanUndo(mounted.canUndo());
        offHistory = mounted.onHistoryChanged(refreshHistory);
        refreshDocs();
        refresh();
        refreshHistory();
      })
      .catch((error: unknown) => {
        setState({
          kind: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });

    return () => {
      disposed = true;
      offChange?.();
      offDocs?.();
      offHistory?.();
      apiRef.current?.destroy();
      apiRef.current = null;
    };
  }, []);

  // Deep link: /porchfest/workspace?view=kanban opens the kanban view. Read
  // once on mount; the apply effect below drives the editor when it is ready.
  useEffect(() => {
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "kanban" || view === "table") {
      setDbView(view);
      setMobileView(view);
    }
  }, []);

  // Apply the desired database view whenever it changes or the applications doc
  // becomes active. switchView retries internally until the block renders, so
  // this lands the deep link on first paint and the segment control on click.
  useEffect(() => {
    if (
      state.kind === "ready" &&
      (currentDoc?.kind === "applications" || currentDoc?.kind === "tasks")
    ) {
      apiRef.current?.switchView(dbView);
    }
  }, [state.kind, currentDoc?.kind, dbView]);

  const handleOpenDoc = (docId: string) => {
    apiRef.current?.openDoc(docId);
    setCurrentDocId(docId);
    setCanUndo(apiRef.current?.canUndo() ?? false);
    setDeleteNotice(null);
    setCreateMenuOpen(false);
  };

  const handleUndo = () => {
    const mounted = apiRef.current;
    if (!mounted?.undo()) return;
    setMobileRows(mounted.api.list());
    setDocs(mounted.docs());
    setCurrentDocId(mounted.currentDocId());
    setCanUndo(mounted.canUndo());
  };

  const currentDatabaseView =
    currentDoc?.kind === "applications" ? mobileView : dbView;

  const handleDatabaseViewChange = (view: MobileWorkspaceView) => {
    if (currentDoc?.kind === "applications") {
      setMobileView(view);
    }
    setDbView(view);
  };

  const handleNewNote = () => {
    const mounted = apiRef.current;
    if (!mounted) return;
    const docId = mounted.createNote("Untitled note");
    setDocs(mounted.docs());
    handleOpenDoc(docId);
  };

  const handleNewTodoList = () => {
    const mounted = apiRef.current;
    if (!mounted) return;
    const docId = mounted.createTodoList("Untitled to-do list");
    setDocs(mounted.docs());
    handleOpenDoc(docId);
  };

  const handleDeleteDoc = (doc: CivicDocSummary) => {
    const mounted = apiRef.current;
    if (!mounted) return;
    // The store is shared CRDT state: this deletion lands on every
    // organizer's workspace, so it gets a hard confirm.
    const confirmed = window.confirm(
      `Delete "${doc.title}"? This removes it for every organizer.`,
    );
    if (!confirmed) return;
    if (!mounted.deleteWorkspaceDoc(doc.id)) {
      setDeleteNotice(`"${doc.title}" cannot be deleted.`);
      return;
    }
    setDeleteNotice(null);
    setDocs(mounted.docs());
    setCurrentDocId(mounted.currentDocId());
  };

  // One-way ledger ingestion whenever fresh application rows arrive.
  useEffect(() => {
    const rows = applicationsResult.data?.eventApplications;
    const mounted = apiRef.current;
    if (!rows || !mounted || state.kind !== "ready") {
      return;
    }
    const mapped = rows.map((row) =>
      mapEventApplicationToCivicFields(row as EventApplicationLedgerRow),
    );
    const dropped = mapped.flatMap((m) => m.droppedKeys);
    if (dropped.length > 0) {
      console.warn(
        "civic ingestion: unmapped categoryPayload keys (kept in ledger, not in workspace):",
        Array.from(new Set(dropped)),
      );
    }
    const hydrated = mounted.api.hydrateExternalRows(mapped.map((m) => m.fields));
    if (hydrated.inserted > 0 || hydrated.updated > 0 || rows.length > 0) {
      setMobileRows(mounted.api.list());
    }
  }, [applicationsResult.data, state.kind]);

  useEffect(() => {
    if (state.kind !== "ready" || !googleSheetsConfigured) return;
    void runGoogleSheetImport("auto");
    const interval = window.setInterval(() => {
      void runGoogleSheetImport("auto");
    }, GOOGLE_SHEET_REFRESH_MS);
    return () => window.clearInterval(interval);
  }, [googleSheetsConfigured, runGoogleSheetImport, state.kind]);

  return (
    <div className="civic-workspace-shell">
      <header className="civic-workspace-header">
        <nav className="civic-workspace-nav" aria-label="Planner surfaces">
          <a href="/porchfest">Map</a>
          <a href="/porchfest/apply">Applications</a>
        </nav>
      </header>
      <div className="civic-workspace-docbar" role="tablist" aria-label="Workspace docs">
        {docs.map((doc) => (
          // Buttons cannot nest, so the tab pill is a presentation wrapper
          // around the tab button and (for notes) the delete affordance.
          <span
            key={doc.id}
            role="presentation"
            className="civic-workspace-doctab"
            data-current={doc.id === currentDocId || undefined}
            data-kind={doc.kind}
          >
            <button
              type="button"
              role="tab"
              aria-selected={doc.id === currentDocId}
              className="civic-workspace-doctab-open"
              onClick={() => handleOpenDoc(doc.id)}
            >
              {doc.title}
            </button>
            {doc.kind !== "applications" && doc.kind !== "inbox" ? (
              <button
                type="button"
                className="planner-iconbtn civic-workspace-doctab-delete"
                aria-label={`Delete ${
                  doc.kind === "todo-list" ? "to-do list" : "note"
                } "${doc.title}"`}
                onClick={() => handleDeleteDoc(doc)}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
        <span className="civic-workspace-newdoc">
          <button
            type="button"
            className="civic-workspace-doctab civic-workspace-doctab--new"
            aria-haspopup="menu"
            aria-expanded={createMenuOpen}
            onClick={() => setCreateMenuOpen((open) => !open)}
            disabled={state.kind !== "ready"}
          >
            + New
          </button>
          {createMenuOpen && state.kind === "ready" ? (
            <span className="civic-workspace-newdoc-menu" role="menu">
              <button type="button" role="menuitem" onClick={handleNewTodoList}>
                To-do list
              </button>
              <button type="button" role="menuitem" onClick={handleNewNote}>
                Note
              </button>
            </span>
          ) : null}
        </span>
        {deleteNotice ? (
          <span className="planner-note civic-workspace-docnote" role="status">
            {deleteNotice}
          </span>
        ) : null}
        <div className="civic-workspace-actions">
          {currentDoc?.kind === "applications" ||
          currentDoc?.kind === "tasks" ? (
            <div
              className="civic-workspace-viewseg"
              role="group"
              aria-label="Database view"
            >
              <button
                type="button"
                data-active={currentDatabaseView === "table" || undefined}
                aria-pressed={currentDatabaseView === "table"}
                onClick={() => handleDatabaseViewChange("table")}
              >
                Table
              </button>
              <button
                type="button"
                data-active={currentDatabaseView === "kanban" || undefined}
                aria-pressed={currentDatabaseView === "kanban"}
                onClick={() => handleDatabaseViewChange("kanban")}
              >
                Kanban
              </button>
            </div>
          ) : null}
          <button
            type="button"
            className="civic-workspace-export-button"
            title="Export CSV"
            onClick={handleDownloadCsv}
            disabled={state.kind !== "ready"}
          >
            <Download aria-hidden="true" size={14} strokeWidth={2} />
            <span>CSV</span>
          </button>
          <button
            type="button"
            className="civic-workspace-export-button"
            title="Export GeoJSON"
            onClick={handleDownloadGeoJson}
            disabled={state.kind !== "ready"}
          >
            <MapIcon aria-hidden="true" size={14} strokeWidth={2} />
            <span>GeoJSON</span>
          </button>
          <button
            type="button"
            className="civic-workspace-history-button"
            aria-label="Undo last workspace edit"
            title="Undo"
            onClick={handleUndo}
            disabled={state.kind !== "ready" || !canUndo}
          >
            <Undo2 aria-hidden="true" size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
      <div className="civic-weather-band">
        <PorchfestForecastCard />
      </div>
      <section className="civic-google-band" aria-label="Google Workspace sync">
        <div
          className="civic-google-status"
          data-kind={googleNotice.kind}
          title={googleStatusDetail}
        >
          <span>{googleStatus}</span>
          {lastGoogleSyncLabel ? <span>Last sync {lastGoogleSyncLabel}</span> : null}
          {googleNoticeMessage ? <span>{googleNoticeMessage}</span> : null}
        </div>
        <div className="civic-google-actions">
          <button
            type="button"
            className="civic-google-button"
            onClick={() => void runGoogleSheetImport("manual")}
            disabled={state.kind !== "ready" || !googleSheetsConfigured}
          >
            <CloudDownload aria-hidden="true" size={16} strokeWidth={2} />
            <span>Sync from Google</span>
          </button>
          <button
            type="button"
            className="civic-google-button civic-google-button--write"
            onClick={() => void handleExportToGoogleSheet()}
            disabled={
              state.kind !== "ready" ||
              !googleSheetsConfigured ||
              googleExportResult.fetching
            }
          >
            <CloudUpload aria-hidden="true" size={16} strokeWidth={2} />
            <span>
              {googleExportResult.fetching ? "Updating" : "Update Google Sheet"}
            </span>
          </button>
        </div>
      </section>
      <form className="civic-billing-band" onSubmit={handleBillingRequest}>
        <div className="civic-billing-field civic-billing-field--application">
          <label htmlFor="civic-billing-application">Application</label>
          <select
            id="civic-billing-application"
            value={selectedApplicationId}
            disabled={applications.length === 0}
            onChange={(event) => {
              setSelectedApplicationId(event.target.value);
              setBillingNotice({ kind: "idle" });
            }}
          >
            {applications.length === 0 ? (
              <option value="">No applications loaded</option>
            ) : (
              applications.map((row) => (
                <option key={row.id} value={row.id}>
                  {applicationOptionLabel(row)}
                </option>
              ))
            )}
          </select>
        </div>
        <div className="civic-billing-field">
          <label htmlFor="civic-billing-amount">Amount</label>
          <input
            id="civic-billing-amount"
            inputMode="decimal"
            placeholder="0.00"
            value={billingAmount}
            onChange={(event) => {
              setBillingAmount(event.target.value);
              setBillingNotice({ kind: "idle" });
            }}
          />
        </div>
        <button
          className="civic-billing-button"
          type="submit"
          disabled={!selectedApplication || !amountCents || billingResult.fetching}
        >
          {billingResult.fetching ? "Requesting" : "Request link"}
        </button>
        <div className="civic-billing-status" aria-live="polite">
          {billingNotice.kind === "success" ? (
            <>
              <span>{billingNotice.message}</span>
              {billingNotice.link ? (
                <a href={billingNotice.link} target="_blank" rel="noreferrer">
                  Open link
                </a>
              ) : null}
            </>
          ) : billingNotice.kind === "error" ? (
            <span role="alert">{billingNotice.message}</span>
          ) : selectedBilling?.paymentLinkUrl ? (
            <>
              <span>
                Existing {formatCurrency(selectedBilling.amountCents ?? 0)} link
              </span>
              <a
                href={selectedBilling.paymentLinkUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open link
              </a>
            </>
          ) : selectedBilling?.billingRef ? (
            <span>Billing ref {selectedBilling.billingRef}</span>
          ) : null}
        </div>
      </form>
      {state.kind === "error" ? (
        <p className="civic-workspace-error" role="alert">
          {state.message}
        </p>
      ) : null}
      {currentDoc?.kind === "applications" ? (
        <MobileWorkspaceSurface
          rows={mobileRows}
          online={networkOnline}
          view={mobileView}
          activeLane={activeMobileLane}
          visibleColumns={visibleMobileColumns}
          selectedRow={selectedMobileRow}
          onViewChange={setMobileView}
          onLaneChange={setActiveMobileLane}
          onToggleColumn={toggleMobileColumn}
          onOpenRow={setSelectedMobileRowId}
          onCloseRow={() => setSelectedMobileRowId(null)}
          onStatusChange={handleMobileStatusChange}
        />
      ) : null}
      <div
        ref={containerRef}
        className="civic-workspace-editor"
        data-mobile-replaced={
          currentDoc?.kind === "applications" ? "true" : undefined
        }
      />
      <style>{`
        .civic-workspace-shell {
          display: flex;
          flex-direction: column;
          /* The porchfest layout wraps routes in overflow-hidden h-full for
             the map surface, so the page itself can never scroll here. The
             shell pins to the viewport and scrolling happens inside the
             editor's .affine-page-viewport (see the editor pane rules). */
          height: 100vh;
          height: 100dvh;
          background: #ffffff;
          color: #1c1c1c;
        }
        /* Top-strip treatment (carried over from AtlasSceneChrome): no
           full-width band, no big wordmark. The kicker overline carries
           the identity, the h1 stays for the document outline but reads
           as a quiet line, and the nav is a content-hugging hairline
           strip anchored right. */
        /* The overline + page-title block was removed; the header is now a
           slim right-aligned nav strip, reclaiming the vertical space. */
        .civic-workspace-header {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 16px;
          padding: 8px 24px 0;
        }
        .civic-workspace-nav {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 4px;
          border: 1px solid #e2e2e2;
          border-radius: 9999px;
          background: #ffffff;
          box-shadow: 0 1px 2px rgba(28, 28, 28, 0.05);
        }
        .civic-workspace-nav a {
          padding: 6px 12px;
          border: 1px solid transparent;
          border-radius: 9999px;
          background: transparent;
          color: #454545;
          font-family: var(--font-mono, inherit);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-decoration: none;
          white-space: nowrap;
        }
        .civic-workspace-nav a:hover {
          border-color: #e2e2e2;
          color: #1c1c1c;
        }
        /* Lane 1d: the doc tabs, the view segment, and the billing band read
           as ONE chrome strip, not three stacked bands, so the docbar drops
           its own divider and the billing band below carries the single
           bottom hairline. */
        .civic-workspace-docbar {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 8px 24px 6px;
          overflow-x: auto;
        }
        /* View segment control (Lane 1c): owns table/kanban switching now that
           the native BlockSuite switcher is hidden. Anchored right on the
           strip; reads as a compact pill in the Observable register. */
        .civic-workspace-actions {
          display: inline-flex;
          margin-left: auto;
          align-items: center;
          gap: 6px;
        }
        .civic-workspace-viewseg {
          display: inline-flex;
          padding: 2px;
          border: 1px solid #e2e2e2;
          border-radius: 9999px;
          background: #ffffff;
          gap: 2px;
        }
        .civic-workspace-viewseg button {
          padding: 4px 12px;
          border: 0;
          border-radius: 9999px;
          background: transparent;
          color: #454545;
          font-family: var(--font-mono, inherit);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          cursor: pointer;
        }
        .civic-workspace-viewseg button:hover {
          color: #1c1c1c;
        }
        .civic-workspace-viewseg button[data-active] {
          background: #f1f6fb;
          color: #005186;
        }
        .civic-workspace-export-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          min-width: 34px;
          height: 30px;
          padding: 0 9px;
          border: 1px solid #e2e2e2;
          border-radius: 9999px;
          background: #ffffff;
          color: #1c1c1c;
          font-family: var(--font-mono, inherit);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          cursor: pointer;
        }
        .civic-workspace-export-button:hover:not(:disabled) {
          border-color: #005186;
          color: #005186;
          background: #f1f6fb;
        }
        .civic-workspace-export-button:disabled {
          color: #b8b8b8;
          cursor: default;
          background: #f5f5f5;
        }
        .civic-workspace-history-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          padding: 0;
          border: 1px solid #e2e2e2;
          border-radius: 9999px;
          background: #ffffff;
          color: #1c1c1c;
          cursor: pointer;
        }
        .civic-workspace-history-button:hover:not(:disabled) {
          border-color: #005186;
          color: #005186;
          background: #f1f6fb;
        }
        .civic-workspace-history-button:disabled {
          color: #b8b8b8;
          cursor: default;
          background: #f5f5f5;
        }
        .civic-workspace-doctab {
          display: inline-flex;
          align-items: center;
          border: 1px solid transparent;
          border-radius: 4px;
          background: transparent;
          color: #454545;
          font-size: 13px;
          white-space: nowrap;
        }
        .civic-workspace-doctab:hover {
          background: #f5f5f5;
          color: #1c1c1c;
        }
        .civic-workspace-doctab[data-current] {
          background: #f1f6fb;
          border-color: #005186;
          color: #005186;
        }
        .civic-workspace-doctab[data-current] .civic-workspace-doctab-open {
          font-weight: 600;
        }
        .civic-workspace-doctab[data-kind="todo-list"]::before {
          content: "";
          width: 6px;
          height: 6px;
          margin-left: 8px;
          border-radius: 9999px;
          background: #005186;
        }
        .civic-workspace-doctab[data-kind="todo-list"] .civic-workspace-doctab-open {
          padding-left: 6px;
        }
        .civic-workspace-doctab-open {
          padding: 6px 12px;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          cursor: pointer;
          white-space: nowrap;
        }
        /* Note tabs: the title button cedes its right padding to the 16px
           delete target so the x sits inside the pill. */
        .civic-workspace-doctab-open:not(:only-child) {
          padding-right: 4px;
        }
        .civic-workspace-doctab-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          margin-right: 6px;
          padding: 0;
          border: 0;
          background: transparent;
          font-size: 13px;
          line-height: 1;
          cursor: pointer;
        }
        .civic-workspace-doctab--new {
          padding: 6px 12px;
          color: #005186;
          font-weight: 600;
          cursor: pointer;
        }
        .civic-workspace-doctab--new:disabled {
          color: #c5c5c5;
          cursor: default;
          background: transparent;
        }
        .civic-workspace-newdoc {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .civic-workspace-newdoc-menu {
          position: absolute;
          z-index: 30;
          top: calc(100% + 4px);
          left: 0;
          display: grid;
          min-width: 132px;
          padding: 4px;
          border: 1px solid #d7d7d7;
          border-radius: 6px;
          background: #ffffff;
          box-shadow: 0 10px 24px rgba(28, 28, 28, 0.12);
        }
        .civic-workspace-newdoc-menu button {
          width: 100%;
          padding: 7px 9px;
          border: 0;
          border-radius: 4px;
          background: transparent;
          color: #1c1c1c;
          font: inherit;
          font-size: 12px;
          text-align: left;
          cursor: pointer;
        }
        .civic-workspace-newdoc-menu button:hover {
          background: #f1f6fb;
          color: #005186;
        }
        .civic-workspace-docnote {
          margin: 0 0 0 8px;
          padding: 4px 10px;
          white-space: nowrap;
        }
        .civic-workspace-overline {
          margin: 0;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.6px;
          text-transform: uppercase;
          color: #454545;
        }
        /* Quiet page title, not a wordmark: the overline above it is
           the identity. Kept as an h1 for the document outline. */
        .civic-workspace-header h1 {
          margin: 2px 0 0;
          font-family: var(--font-mono, inherit);
          font-size: 13px;
          font-weight: 600;
          line-height: 18px;
        }
        /* Event-day weather (Lane 4 Tier 1): a quiet metadata line under the
           tab strip, never a centerpiece card. */
        .civic-weather-band {
          padding: 4px 24px 8px;
        }
        .civic-google-band {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: start;
          gap: 12px;
          padding: 6px 24px;
          border-top: 1px solid #eeeeee;
          background: #fbfbfb;
        }
        .civic-google-status {
          display: flex;
          min-width: 0;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px;
          color: #454545;
          font-size: 12px;
          line-height: 16px;
        }
        .civic-google-status span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: normal;
        }
        .civic-google-status[data-kind="success"] span:last-child {
          color: #005186;
          font-weight: 700;
        }
        .civic-google-status[data-kind="error"] span:last-child {
          color: #9f1f1f;
          font-weight: 700;
        }
        .civic-google-actions {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          gap: 8px;
        }
        .civic-google-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 32px;
          padding: 0 12px;
          border: 1px solid #cfcfcf;
          border-radius: 2px;
          background: #ffffff;
          color: #1c1c1c;
          font-family: var(--font-mono, inherit);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
          cursor: pointer;
        }
        .civic-google-button:hover:not(:disabled) {
          border-color: #005186;
          color: #005186;
          background: #f1f6fb;
        }
        .civic-google-button--write {
          border-color: #1c1c1c;
        }
        .civic-google-button:disabled {
          border-color: #d7d7d7;
          background: #f5f5f5;
          color: #9a9a9a;
          cursor: default;
        }
        .civic-billing-band {
          display: grid;
          grid-template-columns: minmax(220px, 1fr) 112px auto minmax(0, 280px);
          gap: 12px;
          align-items: end;
          /* Hugs the docbar above it: together they are one chrome strip with
             a single bottom hairline (Lane 1d). */
          padding: 6px 24px 12px;
          border-bottom: 1px solid #e2e2e2;
          background: #ffffff;
        }
        .civic-billing-field {
          min-width: 0;
        }
        .civic-billing-field label {
          display: block;
          margin: 0 0 4px;
          font-family: var(--font-mono, inherit);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #454545;
        }
        .civic-billing-field select,
        .civic-billing-field input {
          width: 100%;
          height: 34px;
          border: 1px solid #cfcfcf;
          border-radius: 2px;
          background: #ffffff;
          color: #1c1c1c;
          font: inherit;
          font-size: 13px;
        }
        .civic-billing-field select {
          padding: 0 28px 0 10px;
        }
        .civic-billing-field input {
          padding: 0 10px;
        }
        .civic-billing-button {
          height: 34px;
          padding: 0 14px;
          border: 1px solid #1c1c1c;
          border-radius: 2px;
          background: #1c1c1c;
          color: #ffffff;
          font-family: var(--font-mono, inherit);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .civic-billing-button:disabled {
          border-color: #b8b8b8;
          background: #e6e6e6;
          color: #777777;
        }
        .civic-billing-status {
          min-height: 34px;
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          color: #454545;
          font-size: 12px;
          line-height: 16px;
        }
        .civic-billing-status span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .civic-billing-status a {
          flex: 0 0 auto;
          color: #1c1c1c;
          font-weight: 700;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .civic-workspace-error {
          margin: 0;
          padding: 8px 24px;
          border-bottom: 1px solid #e2e2e2;
          color: #1c1c1c;
          font-family: var(--font-mono, inherit);
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .civic-workspace-editor {
          flex: 1;
          min-height: 0;
          /* The pane is a fixed frame, not the scroll container: BlockSuite
             page mode binds every scroll behavior (caret follow while
             typing, drag-handle autoscroll, click-to-append in the blank
             area below the last block, getScrollContainer for sticky
             database headers) to .affine-page-viewport, so that element
             must own the scrolling. When the pane scrolled instead, the
             applications database happened to work (native wheel over a
             grown pane) but freshly created note docs could not scroll:
             the viewport never overflowed and caret follow no-oped. */
          overflow: hidden;
          background: #ffffff;
        }
        .civic-workspace-editor affine-editor-container {
          display: block;
          height: 100%;
          --affine-editor-width: min(1100px, calc(100vw - 48px));
          --affine-editor-side-padding: clamp(16px, 2vw, 28px);
        }
        /* Same height contract the upstream BlockSuite playground and
           AFFiNE apply to the page editor: a definite-height
           .affine-page-viewport (overflow-y auto in the component styles)
           with the editor wrapper filling it, so page content taller than
           the pane scrolls inside the viewport for every doc, applications
           and organizer notes alike. */
        .civic-workspace-editor .affine-page-viewport {
          height: 100%;
          overscroll-behavior: contain;
        }
        .civic-workspace-editor .playground-page-editor-container {
          height: 100%;
        }
        .civic-mobile-workspace {
          display: none;
        }
        @media (min-width: 781px) {
          .civic-mobile-workspace {
            display: flex;
            flex: 1;
            min-height: 0;
            flex-direction: column;
            gap: 8px;
            padding: 10px 24px 16px;
            background: #ffffff;
          }
          .civic-workspace-editor[data-mobile-replaced="true"] {
            display: none;
          }
          .civic-mobile-toolbar {
            display: none;
          }
          .civic-mobile-columns {
            border: 1px solid #e2e2e2;
            border-radius: 6px;
            background: #fbfbfb;
          }
          .civic-mobile-columns summary {
            min-height: 30px;
            padding: 6px 10px;
            color: #1c1c1c;
            font-family: var(--font-mono, inherit);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            cursor: pointer;
          }
          .civic-mobile-columns > div {
            display: grid;
            grid-template-columns: repeat(4, minmax(140px, 1fr));
            gap: 8px 12px;
            padding: 0 12px 12px;
          }
          .civic-mobile-columns label {
            display: flex;
            align-items: center;
            gap: 7px;
            min-height: 28px;
            color: #454545;
            font-size: 12px;
          }
          .civic-mobile-columns input {
            accent-color: #005186;
          }
          .civic-mobile-table-frame {
            flex: 1;
            min-height: 0;
            overflow: auto;
            border: 1px solid #e2e2e2;
            border-radius: 6px;
            background: #ffffff;
          }
          .civic-mobile-table {
            min-width: 860px;
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          .civic-mobile-table th,
          .civic-mobile-table td {
            padding: 8px 10px;
            border-bottom: 1px solid #e2e2e2;
            text-align: left;
            vertical-align: middle;
          }
          .civic-mobile-table thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: #f5f5f5;
            color: #454545;
            font-family: var(--font-mono, inherit);
            font-size: 10px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .civic-mobile-table tbody th {
            max-width: 260px;
            color: #1c1c1c;
            font-weight: 600;
          }
          .civic-mobile-title-button {
            max-width: 100%;
            padding: 0;
            border: 0;
            background: transparent;
            color: #005186;
            font: inherit;
            font-weight: 650;
            text-align: left;
            text-decoration: underline;
            text-underline-offset: 3px;
            cursor: pointer;
          }
          .civic-mobile-table select,
          .civic-mobile-card select,
          .civic-mobile-detail-status select {
            min-height: 32px;
            border: 1px solid #cfcfcf;
            border-radius: 4px;
            background: #ffffff;
            color: #1c1c1c;
            font: inherit;
          }
          .civic-mobile-table select {
            width: 160px;
            padding: 0 8px;
          }
          .civic-mobile-lanes {
            display: flex;
            flex: 1;
            min-height: 0;
            flex-direction: column;
            gap: 10px;
          }
          .civic-mobile-lane-tabs {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            padding-bottom: 2px;
            scroll-snap-type: x mandatory;
          }
          .civic-mobile-lane-tabs button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 34px;
            flex: 0 0 auto;
            padding: 0 10px;
            border: 1px solid transparent;
            border-radius: 999px;
            background: #f5f5f5;
            color: #454545;
            font: inherit;
            font-size: 13px;
            cursor: pointer;
            scroll-snap-align: start;
          }
          .civic-mobile-lane-tabs button[data-active] {
            border-color: #005186;
            background: #ffffff;
            color: #005186;
          }
          .civic-mobile-lane-tabs button span:last-child {
            color: #454545;
            font-variant-numeric: tabular-nums;
          }
          .civic-mobile-lane-stack {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding-right: 2px;
          }
          .civic-mobile-card {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 168px;
            gap: 12px;
            align-items: start;
            margin-bottom: 8px;
            padding: 12px;
            border: 1px solid #e2e2e2;
            border-radius: 6px;
            background: #ffffff;
          }
          .civic-mobile-card h2 {
            margin: 0;
            color: #1c1c1c;
            font-size: 15px;
            font-weight: 650;
            line-height: 1.25;
          }
          .civic-mobile-card p {
            margin: 4px 0 0;
            color: #454545;
            font-size: 12px;
            line-height: 1.35;
          }
          .civic-mobile-card select {
            width: 100%;
            padding: 0 8px;
          }
          .civic-mobile-open-button {
            margin-top: 8px;
            min-height: 30px;
            padding: 0 10px;
            border: 1px solid #005186;
            border-radius: 999px;
            background: #ffffff;
            color: #005186;
            font-family: var(--font-mono, inherit);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .civic-mobile-detail-backdrop {
            position: fixed;
            inset: 0;
            z-index: 50;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
            background: rgba(28, 28, 28, 0.28);
          }
          .civic-mobile-detail-sheet {
            display: flex;
            width: min(760px, 100%);
            max-height: calc(100dvh - 48px);
            flex-direction: column;
            border: 1px solid #d8d8d8;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 20px 60px -36px rgba(0, 0, 0, 0.5);
          }
          .civic-mobile-detail-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 16px 10px;
            border-bottom: 1px solid #e2e2e2;
          }
          .civic-mobile-detail-header p {
            margin: 0 0 4px;
            font-family: var(--font-mono, inherit);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #454545;
          }
          .civic-mobile-detail-header h2 {
            margin: 0;
            color: #1c1c1c;
            font-size: 20px;
            line-height: 1.2;
          }
          .civic-mobile-detail-header button {
            min-height: 32px;
            padding: 0 10px;
            border: 1px solid #cfcfcf;
            border-radius: 999px;
            background: #ffffff;
            color: #1c1c1c;
            font-size: 13px;
            font-weight: 650;
          }
          .civic-mobile-detail-status {
            display: grid;
            grid-template-columns: 76px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            padding: 10px 16px;
            border-bottom: 1px solid #e2e2e2;
          }
          .civic-mobile-detail-status span {
            font-family: var(--font-mono, inherit);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #454545;
          }
          .civic-mobile-detail-status select {
            width: 100%;
            padding: 0 8px;
          }
          .civic-mobile-detail-scroll {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 14px 16px 18px;
          }
          .civic-mobile-detail-group {
            margin-bottom: 16px;
          }
          .civic-mobile-detail-group h3 {
            margin: 0 0 8px;
            font-family: var(--font-mono, inherit);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #454545;
          }
          .civic-mobile-detail-row {
            display: grid;
            grid-template-columns: 140px minmax(0, 1fr);
            gap: 10px;
            padding: 6px 0;
            border-bottom: 1px solid #eeeeee;
          }
          .civic-mobile-detail-row dt {
            color: #454545;
            font-size: 12px;
          }
          .civic-mobile-detail-row dd {
            margin: 0;
            min-width: 0;
            overflow-wrap: anywhere;
            color: #1c1c1c;
            font-size: 13px;
          }
        }
        @media (max-width: 780px) {
          .civic-workspace-shell {
            padding:
              env(safe-area-inset-top, 0)
              env(safe-area-inset-right, 0)
              env(safe-area-inset-bottom, 0)
              env(safe-area-inset-left, 0);
          }
          .civic-workspace-header {
            flex-wrap: nowrap;
            gap: 8px;
            padding: 8px 10px 6px;
          }
          .civic-workspace-header > div {
            min-width: 0;
          }
          .civic-workspace-nav {
            flex: 0 0 auto;
            justify-content: flex-end;
            padding: 3px;
          }
          .civic-workspace-nav a {
            padding: 5px 8px;
            font-size: 10px;
            text-align: center;
          }
          .civic-workspace-docbar {
            padding: 4px 10px;
          }
          .civic-workspace-doctab-open,
          .civic-workspace-doctab--new {
            padding-top: 5px;
            padding-bottom: 5px;
            font-size: 12px;
          }
          .civic-google-band {
            grid-template-columns: minmax(0, 1fr);
            align-items: stretch;
            gap: 7px;
            padding: 6px 10px;
          }
          .civic-google-status {
            display: grid;
            gap: 2px;
            font-size: 11px;
          }
          .civic-google-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
          }
          .civic-google-button {
            min-width: 0;
            padding: 0 8px;
            font-size: 10px;
          }
          .civic-google-button span {
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .civic-billing-band {
            display: none;
          }
          /* The mobile read surface carries its own table/kanban segment, so
             the desktop database segment is hidden with the billing band. */
          .civic-workspace-viewseg {
            display: none;
          }
          .civic-workspace-export-button {
            min-width: 30px;
            padding: 0 8px;
          }
          .civic-workspace-export-button span {
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .civic-mobile-workspace {
            display: flex;
            flex: 1;
            min-height: 0;
            flex-direction: column;
            gap: 6px;
            padding: 6px 10px 10px;
            background: #ffffff;
          }
          .civic-workspace-editor[data-mobile-replaced="true"] {
            display: none;
          }
          .civic-mobile-toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }
          .civic-mobile-segment {
            display: inline-flex;
            gap: 2px;
            padding: 3px;
            border: 1px solid #e2e2e2;
            border-radius: 999px;
            background: #f5f5f5;
          }
          .civic-mobile-segment button,
          .civic-mobile-lane-tabs button {
            border: 1px solid transparent;
            background: transparent;
            color: #454545;
            font: inherit;
            cursor: pointer;
          }
          .civic-mobile-segment button {
            min-height: 30px;
            padding: 0 10px;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 600;
          }
          .civic-mobile-segment button[data-active],
          .civic-mobile-lane-tabs button[data-active] {
            border-color: #005186;
            background: #ffffff;
            color: #005186;
          }
          .civic-mobile-sync {
            display: inline-flex;
            align-items: center;
            min-height: 26px;
            padding: 0 8px;
            border: 1px solid #cfcfcf;
            border-radius: 999px;
            color: #454545;
            font-size: 12px;
            font-weight: 600;
          }
          .civic-mobile-sync:not([data-online]) {
            border-color: #005186;
            color: #005186;
          }
          .civic-mobile-columns {
            border: 1px solid #e2e2e2;
            border-radius: 8px;
            background: #fbfbfb;
          }
          .civic-mobile-columns summary {
            min-height: 30px;
            padding: 6px 9px;
            color: #1c1c1c;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
          }
          .civic-mobile-columns > div {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 6px;
            padding: 0 10px 10px;
          }
          .civic-mobile-columns label {
            display: flex;
            align-items: center;
            gap: 7px;
            min-height: 30px;
            color: #454545;
            font-size: 13px;
          }
          .civic-mobile-columns input {
            accent-color: #005186;
          }
          .civic-mobile-table-frame {
            flex: 1;
            min-height: 0;
            overflow: auto;
            border: 1px solid #e2e2e2;
            border-radius: 8px;
            background: #ffffff;
          }
          .civic-mobile-table {
            min-width: 680px;
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          .civic-mobile-table th,
          .civic-mobile-table td {
            padding: 8px 9px;
            border-bottom: 1px solid #e2e2e2;
            text-align: left;
            vertical-align: middle;
          }
          .civic-mobile-table thead th {
            position: sticky;
            top: 0;
            z-index: 1;
            background: #f5f5f5;
            color: #454545;
            font-family: var(--font-mono, inherit);
            font-size: 10px;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .civic-mobile-table tbody th {
            max-width: 220px;
            color: #1c1c1c;
            font-weight: 600;
          }
          .civic-mobile-title-button {
            max-width: 100%;
            padding: 0;
            border: 0;
            background: transparent;
            color: #005186;
            font: inherit;
            font-weight: 650;
            text-align: left;
            text-decoration: underline;
            text-underline-offset: 3px;
            cursor: pointer;
          }
          .civic-mobile-table select,
          .civic-mobile-card select,
          .civic-mobile-detail-status select {
            min-height: 36px;
            border: 1px solid #cfcfcf;
            border-radius: 4px;
            background: #ffffff;
            color: #1c1c1c;
            font: inherit;
            font-size: 16px;
          }
          .civic-mobile-table select {
            width: 160px;
            padding: 0 8px;
          }
          .civic-mobile-lanes {
            display: flex;
            flex: 1;
            min-height: 0;
            flex-direction: column;
            gap: 10px;
          }
          .civic-mobile-lane-tabs {
            display: flex;
            gap: 6px;
            overflow-x: auto;
            padding-bottom: 2px;
            scroll-snap-type: x mandatory;
          }
          .civic-mobile-lane-tabs button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 36px;
            flex: 0 0 auto;
            padding: 0 10px;
            border-radius: 999px;
            background: #f5f5f5;
            font-size: 13px;
            scroll-snap-align: start;
          }
          .civic-mobile-lane-tabs button span:last-child {
            color: #454545;
            font-variant-numeric: tabular-nums;
          }
          .civic-mobile-lane-stack {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding-right: 2px;
          }
          .civic-mobile-card {
            display: grid;
            grid-template-columns: minmax(0, 1fr) 148px;
            gap: 10px;
            align-items: start;
            margin-bottom: 8px;
            padding: 12px;
            border: 1px solid #e2e2e2;
            border-radius: 8px;
            background: #ffffff;
            box-shadow: 0 2px 8px -6px rgba(0, 0, 0, 0.18);
          }
          .civic-mobile-card h2 {
            margin: 0;
            color: #1c1c1c;
            font-size: 15px;
            font-weight: 650;
            line-height: 1.25;
          }
          .civic-mobile-card p {
            margin: 4px 0 0;
            color: #454545;
            font-size: 12px;
            line-height: 1.35;
          }
          .civic-mobile-card select {
            width: 100%;
            padding: 0 8px;
          }
          .civic-mobile-open-button {
            margin-top: 8px;
            min-height: 30px;
            padding: 0 10px;
            border: 1px solid #005186;
            border-radius: 999px;
            background: #ffffff;
            color: #005186;
            font-family: var(--font-mono, inherit);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .civic-mobile-detail-backdrop {
            position: fixed;
            inset: 0;
            z-index: 50;
            display: flex;
            align-items: flex-end;
            background: rgba(28, 28, 28, 0.28);
          }
          .civic-mobile-detail-sheet {
            display: flex;
            width: 100%;
            max-height: calc(100dvh - 32px);
            min-height: min(70dvh, 620px);
            flex-direction: column;
            border: 1px solid #d8d8d8;
            border-radius: 12px 12px 0 0;
            background: #ffffff;
            box-shadow: 0 -16px 40px -28px rgba(0, 0, 0, 0.5);
          }
          .civic-mobile-detail-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 14px 10px;
            border-bottom: 1px solid #e2e2e2;
          }
          .civic-mobile-detail-header p {
            margin: 0 0 4px;
            font-family: var(--font-mono, inherit);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #454545;
          }
          .civic-mobile-detail-header h2 {
            margin: 0;
            color: #1c1c1c;
            font-size: 18px;
            line-height: 1.2;
          }
          .civic-mobile-detail-header button {
            min-height: 32px;
            padding: 0 10px;
            border: 1px solid #cfcfcf;
            border-radius: 999px;
            background: #ffffff;
            color: #1c1c1c;
            font-size: 13px;
            font-weight: 650;
          }
          .civic-mobile-detail-status {
            display: grid;
            grid-template-columns: 76px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            padding: 10px 14px;
            border-bottom: 1px solid #e2e2e2;
          }
          .civic-mobile-detail-status span {
            font-family: var(--font-mono, inherit);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #454545;
          }
          .civic-mobile-detail-status select {
            width: 100%;
            padding: 0 8px;
          }
          .civic-mobile-detail-scroll {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            padding: 12px 14px calc(18px + env(safe-area-inset-bottom, 0));
          }
          .civic-mobile-detail-group {
            margin-bottom: 16px;
          }
          .civic-mobile-detail-group h3 {
            margin: 0 0 8px;
            font-family: var(--font-mono, inherit);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #005186;
          }
          .civic-mobile-detail-group dl {
            display: grid;
            gap: 8px;
            margin: 0;
          }
          .civic-mobile-detail-group dl > div {
            display: grid;
            gap: 3px;
            padding-bottom: 8px;
            border-bottom: 1px solid #eeeeee;
          }
          .civic-mobile-detail-group dt {
            color: #6f6f6f;
            font-size: 11px;
            font-weight: 650;
            letter-spacing: 0.03em;
            text-transform: uppercase;
          }
          .civic-mobile-detail-group dd {
            margin: 0;
            color: #1c1c1c;
            font-size: 14px;
            line-height: 1.4;
            overflow-wrap: anywhere;
          }
          .civic-mobile-detail-group a {
            color: #005186;
            font-weight: 650;
            text-decoration: underline;
            text-underline-offset: 3px;
          }
          .civic-mobile-empty {
            margin: 0;
            padding: 12px;
            border: 1px solid #e2e2e2;
            border-radius: 8px;
            color: #454545;
            font-size: 13px;
            line-height: 1.45;
          }
        }
      `}</style>
    </div>
  );
}

export default function CivicWorkspaceClient() {
  return (
    <PlannerClientProvider>
      <WorkspaceInner />
    </PlannerClientProvider>
  );
}
