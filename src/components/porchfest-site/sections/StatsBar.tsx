// @ts-nocheck
import ScrollReveal from '../components/ScrollReveal';
import { C, serif, mono } from '../tokens';
import { STATS } from '../porchfest-data';

export default function StatsBar() {
  return (
    <div style={{
      background: C.darkWarm,
      padding: '48px clamp(20px,5vw,80px)',
      borderTop: '1px solid rgba(240,235,228,.06)',
      borderBottom: '1px solid rgba(240,235,228,.06)',
    }}>
      <div className="stats-grid" style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 32,
      }}>
        {STATS.map((stat, i) => (
          <ScrollReveal key={stat.label} delay={i} style={{ textAlign: 'center' }}>
            <div className="st-n" style={{ ...serif, fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, color: C.burgBright, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.12em', color: 'rgba(240,235,228,.32)', marginTop: 8 }}>
              {stat.label}
            </div>
          </ScrollReveal>
        ))}
      </div>
      <style>{`@media(max-width:640px){.stats-grid{grid-template-columns:1fr 1fr!important}.st-n{font-size:36px!important}}`}</style>
    </div>
  );
}
