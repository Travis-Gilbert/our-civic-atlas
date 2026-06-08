/**
 * PlannerProgressBar: a small accessible linear progress bar for the porchfest
 * planner. Ported from the commonplace task bars (travisgilbert.me 152b09a) and
 * conformed to the civic-atlas `--ctx-*` register (single accent fill, since the
 * planner's rule is hierarchy from elevation, never color). Styles live in
 * src/app/porchfest/porchfest.css under `.planner-progress*`.
 *
 * `value` is a fraction in [0, 1]. Pass `caption` for a concrete figure (e.g.
 * "3/5" or "2 of 8 done"); pass `showPercent` to render "{pct}%" when no caption
 * is supplied.
 */

import type { CSSProperties } from "react";

export interface PlannerProgressBarProps {
  readonly value: number;
  readonly ariaLabel: string;
  readonly caption?: string;
  readonly showPercent?: boolean;
  readonly size?: "sm" | "md";
}

export function PlannerProgressBar({
  value,
  ariaLabel,
  caption,
  showPercent = false,
  size = "sm",
}: PlannerProgressBarProps) {
  const fraction = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const pct = Math.round(fraction * 100);
  const label = caption ?? (showPercent ? `${pct}%` : null);

  return (
    <div className={`planner-progress planner-progress--${size}`}>
      <div
        className="planner-progress-track"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="planner-progress-fill"
          style={{ width: `${pct}%` } as CSSProperties}
        />
      </div>
      {label !== null ? (
        <span className="planner-progress-label">{label}</span>
      ) : null}
    </div>
  );
}
