// @ts-nocheck
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { C, mono } from '../tokens';

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isLanding = pathname === '/' || pathname === '/porchfest-public';
  const isSponsors =
    pathname === '/sponsors' || pathname === '/porchfest-public/sponsors';

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setScrolled(window.scrollY > 80);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    padding: 'max(14px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) 14px max(24px, env(safe-area-inset-left))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    transition: 'background .4s, box-shadow .4s',
    ...(scrolled ? {
      background: 'rgba(26,24,22,.55)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      boxShadow: '0 2px 20px rgba(0,0,0,.15)',
    } : {}),
  };

  const markStyle = {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: C.burg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "var(--font-display-face), Georgia, serif",
    fontWeight: 900,
    fontSize: 16,
    color: '#fff',
    lineHeight: 1,
  };

  const labelStyle = {
    ...mono,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.14em',
    color: 'rgba(240,235,228,.65)',
  };

  const linkStyle = {
    ...mono,
    fontSize: 10,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '.1em',
    color: 'rgba(240,235,228,.4)',
    textDecoration: 'none',
    transition: 'color .2s',
  };

  const ctaStyle = {
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
  };

  const handleAnchor = (e, id) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav style={navStyle} role="navigation" aria-label="Main navigation">
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <div style={markStyle}>P</div>
        <span style={labelStyle}>Porchfest 2026</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {isLanding && (
          <>
            <a href="#about" onClick={(e) => handleAnchor(e, 'about')} style={linkStyle} className="nav-link-hide">About</a>
            <a href="#gallery" onClick={(e) => handleAnchor(e, 'gallery')} style={linkStyle} className="nav-link-hide">Gallery</a>
          </>
        )}
        <Link
          href="/sponsors"
          style={{ ...linkStyle, color: isSponsors ? C.tealBright : linkStyle.color }}
          className="nav-link-hide"
        >
          Sponsors
        </Link>
        <Link href="/apply" style={ctaStyle} className="nav-cta">Apply Now</Link>
      </div>
      <style>{`
        @media(max-width:640px){
          .nav-link-hide{display:none!important}
          .nav-cta{padding:11px 20px!important}
        }
      `}</style>
    </nav>
  );
}
