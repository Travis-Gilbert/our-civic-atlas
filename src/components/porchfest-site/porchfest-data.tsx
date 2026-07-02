// @ts-nocheck
import { C } from './tokens';

export const META = {
  title: 'Carriage Town Porchfest 2026 | Flint, MI',
  description: "Live music on front porches, street stages, and sidewalks across Carriage Town, Flint. Free entry. Friday, July 17, 2026.",
  ogImage: '/photos/poster-hero.jpg',
};

export const STATS = [
  { value: '+3,000', label: 'Attendees in 2025' },
  { value: '20+', label: 'Performing Acts' },
  { value: '45', label: 'Vendors last year' },
  { value: '7', label: 'Years running' },
];

export const CATEGORIES = [
  {
    id: 'musician',
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
        <path d="M10 20V8l14-3v12" stroke={C.teal} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="7" cy="20" r="3" stroke={C.teal} strokeWidth="1.5"/>
        <circle cx="21" cy="17" r="3" stroke={C.teal} strokeWidth="1.5"/>
      </svg>
    ),
    label: 'Musician / Band',
    description: 'Solo, duo, full band, or DJ. Any genre. Send us your sound and we will match you to a porch.',
    accent: 'teal',
  },
  {
    id: 'vendor',
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
        <path d="M4 10h20l-2 12H6L4 10z" stroke={C.gold} strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M9 10V7a5 5 0 0110 0v3" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Food Vendor',
    description: 'Food trucks, pop-ups, and beverage stands. Tell us what you serve and we will put you on the block.',
    accent: 'gold',
  },
  {
    id: 'entertainer',
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="10" r="4" stroke={C.burg} strokeWidth="1.5"/>
        <path d="M6 24c0-4.418 3.582-8 8-8s8 3.582 8 8" stroke={C.burg} strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M21 6l2-2M7 6L5 4M14 4V2" stroke={C.burg} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    label: 'Entertainer / Artist',
    description: 'Comedy, dance, chalk art, street performance, or spoken word. Bring whatever makes the block come alive.',
    accent: 'burg',
  },
  {
    id: 'other',
    icon: () => (
      <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="10" stroke={C.inkLight} strokeWidth="1.5"/>
        <circle cx="14" cy="14" r="2" fill={C.inkLight}/>
        <circle cx="8" cy="14" r="2" fill={C.inkLight}/>
        <circle cx="20" cy="14" r="2" fill={C.inkLight}/>
      </svg>
    ),
    label: 'Something Else',
    description: 'Craft vendors, community orgs, sponsors, or anything else. Tell us your idea.',
    accent: 'inkLight',
  },
];

export const GENRES = [
  'Hip-Hop / Rap', 'R&B / Soul', 'Rock', 'Folk / Acoustic', 'Jazz',
  'Blues', 'Pop', 'Country', 'Electronic / DJ', 'Punk',
  'Gospel', 'Latin', 'Spoken Word', 'Other',
];

export const SETUP_NEEDS = [
  'Power outlet', 'Extra chairs', 'Shade / canopy', 'Parking for van',
  'Ground-level access', 'Table',
];

export const FOOD_TYPES = [
  'BBQ / Grill',
  'Soul Food',
  'Coney / Hot Dogs',
  'Burgers / Fries',
  'Sandwiches / Subs',
  'Pizza',
  'Mexican / Tex-Mex',
  'Asian / Stir Fry',
  'Caribbean',
  'Mediterranean / Middle Eastern',
  'Polish / European',
  'Seafood',
  'Vegan / Vegetarian',
  'Desserts / Baked Goods',
  'Ice Cream / Frozen Treats',
  'Coffee / Tea',
  'Beverages',
  'Snacks / Concessions',
  'Other',
];

export const VENDOR_NEEDS = [
  'Power outlet', 'Water access', 'Extra table', 'Shade / canopy',
  'Parking for truck', 'Waste disposal',
];

export const ENT_TYPES = [
  'Comedy / Stand-up', 'Dance', 'Spoken Word / Poetry', 'Visual Art / Chalk',
  'Magic / Circus', 'Theater / Improv', 'Other',
];

export const HOW_STEPS = [
  {
    num: '01',
    title: 'Show up',
    body: 'Carriage Town, Friday, July 17th, afternoon onward. Free street parking. Six blocks centered on Mason Street and First Avenue.',
  },
  {
    num: '02',
    title: 'Walk the blocks',
    body: 'Every porch and corner has a different act: hip-hop beside folk beside a DJ beside a comedian. Walk fifty feet and the lineup changes.',
  },
  {
    num: '03',
    title: 'Stay all day',
    body: 'Grab food from any vendor on Mason Street. Claim a lawn chair. Bring the family. The festival runs until sundown, sometimes longer.',
  },
];

