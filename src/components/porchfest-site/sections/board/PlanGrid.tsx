// @ts-nocheck
import { useState } from 'react';
import { C, serif, sans, mono } from '../../tokens';
import ProgressBar from '../../components/ProgressBar';
import { PLANS } from '../../board-data';

function tone(progress) {
  if (progress >= 66) return 'healthy';
  if (progress >= 25) return 'pending';
  return 'blocked';
}

function PlanCard({ plan }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const doneCount = plan.steps.filter((s) => s.done).length;

  return (
    <div
      style={{
        background: 'rgba(26,24,22,.6)',
        border: `1px solid ${hovered ? 'rgba(240,235,228,.18)' : 'rgba(240,235,228,.08)'}`,
        borderRadius: 12,
        padding: 24,
        transition: 'border-color .2s, transform .2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
        <div style={{ ...serif, fontSize: 19, fontWeight: 800, color: C.heroText, lineHeight: 1.2 }}>
          {plan.title}
        </div>
        <span style={{
          ...mono,
          fontSize: 9,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          color: 'rgba(240,235,228,.5)',
          background: 'rgba(240,235,228,.05)',
          padding: '4px 9px',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}>
          {plan.status}
        </span>
      </div>

      <ProgressBar value={plan.progress} tone={tone(plan.progress)} height={8} showLabel label={`${plan.title} progress`} />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 14 }}>
        <span style={{ ...mono, fontSize: 10, color: 'rgba(240,235,228,.4)' }}>
          Owner: <span style={{ color: 'rgba(240,235,228,.7)' }}>{plan.owner}</span>
        </span>
        <span style={{ ...mono, fontSize: 10, color: 'rgba(240,235,228,.4)' }}>
          {doneCount} / {plan.steps.length} steps
        </span>
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          ...mono,
          marginTop: 16,
          background: 'transparent',
          border: '1px solid rgba(240,235,228,.12)',
          color: 'rgba(240,235,228,.6)',
          padding: '8px 12px',
          borderRadius: 5,
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          cursor: 'pointer',
          width: '100%',
        }}
        aria-expanded={open}
      >
        {open ? 'Hide details' : 'View details'}
      </button>

      {open && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(240,235,228,.08)' }}>
          <div style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(240,235,228,.4)', marginBottom: 10 }}>
            Steps
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.steps.map((step, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Check done={step.done} />
                <span style={{
                  ...sans,
                  fontSize: 14,
                  color: step.done ? 'rgba(240,235,228,.4)' : C.heroText,
                  textDecoration: step.done ? 'line-through' : 'none',
                }}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
          {plan.notes && (
            <div style={{
              ...sans,
              fontSize: 13,
              color: 'rgba(240,235,228,.55)',
              lineHeight: 1.55,
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid rgba(240,235,228,.06)',
            }}>
              {plan.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Check({ done }) {
  return (
    <span style={{
      width: 16,
      height: 16,
      borderRadius: 4,
      border: `1.5px solid ${done ? C.teal : 'rgba(240,235,228,.2)'}`,
      background: done ? C.teal : 'transparent',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      {done && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M1.5 5l2.5 2.5L8.5 2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

export default function PlanGrid() {
  return (
    <section style={{ marginBottom: 48 }}>
      <div style={{
        ...mono,
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.14em',
        color: C.tealBright,
        marginBottom: 18,
      }}>
        Specific Plans
      </div>
      <div className="plan-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 20,
      }}>
        {PLANS.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
      </div>
      <style>{`@media(max-width:720px){.plan-grid{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
