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
const placements = await FileAttachment("data/placements.json").json();
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
  <p>Where the festival stands: money against the goal, who has applied, how much is on the map, and what is left. Figures refresh when the dashboard rebuilds.</p>
</div>

```js
// Source banner whenever a loader could not read its upstream system.
const unavailableSources = [
  money.status === "pending" ? "fundraising ledger" : null,
  submissions.status === "pending" ? "submissions" : null,
  placements.status === "pending" ? "map placements" : null,
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
const gapCents = goalCents != null ? Math.max(goalCents - raisedCents, 0) : null;
const moneyPct = goalCents ? Math.min(raisedCents / goalCents, 1) : null;
```

<div class="grid grid-cols-3">
  <div class="card">
    <h2>Raised</h2>
    <div class="big">${money.status === "pending" ? "—" : formatMoney(raisedCents, money.currency)}</div>
    <div class="muted">${money.status === "pending" ? "ledger source unavailable" : `${money.paidCount} payment${money.paidCount === 1 ? "" : "s"} received`}</div>
  </div>
  <div class="card">
    <h2>Goal</h2>
    <div class="big">${goalCents != null ? formatMoney(goalCents, money.currency) : "—"}</div>
    <div class="muted">${goalCents != null ? "fundraising target" : "goal not configured"}</div>
  </div>
  <div class="card">
    <h2>Gap to goal</h2>
    <div class="big">${gapCents != null ? formatMoney(gapCents, money.currency) : "—"}</div>
    <div class="muted">${moneyPct != null ? `${Math.round(moneyPct * 100)}% of goal raised` : "add a goal to track the gap"}</div>
  </div>
</div>

<div class="grid grid-cols-1">
  <div class="card">
    <h2>Progress to goal</h2>
    ${goalCents ? resize((width) => moneyBar(width)) : html`<div class="muted">No fundraising goal configured yet.</div>`}
  </div>
</div>

```js
function moneyBar(width) {
  const domainMax = Math.max(goalCents ?? 0, raisedCents, 1);
  return Plot.plot({
    width,
    height: 70,
    marginTop: 8,
    marginBottom: 28,
    marginLeft: 8,
    marginRight: 8,
    x: {
      domain: [0, domainMax],
      label: null,
      tickFormat: (d) => formatMoney(d, money.currency),
      ticks: 4,
    },
    y: {axis: null, domain: ["goal"]},
    marks: [
      Plot.barX([{y: "goal", v: goalCents ?? 0}], {y: "y", x: "v", fill: TRACK, rx: 4}),
      Plot.barX([{y: "goal", v: raisedCents}], {y: "y", x: "v", fill: NAVY, rx: 4}),
      Plot.ruleX([goalCents ?? 0], {stroke: "var(--theme-foreground)", strokeDasharray: "3,3"}),
      Plot.text(
        [{y: "goal", v: raisedCents}],
        {
          y: "y",
          x: "v",
          text: () => (moneyPct != null ? `${Math.round(moneyPct * 100)}%` : ""),
          fill: "var(--theme-background)",
          dx: -6,
          textAnchor: "end",
          fontWeight: 600,
        },
      ),
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
    <h2>Total applications</h2>
    <div class="big">${submissions.status === "pending" ? "—" : submissions.total.toLocaleString()}</div>
    <div class="muted">across ${subRows.length} categor${subRows.length === 1 ? "y" : "ies"}</div>
  </div>
  ${subRows.slice(0, 3).map((r) => html`<div class="card">
    <h2>${r.label}</h2>
    <div class="big">${r.count.toLocaleString()}</div>
    <div class="muted">${submissions.total > 0 ? Math.round((r.count / submissions.total) * 100) : 0}% of applications</div>
  </div>`)}
</div>

<div class="grid grid-cols-2">
  <div class="card">
    <h2>Applications by category</h2>
    ${subRows.length ? resize((width) => categoryBar(subRows, width)) : html`<div class="muted">No submissions yet.</div>`}
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
    x: {label: "Applications", grid: true},
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

## On the festival map

```js
const placedRows = [...(placements.byCategory ?? [])]
  .map((r) => ({...r, label: labelFor(r.category)}))
  .sort((a, b) => b.count - a.count);
const biggest = placedRows[0];
```

<div class="grid grid-cols-3">
  <div class="card">
    <h2>Placed on the map</h2>
    <div class="big">${placements.status === "pending" ? "—" : placements.total.toLocaleString()}</div>
    <div class="muted">placements across ${placedRows.length} categor${placedRows.length === 1 ? "y" : "ies"}</div>
  </div>
  <div class="card">
    <h2>Applications received</h2>
    <div class="big">${submissions.total.toLocaleString()}</div>
    <div class="muted">the applicant pipeline, above</div>
  </div>
  <div class="card">
    <h2>Largest on the map</h2>
    <div class="big">${biggest ? biggest.count.toLocaleString() : "—"}</div>
    <div class="muted">${biggest ? biggest.label.toLowerCase() : "nothing placed yet"}</div>
  </div>
</div>

```js
html`<div class="note" label="What this shows">
  The festival map is the imported <b>placements</b> layer: vendor stalls, music
  porches, parking, and amenities. Applicant-to-porch assignments remain in the
  planning workspace, so this section is the map's composition rather than an
  applicant-by-applicant placement count.
</div>`
```

<div class="grid grid-cols-1">
  <div class="card">
    <h2>Placements by category</h2>
    ${placedRows.length ? resize((width) => placedBar(width)) : html`<div class="muted">Nothing placed on the map yet.</div>`}
  </div>
</div>

```js
function placedBar(width) {
  return Plot.plot({
    width,
    height: Math.max(160, placedRows.length * 34),
    marginLeft: 110,
    x: {label: "Placements", grid: true},
    y: {label: null},
    marks: [
      Plot.barX(placedRows, {x: "count", y: "label", fill: NAVY, rx: 3, sort: {y: "x", reverse: true}}),
      Plot.text(placedRows, {x: "count", y: "label", text: (d) => d.count, dx: 6, textAnchor: "start", fill: "var(--theme-foreground-muted)"}),
      Plot.ruleX([0]),
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