export const ABOUT_COPY = {
  headline: 'Every porch',
  headlineAccent: 'is a stage.',
  pullQuote: 'Walk through the neighborhood and the music finds you. Porches, street corners, front yards. Turn any direction and something is happening.',
  paragraphs: [
    'Seven years ago, a few Carriage Town residents put bands on their front porches and invited the neighborhood. Now Porchfest fills six blocks, draws thousands, and ranks among Genesee County\'s most popular festivals.',
    'Performers play on residential porches, sidewalk stages, and the main stage at Mason Street and First Avenue. Food vendors line the blocks. The whole thing runs from afternoon into evening, and every part of it is free.',
    'We prioritize Flint-based artists and acts rooted in the community. All genres, all forms of performance. If you play music, serve food, or bring something that makes a block party better, a porch may have your name on it.',
  ],
};

export const PHOTOS = {
  hero: '/photos/poster-hero.jpg',
  strip: [
    '/photos/photo-red-porch-dj.jpg',
    '/photos/photo-stage-lights.jpg',
    '/photos/photo-crowd-dance.jpg',
    '/photos/photo-mc-street.jpg',
  ],
  gallery: [
    { src: '/photos/photo-wide-crowd.jpg', cls: 'g1', alt: 'Wide view of hundreds at Porchfest with historic houses and vendor tents' },
    { src: '/photos/photo-red-porch-dj.jpg', cls: 'g2', alt: 'DJ and performers on a red front porch' },
    { src: '/photos/photo-mc-street.jpg', cls: 'g3', alt: 'MC performing at the street corner' },
    { src: '/photos/photo-stage-lights.jpg', cls: 'g4', alt: 'Performer under dramatic stage lights' },
    { src: '/photos/photo-golden-hour.jpg', cls: 'g5', alt: 'Family walking through the neighborhood at golden hour' },
  ],
  goldenHour: '/photos/photo-golden-hour.jpg',
  porchSinger: '/photos/photo-porch-singer.jpg',
};

export const HERO_COPY = {
  tag: '7th Annual',
  tagAccent: 'Porchfest',
  tagSuffix: 'Flint, Michigan',
  headline: "Flint's Best",
  headlineAccent: 'Fest',
  sub: "Flint's best festival returns. Performers take over front porches, street corners, and stages across six blocks of Carriage Town while thousands wander from act to act.",
  metaItems: [
    { value: 'July 17', label: 'Friday, 2026' },
    { value: '+3,000', label: 'Attendees in 2025' },
    { value: 'Free', label: 'Always, for everyone' },
  ],
};

// Color lookup helper for accent strings
export const accentColor = (accent) => {
  const map = {
    teal: C.teal,
    tealBright: C.tealBright,
    tealDim: C.tealDim,
    gold: C.gold,
    goldBright: C.goldBright,
    goldDim: C.goldDim,
    burg: C.burg,
    burgBright: C.burgBright,
    burgDim: C.burgDim,
    inkLight: C.inkLight,
  };
  return map[accent] || C.teal;
};

export const accentBright = (accent) => {
  const map = {
    teal: C.tealBright,
    gold: C.goldBright,
    burg: C.burgBright,
    inkLight: C.inkLight,
  };
  return map[accent] || C.tealBright;
};

export const accentDim = (accent) => {
  const map = {
    teal: C.tealDim,
    gold: C.goldDim,
    burg: C.burgDim,
    inkLight: 'rgba(154,142,130,.1)',
  };
  return map[accent] || C.tealDim;
};

// ── Sponsor page data ──

