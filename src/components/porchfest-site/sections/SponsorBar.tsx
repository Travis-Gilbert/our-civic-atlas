// @ts-nocheck
import Link from 'next/link';
import ScrollReveal from '../components/ScrollReveal';
import { C, serif, sans, mono } from '../tokens';

export default function SponsorBar() {
  return (
    <div style={{
      background: C.dark,
      padding: '48px clamp(20px,5vw,80px)',
      borderTop: '1px solid rgba(240,235,228,.04)',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 24,
      }}>
        <ScrollReveal>
          <div>
            <p style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: C.burg, marginBottom: 6 }}>
              Sponsors
            </p>
            <p style={{ ...serif, fontSize: 22, fontWeight: 700, color: C.heroText, lineHeight: 1.2 }}>
              Put your brand on a porch.
            </p>
            <p style={{ ...sans, fontSize: 14, color: 'rgba(240,235,228,.4)', marginTop: 6, maxWidth: '40ch' }}>
              Logo placement, porch naming, stage naming, and activation space. Porchfest drew 3,000+ people last year.
            </p>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={2}>
          <Link
            href="/sponsors"
            style={{
              ...mono,
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              color: '#fff',
              background: C.teal,
              padding: '9px 18px',
              borderRadius: 5,
              textDecoration: 'none',
              transition: 'background .2s, transform .2s',
              display: 'inline-block',
            }}
          >
            Partner With Us
          </Link>
        </ScrollReveal>
      </div>
    </div>
  );
}
