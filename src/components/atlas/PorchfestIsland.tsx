"use client";

/**
 * PorchFest Dynamic Island.
 *
 * A porchfest-scoped twin of the atlas Dynamic Island
 * (AtlasDynamicIsland.tsx). It reuses the same shell so it reads as the
 * same feature as the rest of the site: the `.atlas-scene-glass` pill
 * material, the framer-motion collapse/expand morph (same easing +
 * duration), the `.atlas-scene-search-results` dropdown, and the
 * `.atlas-dossier-tab` / `.atlas-dossier-close` chrome (all
 * `.civic-atlas`-scoped in atlas.css, which the porchfest route imports).
 *
 * It does NOT absorb the whole chrome the way the atlas island does. The
 * left panels and the sidebar task rail stay. The island adds two things
 * on top: a bottom search (over placements AND tasks), mobile edit chrome,
 * and a compressed, read + search view of the same data:
 *   - collapsed: a search pill, tap the label to expand
 *   - Selected tab: selection metadata and organizer details
 *   - Tasks tab: status-filtered, searchable task list, click to fly
 *   - Places tab: searchable placement list (with addresses), click to fly
 *
 * Selecting anything hands a placement id back to the parent, which flies
 * the camera there and opens the Selected readout. Task mutation stays in
 * the sidebar rail; this surface is a viewer.
 */

import { AnimatePresence, motion } from "framer-motion";
import { ListChecks, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { CATEGORY_COLOR } from "@/components/atlas/PlannerPalette";
import type {
  AtlasEventPlannerCategory,
  AtlasEventPlannerPlacement,
} from "@/components/atlas/AtlasEventPlannerLayer";

// Same morph curve + duration as AtlasDynamicIsland so the two islands
// feel like one feature.
const islandTransition = {
  type: "tween",
  ease: [0.22, 1, 0.36, 1],
  duration: 0.34,
} as const;

const COLLAPSED_WIDTH = 360;
const EXPANDED_WIDTH = 392;
const COLLAPSED_HEIGHT = 58;
const EXPANDED_HEIGHT = 452;

type IslandTab =
  | "selected"
  | "edit"
  | "tasks"
  | "places"
  | "key"
  | "import"
  | "info";

const STATUS_OPTIONS = ["all", "open", "in_progress", "done"] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number];

const STATUS_LABEL: Record<string, string> = {
  all: "All",
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  blocked: "Blocked",
  deferred: "Deferred",
  todo: "To do",
};

const statusLabel = (value: string): string =>
  STATUS_LABEL[value] ?? value.replace(/_/g, " ");

const humanizeLabel = (value: string): string =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const TAB_LABEL: Record<IslandTab, string> = {
  selected: "Selected",
  edit: "Edit",
  tasks: "Tasks",
  places: "Places",
  key: "Map key",
  import: "Import",
  info: "Info",
};

export type IslandTask = {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly ownerDisplay?: string | null;
  readonly placementId?: string | null;
};

const swatchColor = (category: string): string =>
  CATEGORY_COLOR[category as AtlasEventPlannerCategory] ?? CATEGORY_COLOR.amenity;

