// @ts-nocheck
import Link from 'next/link';
import { C, serif, sans, mono } from '../tokens';

export default function Footer() {
  const muted = 'rgba(240,235,228,.45)';
  const dim = 'rgba(240,235,228,.2)';
  const faint = 'rgba(240,235,228,.15)';
  const divider = 'rgba(240,235,228,.05)';

  return (
    <footer style={{ background: C.dark, padding: '48px clamp(20px,5vw,80px)', borderTop: `1px solid ${divider}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32 }}>
        <div>
          <h3 style={{ ...serif, fontSize: 18, fontWeight: 700, color: C.heroText, marginBottom: 6 }}>Carriage Town Porchfest</h3>
          <p style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: dim }}>Carriage Town Historic Neighborhood Association</p>
        </div>
        <div style={{ display: 'flex', gap: 48 }}>
          <div>
            <h4 style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(240,235,228,.28)', marginBottom: 12 }}>Event</h4>
            <a href="/#about" style={{ ...sans, display: 'block', fontSize: 14, color: muted, textDecoration: 'none', marginBottom: 8 }}>About</a>
            <a href="/#gallery" style={{ ...sans, display: 'block', fontSize: 14, color: muted, textDecoration: 'none', marginBottom: 8 }}>Gallery</a>
            <Link href="/sponsors" style={{ ...sans, display: 'block', fontSize: 14, color: muted, textDecoration: 'none', marginBottom: 8 }}>Sponsors</Link>
          </div>
          <div>
            <h4 style={{ ...mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', color: 'rgba(240,235,228,.28)', marginBottom: 12 }}>CTHNA</h4>
            <a href="https://www.cthna.org" target="_blank" rel="noopener noreferrer" style={{ ...sans, display: 'block', fontSize: 14, color: muted, textDecoration: 'none', marginBottom: 8 }}>cthna.org</a>
            <a href="mailto:porchfest@cthna.org" style={{ ...sans, display: 'block', fontSize: 14, color: muted, textDecoration: 'none', marginBottom: 8 }}>porchfest@cthna.org</a>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '32px auto 0', paddingTop: 24, borderTop: `1px solid ${divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: faint }}>&copy; 2026 Carriage Town Historic Neighborhood Association</span>
        <span style={{ ...mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em', color: faint }}>Flint, Michigan</span>
      </div>
      <style>{`@media(max-width:640px){footer a{margin-bottom:12px!important;padding:4px 0}}`}</style>
    </footer>
  );
}
