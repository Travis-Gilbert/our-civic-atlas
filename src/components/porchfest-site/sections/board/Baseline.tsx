// @ts-nocheck
import { useEffect, useState } from 'react';
import { C, serif, sans, mono } from '../../tokens';
import ProgressBar from '../../components/ProgressBar';
import { BUDGET, KPIS, NEXT_STEPS, SPONSORSHIP_FINANCE } from '../../board-data';

const MONEY_DATA_PATH = '/porchfest-dashboard/data/money.json';

const fmt = (n) => '$' + n.toLocaleString('en-US');
const fmtCents = (cents, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format((cents ?? 0) / 100);
const fmtDate = (value) => {
  const parsed = Date.parse(value ?? '');
  if (!Number.isFinite(parsed)) return value ?? '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parsed));
};

const STATUS_STYLE = {
  todo: { label: 'To do', color: 'rgba(240,235,228,.45)', bg: 'rgba(240,235,228,.06)' },
  doing: { label: 'In progress', color: C.tealBright, bg: C.tealDim },
  done: { label: 'Done', color: C.gold, bg: C.goldDim },
};

function normalizeFinance(data) {
  const sponsorship = data?.sponsorship ?? {};
  return {
    ...SPONSORSHIP_FINANCE,
    status: data?.status ?? SPONSORSHIP_FINANCE.status,
    source: data?.source ?? SPONSORSHIP_FINANCE.source,
    currency: data?.currency ?? SPONSORSHIP_FINANCE.currency,
    goalCents:
      typeof data?.goalCents === 'number'
        ? data.goalCents
        : SPONSORSHIP_FINANCE.goalCents,
    askedCents:
      typeof sponsorship.askedCents === 'number'
        ? sponsorship.askedCents
        : SPONSORSHIP_FINANCE.askedCents,
    promisedCents:
      typeof sponsorship.promisedCents === 'number'
        ? sponsorship.promisedCents
        : SPONSORSHIP_FINANCE.promisedCents,
    collectedCents:
      typeof sponsorship.collectedCents === 'number'
        ? sponsorship.collectedCents
        : typeof data?.raisedCents === 'number'
          ? data.raisedCents
          : SPONSORSHIP_FINANCE.collectedCents,
    openPromisedCents:
      typeof sponsorship.openPromisedCents === 'number'
        ? sponsorship.openPromisedCents
        : SPONSORSHIP_FINANCE.openPromisedCents,
    sponsorRows:
      typeof sponsorship.sponsorRows === 'number'
        ? sponsorship.sponsorRows
        : SPONSORSHIP_FINANCE.sponsorRows,
    askedCount:
      typeof sponsorship.askedCount === 'number'
        ? sponsorship.askedCount
        : SPONSORSHIP_FINANCE.askedCount,
    promisedCount:
      typeof sponsorship.promisedCount === 'number'
        ? sponsorship.promisedCount
        : SPONSORSHIP_FINANCE.promisedCount,
    collectedCount:
      typeof sponsorship.collectedCount === 'number'
        ? sponsorship.collectedCount
        : typeof data?.paidCount === 'number'
          ? data.paidCount
          : SPONSORSHIP_FINANCE.collectedCount,
    porchesSponsored:
      typeof sponsorship.porchesSponsored === 'number'
        ? sponsorship.porchesSponsored
        : SPONSORSHIP_FINANCE.porchesSponsored,
    asOf: data?.asOf ?? SPONSORSHIP_FINANCE.asOf,
  };
}

function useSponsorshipFinance() {
  const [finance, setFinance] = useState(SPONSORSHIP_FINANCE);

  useEffect(() => {
    let cancelled = false;

    async function loadMoney() {
      try {
        const response = await fetch(MONEY_DATA_PATH, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled && data?.status === 'live') {
          setFinance(normalizeFinance(data));
        }
      } catch {
        // Keep the static sponsorship snapshot.
      }
    }

    loadMoney();
    return () => {
      cancelled = true;
    };
  }, []);

  return finance;
}

function BudgetCard() {
  const finance = useSponsorshipFinance();
  const { spent } = BUDGET;
  const goalCents = finance.goalCents || BUDGET.goal * 100;
  const maxPipelineCents = Math.max(
    goalCents,
    finance.askedCents,
    finance.promisedCents,
    finance.collectedCents,
    1,
  );
  const collectedPct = Math.round((finance.collectedCents / goalCents) * 100);

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
            Sponsorship & Finance
          </div>
          <div style={{ ...serif, fontSize: 28, fontWeight: 800, color: C.heroText, lineHeight: 1.1 }}>
            {fmtCents(finance.collectedCents, finance.currency)} <span style={{ color: 'rgba(240,235,228,.35)', fontWeight: 400 }}>collected of {fmtCents(goalCents, finance.currency)}</span>
          </div>
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'rgba(240,235,228,.45)' }}>
          {collectedPct}% of goal
        </div>
      </div>

      <ProgressBar value={finance.collectedCents} max={goalCents} tone="healthy" height={14} label="Sponsorship collected" />

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <PipelineRow label="Asked" value={finance.askedCents} max={maxPipelineCents} color="rgba(240,235,228,.28)" currency={finance.currency} />
        <PipelineRow label="Promised" value={finance.promisedCents} max={maxPipelineCents} color={C.gold} currency={finance.currency} />
        <PipelineRow label="Collected" value={finance.collectedCents} max={maxPipelineCents} color={C.tealBright} currency={finance.currency} />
      </div>

      <div className="budget-grid" style={{
        marginTop: 22,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
      }}>
        <BudgetMetric label="Asked" value={fmtCents(finance.askedCents, finance.currency)} color={C.heroText} />
        <BudgetMetric label="Promised" value={fmtCents(finance.promisedCents, finance.currency)} color={C.gold} />
        <BudgetMetric label="Collected" value={fmtCents(finance.collectedCents, finance.currency)} color={C.tealBright} />
        <BudgetMetric label="Open promised" value={fmtCents(finance.openPromisedCents, finance.currency)} color={C.burgBright} />
      </div>

      <div className="budget-grid" style={{
        marginTop: 18,
        paddingTop: 18,
        borderTop: '1px solid rgba(240,235,228,.06)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
      }}>
        <BudgetMetric label="Rows" value={finance.sponsorRows.toLocaleString('en-US')} color={C.heroText} />
        <BudgetMetric label="Active asks" value={finance.askedCount.toLocaleString('en-US')} color={C.heroText} />
        <BudgetMetric label="Collected entries" value={finance.collectedCount.toLocaleString('en-US')} color={C.heroText} />
        <BudgetMetric label="Spent" value={fmt(spent)} color="rgba(240,235,228,.55)" />
      </div>

      <div style={{ ...sans, fontSize: 12, color: 'rgba(240,235,228,.4)', lineHeight: 1.6, marginTop: 18 }}>
        {finance.porchesSponsored} porch sponsorship{finance.porchesSponsored === 1 ? '' : 's'} assigned · updated {fmtDate(finance.asOf)}
      </div>

      <style>{`@media(max-width:640px){.budget-grid{grid-template-columns:1fr 1fr!important}}`}</style>
    </div>
  );
}

function PipelineRow({ label, value, max, color, currency }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '86px 1fr 92px',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(240,235,228,.45)' }}>
        {label}
      </div>
      <div style={{
        height: 8,
        borderRadius: 999,
        overflow: 'hidden',
        background: 'rgba(240,235,228,.08)',
        border: '1px solid rgba(240,235,228,.04)',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 999,
          background: color,
        }} />
      </div>
      <div style={{ ...mono, fontSize: 10, color: 'rgba(240,235,228,.62)', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {fmtCents(value, currency)}
      </div>
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
