// @ts-nocheck
import { C, mono } from '../tokens';

// Reusable progress bar.
// value: 0 to 100 (or 0 to max if max is provided)
// max: optional ceiling. If omitted, value is treated as a percentage.
// tone: 'healthy' | 'pending' | 'blocked'
// height: px
// showLabel: if true, render the percentage to the right
export default function ProgressBar({
  value = 0,
  max = 100,
  tone = 'healthy',
  height = 10,
  showLabel = false,
  label,
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  const fillColor = {
    healthy: C.teal,
    pending: C.gold,
    blocked: C.burg,
  }[tone] || C.teal;

  const trackColor = 'rgba(240,235,228,.08)';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        style={{
          flex: 1,
          height,
          background: trackColor,
          borderRadius: height / 2,
          overflow: 'hidden',
          border: '1px solid rgba(240,235,228,.04)',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: fillColor,
            transition: 'width .6s ease-out',
            borderRadius: height / 2,
          }}
        />
      </div>
      {showLabel && (
        <div
          style={{
            ...mono,
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(240,235,228,.6)',
            minWidth: 36,
            textAlign: 'right',
          }}
        >
          {Math.round(pct)}%
        </div>
      )}
    </div>
  );
}
