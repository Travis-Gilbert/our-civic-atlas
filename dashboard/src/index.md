---
title: PorchFest Board
toc: false
---

```js
import {
  formatMoney,
  formatTimestamp,
  formatDate,
  labelFor,
  categorySortKey,
} from "./components/format.js";
```

```js
// All figures are refreshed by the data loaders in src/data/. The browser only
// ever reads the JSON files emitted by the dashboard build.
const money = await FileAttachment("data/money.json").json();
const submissions = await FileAttachment("data/submissions.json").json();
const tasks = await FileAttachment("data/tasks.json").json();
const meta = await FileAttachment("data/meta.json").json();
```

```js
// Brand-navy accent from the Path B register, plus a faint track colour for
// progress bars. Read from the Framework theme so light/dark stay consistent.
const NAVY = "#005186";
const TRACK = "var(--theme-foreground-faintest)";
const FAINT = "var(--theme-foreground-fainter)";
```

<div class="hero">
  <h1>PorchFest 2026 | board view</h1>
  <p>Where the festival stands: money against the goal, the current roster, and what is left. Figures refresh when the dashboard rebuilds.</p>
</div>

```js
// Source banner whenever a loader could not read its upstream system.
const unavailableSources = [
  money.status === "pending" ? "fundraising ledger" : null,
  submissions.status === "pending" ? "submissions" : null,
  tasks.status === "pending" ? "tasks" : null,
].filter(Boolean);
```

```js
unavailableSources.length > 0
  ? html`<div class="note" label="Source needs refresh">
      These sources were unavailable during the last dashboard refresh:
      <b>${unavailableSources.join(", ")}</b>. They will update after the next
      successful refresh.
    </div>`
  : null
```

## Money

```js
const goalCents = money.goalCents ?? null;
const raisedCents = money.raisedCents ?? 0;
const sponsorship = money.sponsorship ?? {};
const askedCents = sponsorship.askedCents ?? 0;
const promisedCents = sponsorship.promisedCents ?? 0;
const collectedCents = sponsorship.collectedCents ?? raisedCents;
const openPromisedCents = sponsorship.openPromisedCents ?? Math.max(promisedCents - collectedCents, 0);
const gapCents = goalCents != null ? Math.max(goalCents - raisedCents, 0) : null;
const moneyPct = goalCents ? Math.min(raisedCents / goalCents, 1) : null;
const promisedPct = goalCents ? Math.min(promisedCents / goalCents, 1) : null;
```

<div class="grid grid-cols-4">
  <div class="card">
    <h2>Collected</h2>
    <div class="big">${money.status === "pending" ? "—" : formatMoney(collectedCents, money.currency)}</div>
    <div class="muted">${money.status === "pending" ? "funding source unavailable" : `${money.paidCount} collected entr${money.paidCount === 1 ? "y" : "ies"}`}</div>
  </div>
  <div class="card">
    <h2>Promised</h2>
    <div class="big">${money.status === "pending" ? "—" : formatMoney(promisedCents, money.currency)}</div>
    <div class="muted">${money.status === "pending" ? "awaiting source" : `${sponsorship.promisedCount ?? 0} sponsor${(sponsorship.promisedCount ?? 0) === 1 ? "" : "s"} pledged`}</div>
  </div>
  <div class="card">
    <h2>Asked</h2>
    <div class="big">${money.status === "pending" ? "—" : formatMoney(askedCents, money.currency)}</div>
    <div class="muted">${money.status === "pending" ? "awaiting source" : `${sponsorship.askedCount ?? 0} active ask${(sponsorship.askedCount ?? 0) === 1 ? "" : "s"}`}</div>
  </div>
  <div class="card">
    <h2>Open pledges</h2>
    <div class="big">${money.status === "pending" ? "—" : formatMoney(openPromisedCents, money.currency)}</div>
    <div class="muted">${sponsorship.porchesSponsored ? `${sponsorship.porchesSponsored} porch sponsorship${sponsorship.porchesSponsored === 1 ? "" : "s"} assigned` : "porch sponsorships not assigned"}</div>
  </div>
</div>

<div class="grid grid-cols-1">
  <div class="card">
    <h2>Sponsorship pipeline</h2>
    ${money.status === "pending" ? html`<div class="muted">Funding source unavailable.</div>` : resize((width) => sponsorshipPipeline(width))}
    <div class="muted">${goalCents ? `${Math.round((promisedPct ?? 0) * 100)}% of goal promised; ${Math.round((moneyPct ?? 0) * 100)}% collected` : `${sponsorship.sponsorRows ?? 0} sponsor rows in the current source`}</div>
  </div>
