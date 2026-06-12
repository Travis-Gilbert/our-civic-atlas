"use client";

/**
 * CivicAtlasSidebar: the atlas's left sidebar. Two levels, an icon nav
 * rail plus a detail panel, adapted from the Theseus reference sidebar
 * ("Sidebar component.md"). The reference ships a dark neutral-950
 * register; this adaptation inverts it onto the atlas's Observable
 * cool tokens (paper surface, near-black ink, hairline rules, navy
 * single-action accent). All stateful chrome (hover fills, focus
 * treatment, the active rail edge, the collapse animation) lives in
 * atlas.css under .atlas-sidebar-* because it needs pseudo-classes
 * and the shared soft-spring curve.
 *
 * Functionality rule (binding): the layer preset rack is NOT
 * reimplemented here. The Layers section composes the existing
 * <ControlDossier/> so every preset control (eye toggles, inline
 * preset editors, the embedded traffic panel, the envelope legend)
 * keeps its single implementation. The sidebar adds navigation,
 * civic counts, and search around it.
 *
 * Desktop only by design: below 768px the atlas hides desktop panels
 * and routes all controls through the dynamic island, so
 * OpenFlintAtlasScene keeps feeding the island's Layers tab on small
 * viewports and mounts this sidebar with `hidden md:flex`.
 */

import Link from "next/link";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Eye,
  EyeOff,
  FlaskConical,
  Landmark,
  Layers3,
  Map as MapIcon,
  MapPin,
  Music,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import {
  ControlDossier,
  type LayerPreset,
} from "@/components/atlas/ControlDossier";
import {
  FLINT_LOST_RECONSTRUCTIONS,
  buildAtelierHref,
  resolveAtelierEntryYear,
} from "@/lib/atlas/atelier-route";

/* ------------------------------------------------------------------ */
/*  Section model                                                      */
/* ------------------------------------------------------------------ */

type SidebarSectionId =
  | "atlas"
  | "layers"
  | "places"
  | "events"
  | "reconstructions"
  | "porchfest"
  | "research";

type SidebarIcon = ComponentType<{ className?: string }>;

const RAIL_SECTIONS: ReadonlyArray<{
  id: SidebarSectionId;
  label: string;
  Icon: SidebarIcon;
}> = [
  { id: "atlas", label: "Atlas", Icon: MapIcon },
  { id: "layers", label: "Layers", Icon: Layers3 },
  { id: "places", label: "Places", Icon: MapPin },
  { id: "events", label: "Events", Icon: CalendarDays },
  { id: "reconstructions", label: "Reconstructions", Icon: Landmark },
  { id: "porchfest", label: "PorchFest", Icon: Music },
  { id: "research", label: "Research", Icon: FlaskConical },
];

/* Real routes only. PorchFest surfaces per the event-planning
   platform; research targets are the chrome header's destinations. */
const PORCHFEST_LINKS = [
  {
    href: "/porchfest",
    label: "Planner map",
    sublabel: "Place performances and stages",
  },
  {
    href: "/porchfest/workspace",
    label: "Workspace",
    sublabel: "Applications table, kanban, notes",
  },
  {
    href: "/porchfest/apply",
    label: "Apply",
    sublabel: "Performer and host intake",
  },
] as const;

