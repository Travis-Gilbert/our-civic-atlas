// @ts-nocheck
// Board dashboard data
// Edit these values when status changes, then commit.
// Vercel auto-redeploys on push to main.

export const BOARD_META = {
  title: 'Board Dashboard',
  subtitle: 'Carriage Town Porchfest 2026',
  asOf: '2026-04-20',
};

// Budget
// goal: fundraising target for the year
// committed: confirmed sponsorship money (signed / paid)
// pledged: verbal or unsigned pledges
// spent: cash out the door so far
export const BUDGET = {
  goal: 50000,
  committed: 11000,
  pledged: 0,
  spent: 0,
};

// KPI tiles shown next to the budget bar.
// Update values by hand when a batch of new applications or inquiries comes in.
export const KPIS = [
  {
    label: 'Performer Applications',
    value: 0,
    note: 'Submissions via /apply',
  },
  {
    label: 'Sponsor Inquiries',
    value: 0,
    note: 'Submissions via /sponsors',
  },
];

// Top-level next steps for Travis/board.
// status: 'todo' | 'doing' | 'done'
export const NEXT_STEPS = [
  {
    title: 'Confirm Square billing handoff',
    owner: 'Travis',
    due: '2026-05-01',
    status: 'doing',
  },
  {
    title: 'Lock in city permit and street closure approval',
    owner: 'Travis',
    due: '2026-05-15',
    status: 'todo',
  },
  {
    title: 'Confirm Main Stage vendor and load-in plan',
    owner: 'TBD',
    due: '2026-06-01',
    status: 'todo',
  },
];

// Roadblocks the board can help unblock.
// severity: 'low' | 'med' | 'high'
// ask: what the board specifically needs to do
export const ROADBLOCKS = [
  {
    title: 'Need board introductions to 3 target sponsors',
    severity: 'high',
    description: 'Short list is ready. Warm intros will close faster than cold outreach.',
    ask: 'Each board member: send 1 intro email this week.',
  },
  {
    title: 'City approval timeline unclear',
    severity: 'med',
    description: 'Initial meeting went well but we have not received a permit decision yet.',
    ask: 'Board connection to city manager office if we do not hear back by May 1.',
  },
];

// Specific operational plans.
// progress: 0 to 100
// status: short free-text label
// steps: each item is a checklist row
// notes: optional longer context shown under the steps
export const PLANS = [
  {
    id: 'trash',
    title: 'Trash Pickup & Removal',
    icon: 'trash',
    progress: 15,
    owner: 'TBD',
    status: 'Scoping',
    steps: [
      { label: 'Identify dumpster or bin vendor', done: false },
      { label: 'Map placement across the six blocks', done: false },
      { label: 'Confirm day-of cleanup crew', done: false },
      { label: 'Schedule post-event haul away', done: false },
    ],
    notes: 'Day-of trash was a sore point in 2025. Want this nailed down by June.',
  },
  {
    id: 'city',
    title: 'City Approval',
    icon: 'city',
    progress: 40,
    owner: 'Travis',
    status: 'In motion',
    steps: [
      { label: 'Initial meeting with city manager', done: true },
      { label: 'Submit street closure application', done: false },
      { label: 'Submit noise ordinance variance', done: false },
      { label: 'Receive written approval', done: false },
    ],
    notes: 'First meeting was positive. Application packet is drafted, awaiting a final review.',
  },
  {
    id: 'safety',
    title: 'Safety & Medical',
    icon: 'safety',
    progress: 0,
    owner: 'TBD',
    status: 'Not started',
    steps: [
      { label: 'First aid / EMT coverage', done: false },
      { label: 'Police detail or volunteer marshals', done: false },
      { label: 'Emergency contact tree', done: false },
    ],
    notes: '',
  },
  {
    id: 'volunteers',
    title: 'Volunteer Recruitment',
    icon: 'volunteers',
    progress: 10,
    owner: 'TBD',
    status: 'Early',
    steps: [
      { label: 'Define volunteer roles and shift count', done: false },
      { label: 'Set up signup form', done: false },
      { label: 'Recruit block captains', done: false },
    ],
    notes: '',
  },
];

// Marketing plan gets its own section so board members can see the actual artifacts.
// status values kept loose so Travis can write anything meaningful.
export const MARKETING = {
  facebookPosts: [
    // { label: 'Lineup teaser', url: 'https://facebook.com/...', status: 'draft' },
  ],
  pressReleases: [
    // { label: 'Festival announcement', url: '', date: '2026-05-01', status: 'draft' },
  ],
  posters: [
    // { label: 'Main poster v1', imageUrl: '/photos/poster-hero.jpg', locationsPosted: [] },
  ],
  notes: 'Social push begins 8 weeks out. Posters go up 4 weeks out.',
};
