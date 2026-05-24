"use client";

/**
 * AtelierEvidenceCard - PT-401
 *
 * Type-dispatched source card rendered in the atelier scene area at
 * geographic-provenance positions. One card per EvidenceItem. Each
 * source type gets a distinct visual identity per atelier spec lines
 * 36-38 and `atelier-visual-register-proposal.md` Decision 3:
 *
 *   - SANBORN: amber paper with sepia rule lines (handled by atelier.css
 *     repeating-linear-gradient background)
 *   - PHOTOGRAPH: chamfered-corner frame (clip-path chamfer)
 *   - DIRECTORY / CITY_DIRECTORY: typewriter card with bottom hairline
 *   - TEXT_MENTION: italic quoted slip, no card chrome
 *   - HABS_RECORD: government-archive paper with federal-blue border
 *   - PLAT_MAP: drafting-vellum line-drawing
 *   - OTHER: neutral cream
 *
 * CSS dispatch on `data-source-type` attribute (see atelier.css selectors
 * `.atelier-source-card[data-source-type="..."]`).
 *
 * Position: cards are absolute-positioned. Caller provides x/y offsets
 * (top/left CSS). Geographic-provenance positioning per spec line 66
 * lands at PT-303 (Stage 1 choreographer). Until then, callers use
 * simple anchor positions.
 */

import type { AtelierDossier } from "@/lib/atlas/use-reconstruction-dossier";
import type { EvidenceType } from "@/lib/api/graphql/generated/graphql";

type EvidenceItem = AtelierDossier["evidence"]["items"][number];

type AtelierEvidenceCardProps = {
  item: EvidenceItem;
  /** Position in CSS terms (top, left, right, bottom). Defaults to
   * static positioning if omitted. */
  style?: React.CSSProperties;
  onSelect?: (item: EvidenceItem) => void;
};

function evidenceTypeKey(evidenceType: EvidenceType): string {
  return evidenceType.toLowerCase();
}

function evidenceTypeBadge(evidenceType: EvidenceType): string {
  switch (evidenceType) {
    case "SANBORN":
      return "Sanborn";
    case "PHOTOGRAPH":
      return "Photo";
    case "DIRECTORY":
    case "CITY_DIRECTORY":
      return "Directory";
    case "TEXT_MENTION":
      return "Mention";
    case "PLAT_MAP":
      return "Plat";
    case "HABS_RECORD":
      return "HABS";
    case "OTHER":
      return "Source";
  }
}

export function AtelierEvidenceCard({
  item,
  style,
  onSelect,
}: AtelierEvidenceCardProps) {
  const typeKey = evidenceTypeKey(item.evidenceType);
  const typeBadge = evidenceTypeBadge(item.evidenceType);

  // Text Mention has no card chrome (spec line 38, Decision 3). Render
  // as a floating italic quoted slip.
  if (item.evidenceType === "TEXT_MENTION") {
    return (
      <div
        className="atelier-source-card"
        data-source-type={typeKey}
        style={style}
        role="article"
        aria-label={`Text mention from ${item.source.name}`}
        tabIndex={0}
        onClick={() => onSelect?.(item)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.(item);
          }
        }}
      >
        <span className="atelier-source-card__quote">&ldquo;</span>
        <span>{item.summary ?? item.source.name}</span>
        <span className="atelier-source-card__quote">&rdquo;</span>
        <div
          style={{
            marginTop: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            fontStyle: "normal",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          {item.source.name}
          {item.sourceDateLabel ? ` · ${item.sourceDateLabel}` : ""}
        </div>
      </div>
    );
  }

  // Photograph has an inner div for the photo-paper interior (CSS
  // clip-path creates the chamfer on the outer card; the inner div
  // holds the actual content so the chamfer reads as a real frame).
  if (item.evidenceType === "PHOTOGRAPH") {
    return (
      <div
        className="atelier-source-card"
        data-source-type={typeKey}
        style={style}
        role="article"
        aria-label={`Photograph from ${item.source.name}`}
        tabIndex={0}
        onClick={() => onSelect?.(item)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect?.(item);
          }
        }}
      >
        <div className="atelier-source-card__inner">
          <CardHeader
            title={item.source.name}
            dateLabel={item.sourceDateLabel}
            badge={typeBadge}
          />
          <CardSummary text={item.summary} />
          <ConfidenceChip confidence={item.confidence} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="atelier-source-card"
      data-source-type={typeKey}
      style={style}
      role="article"
      aria-label={`${typeBadge} from ${item.source.name}`}
      tabIndex={0}
      onClick={() => onSelect?.(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect?.(item);
        }
      }}
    >
      <CardHeader
        title={item.source.name}
        dateLabel={item.sourceDateLabel}
        badge={typeBadge}
      />
      <CardSummary text={item.summary} />
      <ConfidenceChip confidence={item.confidence} />
    </div>
  );
}

function CardHeader({
  title,
  dateLabel,
  badge,
}: {
  title: string;
  dateLabel: string | null | undefined;
  badge: string;
}) {
  return (
    <div className="atelier-source-card__header">
      <div className="atelier-source-card__title">{title}</div>
      <div className="atelier-source-card__year">
        {dateLabel ?? badge}
      </div>
    </div>
  );
}

function CardSummary({ text }: { text: string | null | undefined }) {
  if (!text) return null;
  return <p className="atelier-source-card__summary">{text}</p>;
}

function ConfidenceChip({ confidence }: { confidence: number }) {
  // Per the Lost Flint brainstorm 60/90 thresholds, hide chip when
  // confidence >= 0.85 (the clean default).
  if (confidence >= 0.85) return null;
  const label =
    confidence < 0.6
      ? "contested"
      : `${Math.round(confidence * 100)}% confidence`;
  return <div className="atelier-source-card__confidence-chip">{label}</div>;
}
