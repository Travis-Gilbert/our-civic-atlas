// @ts-nocheck
import { useEffect } from 'react';
import VideoBackground from '../components/VideoBackground';
import SponsorHero from '../sections/SponsorHero';
import WhySponsor from '../sections/WhySponsor';
import SponsorTiers from '../sections/SponsorTiers';
import SponsorDeliverables from '../sections/SponsorDeliverables';
import SponsorForm from '../sections/SponsorForm';
import { META } from '../porchfest-data';
import { C, serif, sans, mono } from '../tokens';

function Divider() {
  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '0 clamp(20px,5vw,80px)',
      }}
    >
      <div style={{ height: 1, background: 'rgba(240,235,228,.06)' }} />
    </div>
  );
}

function BottomCTA() {
  return (
    <section
      style={{
        padding: '56px clamp(20px,5vw,80px)',
        background: 'rgba(26,24,22,.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        borderTop: '1px solid rgba(240,235,228,.04)',
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 24,
        }}
      >
        <div>
          <h3
            style={{
              ...serif,
              fontSize: 22,
              fontWeight: 700,
              color: C.heroText,
              marginBottom: 6,
            }}
          >
            Questions? Start with the form.
          </h3>
          <p
            style={{
              ...sans,
              fontSize: 14,
              color: 'rgba(240,235,228,.4)',
              maxWidth: '40ch',
            }}
          >
            Send your sponsorship interest and we will find a time to talk about how your brand fits into Porchfest.
          </p>
        </div>
        <a
          href="#sponsor-form"
          style={{
            ...mono,
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '.12em',
            color: '#fff',
            background: C.burg,
            padding: '12px 24px',
            borderRadius: 5,
            textDecoration: 'none',
            transition: 'background .2s',
            display: 'inline-block',
          }}
        >
          Sponsor Interest
        </a>
      </div>
    </section>
  );
}

export default function Sponsors() {
  useEffect(() => {
    document.title = 'Sponsor Porchfest 2026 | Carriage Town, Flint';
    return () => {
      document.title = META.title;
    };
  }, []);

  useEffect(() => {
    if (window.location.hash === '#sponsor-form') {
      const el = document.getElementById('sponsor-form');
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 300);
      }
    }
  }, []);

  return (
    <>
      <VideoBackground />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <SponsorHero />
        <Divider />
        <WhySponsor />
        <Divider />
        <SponsorTiers />
        <SponsorDeliverables />
        <SponsorForm />
        <BottomCTA />
      </div>
    </>
  );
}
