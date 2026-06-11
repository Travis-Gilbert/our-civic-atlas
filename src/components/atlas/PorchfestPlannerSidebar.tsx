"use client";

/**
 * PorchfestPlannerSidebar: the planner's left sidebar, the approved
 * CivicAtlasSidebar interaction model carried over to /porchfest. Two
 * levels: a 56px icon nav rail plus a 320px detail panel, collapse to
 * rail, the shared soft-spring curve, a client-side search filter,
 * aside+nav landmarks, aria-current on the active rail item, and an
 * inert collapsed panel. All stateful chrome reuses .atlas-sidebar-*
 * from atlas.css (the porchfest layout imports it); the one
 * porchfest-specific rule is .planner-sidebar-embed in porchfest.css,
 * which strips an embedded panel's floating card chrome the same way
 * the atlas sidebar neutralizes ControlDossier's card.
 *
 * Functionality rule (binding, mirrored from the atlas sidebar): no
 * planner control is reimplemented here. PorchfestPlannerClient owns
 * every panel's props and state (civicApi, placementArm, droppedFile,
 * toasts, palette mode, layer visibility) and passes the rendered
 * panels in as section content. Applications is a render prop so the
 * client can filter its unplaced list against the search query; the
 * Planner, Layers, and Import sections are composed panels whose
 * internals the search deliberately does not reach.
 *
 * Two deliberate departures from the atlas sidebar, both stateful-
 * panel driven:
 *   - Section bodies stay MOUNTED and hide via the `hidden` attribute
 *     instead of unmounting on section switch. PlannerImportPanel
 *     carries a mid-flow preview state machine and consumes dropped
 *     files through an effect; unmounting it would drop an import in
 *     progress (the atlas sections were stateless rows, so it could
 *     unmount freely).
 *   - `importSignal` / `selectionId` let map-level events (a file
 *     drop, a figure click) reopen the panel so their UI is never
 *     trapped behind a collapsed rail.
 *
 * Desktop only by design: below 768px the planner folds all controls
 * into the PorchfestIsland, so the client mounts this behind its
 * !isMobile gate with `hidden md:flex`, exactly like the atlas.
 */

import Link from "next/link";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowUpRight,
  FileUp,
  Inbox,
  Layers3,
  Link2,
  Map as MapIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Section model                                                      */
/* ------------------------------------------------------------------ */

type PlannerSidebarSectionId =
  | "planner"
  | "layers"
  | "applications"
  | "import"
  | "links";

type SidebarIcon = ComponentType<{ className?: string }>;

const RAIL_SECTIONS: ReadonlyArray<{
  id: PlannerSidebarSectionId;
  label: string;
  Icon: SidebarIcon;
}> = [
  { id: "planner", label: "Planner", Icon: MapIcon },
  { id: "layers", label: "Layers", Icon: Layers3 },
  { id: "applications", label: "Applications", Icon: Inbox },
  { id: "import", label: "Import / Export", Icon: FileUp },
  { id: "links", label: "Links", Icon: Link2 },
];

/* Team surfaces only. Per the team-surface rule the public apply form
   stays out of primary nav: applicants receive the direct
   /porchfest/apply link, and the planner column never carried it. */
const PLANNER_LINKS = [
  {
    href: "/porchfest/workspace",
    label: "Workspace",
    sublabel: "Applications table, kanban, notes",
  },
  {
    href: "/porchfest/workspace",
    label: "Applications",
    sublabel: "Review submissions in the workspace",
  },
  {
    href: "/open-flint-atlas",
    label: "Atlas",
    sublabel: "The Flint civic atlas",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Shared rows (same markup conventions as CivicAtlasSidebar)         */
/* ------------------------------------------------------------------ */

function SidebarKicker({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ctx-ink-mute)]">
      {children}
    </p>
  );
}

function SidebarGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <SidebarKicker>{title}</SidebarKicker>
      <div className="mt-1.5 flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function LinkRow({
  href,
  label,
  sublabel,
}: {
  href: string;
  label: string;
  sublabel?: string;
}) {
  return (
    <Link href={href} className="atlas-sidebar-row group">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] leading-[1.35] text-[color:var(--ctx-ink)]">
          {label}
        </span>
        {sublabel ? (
          <span className="block truncate text-[11px] leading-[1.4] text-[color:var(--ctx-ink-mute)]">
            {sublabel}
          </span>
        ) : null}
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[color:var(--ctx-ink-faint)] group-hover:text-[color:var(--ctx-accent)]" />
    </Link>
  );
}

