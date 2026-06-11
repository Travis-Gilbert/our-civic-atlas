// @ts-nocheck
import { C, serif, sans, mono } from '../../tokens';
import { ROADBLOCKS } from '../../board-data';

const SEVERITY = {
  high: { label: 'High', color: C.burgBright, bg: C.burgDim, border: 'rgba(150,56,72,.35)' },
  med: { label: 'Med', color: C.gold, bg: C.goldDim, border: 'rgba(196,154,74,.3)' },
  low: { label: 'Low', color: C.tealBright, bg: C.tealDim, border: 'rgba(42,122,123,.3)' },
};

function RoadblockRow({ item }) {
  const sev = SEVERITY[item.severity] || SEVERITY.med;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: 18,
      padding: '20px 0',
      borderBottom: '1px solid rgba(240,235,228,.06)',
    }}>
      <span style={{
        ...mono,
        fontSize: 9,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: sev.color,
        background: sev.bg,
        border: `1px solid ${sev.border}`,
        padding: '6px 10px',
        borderRadius: 4,
        height: 'fit-content',
        minWidth: 48,
        textAlign: 'center',
      }}>
        {sev.label}
      </span>
      <div>
        <div style={{ ...serif, fontSize: 17, fontWeight: 700, color: C.heroText, marginBottom: 6 }}>
          {item.title}
        </div>
        {item.description && (
          <div style={{ ...sans, fontSize: 14, color: 'rgba(240,235,228,.55)', lineHeight: 1.55, marginBottom: 8 }}>
            {item.description}
          </div>
        )}
        {item.ask && (
          <div style={{
            ...sans,
            fontSize: 13,
            color: C.gold,
            padding: '8px 12px',
            background: 'rgba(196,154,74,.06)',
            border: '1px solid rgba(196,154,74,.18)',
            borderRadius: 6,
            display: 'inline-block',
          }}>
            <span style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', marginRight: 8 }}>
              Ask:
            </span>
            {item.ask}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Roadblocks() {
  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{
        background: 'rgba(26,24,22,.6)',
        border: '1px solid rgba(240,235,228,.08)',
        borderRadius: 12,
        padding: '8px 28px 24px',
      }}>
        <div style={{
          ...mono,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          color: C.burgBright,
          padding: '22px 0 8px',
        }}>
          Roadblocks
        </div>
        {ROADBLOCKS.length === 0 ? (
          <div style={{ ...sans, fontSize: 14, color: 'rgba(240,235,228,.4)', padding: '20px 0' }}>
            No roadblocks logged.
          </div>
        ) : (
          ROADBLOCKS.map((r, i) => <RoadblockRow key={i} item={r} />)
        )}
      </div>
    </section>
  );
}
