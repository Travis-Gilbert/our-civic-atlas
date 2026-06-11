// @ts-nocheck
import ScrollReveal from '../components/ScrollReveal';
import ResponsiveImg from '../components/ResponsiveImg';
import { C, serif, sans, mono } from '../tokens';
import { PHOTOS } from '../porchfest-data';

export default function Gallery() {
  return (
    <section id="gallery" style={{ background: C.dark, padding: '80px clamp(20px,5vw,80px)' }}>
      {/* Header */}
      <div style={{ maxWidth: 1100, margin: '0 auto 40px' }}>
        <ScrollReveal>
          <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: C.burgBright, marginBottom: 12 }}>
            Porchfest 2025
          </div>
        </ScrollReveal>
        <ScrollReveal delay={1}>
          <h2 style={{ ...serif, fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800, color: C.heroText, lineHeight: 1.1, marginBottom: 8 }}>
            See what it looks like.
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={2}>
          <p style={{ ...sans, fontSize: 15, color: 'rgba(240,235,228,.4)', lineHeight: 1.65 }}>
            All from last year. All real.
          </p>
        </ScrollReveal>
      </div>

      {/* Grid */}
      <div className="gal-grid" style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 6,
      }}>
        {PHOTOS.gallery.map((photo, i) => (
          <ScrollReveal
            key={photo.cls}
            delay={i + 1}
            direction="scale"
            className={`gi-${photo.cls}`}
            style={gridStyles[photo.cls]}
          >
            <div className="gal-item" style={{ borderRadius: 8, overflow: 'hidden', position: 'relative', height: '100%' }}>
              <ResponsiveImg
                src={photo.src}
                alt={photo.alt}
                width={2048}
                height={1366}
                loading="lazy"
                className="gal-img"
                style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .6s cubic-bezier(.16,1,.3,1), filter .6s ease' }}
              />
              <div className="gal-overlay" style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(26,24,22,.4) 0%, transparent 50%)',
                opacity: 0,
                transition: 'opacity .4s ease',
                pointerEvents: 'none',
              }} />
            </div>
          </ScrollReveal>
        ))}
      </div>

      <style>{`
        .gal-item:hover .gal-img{transform:scale(1.04)}
        .gal-item:hover .gal-overlay{opacity:1}
        @media(max-width:640px){
          .gal-grid{grid-template-columns:1fr 1fr!important}
          .gi-g1{grid-column:1/-1!important;min-height:200px!important}
          .gi-g2,.gi-g3,.gi-g4,.gi-g5{grid-column:auto!important;min-height:160px!important}
        }
      `}</style>
    </section>
  );
}

const gridStyles = {
  g1: { gridColumn: '1 / 8', minHeight: 340 },
  g2: { gridColumn: '8 / 13', minHeight: 340 },
  g3: { gridColumn: '1 / 5', minHeight: 260 },
  g4: { gridColumn: '5 / 9', minHeight: 260 },
  g5: { gridColumn: '9 / 13', minHeight: 260 },
};
