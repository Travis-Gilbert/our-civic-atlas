"use client";

/**
 * ControlDossier — the editable layer-preset rack on the left of the
 * atlas.
 *
 * Borrows the visual language of the Context Theorem FileTree (folder /
 * file icons, chevrons, indented hierarchy, mono labels) but is NOT a
 * navigation tree. Each "file" is an editable preset that controls
 * what the map renders. Two affordances per row:
 *
 *   - Eye toggle (left of name): turns the corresponding map overlay
 *     on or off. Wired to the existing `layerVisibility` map.
 *   - Chevron + name: expands the row inline so the user can edit the
 *     preset's parameters (filters, styling, thresholds). The dossier
 *     panel itself has no fixed height — it grows as files open.
 *
 * Behavior:
 *
 *   - Sticky on the left side of the body, vertically centered. Always
 *     transparent (no card chrome).
 *   - `data-fade-source` so the page-level proximity-fade in
 *     CanvasBackground softens dots beneath the dossier.
 *   - Each preset row's `controls` is rendered inline when expanded.
 *     The component does not assume what those controls are — they're
 *     passed in by the page, so the dossier is reusable across
 *     different atlas views.
 *
 * Wire-up: replaces the prior `dossier` slot content in
 * /open-flint-atlas/page.tsx. The top-right toolbar `LayerControls`
 * dropdown is now redundant; either keep it as a quick toggle or drop
 * it in a follow-up.
 */

import { useCallback, useState, type ReactNode } from "react";

const ChevronRight = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M5 3l4 4-4 4" />
  </svg>
);
const ChevronDown = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M3 5l4 4 4-4" />
  </svg>
);

/**
 * File-extension icon glyphs. Mirrors the scheme used by the FileTree
 * component (Context-Theorem-UI/src/components/ui/file-tree.tsx) where
 * each file extension renders a colored Unicode glyph in place of an
 * SVG icon. New entries here: geojson + ndjson, since the atlas works
 * with map/event data formats that aren't in the dev-tool tree.
 */
const FILE_GLYPHS: Record<string, { color: string; glyph: string }> = {
  geojson: { color: "oklch(0.65 0.16 165)", glyph: "⬣" },
  ndjson:  { color: "oklch(0.7 0.14 90)",  glyph: "⬡" },
  json:    { color: "oklch(0.75 0.15 85)", glyph: "{}" },
  md:      { color: "oklch(0.6 0.0 0)",    glyph: "◊" },
  ts:      { color: "oklch(0.6 0.15 230)", glyph: "◆" },
  tsx:     { color: "oklch(0.65 0.18 220)", glyph: "⚛" },
  css:     { color: "oklch(0.65 0.2 280)", glyph: "◈" },
  svg:     { color: "oklch(0.7 0.15 160)", glyph: "◐" },
  default: { color: "var(--ctx-ink-mute)", glyph: "◇" },
};

function getFileGlyph(extension?: string) {
  return FILE_GLYPHS[extension ?? "default"] ?? FILE_GLYPHS.default;
}

export interface LayerPreset {
  /** Stable key matching layerVisibility map. */
  id: string;
  /** Human-readable label. */
  name: string;
  /** File-extension hint, e.g. "geojson", "csv". Rendered as a muted suffix. */
  extension?: string;
  /** Editable preset content, rendered when the row is expanded. */
  controls?: ReactNode;
}

export interface ControlDossierProps {
  /** Preset rows to render. Order is preserved. */
  presets: LayerPreset[];
  /** Map of layer id → visible. */
  visibility: Record<string, boolean>;
  /** Toggle a layer's visibility. */
  onToggle: (id: string, visible: boolean) => void;
  /** Optional default-open row id (e.g. the one most recently selected). */
  defaultOpenId?: string;
}

export function ControlDossier({
  presets,
  visibility,
  defaultOpenId,
}: ControlDossierProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(() =>
    defaultOpenId ? new Set([defaultOpenId]) : new Set(),
  );

  const toggleOpen = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div
      className="control-dossier-card w-full"
      aria-label="Control dossier — atlas layer presets"
    >
      {/* Preset rows */}
      <ul className="px-1 py-2 list-none m-0">
        {presets.map((preset) => {
          const isOpen = openIds.has(preset.id);
          const isVisible = visibility[preset.id] !== false;
          return (
            <li key={preset.id} className="m-0">
              {/* Row — chevron + glyph + name + extension. The eye toggle
                  is gone (the preset opens to expose its own visibility
                  control if needed). The whole row is one clickable target. */}
              <div
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-[3px] hover:bg-[rgba(31,31,35,0.04)] transition-colors"
                style={{
                  color: isVisible ? "var(--ctx-ink)" : "var(--ctx-ink-mute)",
                }}
              >
                {/* Chevron — opens preset editor inline. */}
                <button
                  type="button"
                  onClick={() => toggleOpen(preset.id)}
                  className="flex items-center justify-center shrink-0 cursor-pointer"
                  style={{
                    width: 14,
                    height: 14,
                    background: "transparent",
                    border: "none",
                    color: "var(--ctx-ink-mute)",
                  }}
                  aria-expanded={isOpen}
                  aria-label={isOpen ? `Close ${preset.name} preset` : `Open ${preset.name} preset`}
                >
                  {isOpen ? (
                    <ChevronDown className="w-[10px] h-[10px]" />
                  ) : (
                    <ChevronRight className="w-[10px] h-[10px]" />
                  )}
                </button>

                {/* File-extension glyph + name + ext. Clicking the row also toggles open. */}
                <button
                  type="button"
                  onClick={() => toggleOpen(preset.id)}
                  className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer"
                  style={{ background: "transparent", border: "none", padding: 0 }}
                >
                  {(() => {
                    const g = getFileGlyph(preset.extension);
                    return (
                      <span
                        className="font-mono text-[12px] leading-none shrink-0 select-none"
                        style={{ color: g.color, width: 14, textAlign: "center" }}
                        aria-hidden="true"
                      >
                        {g.glyph}
                      </span>
                    );
                  })()}
                  <span
                    className="text-[12.5px] leading-[1.4] truncate"
                    style={{
                      color: isVisible ? "var(--ctx-ink)" : "var(--ctx-ink-mute)",
                    }}
                  >
                    {preset.name}
                  </span>
                  {preset.extension && (
                    <span
                      className="font-mono text-[10px] shrink-0"
                      style={{ color: "var(--ctx-ink-faint)" }}
                    >
                      .{preset.extension}
                    </span>
                  )}
                </button>
              </div>

              {/* Expanded preset editor */}
              {isOpen && preset.controls && (
                <div
                  className="ml-7 mr-1 mt-1 mb-2 px-2 py-2 rounded-[3px]"
                  style={{
                    borderLeft: "1px solid var(--ctx-rule-soft)",
                    color: "var(--ctx-ink-soft)",
                  }}
                >
                  {preset.controls}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
