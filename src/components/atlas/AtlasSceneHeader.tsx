"use client";

import { Search } from "lucide-react";
import type { AtlasNodeSummary } from "@/lib/atlas/node-horizon";

type AtlasSceneHeaderProps = {
  searchValue: string;
  onSearchValueChange: (value: string) => void;
  searchResults: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  onSearchResultSelect: (placeId: string) => void;
  placesCount: number;
  eventsCount: number;
  activeViewLabel: string;
  currentNode: AtlasNodeSummary | null;
  compareNode: AtlasNodeSummary | null;
  onClearCompare: () => void;
};

export function AtlasSceneHeader({
  searchValue,
  onSearchValueChange,
  searchResults,
  onSearchResultSelect,
  placesCount,
  eventsCount,
  activeViewLabel,
  currentNode,
  compareNode,
  onClearCompare,
}: AtlasSceneHeaderProps) {
  return (
    <header className="atlas-scene-header pointer-events-auto absolute left-4 right-4 top-4 flex flex-col gap-3 md:left-5 md:right-5 md:flex-row md:items-start md:justify-between md:gap-4">
      <div className="atlas-scene-glass atlas-scene-brand hidden min-w-[260px] max-w-[360px] px-4 py-3 md:block">
        <p className="font-mono text-[10px] uppercase leading-none tracking-[0.14em] text-[color:var(--ctx-ink-mute)]">
          Our Civic Atlas
        </p>
        <nav
          aria-label="Atlas hierarchy"
          className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]"
        >
          <span>Atlas network</span>
          <span aria-hidden="true">/</span>
          <span>{currentNode?.name ?? "Flint Atlas"}</span>
          {compareNode ? (
            <>
              <span aria-hidden="true">/</span>
              <span>{compareNode.name}</span>
            </>
          ) : null}
        </nav>
        <h1 className="mt-1 text-[24px] font-semibold leading-none text-[color:var(--ctx-ink)]">
          {currentNode?.name ?? "Flint Atlas"}
        </h1>
        <p className="mt-2 text-[12px] leading-[1.55] text-[color:var(--ctx-ink-soft)]">
          {compareNode
            ? `Comparing scope, freshness, capabilities, and package readiness with ${compareNode.name}.`
            : "Flint stays centered while Node Horizon keeps nearby atlas paths within reach."}
        </p>
        {compareNode ? (
          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-full border border-[rgba(42,36,25,0.08)] bg-[rgba(255,255,255,0.44)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--ctx-ink-mute)]">
              Compare active
            </span>
            <button
              type="button"
              className="rounded-full border border-[rgba(42,36,25,0.08)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--ctx-ink)] transition hover:bg-[rgba(42,36,25,0.05)]"
              onClick={onClearCompare}
            >
              Return to Flint Atlas
            </button>
          </div>
        ) : null}
        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
          <SceneMetric label="places" value={String(placesCount)} />
          <SceneMetric label="events" value={String(eventsCount)} />
          <SceneMetric label="view" value={activeViewLabel} />
        </div>
      </div>

      <div className="atlas-scene-glass atlas-scene-search-shell relative w-full px-3 py-2 md:min-w-[min(520px,44vw)] md:max-w-[620px]">
        <label
          className="flex items-center gap-2"
          aria-label="Search Flint Atlas places"
        >
          <Search
            className="h-4 w-4 shrink-0 text-[color:var(--ctx-ink-mute)]"
            aria-hidden="true"
          />
          <input
            value={searchValue}
            onChange={(event) => onSearchValueChange(event.target.value)}
            suppressHydrationWarning
            className="h-9 w-full bg-transparent text-[14px] outline-none placeholder:text-[color:var(--ctx-ink-faint)]"
            placeholder="Search places, wards, landmarks..."
            type="search"
            name="atlas-search"
            autoComplete="off"
          />
        </label>
        {searchValue.trim().length > 0 && (
          <div
            className="atlas-scene-search-results absolute left-0 right-0 top-[calc(100%+6px)]"
            role="listbox"
            aria-label="Place search results"
          >
            {searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-3 py-2 text-left text-[13px]"
                  onClick={() => onSearchResultSelect(result.id)}
                  role="option"
                  aria-selected={false}
                >
                  <span className="truncate text-[color:var(--ctx-ink)]">
                    {result.name}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[color:var(--ctx-ink-mute)]">
                    {result.type}
                  </span>
                </button>
              ))
            ) : (
              <p className="px-3 py-2 text-[13px] text-[color:var(--ctx-ink-mute)]">
                No matching places in the current read model.
              </p>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

function SceneMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[15px] font-semibold leading-none text-[color:var(--ctx-ink)]">
        {value}
      </span>
      <span className="mt-1 block font-mono text-[9px] uppercase leading-none tracking-[0.1em] text-[color:var(--ctx-ink-mute)]">
        {label}
      </span>
    </div>
  );
}
