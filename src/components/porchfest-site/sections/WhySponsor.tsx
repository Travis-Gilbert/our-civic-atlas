// @ts-nocheck
import { useState } from 'react';
import ScrollReveal from '../components/ScrollReveal';
import { SPONSOR_WHY } from '../porchfest-data';
import {
  C,
  serif,
  sans,
  mono,
  cardGradient,
  cardGradientHover,
  cardBorder,
  cardBorderHover,
} from '../tokens';

// Inline SVG icons to match mockup: clock, people, layers
const ICONS = [
  ({ stroke }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  ({ stroke }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  ({ stroke }) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
];

function WhyCard({ item, Icon, delay }) {
  const [hover, setHover] = useState(false);
  return (
    <ScrollReveal delay={delay}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: '28px 22px',
          borderRadius: 12,
          background: hover ? cardGradientHover : cardGradient,
          border: `1px solid ${hover ? cardBorderHover : cardBorder}`,
          transform: hover ? 'translateY(-3px)' : 'translateY(0)',
          boxShadow: hover ? '0 8px 32px rgba(0,0,0,.3)' : 'none',
          transition: 'all .3s',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
            background: item.iconBg,
          }}
        >
          <Icon stroke={item.iconColor} />
        </div>
        <h3
          style={{
            ...serif,
            fontSize: 17,
            fontWeight: 700,
            color: C.heroText,
            marginBottom: 8,
          }}
        >
          {item.title}
        </h3>
        <p
          style={{
            ...sans,
            fontSize: 13,
            color: 'rgba(240,235,228,.72)',
            lineHeight: 1.65,
          }}
        >
          {item.body}
        </p>
      </div>
    </ScrollReveal>
  );
}

export default function WhySponsor() {
  return (
    <section
      style={{
        padding: '64px clamp(20px,5vw,80px)',
        maxWidth: 1100,
        margin: '0 auto',
      }}
    >
      <ScrollReveal>
        <p
          style={{
            ...mono,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.14em',
            color: C.burgBright,
            marginBottom: 12,
          }}
        >
          Why Porchfest
        </p>
        <h2
          style={{
            ...serif,
            fontSize: 'clamp(24px, 3.5vw, 36px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 12,
            maxWidth: '28ch',
            color: C.heroText,
          }}
        >
          This is not a typical event sponsorship.
        </h2>
        <p
          style={{
            ...sans,
            fontSize: 15,
            color: 'rgba(240,235,228,.5)',
            lineHeight: 1.7,
            maxWidth: '56ch',
            marginBottom: 40,
          }}
        >
          Porchfest is grassroots, free, and built by residents. It feels like a neighborhood, not a production. Your brand rides that goodwill.
        </p>
      </ScrollReveal>
      <div
        className="why-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
        }}
      >
        {SPONSOR_WHY.map((item, i) => (
          <WhyCard key={item.title} item={item} Icon={ICONS[i]} delay={i + 1} />
        ))}
      </div>
      <style>{`
        @media (max-width: 600px) {
          .why-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
