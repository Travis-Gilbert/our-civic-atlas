// @ts-nocheck
// Colors
export const C = {
  // Ground
  paper:      '#F2EDE5',
  surface:    '#FAF6F1',
  cream:      '#FFF8F0',
  ink:        '#2A2420',
  inkMuted:   '#6A5E52',
  inkLight:   '#9A8E82',
  dark:       '#1A1816',
  darkWarm:   '#2A2420',
  border:     '#D4CCC4',
  borderLight:'#E8E0D6',
  // Primary: teal
  teal:       '#2A7A7B',
  tealBright: '#35918F',
  tealDim:    'rgba(42,122,123,.1)',
  // Secondary: burgundy (from poster)
  burg:       '#7A2E3A',
  burgBright: '#963848',
  burgDim:    'rgba(122,46,58,.1)',
  // Tertiary: warm gold
  gold:       '#C49A4A',
  goldBright: '#D4AA52',
  goldDim:    'rgba(196,154,74,.1)',
  // Utility
  error:      '#A44A3A',
  heroText:   '#F0EBE4',
};

// Typography
export const serif  = { fontFamily: "var(--font-display-face), Georgia, serif" };
export const sans   = { fontFamily: "var(--font-porchfest-sans), -apple-system, sans-serif" };
export const mono   = { fontFamily: "var(--font-porchfest-mono), monospace" };

// Shared tag style
export const tagStyle = (color = C.teal) => ({
  ...mono,
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '.14em',
  color,
  marginBottom: 12,
});

// Section heading
export const shStyle = {
  ...serif,
  fontSize: 'clamp(28px, 4vw, 42px)',
  fontWeight: 800,
  lineHeight: 1.1,
  marginBottom: 10,
};

// Section paragraph
export const spStyle = {
  ...sans,
  fontSize: 15,
  color: C.inkMuted,
  lineHeight: 1.7,
  maxWidth: '50ch',
};

// Card surface: warm gold-to-burgundy gradient over a dark base (for legibility over video)
export const cardGradient = 'linear-gradient(135deg, rgba(196,154,74,.15), rgba(122,46,58,.15)), rgba(26,24,22,.82)';
export const cardGradientHover = 'linear-gradient(135deg, rgba(196,154,74,.22), rgba(122,46,58,.22)), rgba(26,24,22,.88)';
export const cardBorder = 'rgba(240,235,228,.12)';
export const cardBorderHover = 'rgba(240,235,228,.22)';

// Card iridescence: soft palette-shift over cream for the apply category cards.
export const cardIridescent =
  'linear-gradient(135deg, rgba(42,122,123,.08), rgba(196,154,74,.06) 40%, rgba(122,46,58,.06) 70%, rgba(255,248,240,.95))';
export const cardIridescentHover =
  'linear-gradient(135deg, rgba(42,122,123,.14), rgba(196,154,74,.10) 40%, rgba(122,46,58,.10) 70%, rgba(255,248,240,.88))';
