// @ts-nocheck
import ScrollReveal from '../components/ScrollReveal';
import { C, serif, sans, mono } from '../tokens';

const STATS = [
  { value: '3,000+', label: 'Attendees 2025' },
  { value: '30+', label: 'Performing Acts' },
  { value: '6', label: 'City Blocks' },
  { value: 'Free', label: 'Always' },
];

export default function SponsorHero() {
  return (
    <section
      style={{
        padding: '140px clamp(20px,5vw,80px) 80px',
        maxWidth: 1100,
        margin: '0 auto',
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
            Sponsorship
          </p>
          <h1
            style={{
              ...serif,
              fontSize: 'clamp(32px, 5vw, 52px)',
              fontWeight: 800,
              lineHeight: 1.08,
              marginBottom: 16,
              color: C.heroText,
            }}
          >
            Put your brand
            <br />
            on a{' '}
            <span style={{ color: C.gold }}>porch.</span>
          </h1>
          <p
            style={{
              ...sans,
              fontSize: 18,
              color: 'rgba(240,235,228,.75)',
              lineHeight: 1.6,
              maxWidth: '46ch',
              marginBottom: 28,
            }}
          >
            Sponsor Flint's best fest.
          </p>
          <div
            className="sponsor-hero-stats"
            style={{ display: 'flex', gap: 32, marginTop: 8, flexWrap: 'wrap' }}
          >
            {STATS.map((s) => (
              <div key={s.label}>
                <div
                  style={{
                    ...serif,
                    fontSize: 28,
                    fontWeight: 800,
                    color: C.heroText,
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    ...mono,
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '.12em',
                    color: 'rgba(240,235,228,.35)',
                    marginTop: 4,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
      <style>{`
        @media (max-width: 600px) {
          .sponsor-hero-stats { gap: 24px !important; }
        }
      `}</style>
    </section>
  );
}
