"use client";

/**
 * AtelierEvidenceCard - PT-401
 *
 * Source card rendered in the atelier scene area. The first implementation
 * used one visual style per EvidenceType, but the atelier reads more clearly
 * when all sources share one calm archival-card language and source type is
 * shown as metadata instead of costume.
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
  const typeBadge = evidenceTypeBadge(item.evidenceType);

  return (
    <div
      className="atelier-source-card"
      data-source-type="source"
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