</div>

```js
function sponsorshipPipeline(width) {
  const rows = [
    {label: "Asked", value: askedCents, fill: FAINT},
    {label: "Promised", value: promisedCents, fill: "#4f7d57"},
    {label: "Collected", value: collectedCents, fill: NAVY},
  ];
  const domainMax = Math.max(goalCents ?? 0, askedCents, promisedCents, collectedCents, 1);
  return Plot.plot({
    width,
    height: 120,
    marginTop: 12,
    marginBottom: 28,
    marginLeft: 80,
    marginRight: 16,
    x: {
      domain: [0, domainMax],
      label: null,
      tickFormat: (d) => formatMoney(d, money.currency),
      ticks: 4,
    },
    y: {label: null, domain: rows.map((d) => d.label)},
    marks: [
      Plot.barX(rows, {y: "label", x: "value", fill: "fill", rx: 4}),
      Plot.text(rows, {y: "label", x: "value", text: (d) => formatMoney(d.value, money.currency), dx: 6, textAnchor: "start", fill: "var(--theme-foreground-muted)"}),
      ...(goalCents ? [Plot.ruleX([goalCents], {stroke: "var(--theme-foreground)", strokeDasharray: "3,3"})] : []),
      Plot.ruleX([0]),
    ],
  });
}
```

## Submissions

```js
const subRows = [...(submissions.byCategory ?? [])]
  .map((r) => ({...r, label: labelFor(r.category)}))
  .sort((a, b) => categorySortKey(a.category) - categorySortKey(b.category) || b.count - a.count);
```

<div class="grid grid-cols-4">
  <div class="card">
    <h2>Total records</h2>
    <div class="big">${submissions.status === "pending" ? "—" : submissions.total.toLocaleString()}</div>
    <div class="muted">applications and organizer-entered rows across ${subRows.length} categor${subRows.length === 1 ? "y" : "ies"}</div>
  </div>
  ${subRows.slice(0, 3).map((r) => html`<div class="card">
    <h2>${r.label}</h2>
    <div class="big">${r.count.toLocaleString()}</div>
    <div class="muted">${submissions.total > 0 ? Math.round((r.count / submissions.total) * 100) : 0}% of records</div>
  </div>`)}
</div>

<div class="grid grid-cols-2">
  <div class="card">
    <h2>Roster by category</h2>
    ${subRows.length ? resize((width) => categoryBar(subRows, width)) : html`<div class="muted">No records yet.</div>`}
  </div>
  <div class="card">
    <h2>Submissions over time</h2>
    ${(submissions.overTime ?? []).length ? resize((width) => submissionsOverTime(width)) : html`<div class="muted">No dated submissions yet.</div>`}
  </div>
</div>

```js
function categoryBar(rows, width) {
  return Plot.plot({
    width,
    height: Math.max(140, rows.length * 38),
    marginLeft: 96,
    x: {label: "Records", grid: true},
    y: {label: null},
    marks: [
      Plot.barX(rows, {x: "count", y: "label", fill: NAVY, rx: 3, sort: {y: "x", reverse: true}}),
      Plot.text(rows, {x: "count", y: "label", text: (d) => d.count, dx: 6, textAnchor: "start", fill: "var(--theme-foreground-muted)"}),
      Plot.ruleX([0]),
    ],
  });
}

function submissionsOverTime(width) {
  const data = (submissions.overTime ?? []).map((d) => ({...d, date: new Date(d.day)}));
  return Plot.plot({
    width,
    height: Math.max(140, 38 * Math.min(subRows.length, 4)),
    marginLeft: 44,
    x: {type: "utc", label: null},
    y: {grid: true, label: "Cumulative"},
    marks: [
      Plot.areaY(data, {x: "date", y: "cumulative", fill: NAVY, fillOpacity: 0.12, curve: "step-after"}),
      Plot.lineY(data, {x: "date", y: "cumulative", stroke: NAVY, curve: "step-after"}),
      Plot.ruleY([0]),
    ],
  });
}
```

## What is left

```js
const statusRows = [...(tasks.byStatus ?? [])].map((r) => ({
  ...r,
  label: r.status.replace(/_/g, " "),
}));
```