function EmptyMatches({ query, scope }: { query: string; scope: string }) {
  return (
    <p className="m-0 px-2 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-mute)]">
      No matches for &ldquo;{query}&rdquo; in {scope}.
    </p>
  );
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface PorchfestPlannerSidebarProps {
  /** Planner section: event identity, edit-mode toggle, palette,
   *  camera bookmarks. Owned and wired by PorchfestPlannerClient. */
  plannerContent: ReactNode;
  /** Layers section: the PlannerLayerControls panel. */
  layersContent: ReactNode;
  /** Applications section. Render prop: the client filters its
   *  unplaced list (and keeps the Place/Cancel arming buttons wired)
   *  against the sidebar's live search query. */
  applicationsContent: (query: string) => ReactNode;
  /** Import / Export section: the PlannerImportPanel. Stays mounted
   *  while hidden so a mid-flow import preview survives section
   *  switches. */
  importContent: ReactNode;
  /** Selected-placement card body. Pinned below the section body so
   *  the selection (and its figure override select) stays visible
   *  across section switches. */
  selectionContent?: ReactNode;
  /** Identity of the current selection. A new selection expands a
   *  collapsed panel so the pinned card is reachable. */
  selectionId?: string | null;
  /** Identity of a dropped import file. A new drop activates the
   *  Import / Export section and expands the panel so the preview is
   *  visible (the drop target is the whole map wrapper). */
  importSignal?: unknown;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

export function PorchfestPlannerSidebar({
  plannerContent,
  layersContent,
  applicationsContent,
  importContent,
  selectionContent = null,
  selectionId = null,
  importSignal = null,
  className = "",
}: PorchfestPlannerSidebarProps) {
  const [activeSection, setActiveSection] =
    useState<PlannerSidebarSectionId>("planner");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [query, setQuery] = useState("");

  /* Map clicks land while the panel may be collapsed; a fresh
     selection reopens it so the pinned card is never invisible. */
  useEffect(() => {
    if (selectionId) setIsCollapsed(false);
  }, [selectionId]);

  /* A file dropped on the map must surface its preview-and-confirm
     UI even if the user is in another section or collapsed. */
  useEffect(() => {
    if (importSignal) {
      setActiveSection("import");
      setIsCollapsed(false);
    }
  }, [importSignal]);

  const normalizedQuery = query.trim().toLowerCase();

  const selectSection = (id: PlannerSidebarSectionId) => {
    setActiveSection(id);
    setIsCollapsed(false);
  };

  const sectionLabel =
    RAIL_SECTIONS.find((section) => section.id === activeSection)?.label ??
    "Planner";

  function renderLinksSection(): ReactNode {
    const links = PLANNER_LINKS.filter(
      (link) =>
        normalizedQuery === "" ||
        link.label.toLowerCase().includes(normalizedQuery),
    );
    if (links.length === 0) {
      return <EmptyMatches query={query} scope="planner links" />;
    }
    return (
      <SidebarGroup title="Team surfaces">
        {links.map((link) => (
          /* Workspace and Applications intentionally share an href, so
             the label is the stable key. */
          <LinkRow
            key={link.label}
            href={link.href}
            label={link.label}
            sublabel={link.sublabel}
          />
        ))}
      </SidebarGroup>
    );
  }

  const sectionBody: Record<PlannerSidebarSectionId, () => ReactNode> = {
    planner: () => plannerContent,
    layers: () => layersContent,
    applications: () => applicationsContent(query),
    /* Same neutralization the atlas applies to the embedded
       ControlDossier: the import panel keeps its single
       implementation; its floating card chrome drops in here. */
    import: () => <div className="planner-sidebar-embed">{importContent}</div>,
    links: renderLinksSection,
  };

  return (
    <aside
      className={`atlas-sidebar pointer-events-auto ${className}`}
      aria-label="PorchFest planner sidebar"
      data-collapsed={isCollapsed ? "true" : "false"}
      data-fade-source
    >
      {/* Level 1: icon rail. Always visible; the panel collapses away. */}
      <nav className="atlas-sidebar-rail" aria-label="Planner sections">
        <span className="atlas-sidebar-rail-brand" title="Our Civic Atlas">
          OCA
        </span>
        <div className="flex w-full flex-col items-center gap-1.5">
          {RAIL_SECTIONS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className="atlas-sidebar-rail-btn"
              aria-current={activeSection === id ? "true" : undefined}
              aria-label={label}
              title={label}
              onClick={() => selectSection(id)}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
        {isCollapsed ? (
          <div className="mt-auto flex w-full flex-col items-center">
            <button
              type="button"
              className="atlas-sidebar-rail-btn"
              aria-expanded={false}
              aria-label="Expand sidebar panel"
              title="Expand"
              onClick={() => setIsCollapsed(false)}
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </nav>

      {/* Level 2: detail panel. Collapses to rail-only; inert removes
          the hidden content from tab order and the a11y tree. */}
      <div className="atlas-sidebar-panel" inert={isCollapsed}>
        <div className="atlas-sidebar-panel-inner">
          {/* No wordmark, matching the atlas sidebar and top strip:
              the kicker alone carries the identity. */}
          <header className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            <div className="min-w-0">
              <SidebarKicker>Our Civic Atlas</SidebarKicker>
            </div>
            <button
              type="button"
              className="atlas-sidebar-rail-btn"
              aria-expanded={true}
              aria-label="Collapse sidebar panel"
              title="Collapse"
              onClick={() => setIsCollapsed(true)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </header>

          <div className="px-4 pb-3">
            <label className="atlas-sidebar-search">
              <Search className="h-4 w-4 shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the planner..."
                aria-label="Search the planner"
              />
            </label>
          </div>

          <div className="px-4 pb-2">
            <h3 className="m-0 text-[15px] font-semibold leading-[1.2] text-[color:var(--ctx-ink)]">
              {sectionLabel}
            </h3>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {RAIL_SECTIONS.map(({ id }) => (
              <div
                key={id}
                className="space-y-4"
                hidden={activeSection !== id}
              >
                {sectionBody[id]()}
              </div>
            ))}
          </div>

          {selectionContent ? (
            <div className="max-h-[45%] shrink-0 overflow-y-auto border-t border-[color:var(--ctx-rule)] px-3 py-3">
              {selectionContent}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
