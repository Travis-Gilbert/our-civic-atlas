// @ts-nocheck
import { C, serif, sans, mono } from '../../tokens';
import ProgressBar from '../../components/ProgressBar';
import { BUDGET, KPIS, NEXT_STEPS } from '../../board-data';

const fmt = (n) => '$' + n.toLocaleString('en-US');

const STATUS_STYLE = {
  todo: { label: 'To do', color: 'rgba(240,235,228,.45)', bg: 'rgba(240,235,228,.06)' },
  doing: { label: 'In progress', color: C.tealBright, bg: C.tealDim },
  done: { label: 'Done', color: C.gold, bg: C.goldDim },
};

function BudgetCard() {
  const { goal, committed, pledged, spent } = BUDGET;
  const totalInHand = committed + pledged;

  return (
    <div style={{
      background: 'rgba(26,24,22,.6)',
      border: '1px solid rgba(240,235,228,.08)',
      borderRadius: 12,
      padding: 28,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: C.tealBright, marginBottom: 6 }}>
            Budget
          </div>
          <div style={{ ...serif, fontSize: 28, fontWeight: 800, color: C.heroText, lineHeight: 1.1 }}>
            {fmt(committed)} <span style={{ color: 'rgba(240,235,228,.35)', fontWeight: 400 }}>of {fmt(goal)}</span>
          </div>
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'rgba(240,235,228,.45)' }}>
          {Math.round((committed / goal) * 100)}% of goal
        </div>
      </div>

      <ProgressBar value={committed} max={goal} tone="healthy" height={14} label="Budget committed" />

      <div className="budget-grid" style={{
        marginTop: 22,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
      }}>
        <BudgetMetric label="Committed" value={fmt(committed)} color={C.tealBright} />
        <BudgetMetric label="Pledged" value={fmt(pledged)} color={C.gold} />
        <BudgetMetric label="In hand" value={fmt(totalInHand)} color={C.heroText} />
        <BudgetMetric label="Spent" value={fmt(spent)} color={C.burgBright} />
      </div>

      <style>{`@media(max-width:640px){.budget-grid{grid-template-columns:1fr 1fr!important}}`}</style>
    </div>
  );
}

function BudgetMetric({ label, value, color }) {
  return (
    <div>
      <div style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(240,235,228,.4)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ ...serif, fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}

function KpiTile({ label, value, note }) {
  return (
    <div style={{
      background: 'rgba(26,24,22,.6)',
      border: '1px solid rgba(240,235,228,.08)',
      borderRadius: 12,
      padding: 24,
    }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: C.gold, marginBottom: 10 }}>
        {label}
      </div>
      <div style={{ ...serif, fontSize: 44, fontWeight: 900, color: C.heroText, lineHeight: 1 }}>
        {value}
      </div>
      {note && (
        <div style={{ ...sans, fontSize: 12, color: 'rgba(240,235,228,.4)', marginTop: 10 }}>
          {note}
        </div>
      )}
    </div>
  );
}

function NextSteps() {
  return (
    <div style={{
      background: 'rgba(26,24,22,.6)',
      border: '1px solid rgba(240,235,228,.08)',
      borderRadius: 12,
      padding: 28,
    }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: C.burgBright, marginBottom: 16 }}>
        Next Steps
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NEXT_STEPS.map((step, i) => {
          const status = STATUS_STYLE[step.status] || STATUS_STYLE.todo;
          return (
            <li
              key={i}
              className="next-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                alignItems: 'center',
                gap: 16,
                padding: '14px 0',
                borderBottom: i < NEXT_STEPS.length - 1 ? '1px solid rgba(240,235,228,.06)' : 'none',
              }}
            >
              <span style={{ ...sans, fontSize: 15, color: C.heroText }}>
                {step.title}
              </span>
              <span style={{ ...mono, fontSize: 10, color: 'rgba(240,235,228,.4)' }} className="next-owner">
                {step.owner}
              </span>
              <span style={{ ...mono, fontSize: 10, color: 'rgba(240,235,228,.4)' }} className="next-due">
                {step.due}
              </span>
              <span style={{
                ...mono,
                fontSize: 9,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.12em',
                color: status.color,
                background: status.bg,
                padding: '5px 10px',
                borderRadius: 4,
              }}>
                {status.label}
              </span>
            </li>
          );
        })}
      </ul>
      <style>{`@media(max-width:640px){.next-row{grid-template-columns:1fr auto!important}.next-owner,.next-due{display:none!important}}`}</style>
    </div>
  );
}

export default function Baseline() {
  return (
    <section style={{ marginBottom: 48 }}>
      <BudgetCard />

      <div className="kpi-row" style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${KPIS.length}, 1fr)`,
        gap: 20,
        marginTop: 20,
      }}>
        {KPIS.map((k) => (
          <KpiTile key={k.label} {...k} />
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <NextSteps />
      </div>

      <style>{`@media(max-width:640px){.kpi-row{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
