// @ts-nocheck
import { useEffect, useRef } from 'react';

/**
 * VideoBackground: fixed-position autoplay looping video behind page content.
 * - muted, looped, playsInline, autoPlay so mobile browsers will play it
 * - poster fallback renders instantly and while the video loads
 * - 72% dark scrim over the video for text legibility
 * - respects prefers-reduced-motion: pauses the video and shows only the poster
 */
export default function VideoBackground() {
  const videoRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const video = videoRef.current;
    if (!video) return;

    const applyPreference = () => {
      if (mq.matches) {
        try {
          video.pause();
          video.removeAttribute('autoplay');
        } catch (e) {
          // Ignore; paused state may not be reachable during unload
        }
      }
    };

    applyPreference();
    mq.addEventListener('change', applyPreference);
    return () => mq.removeEventListener('change', applyPreference);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        background: '#1A1816',
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/photos/poster-hero.jpg"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
        }}
      >
        <source src="/video/porchfest-highlights.mp4" type="video/mp4" />
      </video>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(26,24,22,.72)',
        }}
      />
    </div>
  );
}
