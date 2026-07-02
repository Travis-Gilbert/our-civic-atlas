// @ts-nocheck
import { useState } from 'react';
import ScrollReveal from '../components/ScrollReveal';
import { SPONSOR_TIERS } from '../porchfest-data';
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

function TierCard({ tier, delay }) {
  const [hover, setHover] = useState(false);

  const handleSelect = (e) => {
    e.preventDefault();
    const formEl = document.getElementById('sponsor-form');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    window.dispatchEvent(new CustomEvent('select-sponsor-tier', { detail: tier.id }));
  };

  const featuredBorderColor = tier.featuredBorder || C.teal;
  const featuredBorderHoverColor = tier.featuredBorderHover || C.tealBright;
  const featuredBorderNow = hover ? featuredBorderHoverColor : featuredBorderColor;
  const normalBorder = hover ? cardBorderHover : cardBorder;

  const shadow = tier.featured
    ? hover
      ? tier.featuredShadowHover || `0 0 0 1px ${featuredBorderHoverColor}, 0 12px 40px rgba(42,122,123,.2)`
      : tier.featuredShadow || '0 0 0 1px rgba(42,122,123,.3)'
    : hover
    ? '0 12px 40px rgba(0,0,0,.35)'
    : 'none';

  return (
    <ScrollReveal delay={delay}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          background: hover ? cardGradientHover : cardGradient,
          border: `1.5px solid ${tier.featured ? featuredBorderNow : normalBorder}`,
          boxShadow: shadow,
          transform: hover ? 'translateY(-4px)' : 'translateY(0)',
          transition: 'all .3s',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            padding: '22px 20px 16px',
            borderBottom: '1px solid rgba(240,235,228,.06)',
          }}
        >
          <span
            style={{
              ...mono,
              display: 'inline-block',
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.14em',
              padding: '3px 8px',
              borderRadius: 3,
              marginBottom: 10,
              background: tier.badgeBg,
              color: tier.badgeColor,
            }}
          >
            {tier.badge}
          </span>
          <div
            style={{
              ...serif,
              fontSize: 22,
              fontWeight: 800,
              color: C.heroText,
              marginBottom: 4,
            }}
          >
            {tier.name}
          </div>
          <div
            style={{
              ...mono,
              fontSize: 24,
              fontWeight: 700,
              color: C.heroText,
              lineHeight: 1,
            }}
          >
            {tier.price}
          </div>
        </div>
        <div style={{ padding: '18px 20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              ...mono,
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              color: 'rgba(240,235,228,.5)',
              marginBottom: 12,
            }}
          >
            Includes
          </div>
          <div style={{ flex: 1 }}>
            {tier.items.map((t) => (
              <div
                key={t}
                style={{
                  ...sans,
                  fontSize: 13,
                  color: 'rgba(240,235,228,.8)',
                  lineHeight: 1.5,
                  padding: '6px 0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: C.tealBright,
                    marginTop: 6,
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                <span>{t}</span>
              </div>
            ))}
            {tier.inherited.map((t) => (
              <div
                key={t}
                style={{
                  ...sans,
                  fontSize: 13,
                  color: 'rgba(240,235,228,.55)',
                  lineHeight: 1.5,
                  padding: '6px 0',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'rgba(240,235,228,.3)',
                    marginTop: 6,
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                <span>{t}</span>
              </div>
            ))}
          </div>
          <a
            href="#sponsor-form"
            onClick={handleSelect}
            style={{
              ...mono,
              display: 'block',
              width: '100%',
              textAlign: 'center',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              padding: 14,
              marginTop: 16,
              borderRadius: 6,
              textDecoration: 'none',
              background: tier.ctaBg,
              color: tier.ctaColor,
              boxSizing: 'border-box',
              transition: 'opacity .2s',
            }}
          >
            Select {tier.name}
          </a>
        </div>
      </div>
    </ScrollReveal>
  );
}

export default function SponsorTiers() {
  return (
    <section
      style={{
        padding: '64px clamp(20px,5vw,80px) 80px',
        maxWidth: 1320,
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
            color: C.tealBright,
            marginBottom: 12,
          }}
        >
          Sponsorship Tiers
        </p>
        <h2
          style={{
            ...serif,
            fontSize: 'clamp(24px, 3.5vw, 36px)',
            fontWeight: 800,
            lineHeight: 1.15,
            marginBottom: 12,
            color: C.heroText,
          }}
        >
          Five ways to partner. Benefits build as you go.
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
          Every level includes social and print placement. Higher levels add porch, zone, block, and stage visibility.
        </p>
      </ScrollReveal>
      <div
        className="tiers-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 12,
          alignItems: 'stretch',
        }}
      >
        {SPONSOR_TIERS.map((tier, i) => (
          <TierCard key={tier.id} tier={tier} delay={i + 1} />
        ))}
      </div>
      <style>{`
        @media (max-width: 1200px) {
          .tiers-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 820px) {
          .tiers-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 560px) {
          .tiers-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