const RESEARCH_LINKS = [
  { href: "/open-flint-atlas/methodology", label: "Methodology" },
  { href: "/open-flint-atlas/sources", label: "About the data" },
  { href: "/open-flint-atlas/contribute", label: "Contribute a record" },
] as const;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface CivicAtlasSidebarProps {
  /** Same preset rows the ControlDossier mount consumed. */
  presets: LayerPreset[];
  /** Map of layer id to visible, owned by the scene. */
  visibility: Record<string, boolean>;
  /** Toggle a layer's visibility on the map. */
  onToggle: (id: string, visible: boolean) => void;
  /** Default-open preset row inside the Layers section. */
  defaultOpenPresetId?: string;
  placesCount: number;
  wardsCount: number;
  eventsCount: number;
  /** Active time-travel year, when the user has scrubbed to one. */
  atlasYear?: number | null;
  visibleReconstructionCount?: number | null;
  totalReconstructionCount?: number;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Shared rows                                                        */
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

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 rounded-[6px] px-2 py-1.5">
      <span className="text-[12.5px] leading-[1.4] text-[color:var(--ctx-ink-soft)]">
        {label}
      </span>
      <span className="font-mono text-[11px] text-[color:var(--ctx-ink)]">
        {value}
      </span>
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

/** Same eye affordance the ControlDossier rows use, surfaced
 *  contextually. The toggle logic stays in the scene's
 *  handleLayerChange; this row only calls the shared callback. */
function LayerToggleRow({
  id,
  label,
  visibility,
  onToggle,
}: {
  id: string;
  label: string;
  visibility: Record<string, boolean>;
  onToggle: (id: string, visible: boolean) => void;
}) {
  const isVisible = visibility[id] !== false;
  return (
    <button
      type="button"
      className="atlas-sidebar-row"
      onClick={() => onToggle(id, !isVisible)}
      aria-pressed={isVisible}
      aria-label={isVisible ? `Hide ${label} layer` : `Show ${label} layer`}
    >
      <span className="atlas-sidebar-eye" data-on={isVisible ? "true" : "false"}>
        {isVisible ? (
          <Eye className="h-3 w-3" />
        ) : (
          <EyeOff className="h-3 w-3" />
        )}
      </span>
      <span
        className="flex-1 truncate text-left text-[13px] leading-[1.4]"
        style={{ color: isVisible ? "var(--ctx-ink)" : "var(--ctx-ink-mute)" }}
      >
        {label}
      </span>
    </button>
  );
}

function SidebarCollapsible({
  label,
  countLabel,
  isOpen,
  onToggle,
  children,
}: {
  label: string;
  countLabel?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="w-full">
      <button
        type="button"
        className="atlas-sidebar-row"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="flex-1 truncate text-left text-[13px] leading-[1.4] text-[color:var(--ctx-ink)]">
          {label}
        </span>
        {countLabel ? (
          <span className="shrink-0 font-mono text-[10px] text-[color:var(--ctx-ink-mute)]">
            {countLabel}
          </span>
        ) : null}
        <ChevronDown
          className="atlas-sidebar-chevron h-3.5 w-3.5 shrink-0 text-[color:var(--ctx-ink-mute)]"
          data-open={isOpen ? "true" : "false"}
        />
      </button>
      {isOpen ? <div className="atlas-sidebar-children">{children}</div> : null}
    </div>
  );
}

function SidebarNote({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 px-2 text-[11px] leading-[1.55] text-[color:var(--ctx-ink-mute)]">
      {children}
    </p>
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
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

export function CivicAtlasSidebar({
  presets,
  visibility,
  onToggle,
  defaultOpenPresetId,
  placesCount,
  wardsCount,
  eventsCount,
  atlasYear = null,
  visibleReconstructionCount = null,
  totalReconstructionCount,
  className = "",
}: CivicAtlasSidebarProps) {
  const [activeSection, setActiveSection] =
    useState<SidebarSectionId>("layers");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(["lost-flint"]),
  );

  const normalizedQuery = query.trim().toLowerCase();
  const matchesQuery = (label: string) =>
    normalizedQuery === "" || label.toLowerCase().includes(normalizedQuery);

  const selectSection = (id: SidebarSectionId) => {
    setActiveSection(id);
    setIsCollapsed(false);
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sectionLabel =
    RAIL_SECTIONS.find((section) => section.id === activeSection)?.label ??
    "Atlas";
  const reconstructionTotal =
    totalReconstructionCount ?? FLINT_LOST_RECONSTRUCTIONS.length;

  /* ---------------- Section bodies (filtered by the search) -------- */

  function renderAtlasSection(): ReactNode {
    const stats = [
      { label: "Places", value: String(placesCount) },
      { label: "Wards", value: String(wardsCount) },
      { label: "Events", value: String(eventsCount) },
      { label: "Lost Flint reconstructions", value: String(reconstructionTotal) },
    ].filter((stat) => matchesQuery(stat.label));

    if (stats.length === 0 && normalizedQuery !== "") {
      return <EmptyMatches query={query} scope="the atlas overview" />;
    }
    return (
      <>
        {normalizedQuery === "" ? (
          <SidebarNote>
            Flint, Michigan. Civic places, layers, events, and historical
            reconstructions on one map.
          </SidebarNote>
        ) : null}
        <SidebarGroup title="On the map">
          {stats.map((stat) => (
            <StatRow key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </SidebarGroup>
        {atlasYear !== null && normalizedQuery === "" ? (
          <SidebarGroup title="Time travel">
            <StatRow label="Atlas year" value={String(atlasYear)} />
            <StatRow
              label="Reconstructions visible"
              value={`${visibleReconstructionCount ?? 0}/${reconstructionTotal}`}
            />
          </SidebarGroup>
        ) : null}
      </>
    );
  }

  function renderLayersSection(): ReactNode {
    /* The search narrows the embedded preset rack by preset name; the
       rack itself stays the one ControlDossier implementation. */
    const filteredPresets = presets.filter((preset) =>
      matchesQuery(preset.name),
    );
    if (filteredPresets.length === 0) {
      return <EmptyMatches query={query} scope="layer presets" />;
    }
    return (
      <>
        <SidebarKicker>Layer presets</SidebarKicker>
        <div className="atlas-sidebar-layer-dossier -mx-1">
          <ControlDossier
            presets={filteredPresets}
            visibility={visibility}
            onToggle={onToggle}
            defaultOpenId={defaultOpenPresetId}
          />
        </div>
        {normalizedQuery === "" ? (
          <SidebarNote>
            The eye toggles a layer on the map. Expand a row to edit its
            preset.
          </SidebarNote>
        ) : null}
      </>
    );
  }

  function renderPlacesSection(): ReactNode {
    const stats = [
      { label: "Places", value: String(placesCount) },
      { label: "Wards", value: String(wardsCount) },
    ].filter((stat) => matchesQuery(stat.label));
    const toggles = [
      { id: "places", label: "Places" },
      { id: "wards", label: "Ward Boundaries" },
    ].filter((toggle) => matchesQuery(toggle.label));

    if (stats.length === 0 && toggles.length === 0) {
      return <EmptyMatches query={query} scope="places" />;
    }
    return (
      <>
        {stats.length > 0 ? (
          <SidebarGroup title="On the map">
            {stats.map((stat) => (
              <StatRow key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </SidebarGroup>
        ) : null}
        {toggles.length > 0 ? (
          <SidebarGroup title="Layer visibility">
            {toggles.map((toggle) => (
              <LayerToggleRow
                key={toggle.id}
                id={toggle.id}
                label={toggle.label}
                visibility={visibility}
                onToggle={onToggle}
              />
            ))}
          </SidebarGroup>
        ) : null}
        {normalizedQuery === "" ? (
          <SidebarNote>
            Select a place on the map to open its dossier in the island.
          </SidebarNote>
        ) : null}
      </>
    );
  }

  function renderEventsSection(): ReactNode {
    const stats = [{ label: "Events", value: String(eventsCount) }].filter(
      (stat) => matchesQuery(stat.label),
    );
    const toggles = [
      { id: "events", label: "Events" },
      { id: "traffic", label: "Traffic Flow" },
    ].filter((toggle) => matchesQuery(toggle.label));

    if (stats.length === 0 && toggles.length === 0) {
      return <EmptyMatches query={query} scope="events" />;
    }
    return (
      <>
        {stats.length > 0 ? (
          <SidebarGroup title="On the map">
            {stats.map((stat) => (
              <StatRow key={stat.label} label={stat.label} value={stat.value} />
            ))}
          </SidebarGroup>
        ) : null}
        {toggles.length > 0 ? (
          <SidebarGroup title="Layer visibility">
            {toggles.map((toggle) => (
              <LayerToggleRow
                key={toggle.id}
                id={toggle.id}
                label={toggle.label}
                visibility={visibility}
                onToggle={onToggle}
              />
            ))}
          </SidebarGroup>
        ) : null}
        {normalizedQuery === "" ? (
          <SidebarNote>
            The workbench timeline below the map filters events by time.
          </SidebarNote>
        ) : null}
      </>
    );
  }

  function renderReconstructionsSection(): ReactNode {
    const lostFlintRows = FLINT_LOST_RECONSTRUCTIONS.filter(
      (reconstruction) => matchesQuery(reconstruction.name),
    );
    const atelierVisible =
      matchesQuery("Reconstruction Engine") || matchesQuery("Atelier");
    /* A live search forces the matching group open so results are
       reachable without an extra click. */
    const lostFlintOpen =
      normalizedQuery !== ""
        ? lostFlintRows.length > 0
        : openGroups.has("lost-flint");

    if (lostFlintRows.length === 0 && !atelierVisible) {
      return <EmptyMatches query={query} scope="reconstructions" />;
    }
    return (
      <>
        {atlasYear !== null && normalizedQuery === "" ? (
          <SidebarGroup title={`Circa ${atlasYear}`}>
            <StatRow
              label="Reconstructions visible"
              value={`${visibleReconstructionCount ?? 0}/${reconstructionTotal}`}
            />
          </SidebarGroup>
        ) : null}
        {lostFlintRows.length > 0 ? (
          <SidebarGroup title="Lost Flint">
            <SidebarCollapsible
              label="Carriage Town fixtures"
              countLabel={`${lostFlintRows.length}`}
              isOpen={lostFlintOpen}
              onToggle={() => toggleGroup("lost-flint")}
            >
              {lostFlintRows.map((reconstruction) => (
                <LinkRow
                  key={reconstruction.id}
                  href={buildAtelierHref(
                    reconstruction,
                    resolveAtelierEntryYear(reconstruction, atlasYear),
                  )}
                  label={reconstruction.name}
                  sublabel={
                    reconstruction.time_start
                      ? `circa ${reconstruction.time_start}`
                      : undefined
                  }
                />
              ))}
            </SidebarCollapsible>
          </SidebarGroup>
        ) : null}
        {atelierVisible ? (
          <SidebarGroup title="Reconstruction Engine">
            <LinkRow
              href="/open-flint-atlas/reconstruction-engine/building%3Acarriage-town%3A3/1925"
              label="Open the Reconstruction Engine"
              sublabel="Carriage Town Storefront, circa 1925"
            />
          </SidebarGroup>
        ) : null}
      </>
    );
  }

  function renderPorchfestSection(): ReactNode {
    const links = PORCHFEST_LINKS.filter((link) => matchesQuery(link.label));
    if (links.length === 0) {
      return <EmptyMatches query={query} scope="PorchFest" />;
    }
    return (
      <SidebarGroup title="PorchFest 2026">
        {links.map((link) => (
          <LinkRow
            key={link.href}
            href={link.href}
            label={link.label}
            sublabel={link.sublabel}
          />
        ))}
      </SidebarGroup>
    );
  }

  function renderResearchSection(): ReactNode {
    const links = RESEARCH_LINKS.filter((link) => matchesQuery(link.label));
    if (links.length === 0) {
      return <EmptyMatches query={query} scope="research" />;
    }
    return (
      <>
        <SidebarGroup title="Method and sources">
          {links.map((link) => (
            <LinkRow key={link.href} href={link.href} label={link.label} />
          ))}
        </SidebarGroup>
        {normalizedQuery === "" ? (
          <SidebarNote>
            Ask-the-atlas civic research lives in the island&rsquo;s Ask tab.
          </SidebarNote>
        ) : null}
      </>
    );
  }

  const sectionBody: Record<SidebarSectionId, () => ReactNode> = {
    atlas: renderAtlasSection,
    layers: renderLayersSection,
    places: renderPlacesSection,
    events: renderEventsSection,
    reconstructions: renderReconstructionsSection,
    porchfest: renderPorchfestSection,
    research: renderResearchSection,
  };

  return (
    <aside
      className={`atlas-sidebar pointer-events-auto ${className}`}
      aria-label="Civic Atlas sidebar"
      data-collapsed={isCollapsed ? "true" : "false"}
      data-fade-source
    >
      {/* Level 1: icon rail. Always visible; the panel collapses away. */}
      <nav className="atlas-sidebar-rail" aria-label="Atlas sections">
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
          {/* Wordmark removed by request (here and in the top strip);
              the kicker alone carries the identity, and the panel gets
              the vertical room back. */}
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
                placeholder="Search the atlas..."
                aria-label="Search the atlas"
              />
            </label>
          </div>

          <div className="px-4 pb-2">
            <h3 className="m-0 text-[15px] font-semibold leading-[1.2] text-[color:var(--ctx-ink)]">
              {sectionLabel}
            </h3>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 pb-4">
            {sectionBody[activeSection]()}
          </div>
        </div>
      </div>
    </aside>
  );
}
