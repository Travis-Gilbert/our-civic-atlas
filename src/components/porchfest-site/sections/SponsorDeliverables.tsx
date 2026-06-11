// @ts-nocheck
import { useState } from 'react';
import ScrollReveal from '../components/ScrollReveal';
import { SPONSOR_DELIVERABLES } from '../porchfest-data';
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

function DeliverableCard({ item, delay }) {
  const [hover, setHover] = useState(false);
  return (
    <ScrollReveal delay={delay}>
      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          padding: '22px 20px',
          borderRadius: 10,
          background: hover ? cardGradientHover : cardGradient,
          border: `1px solid ${hover ? cardBorderHover : cardBorder}`,
          transform: hover ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: hover ? '0 6px 24px rgba(0,0,0,.25)' : 'none',
          transition: 'all .3s',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <h4
          style={{
            ...serif,
            fontSize: 15,
            fontWeight: 700,
            color: C.heroText,
            marginBottom: 6,
          }}
        >
          {item.title}
        </h4>
        <p
          style={{
            ...sans,
            fontSize: 12.5,
            color: 'rgba(240,235,228,.72)',
            lineHeight: 1.6,
          }}
        >
          {item.body}
        </p>
      </div>
    </ScrollReveal>
  );
}

export default function SponsorDeliverables() {
  return (
    <section
      style={{
        padding: '64px clamp(20px,5vw,80px)',
        background: 'rgba(26,24,22,.35)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="deliverables-inner"
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr',
          gap: 56,
          alignItems: 'start',
        }}
      >
        <ScrollReveal>
          <div>
            <p
              style={{
                ...mono,
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.14em',
                color: C.goldBright,
                marginBottom: 12,
              }}
            >
              What You Get
            </p>
            <h2
              style={{
                ...serif,
                fontSize: 'clamp(22px, 3vw, 32px)',
                fontWeight: 800,
                lineHeight: 1.15,
                marginBottom: 12,
                color: C.heroText,
              }}
            >
              Every deliverable is physical and visible.
            </h2>
            <p
              style={{
                ...sans,
                fontSize: 15,
                color: 'rgba(240,235,228,.5)',
                lineHeight: 1.7,
                maxWidth: '40ch',
              }}
            >
              No buried logo on a PDF. Your brand shows up where the crowd is.
            </p>
          </div>
        </ScrollReveal>
        <div
          className="deliverables-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}
        >
          {SPONSOR_DELIVERABLES.map((d, i) => (
            <DeliverableCard key={d.title} item={d} delay={i + 1} />
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .deliverables-inner { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .deliverables-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
