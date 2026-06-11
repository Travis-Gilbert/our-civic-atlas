// @ts-nocheck
import ScrollReveal from '../components/ScrollReveal';
import ResponsiveImg from '../components/ResponsiveImg';
import { C } from '../tokens';
import { PHOTOS } from '../porchfest-data';

const alts = [
  'DJ and performers on a red front porch',
  'Performer under dramatic stage lights',
  'Street performer engaging with a crowd',
  'MC performing on the street corner',
];

export default function PhotoStrip() {
  return (
    <div className="pstrip" style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1.5fr 1fr',
      gap: 3,
      background: C.dark,
    }}>
      {PHOTOS.strip.map((src, i) => (
        <ScrollReveal key={src} delay={i} direction="scale" distance={28}>
          <ResponsiveImg
            src={src}
            alt={alts[i]}
            width={2000}
            height={1333}
            sizes="25vw"
            loading="lazy"
            className="pstrip-img"
            style={{
              width: '100%',
              height: 140,
              objectFit: 'cover',
              transition: 'filter .4s',
            }}
          />
        </ScrollReveal>
      ))}
      <style>{`
        .pstrip-img:hover{filter:brightness(1.1)}
        @media(max-width:640px){.pstrip{grid-template-columns:1fr 1fr!important}.pstrip-img{height:100px!important}}
      `}</style>
    </div>
  );
}