export function PorchfestIsland({
  placements,
  tasks,
  onSelectPlacement,
  mobile = false,
  selectedPlacement = null,
  selectedCategoryLabel,
  selectedDetailsContent,
  tasksContent,
  editContent,
  mapKeyContent,
  importContent,
  infoContent,
  modeLabel,
}: {
  readonly placements: readonly AtlasEventPlannerPlacement[];
  readonly tasks: readonly IslandTask[];
  readonly onSelectPlacement: (placementId: string) => void;
  /**
   * Mobile mode: the island IS the chrome. It grows to planner tabs
   * (Edit, Tasks, Places, Map key, Info), goes full width, and expands to a
   * tall bottom sheet. The folded chrome is passed as rendered content so
   * the island stays a dumb container.
   */
  readonly mobile?: boolean;
  readonly selectedPlacement?: AtlasEventPlannerPlacement | null;
  readonly selectedCategoryLabel?: string;
  readonly selectedDetailsContent?: ReactNode;
  readonly tasksContent?: ReactNode;
  readonly editContent?: ReactNode;
  readonly mapKeyContent?: ReactNode;
  readonly importContent?: ReactNode;
  readonly infoContent?: ReactNode;
  readonly modeLabel?: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<IslandTab>("tasks");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  // Mobile bottom-sheet height, derived from the viewport so it never
  // exceeds the screen on small phones.
  const [sheetHeight, setSheetHeight] = useState(480);
  const contentScrollRef = useRef<HTMLDivElement>(null);

  const query = search.trim().toLowerCase();
  const selectedPlacementId = selectedPlacement?.id ?? null;
  const selectedLabel = selectedPlacement?.label.trim() || "Selected";
  const selectedCategory =
    selectedCategoryLabel ??
    (selectedPlacement ? humanizeLabel(selectedPlacement.category) : null);
  const selectedAddress = selectedPlacement?.address?.trim() || null;
  const collapsedTitle = selectedPlacement ? selectedLabel : "PorchFest";
  const collapsedSubtitle = selectedPlacement
    ? selectedAddress ?? "Address pending"
    : modeLabel;

  // Close on Escape, matching the atlas island's backdrop dismiss.
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded]);

  useEffect(() => {
    if (!mobile) return;
    const update = () => {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      setSheetHeight(
        Math.min(560, Math.max(360, Math.round(viewportHeight * 0.76))),
      );
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [mobile]);

  // The extra tabs are mobile-only; if the viewport grows back to desktop
  // while on one of them, fall back to Tasks.
  useEffect(() => {
    if (activeTab === "selected" && !selectedPlacement) {
      setActiveTab("tasks");
      return;
    }
    if (
      (!mobile &&
        (activeTab === "edit" ||
          activeTab === "key" ||
          activeTab === "import" ||
          activeTab === "info")) ||
      (mobile && activeTab === "edit" && editContent == null) ||
      (mobile && activeTab === "import" && importContent == null)
    ) {
      setActiveTab("tasks");
    }
  }, [mobile, activeTab, editContent, importContent, selectedPlacement]);

  useEffect(() => {
    if (selectedPlacementId) {
      setActiveTab("selected");
    }
  }, [selectedPlacementId]);

  useEffect(() => {
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTop = 0;
    }
  }, [activeTab, isExpanded]);

  const matchedPlaces = useMemo(() => {
    if (!query) return placements;
    return placements.filter((p) =>
      `${p.label} ${p.address ?? ""} ${p.category}`.toLowerCase().includes(query),
    );
  }, [placements, query]);

  const matchedTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (query && !t.title.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [tasks, statusFilter, query]);

  const openTaskCount = useMemo(
    () => tasks.filter((t) => t.status !== "done").length,
    [tasks],
  );

  // Collapsed dropdown: a unified quick result list (places + tasks).
  const collapsedResults = useMemo(() => {
    if (!query) return [];
    const places = matchedPlaces
      .slice(0, 6)
      .map((p) => ({ kind: "place" as const, id: p.id, label: p.label, sub: p.address ?? null, category: p.category }));
    const taskHits = tasks
      .filter((t) => t.title.toLowerCase().includes(query))
      .slice(0, 3)
      .map((t) => ({ kind: "task" as const, id: t.id, label: t.title, sub: statusLabel(t.status), placementId: t.placementId ?? null }));
    return [...places, ...taskHits].slice(0, 8);
  }, [matchedPlaces, tasks, query]);

  const showCollapsedResults = !mobile && !isExpanded && query.length > 0;
  const selectedTabs: IslandTab[] = selectedPlacement ? ["selected"] : [];
  const tabs: IslandTab[] = mobile
    ? editContent
      ? importContent
        ? [...selectedTabs, "edit", "tasks", "places", "key", "import", "info"]
        : [...selectedTabs, "edit", "tasks", "places", "key", "info"]
      : importContent
        ? [...selectedTabs, "tasks", "places", "key", "import", "info"]
        : [...selectedTabs, "tasks", "places", "key", "info"]
    : [...selectedTabs, "tasks", "places"];
  const usesTasksContent = mobile && tasksContent != null;
  const showSharedSearch =
    activeTab === "places" || (activeTab === "tasks" && !usesTasksContent);

  function openIsland(tab: IslandTab) {
    setActiveTab(tab);
    setIsExpanded(true);
  }

  function selectPlace(placementId: string) {
    onSelectPlacement(placementId);
    setSearch("");
    setIsExpanded(false);
  }

  return (
    <>
      <AnimatePresence>
        {isExpanded ? (
          <motion.div
            key="porchfest-island-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={islandTransition}
            className="pointer-events-auto absolute inset-0 z-[1410] bg-[rgba(246,244,238,0.08)] backdrop-blur-[3px]"
            onClick={() => setIsExpanded(false)}
          />
        ) : null}
      </AnimatePresence>

      {/* Selected-object metadata: the tab that appears on tapping a placement
          or building. Rendered OUTSIDE the island's transformed container
          below, so `position: absolute; left: 50%` centers it on the planner
          viewport instead of resolving against the right-pinned task-tab pill
          (a CSS transform on an ancestor re-parents fixed/abs positioning). It
          sits centered on screen and just below the task tab in the right
          thumb zone. */}
      {mobile && selectedPlacement && !isExpanded && !showCollapsedResults ? (
        <div
          className="atlas-scene-glass pointer-events-auto absolute left-1/2 z-[1415] w-[min(calc(100vw-20px),320px)] -translate-x-1/2 rounded-[14px] p-3"
          style={{
            bottom:
              "calc(max(0.75rem, env(safe-area-inset-bottom, 0.75rem)) + 12px)",
          }}
        >
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="planner-swatch"
              style={{
                backgroundColor: swatchColor(selectedPlacement.category),
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-[color:var(--ctx-ink)]">
                {selectedPlacement.label}
              </span>
              <span className="block truncate text-[11px] text-[color:var(--ctx-ink-mute)]">
                {selectedAddress ?? "Address pending"}
              </span>
            </span>
          </div>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute z-[1420]"
        style={{
          width: mobile
            ? isExpanded
              ? "min(calc(100vw - 20px), 520px)"
              : 58
            : isExpanded
              ? EXPANDED_WIDTH
              : COLLAPSED_WIDTH,
          left: mobile && !isExpanded ? "auto" : "50%",
          right:
            mobile && !isExpanded
              ? "calc(62px + env(safe-area-inset-right, 0px))"
              : "auto",
          transform:
            mobile && !isExpanded ? "translateX(0)" : "translateX(-50%)",
          bottom:
            mobile && !isExpanded
              ? "calc(98px + env(safe-area-inset-bottom, 0px))"
              : mobile
                ? "max(0.75rem, env(safe-area-inset-bottom, 0.75rem))"
                : "max(1.25rem, env(safe-area-inset-bottom, 1.25rem))",
        }}
      >
        {showCollapsedResults ? (
          <div
            className="atlas-scene-search-results pointer-events-auto absolute bottom-[calc(100%+10px)] left-0 right-0"
            role="listbox"
            aria-label="PorchFest search results"
          >
            {collapsedResults.length > 0 ? (
              collapsedResults.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left"
                  onClick={() => {
                    if (r.kind === "place") selectPlace(r.id);
                    else if (r.placementId) selectPlace(r.placementId);
                    else openIsland("tasks");
                  }}
                >
                  {r.kind === "place" ? (
                    <span aria-hidden="true" className="planner-swatch" style={{ backgroundColor: swatchColor(r.category) }} />
                  ) : (
                    <ListChecks className="h-3.5 w-3.5 shrink-0 text-[color:var(--ctx-ink-mute)]" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-[color:var(--ctx-ink)]">{r.label}</span>
                    {r.sub ? (
                      <span className="block truncate text-[11px] text-[color:var(--ctx-ink-mute)]">{r.sub}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                    {r.kind}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-[13px] text-[color:var(--ctx-ink-mute)]">No matches.</p>
            )}
          </div>
        ) : null}

        <motion.div
          initial={false}
          animate={
            mobile
              ? {
                  width: isExpanded ? "100%" : 58,
                  height: isExpanded ? sheetHeight : COLLAPSED_HEIGHT,
                  borderRadius: isExpanded ? 24 : 999,
                }
              : {
                  width: isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
                  height: isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
                  borderRadius: isExpanded ? 24 : 999,
                }
          }
          transition={islandTransition}
          className={`atlas-scene-glass pointer-events-auto relative overflow-hidden${mobile ? " w-full" : ""}`}
        >
          {/* Collapsed layer: tasks icon (left), tappable label (center),
              search field (right). Mirrors the atlas collapsed island. */}
          <motion.div
            initial={false}
            animate={{ opacity: isExpanded ? 0 : 1, pointerEvents: isExpanded ? "none" : "auto" }}
            transition={islandTransition}
            className="absolute inset-0"
          >
            {mobile ? (
              <button
                type="button"
                className="flex h-full w-full items-center justify-center rounded-full text-[color:var(--ctx-ink)]"
                onClick={() =>
                  openIsland(selectedPlacement ? "selected" : "tasks")
                }
                aria-label="Open PorchFest controls"
              >
                <ListChecks className="h-5 w-5" />
                {openTaskCount > 0 ? (
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[color:var(--ctx-accent)]" />
                ) : null}
              </button>
            ) : (
              <div className="relative h-full w-full">
                <button
                  type="button"
                  className="absolute inset-0 flex flex-col items-center justify-center px-[120px] text-center"
                  onClick={() =>
                    openIsland(selectedPlacement ? "selected" : "tasks")
                  }
                  aria-label="Open PorchFest island"
                >
                  <span className="truncate text-[15px] font-medium leading-none text-[color:var(--ctx-ink)]">
                    {collapsedTitle}
                  </span>
                  {collapsedSubtitle ? (
                    <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
                      {collapsedSubtitle}
                    </span>
                  ) : null}
                </button>

                <button
                  type="button"
                  onClick={() => openIsland("tasks")}
                  aria-label="Open tasks"
                  className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(42,36,25,0.12)] bg-[rgba(255,255,255,0.46)] text-[color:var(--ctx-ink)] shadow-[0_10px_18px_-18px_rgba(42,36,25,0.6)]"
                >
                  <ListChecks className="h-4 w-4" />
                </button>

                <label
                  className="absolute right-3 top-1/2 z-10 flex h-10 w-[104px] -translate-y-1/2 items-center gap-2 rounded-full border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.36)] px-3 shadow-[0_10px_18px_-18px_rgba(42,36,25,0.6)]"
                  aria-label="Search PorchFest"
                >
                  <Search className="h-4 w-4 shrink-0 text-[color:var(--ctx-ink-mute)]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    suppressHydrationWarning
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[color:var(--ctx-ink)] outline-none"
                    placeholder=""
                    type="search"
                  />
                </label>
              </div>
            )}
          </motion.div>

          {/* Expanded layer: header, tabs, content, footer. */}
          <motion.div
            initial={false}
            animate={{ opacity: isExpanded ? 1 : 0, pointerEvents: isExpanded ? "auto" : "none" }}
            transition={islandTransition}
            className="absolute inset-0 flex flex-col"
          >
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--ctx-ink-mute)]">
                  {selectedCategory ?? "Carriage Town"}
                </p>
                <h2 className="truncate text-[20px] font-semibold leading-[1.05] text-[color:var(--ctx-ink)]">
                  {selectedPlacement ? selectedLabel : "PorchFest"}
                </h2>
                {selectedPlacement ? (
                  <p className="mt-1 truncate text-[12px] leading-4 text-[color:var(--ctx-ink-mute)]">
                    {selectedAddress ?? "Address pending"}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className="atlas-dossier-close"
                aria-label="Close PorchFest island"
                onClick={() => setIsExpanded(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 pb-3">
              <div className="porchfest-island-tabs-scroll flex gap-2 overflow-x-auto pb-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className="atlas-dossier-tab"
                    data-active={activeTab === tab ? "true" : "false"}
                    onClick={() => setActiveTab(tab)}
                  >
                    {TAB_LABEL[tab]}
                  </button>
                ))}
              </div>
            </div>

            {/* Shared search field: filters the Tasks list (desktop) and the
                Places list. Hidden on the mobile Tasks tab (the embedded rail
                has its own search) and on Map key / Info. */}
            {showSharedSearch ? (
              <div className="px-4 pb-3">
                <label
                  className="flex h-9 items-center gap-2 rounded-full border border-[rgba(42,36,25,0.1)] bg-[rgba(255,255,255,0.34)] px-3"
                  aria-label={activeTab === "tasks" ? "Search tasks" : "Search places"}
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-[color:var(--ctx-ink-mute)]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-w-0 flex-1 bg-transparent text-[16px] text-[color:var(--ctx-ink)] outline-none placeholder:text-[color:var(--ctx-ink-mute)] sm:text-[13px]"
                    placeholder={activeTab === "tasks" ? "Search tasks" : "Search places"}
                    type="search"
                  />
                  {search ? (
                    <button type="button" onClick={() => setSearch("")} aria-label="Clear search" className="shrink-0 text-[color:var(--ctx-ink-mute)] hover:text-[color:var(--ctx-ink)]">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </label>
              </div>
            ) : null}

            <div
              ref={contentScrollRef}
              className="porchfest-island-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-3"
            >
              {activeTab === "selected" ? (
                selectedDetailsContent ?? (
                  <section className="space-y-3">
                    {selectedPlacement ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="planner-swatch"
                            style={{
                              backgroundColor: swatchColor(
                                selectedPlacement.category,
                              ),
                            }}
                          />
                          <p className="planner-kicker">
                            {selectedCategory ?? "Selected"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[15px] font-semibold leading-tight text-[color:var(--ctx-ink)]">
                            {selectedLabel}
                          </p>
                          <p className="mt-1 text-[12px] leading-4 text-[color:var(--ctx-ink-mute)]">
                            {selectedAddress ?? "Address pending"}
                          </p>
                        </div>
                        {selectedPlacement.notes ? (
                          <p className="text-[12px] leading-5 text-[color:var(--ctx-ink-soft)]">
                            {selectedPlacement.notes}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="px-1 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                        Select a map item to see its details here.
                      </p>
                    )}
                  </section>
                )
              ) : null}

              {activeTab === "edit" ? editContent : null}

              {activeTab === "tasks" ? (
                usesTasksContent ? (
                  tasksContent
                ) : (
                <section className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setStatusFilter(option)}
                        className={`planner-control flex min-h-[24px] items-center px-2 py-1 text-[12px] ${statusFilter === option ? "is-active" : ""}`}
                        aria-pressed={statusFilter === option}
                      >
                        {statusLabel(option)}
                      </button>
                    ))}
                  </div>

                  {matchedTasks.length > 0 ? (
                    <ul className="space-y-1.5">
                      {matchedTasks.map((task) => (
                        <li key={task.id}>
                          <button
                            type="button"
                            className="planner-tile flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                            onClick={() => {
                              if (task.placementId) selectPlace(task.placementId);
                            }}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] text-[color:var(--ctx-ink)]">{task.title}</span>
                              {task.ownerDisplay ? (
                                <span className="block truncate text-[11px] text-[color:var(--ctx-ink-mute)]">{task.ownerDisplay}</span>
                              ) : null}
                            </span>
                            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-[color:var(--ctx-ink-mute)]">
                              {statusLabel(task.status)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-1 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                      {tasks.length === 0
                        ? "No tasks yet. Add them in the task rail; they will show here and stay searchable."
                        : "No tasks match this filter."}
                    </p>
                  )}
                </section>
                )
              ) : null}

              {activeTab === "places" ? (
                <section>
                  {matchedPlaces.length > 0 ? (
                    <ul className="space-y-1.5">
                      {matchedPlaces.slice(0, 60).map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            className="planner-tile flex w-full items-center gap-3 px-3 py-2 text-left"
                            onClick={() => selectPlace(p.id)}
                          >
                            <span aria-hidden="true" className="planner-swatch" style={{ backgroundColor: swatchColor(p.category) }} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] text-[color:var(--ctx-ink)]">{p.label}</span>
                              {p.address ? (
                                <span className="block truncate text-[11px] text-[color:var(--ctx-ink-mute)]">{p.address}</span>
                              ) : null}
                            </span>
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-[color:var(--ctx-ink-mute)]" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-1 text-[12px] leading-[1.5] text-[color:var(--ctx-ink-soft)]">
                      No places match this search.
                    </p>
                  )}
                </section>
              ) : null}

              {activeTab === "key" ? mapKeyContent : null}
              {activeTab === "import" ? importContent : null}
              {activeTab === "info" ? infoContent : null}
            </div>

            <div className="border-t border-[rgba(42,36,25,0.08)] px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                <MetaPill label="Tasks" value={String(tasks.length)} />
                <MetaPill label="Open" value={String(openTaskCount)} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.28)] px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
        {label}
      </p>
      <p className="mt-1 text-[12px] font-medium leading-[1.3] text-[color:var(--ctx-ink)]">
        {value}
      </p>
    </div>
  );
}
