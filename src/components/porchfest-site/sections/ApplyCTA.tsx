// @ts-nocheck
import { useState } from 'react';
import Link from 'next/link';
import ScrollReveal from '../components/ScrollReveal';
import ResponsiveImg from '../components/ResponsiveImg';
import { C, serif, sans, mono, tagStyle } from '../tokens';
import { CATEGORIES, PHOTOS, accentColor, accentBright, accentDim } from '../porchfest-data';

function ApplyCard({ cat, delay }) {
  const [hovered, setHovered] = useState(false);
  const color = accentColor(cat.accent);
  const bright = accentBright(cat.accent);
  const dim = accentDim(cat.accent);
  const Icon = cat.icon;

  return (
    <ScrollReveal delay={delay}>
      <Link
        href={`/apply?cat=${cat.id}`}
        style={{
          padding: '28px 22px',
          borderRadius: 12,
          border: `1.5px solid ${hovered ? 'rgba(240,235,228,.18)' : 'rgba(240,235,228,.08)'}`,
          background: hovered ? 'rgba(240,235,228,.06)' : 'rgba(240,235,228,.03)',
          transition: 'border-color .3s, background .3s, transform .3s',
          textDecoration: 'none',
          display: 'block',
          transform: hovered ? 'translateY(-4px)' : 'none',
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: dim,
          marginBottom: 16,
        }}>
          <Icon />
        </div>
        <h3 style={{ ...serif, fontSize: 17, fontWeight: 700, color: C.heroText, marginBottom: 6 }}>
          {cat.label}
        </h3>
        <p style={{ ...sans, fontSize: 13, color: 'rgba(240,235,228,.4)', lineHeight: 1.6 }}>
          {cat.description}
        </p>
        <div style={{
          ...mono,
          fontSize: 10,
          textTransform: 'uppercase',
          letterSpacing: '.1em',
          marginTop: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: bright,
        }}>
          Apply &rarr;
        </div>
      </Link>
    </ScrollReveal>
  );
}

export default function ApplyCTA() {
  return (
    <section id="apply" style={{ background: C.darkWarm, padding: '80px clamp(20px,5vw,80px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Top 2-col */}
        <div className="apply-top" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          alignItems: 'center',
          marginBottom: 48,
        }}>
          <ScrollReveal>
            <div style={tagStyle(C.burgBright)}>Applications Open</div>
            <h2 style={{
              ...serif,
              fontSize: 'clamp(28px, 4vw, 42px)',
              fontWeight: 800,
              color: C.heroText,
              lineHeight: 1.1,
              marginBottom: 12,
            }}>
              Play a porch.<br/>Feed the block.<br/>Be part of it.
            </h2>
            <p style={{ ...sans, fontSize: 16, color: 'rgba(240,235,228,.5)', lineHeight: 1.7, maxWidth: '42ch' }}>
              Musicians, food vendors, entertainers, and anyone with something to offer the neighborhood. Applications close in May. Selected acts hear back by mid-May 2026.
            </p>
          </ScrollReveal>
          <ScrollReveal delay={2}>
            <div style={{ borderRadius: 12, overflow: 'hidden' }}>
              <ResponsiveImg
                src={PHOTOS.goldenHour}
                alt="Family walking through Carriage Town at sunset"
                width={2048}
                height={1496}
                loading="lazy"
                style={{ width: '100%', height: 320, objectFit: 'cover' }}
              />
            </div>
          </ScrollReveal>
        </div>

        {/* Cards */}
        <div className="apply-cards" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
        }}>
          {CATEGORIES.map((cat, i) => (
            <ApplyCard key={cat.id} cat={cat} delay={i} />
          ))}
        </div>
      </div>

      <style>{`
        @media(max-width:800px){.apply-top{grid-template-columns:1fr!important}.apply-cards{grid-template-columns:1fr 1fr!important}}
        @media(max-width:500px){.apply-cards{grid-template-columns:1fr!important}}
      `}</style>
    </section>
  );
}