<div class="grid grid-cols-3">
  <div class="card">
    <h2>Open tasks</h2>
    <div class="big">${tasks.status === "pending" ? "—" : tasks.open.toLocaleString()}</div>
    <div class="muted">${tasks.done} of ${tasks.total} done</div>
  </div>
  <div class="card">
    <h2>Overall completion</h2>
    <div class="big">${tasks.rollupPercent}%</div>
    <div class="muted">checklist- and status-weighted rollup</div>
  </div>
  <div class="card">
    <h2>Upcoming milestones</h2>
    <div class="big">${(tasks.milestones ?? []).length}</div>
    <div class="muted">dated tasks still open</div>
  </div>
</div>

<div class="grid grid-cols-1">
  <div class="card">
    <h2>Completion</h2>
    ${tasks.total > 0 ? resize((width) => rollupBar(width)) : html`<div class="muted">No tasks yet.</div>`}
  </div>
</div>

<div class="grid grid-cols-2">
  <div class="card">
    <h2>Tasks by status</h2>
    ${statusRows.length ? resize((width) => statusBar(width)) : html`<div class="muted">No tasks yet.</div>`}
  </div>
  <div class="card">
    <h2>Milestones</h2>
    ${(tasks.milestones ?? []).length
      ? html`<table class="milestones">
          <thead><tr><th>Due</th><th>Task</th><th>Status</th></tr></thead>
          <tbody>${tasks.milestones.slice(0, 8).map((m) => html`<tr>
            <td class="due">${formatDate(m.dueAt)}</td>
            <td>${m.title}</td>
            <td><span class="pill">${m.status.replace(/_/g, " ")}</span></td>
          </tr>`)}</tbody>
        </table>`
      : html`<div class="muted">No dated milestones.</div>`}
  </div>
</div>

```js
function rollupBar(width) {
  return Plot.plot({
    width,
    height: 64,
    marginTop: 8,
    marginBottom: 28,
    marginLeft: 8,
    marginRight: 8,
    x: {domain: [0, 100], label: null, tickFormat: (d) => `${d}%`, ticks: 5},
    y: {axis: null, domain: ["done"]},
    marks: [
      Plot.barX([{y: "done", v: 100}], {y: "y", x: "v", fill: TRACK, rx: 4}),
      Plot.barX([{y: "done", v: tasks.rollupPercent}], {y: "y", x: "v", fill: NAVY, rx: 4}),
      Plot.text([{y: "done", v: tasks.rollupPercent}], {y: "y", x: "v", text: () => `${tasks.rollupPercent}%`, fill: "var(--theme-background)", dx: -6, textAnchor: "end", fontWeight: 600}),
    ],
  });
}

function statusBar(width) {
  return Plot.plot({
    width,
    height: Math.max(120, statusRows.length * 36),
    marginLeft: 96,
    x: {label: "Tasks", grid: true},
    y: {label: null},
    marks: [
      Plot.barX(statusRows, {x: "count", y: "label", fill: FAINT, rx: 3, sort: {y: "x", reverse: true}}),
      Plot.text(statusRows, {x: "count", y: "label", text: (d) => d.count, dx: 6, textAnchor: "start", fill: "var(--theme-foreground-muted)"}),
      Plot.ruleX([0]),
    ],
  });
}
```

<footer class="built">
  Last refreshed ${formatTimestamp(meta.builtAt)} · event <code>${meta.eventSlug}</code> · tenant <code>${meta.tenantSlug}</code>${meta.moneyLedgerConfigured ? "" : " · money ledger source unavailable"}
</footer>

<style>
.hero h1 { margin-bottom: 0.25rem; }
.hero p { max-width: 52rem; color: var(--theme-foreground-muted); }
.muted { color: var(--theme-foreground-muted); font-size: 0.8125rem; margin-top: 0.25rem; }
.milestones { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.milestones th { text-align: left; color: var(--theme-foreground-muted); font-weight: 500; border-bottom: 1px solid var(--theme-foreground-faintest); padding: 0.25rem 0.5rem; }
.milestones td { padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--theme-foreground-faintest); vertical-align: top; }
.milestones td.due { white-space: nowrap; color: var(--theme-foreground-muted); }
.pill { display: inline-block; padding: 0.05rem 0.5rem; border-radius: 999px; background: var(--theme-foreground-faintest); font-size: 0.75rem; text-transform: capitalize; }
footer.built { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid var(--theme-foreground-faintest); color: var(--theme-foreground-muted); font-size: 0.8125rem; }
footer.built code { font-size: 0.8125rem; }
</style>