export const SPONSOR_TIERS = [
  {
    id: 'porch',
    name: 'Porch',
    price: '$1,000',
    priceNum: 1000,
    badge: 'Most Popular',
    badgeBg: C.tealDim,
    badgeColor: C.tealBright,
    featured: true,
    featuredBorder: C.teal,
    featuredBorderHover: C.tealBright,
    featuredShadow: '0 0 0 1px rgba(42,122,123,.3)',
    featuredShadowHover: '0 0 0 1px #35918F, 0 12px 40px rgba(42,122,123,.2)',
    items: [
      'Your banner on a named porch',
      'Featured with 2 performing acts',
    ],
    inherited: ['+ Social media and print placement'],
    ctaBg: C.teal,
    ctaColor: '#fff',
  },
  {
    id: 'kidszone',
    name: 'Kids Zone',
    price: '$1,000',
    priceNum: 1000,
    badge: 'Kids Zone',
    badgeBg: C.goldDim,
    badgeColor: C.goldBright,
    featured: false,
    items: [
      'Your name on the Kids Zone',
      'Activation space for a family-friendly booth',
    ],
    inherited: ['+ Social media and print placement'],
    ctaBg: C.goldDim,
    ctaColor: C.goldBright,
  },
  {
    id: 'block',
    name: 'Block',
    price: '$2,000',
    priceNum: 2000,
    badge: 'Block',
    badgeBg: 'rgba(240,235,228,.05)',
    badgeColor: 'rgba(240,235,228,.4)',
    featured: false,
    items: [
      "Branding in the festival's highest-traffic block, next to the historic Nash House",
      'Activation space on the block',
    ],
    inherited: ['+ All Porch benefits'],
    ctaBg: 'rgba(240,235,228,.06)',
    ctaColor: 'rgba(240,235,228,.5)',
  },
  {
    id: 'mainstage',
    name: 'Main Stage',
    price: '$5,000',
    priceNum: 5000,
    badge: 'Main Stage',
    badgeBg: C.burgDim,
    badgeColor: C.burgBright,
    featured: false,
    items: [
      'Up to 3 sponsors',
      'Named partner of the Main Stage',
      'Premium activation space',
    ],
    inherited: ['+ All Block benefits'],
    ctaBg: C.burgDim,
    ctaColor: C.burgBright,
  },
  {
    id: 'title',
    name: 'Title',
    price: '$10,000',
    priceNum: 10000,
    badge: 'Billing Sponsor',
    badgeBg: C.burgDim,
    badgeColor: C.burgBright,
    featured: true,
    featuredBorder: C.burg,
    featuredBorderHover: C.burgBright,
    featuredShadow: '0 0 0 1px rgba(122,46,58,.35)',
    featuredShadowHover: '0 0 0 1px #963848, 0 12px 40px rgba(122,46,58,.25)',
    items: [
      'Only one spot',
      'Naming rights across the festival',
      'Festival-wide signage recognition',
      'Featured in all marketing and print',
    ],
    inherited: ['+ All Main Stage benefits'],
    ctaBg: C.burg,
    ctaColor: '#fff',
  },
];

export const SPONSOR_WHY = [
  {
    title: 'All-Day Exposure',
    body: 'The festival runs from afternoon through sundown. People stay for hours and walk every block.',
    iconColor: C.teal,
    iconBg: C.tealDim,
  },
  {
    title: 'Authentic Reach',
    body: 'Families, young professionals, artists, city leaders. All local. They showed up on purpose.',
    iconColor: C.burgBright,
    iconBg: C.burgDim,
  },
  {
    title: 'Stacked Visibility',
    body: 'Every tier builds on the last. Banners on porches, social placement, print visibility, and main stage recognition. All at once, all day.',
    iconColor: C.gold,
    iconBg: C.goldDim,
  },
];

export const SPONSOR_DELIVERABLES = [
  { title: 'Festival Signage', body: 'Recognition on approved festival signage in high-traffic areas.' },
  { title: 'Porch Banners', body: 'Banners hang on the porch where your acts perform.' },
  { title: 'Stage Branding', body: 'Your name on the main stage at Mason Street and First Avenue.' },
  { title: 'Social & Digital', body: 'Promotion on Porchfest social channels and the website before the event.' },
  { title: 'Activation Space', body: 'Your own space at the festival for a booth or promotion.' },
  { title: 'Print Materials', body: 'Logo on signage, flyers, and the printed festival program.' },
];

export const SPONSOR_CATEGORIES = [
  { value: 'business', label: 'Business' },
  { value: 'nonprofit', label: 'Nonprofit / Community Org' },
  { value: 'individual', label: 'Individual' },
  { value: 'government', label: 'Government / Agency' },
  { value: 'other', label: 'Other' },
];

// Vendor application fees, charged at submission via Stripe Checkout.
// `priceCents` of null means pay-what-you-can; user enters an amount.
export const VENDOR_TIERS = [
  {
    id: 'food-truck',
    label: 'Food Truck',
    description: 'Full-size truck or trailer',
    priceCents: 7500,
    priceDisplay: '$75',
  },
  {
    id: 'pop-up',
    label: 'Pop-up / Tent',
    description: '10x10 tent, table, or pop-up',
    priceCents: 2500,
    priceDisplay: '$25',
  },
  {
    id: 'pay-what-you-can',
    label: 'Pay What You Can',
    description: 'Need a different number? Pay what works for you.',
    priceCents: null,
    priceDisplay: 'Your choice',
    minimumCents: 100,
  },
];
