// @ts-nocheck
import { useEffect } from 'react';
import { C, serif, sans, mono } from '../tokens';
import { BOARD_META } from '../board-data';
import { META as SITE_META } from '../porchfest-data';
import Baseline from '../sections/board/Baseline';
import Roadblocks from '../sections/board/Roadblocks';
import PlanGrid from '../sections/board/PlanGrid';
import MarketingPlan from '../sections/board/MarketingPlan';

function Header() {
  return (
    <header style={{ marginBottom: 40 }}>
      <div style={{ ...mono, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.16em', color: C.gold, marginBottom: 12 }}>
        Internal · Board Only
      </div>
      <h1 style={{ ...serif, fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 900, color: C.heroText, lineHeight: 1.05, marginBottom: 10 }}>
        {BOARD_META.title}
      </h1>
      <div style={{ ...sans, fontSize: 16, color: 'rgba(240,235,228,.55)' }}>
        {BOARD_META.subtitle}
      </div>
      <div style={{ ...mono, fontSize: 11, color: 'rgba(240,235,228,.35)', marginTop: 14 }}>
        As of {BOARD_META.asOf}
      </div>
    </header>
  );
}

export default function Board() {
  useEffect(() => {
    document.title = `${BOARD_META.title} | Porchfest 2026`;
    return () => {
      document.title = SITE_META.title;
    };
  }, []);

  return (
    <div style={{
      background: C.dark,
      minHeight: '100vh',
      padding: 'calc(80px + env(safe-area-inset-top)) clamp(20px,5vw,80px) 80px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Header />
        <Baseline />
        <Roadblocks />
        <PlanGrid />
        <MarketingPlan />
      </div>
    </div>
  );
}
