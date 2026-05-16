"use client";

import { useCallback } from "react";
import { ATLAS_STATE_LEGEND_ITEMS, rgbaCss } from "@/lib/atlas/visual-grammar";

/* ------------------------------------------------------------------ */
/*  Icons                                                              */
/* ------------------------------------------------------------------ */

const EyeIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M1.5 7s2-4 5.5-4 5.5 4 5.5 4-2 4-5.5 4S1.5 7 1.5 7z" />
    <circle cx="7" cy="7" r="1.5" />
  </svg>
);
const EyeOffIcon = (p: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" {...p}>
    <path d="M2 2l10 10" />
    <path d="M5.5 5.5a1.5 1.5 0 002 2" />
    <path d="M4 4C2.5 5 1.5 7 1.5 7s2 4 5.5 4c1 0 1.8-.3 2.5-.7" />
    <path d="M10.5 9C11.8 8 12.5 7 12.5 7s-2-4-5.5-4c-.5 0-1 .06-1.5.2" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Layer definitions                                                  */
/* ------------------------------------------------------------------ */

const LAYERS = [
  { key: "places", label: "Places" },
  { key: "events", label: "Events" },
  { key: "freshSignals", label: "Fresh Signals" },
  { key: "wards", label: "Ward Boundaries" },
  { key: "infrastructure", label: "Infrastructure" },
] as const;

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export type LayerControlsProps = {
  visibility: Record<string, boolean>;
  onChange: (key: string, visible: boolean) => void;
  visible: boolean;
};

/* ------------------------------------------------------------------ */
/*  LayerControls                                                      */
/* ------------------------------------------------------------------ */

export function LayerControls({
  visibility,
  onChange,
  visible,
}: LayerControlsProps) {
  const handleToggle = useCallback(
    (key: string) => {
      onChange(key, !visibility[key]);
    },
    [visibility, onChange],
  );

  if (!visible) return null;

  return (
    <div
      className="absolute z-20 flex flex-col gap-0.5 rounded-[6px]"
      style={{
        top: 12,
        right: 12,
        maxWidth: 220,
        padding: "10px 12px",
        background: "var(--ctx-paper)",
        border: "1px solid var(--ctx-rule-soft)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      {/* Header */}
      <span
        className="font-mono text-[10px] uppercase tracking-[0.14em] mb-1"
        style={{ color: "var(--ctx-ink-mute)" }}
      >
        Layers
      </span>

      {/* Rows */}
      {LAYERS.map(({ key, label }) => {
        const on = visibility[key] !== false;
        return (
          <button
            key={key}
            type="button"
            onClick={() => handleToggle(key)}
            className="flex items-center gap-2.5 px-1.5 py-[5px] rounded-[3px] cursor-pointer transition-colors"
            style={{
              background: "transparent",
              border: "none",
            }}
          >
            {/* Toggle indicator */}
            <span
              className="flex items-center justify-center shrink-0 rounded-[3px] transition-colors"
              style={{
                width: 22,
                height: 22,
                background: on ? "rgba(193,74,44,0.10)" : "transparent",
                border: `1px solid ${on ? "var(--ctx-accent)" : "var(--ctx-rule-soft)"}`,
                color: on ? "var(--ctx-accent)" : "var(--ctx-ink-mute)",
              }}
            >
              {on ? (
                <EyeIcon className="w-[12px] h-[12px]" />
              ) : (
                <EyeOffIcon className="w-[12px] h-[12px]" />
              )}
            </span>

            {/* Label */}
            <span
              className="text-[13px] leading-[1.4]"
              style={{
                color: on ? "var(--ctx-ink)" : "var(--ctx-ink-mute)",
              }}
            >
              {label}
            </span>
          </button>
        );
      })}

      <div
        className="mt-2 rounded-[5px] px-2 py-2"
        style={{
          background: "rgba(255, 255, 255, 0.34)",
          border: "1px solid var(--ctx-rule-soft)",
        }}
      >
        <span
          className="font-mono text-[10px] uppercase tracking-[0.14em]"
          style={{ color: "var(--ctx-ink-mute)" }}
        >
          State Grammar
        </span>
        <div className="mt-2 grid gap-1.5">
          {ATLAS_STATE_LEGEND_ITEMS.map((state) => (
            <div key={state.id} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 items-center justify-center rounded-full text-[11px]"
                style={{
                  color: state.outline_hex,
                  background: rgbaCss(state.color_hex, state.fill_alpha / 255),
                  border:
                    state.stroke_style === "dashed"
                      ? `1px dashed ${state.outline_hex}`
                      : state.stroke_style === "dotted"
                        ? `1px dotted ${state.outline_hex}`
                        : `1px solid ${state.outline_hex}`,
                }}
              >
                {state.icon}
              </span>
              <div className="min-w-0">
                <p
                  className="m-0 text-[11px] leading-[1.35]"
                  style={{ color: "var(--ctx-ink)" }}
                >
                  {state.label}
                </p>
                <p
                  className="m-0 text-[10px] leading-[1.35]"
                  style={{ color: "var(--ctx-ink-mute)" }}
                >
                  {state.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
