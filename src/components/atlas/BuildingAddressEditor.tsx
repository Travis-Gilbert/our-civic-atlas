"use client";

/**
 * BuildingAddressEditor
 *
 * The one editor UI behind Step 3, hosted by both the main-atlas building
 * dossier and the porchfest planner. It reads and writes the shared
 * override store (flint-address-overrides), so a correction made in either
 * surface immediately shows in both and in the map hover tooltip.
 *
 * It is honest about provenance: the source chip says whether the current
 * address came from the planner's edit, the City of Flint parcel data, or
 * OpenStreetMap, and "Revert" drops the override back to the underlying
 * source. For an unmatched building it shows "Not set" and lets the planner
 * type the real address.
 */

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  clearAddressOverride,
  getAddressOverride,
  setAddressOverride,
  subscribeAddressOverrides,
} from "@/lib/atlas/flint-address-overrides";
import {
  addressSourceLabel,
  formatStreetAddress,
  getFlintBuildingAddress,
  resolveBuildingAddressDetailed,
} from "@/lib/atlas/flint-building-addresses";

/** Reactive read of a building's override (SSR-safe, re-renders on change). */
export function useAddressOverride(
  osmId: string | number | null | undefined,
): string | null {
  return useSyncExternalStore(
    subscribeAddressOverrides,
    () => getAddressOverride(osmId),
    () => null,
  );
}

interface BuildingAddressEditorProps {
  readonly osmId: string | number;
  /** The building feature's OSM `address` tag, used as the fallback source. */
  readonly osmAddress?: string | null;
  /** Optional close handler; when provided a Close button is shown. */
  readonly onClose?: () => void;
  readonly className?: string;
}

export function BuildingAddressEditor({
  osmId,
  osmAddress = null,
  onClose,
  className,
}: BuildingAddressEditorProps) {
  // Subscribing keeps the source chip / Revert button in sync when the
  // override changes (including from the other surface or another tab).
  useAddressOverride(osmId);

  const resolved = resolveBuildingAddressDetailed(osmId, osmAddress);
  const flint = getFlintBuildingAddress(osmId);
  const cityAddress = flint ? formatStreetAddress(flint.address) : null;

  const [draft, setDraft] = useState(() => resolved?.text ?? "");

  const handleSave = useCallback(() => {
    setAddressOverride(osmId, draft);
    onClose?.();
  }, [osmId, draft, onClose]);

  const handleRevert = useCallback(() => {
    clearAddressOverride(osmId);
    // Re-seed the field with the underlying source so it is visible.
    setDraft(cityAddress ?? (typeof osmAddress === "string" ? osmAddress : ""));
  }, [osmId, cityAddress, osmAddress]);

  const isEdited = resolved?.source === "edit";
  const trimmedDraft = draft.trim();
  const dirty = trimmedDraft !== (resolved?.text ?? "");

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border border-[rgba(42,36,25,0.12)] bg-[color:var(--ctx-paper)] p-3 ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-[color:var(--ctx-ink-mute)]">
          Building address
        </span>
        <span className="rounded-full bg-[rgba(42,36,25,0.06)] px-2 py-0.5 text-[10px] text-[color:var(--ctx-ink-soft)]">
          {resolved ? addressSourceLabel(resolved.source) : "Not set"}
        </span>
      </div>

      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") handleSave();
          if (event.key === "Escape") onClose?.();
        }}
        placeholder="e.g. 316 W Water St"
        autoFocus
        className="w-full rounded border border-[rgba(42,36,25,0.18)] bg-white/70 px-2 py-1.5 text-[13px] text-[color:var(--ctx-ink)] outline-none focus:border-[color:var(--ctx-ink-soft)]"
      />

      {isEdited && cityAddress && cityAddress !== resolved?.text ? (
        <p className="text-[11px] leading-[1.4] text-[color:var(--ctx-ink-mute)]">
          City of Flint records: {cityAddress}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!dirty}
          className="rounded bg-[color:var(--ctx-ink)] px-3 py-1 text-[12px] font-medium text-[color:var(--ctx-paper)] disabled:opacity-40"
        >
          Save
        </button>
        {isEdited ? (
          <button
            type="button"
            onClick={handleRevert}
            className="rounded border border-[rgba(42,36,25,0.18)] px-3 py-1 text-[12px] text-[color:var(--ctx-ink-soft)]"
          >
            Revert
          </button>
        ) : null}
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded px-2 py-1 text-[12px] text-[color:var(--ctx-ink-mute)]"
          >
            Close
          </button>
        ) : null}
      </div>
    </div>
  );
}
