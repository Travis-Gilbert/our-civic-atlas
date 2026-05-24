"use client";

/**
 * AtelierChromeLabel - top-left "RECONSTRUCTING / 1500 N SAGINAW ST · CIRCA 1925"
 * Per atelier spec line 56-60 and `animation-choreography.md` Stage 0.
 *
 * The label remains visible throughout the animation (spec line 63).
 * Transitions to "RECONSTRUCTED" eyebrow once Stage 7 settles (PT-309).
 */

type AtelierChromeLabelProps = {
  /** "RECONSTRUCTING" during animation; "RECONSTRUCTED" at Stage 7. */
  eyebrow?: string;
  /** Address + circa-year line. */
  title: string;
};

export function AtelierChromeLabel({
  eyebrow = "RECONSTRUCTING",
  title,
}: AtelierChromeLabelProps) {
  return (
    <div className="atelier-chrome-label">
      <span className="atelier-chrome-label__eyebrow">{eyebrow}</span>
      <span className="atelier-chrome-label__title">{title}</span>
    </div>
  );
}
