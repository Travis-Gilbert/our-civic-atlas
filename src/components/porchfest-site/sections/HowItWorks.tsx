// @ts-nocheck
import { useState } from 'react';
import ScrollReveal from '../components/ScrollReveal';
import { C, serif, sans, mono, tagStyle, shStyle, spStyle } from '../tokens';
import { HOW_STEPS } from '../porchfest-data';

const CARD_ACCENTS = [
  { bg: 'rgba(122,46,58,.8)', num: 'rgba(255,255,255,.18)', text: C.heroText, muted: 'rgba(240,235,228,.65)' },   // burgundy
  { bg: 'rgba(42,122,123,.8)', num: 'rgba(255,255,255,.18)', text: C.heroText, muted: 'rgba(240,235,228,.65)' },   // teal
  { bg: 'rgba(196,154,74,.8)', num: 'rgba(255,255,255,.18)', text: C.ink, muted: 'rgba(42,36,32,.7)' },            // gold
];

function HowCard({ step, delay, accent }) {
  const [hovered, setHovered] = useState(false);
  return (
    <ScrollReveal delay={delay}>
      <div
        style={{
          padding: '28px 24px',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,.12)',
          background: accent.bg,
          transition: 'transform .3s, box-shadow .3s',
          ...(hovered ? { transform: 'translateY(-4px)', boxShadow: '0 8px 30px rgba(0,0,0,.15)' } : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ ...serif, fontSize: 48, fontWeight: 900, color: accent.num, lineHeight: 1, marginBottom: 12 }}>
          {step.num}
        </div>
        <h3 style={{ ...serif, fontSize: 18, fontWeight: 700, color: accent.text, marginBottom: 8 }}>
          {step.title}
        </h3>
        <p style={{ ...sans, fontSize: 14, color: accent.muted, lineHeight: 1.65 }}>
          {step.body}
        </p>
      </div>
    </ScrollReveal>
  );
}

export default function HowItWorks() {
  return (
    <section style={{ padding: '80px clamp(20px,5vw,80px)', background: C.paper }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <ScrollReveal>
          <div style={tagStyle()}>How Porchfest Works</div>
        </ScrollReveal>
        <ScrollReveal delay={1}>
          <h2 style={shStyle}>
            Show up. Walk around. <span style={{ color: C.teal }}>Find your sound.</span>
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={2}>
          <p style={spStyle}>
            Free entry. Open streets. Live music everywhere. Get here July 17th and start walking.
          </p>
        </ScrollReveal>

        <div className="how-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 24,
          marginTop: 48,
        }}>
          {HOW_STEPS.map((step, i) => (
            <HowCard key={step.num} step={step} delay={i + 1} accent={CARD_ACCENTS[i]} />
          ))}
        </div>
      </div>
      <style>{`@media(max-width:700px){.how-grid{grid-template-columns:1fr!important}}`}</style>
    </section>
  );
}
