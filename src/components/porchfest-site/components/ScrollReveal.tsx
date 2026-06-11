// @ts-nocheck
import { useRef, useEffect, useState } from 'react';

/**
 * ScrollReveal: IntersectionObserver-based entrance animation.
 * - direction: 'up' (default), 'left', 'right', 'scale' controls entrance vector
 * - delay: multiplied by 0.1s for staggering sibling reveals
 * - distance: px to travel during reveal (default 28)
 * - Fully respects prefers-reduced-motion
 */
export default function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  distance = 28,
  style,
  className,
  ...props
}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setVisible(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const delayS = delay * 0.2;

  const transforms = {
    up: `translateY(${distance}px)`,
    left: `translateX(${distance}px)`,
    right: `translateX(-${distance}px)`,
    scale: `scale(0.95)`,
  };

  const hiddenTransform = transforms[direction] || transforms.up;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) translateX(0) scale(1)' : hiddenTransform,
        transition: [
          `opacity 1.4s cubic-bezier(.16,1,.3,1) ${delayS}s`,
          `transform 1.4s cubic-bezier(.16,1,.3,1) ${delayS}s`,
        ].join(', '),
        willChange: visible ? 'auto' : 'opacity, transform',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
