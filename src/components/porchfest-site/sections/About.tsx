// @ts-nocheck
import ScrollReveal from '../components/ScrollReveal';
import ResponsiveImg from '../components/ResponsiveImg';
import { C, serif, sans, mono, tagStyle, shStyle } from '../tokens';
import { ABOUT_COPY, PHOTOS } from '../porchfest-data';

export default function About() {
  return (
    <section id="about" style={{ padding: '80px clamp(20px,5vw,80px)', background: C.paper }}>
      <div className="about-grid" style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 60,
        alignItems: 'center',
      }}>
        {/* Text column */}
        <div>
          <ScrollReveal>
            <div style={tagStyle()}>What is Porchfest?</div>
            <h2 style={shStyle}>
              {ABOUT_COPY.headline} <span style={{ color: C.teal }}>{ABOUT_COPY.headlineAccent}</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={1}>
            <p style={{ ...sans, fontSize: 16, lineHeight: 1.75, color: C.inkMuted, marginBottom: 16, maxWidth: '48ch' }}>
              {ABOUT_COPY.paragraphs[0]}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={2}>
            <div style={{
              ...serif,
              fontSize: 18,
              fontWeight: 600,
              color: C.ink,
              lineHeight: 1.6,
              paddingLeft: 20,
              borderLeft: `3px solid ${C.teal}`,
              margin: '24px 0',
            }}>
              {ABOUT_COPY.pullQuote}
            </div>
          </ScrollReveal>

          <ScrollReveal delay={3}>
            <p style={{ ...sans, fontSize: 16, lineHeight: 1.75, color: C.inkMuted, marginBottom: 16, maxWidth: '48ch' }}>
              {ABOUT_COPY.paragraphs[1]}
            </p>
            <p style={{ ...sans, fontSize: 16, lineHeight: 1.75, color: C.inkMuted, marginBottom: 16, maxWidth: '48ch' }}>
              {ABOUT_COPY.paragraphs[2]}
            </p>
          </ScrollReveal>
        </div>

        {/* Photo column - slides in from right */}
        <ScrollReveal direction="left" delay={1}>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden' }}>
            <ResponsiveImg
              src={PHOTOS.porchSinger}
              alt="Singer performing on a brick porch with string lights, audience watching from lawn chairs"
              width={2000}
              height={1333}
              loading="lazy"
              className="about-photo"
              style={{ width: '100%', height: 480, objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '16px 20px',
              background: 'linear-gradient(transparent, rgba(26,24,22,.75))',
            }}>
              <span style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: 'rgba(240,235,228,.45)' }}>
                Porchfest 2025 &middot; Carriage Town
              </span>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <style>{`
        @media(max-width:800px){
          .about-grid{grid-template-columns:1fr!important;gap:32px!important}
          .about-photo{height:320px!important}
        }
      `}</style>
    </section>
  );
}
