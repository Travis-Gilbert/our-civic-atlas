"use client";

/* eslint-disable react-hooks/immutability -- canvas animation mutates ref-held buffers per frame. */

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { MT19937, djb2Seed } from "@/lib/mt19937";

const CELL_SIZE_PX = 96;
const DOTS_PER_CELL_MIN = 4;
const DOTS_PER_CELL_RANGE = 5;
const DOT_ALPHA_MIN = 0.1;
const DOT_ALPHA_RANGE = 0.12;
const DOT_RADIUS_PX = 1.2;
const DOT_FADE_NEAR_PX = 18;
const DOT_FADE_INSIDE = 0;
const DOT_FADE_OUTSIDE = 1;
const FADE_SOURCE_SELECTOR =
  "[data-fade-source], [role=dialog], [role=region], .atlas-panel, .control-dossier-card";

interface Dot {
  x: number;
  y: number;
  baseAlpha: number;
  fadeFactor: number;
  fadeTarget: number;
}

function placeDots(
  width: number,
  height: number,
  seed: number,
  dpr: number,
): Dot[] {
  const rng = new MT19937(seed);
  const cellsX = Math.ceil(width / CELL_SIZE_PX);
  const cellsY = Math.ceil(height / CELL_SIZE_PX);
  const dots: Dot[] = [];

  for (let cy = 0; cy < cellsY; cy += 1) {
    for (let cx = 0; cx < cellsX; cx += 1) {
      const dotsThisCell =
        DOTS_PER_CELL_MIN + Math.floor(rng.next() * DOTS_PER_CELL_RANGE);
      for (let i = 0; i < dotsThisCell; i += 1) {
        dots.push({
          x: (cx + rng.next()) * CELL_SIZE_PX * dpr,
          y: (cy + rng.next()) * CELL_SIZE_PX * dpr,
          baseAlpha: DOT_ALPHA_MIN + rng.next() * DOT_ALPHA_RANGE,
          fadeFactor: 1,
          fadeTarget: 1,
        });
      }
    }
  }

  return dots;
}

function readCssVarRgb(name: string): { r: number; g: number; b: number } {
  const source =
    document.querySelector<HTMLElement>(".civic-atlas") ??
    document.documentElement;
  const raw = getComputedStyle(source).getPropertyValue(name).trim();
  const rgb = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgb) {
    return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
  }

  const hex = raw.match(/^#?([0-9a-f]{6})$/i);
  if (hex) {
    const h = hex[1];
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  return { r: 200, g: 189, b: 161 };
}

function distancePointToRect(
  px: number,
  py: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
): number {
  const dx = Math.max(left - px, 0, px - right);
  const dy = Math.max(top - py, 0, py - bottom);
  if (dx === 0 && dy === 0) return 0;
  return Math.sqrt(dx * dx + dy * dy);
}

export function AtlasCanvasBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dotsRef = useRef<Dot[]>([]);
  const rafRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);
  const pathname = usePathname();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const glow = ctx.createRadialGradient(
      width / 2,
      height / 2,
      width * 0.18,
      width / 2,
      height / 2,
      width * 0.78,
    );
    glow.addColorStop(0, "rgba(255, 255, 255, 0.05)");
    glow.addColorStop(0.65, "rgba(74, 64, 50, 0)");
    glow.addColorStop(1, "rgba(74, 64, 50, 0.06)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    const rule = readCssVarRgb("--ctx-rule");
    const rgbPrefix = `rgba(${rule.r}, ${rule.g}, ${rule.b},`;
    for (const dot of dotsRef.current) {
      const alpha = dot.baseAlpha * dot.fadeFactor;
      if (alpha < 0.01) continue;
      ctx.beginPath();
      ctx.fillStyle = `${rgbPrefix} ${alpha})`;
      ctx.arc(dot.x, dot.y, DOT_RADIUS_PX, 0, Math.PI * 2);
      ctx.fill();
    }
  }, []);

  const animateFade = useCallback(() => {
    if (rafRef.current !== null) return;

    const tick = () => {
      let shouldContinue = false;
      for (const dot of dotsRef.current) {
        if (dot.fadeFactor === dot.fadeTarget) continue;
        const delta = dot.fadeTarget - dot.fadeFactor;
        dot.fadeFactor += delta * 0.12;
        if (Math.abs(dot.fadeTarget - dot.fadeFactor) < 0.005) {
          dot.fadeFactor = dot.fadeTarget;
        } else {
          shouldContinue = true;
        }
      }

      draw();

      if (shouldContinue) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [draw]);

  const recomputeFade = useCallback(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rects: DOMRect[] = [];

    document.querySelectorAll<HTMLElement>(FADE_SOURCE_SELECTOR).forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      if (rect.right < 0 || rect.left > window.innerWidth) return;
      rects.push(rect);
    });

    for (const dot of dotsRef.current) {
      if (rects.length === 0) {
        dot.fadeTarget = DOT_FADE_OUTSIDE;
        continue;
      }

      const cssX = dot.x / dpr;
      const cssY = dot.y / dpr;
      let minDistance = Infinity;

      for (const rect of rects) {
        const distance = distancePointToRect(
          cssX,
          cssY,
          rect.left,
          rect.top,
          rect.right,
          rect.bottom,
        );
        minDistance = Math.min(minDistance, distance);
        if (minDistance === 0) break;
      }

      if (minDistance === 0) {
        dot.fadeTarget = DOT_FADE_INSIDE;
      } else if (minDistance >= DOT_FADE_NEAR_PX) {
        dot.fadeTarget = DOT_FADE_OUTSIDE;
      } else {
        dot.fadeTarget = minDistance / DOT_FADE_NEAR_PX;
      }

      if (reducedMotionRef.current) {
        dot.fadeFactor = dot.fadeTarget;
      }
    }
  }, []);

  const applyFade = useCallback(() => {
    recomputeFade();
    if (reducedMotionRef.current) {
      draw();
      return;
    }
    animateFade();
  }, [animateFade, draw, recomputeFade]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = media.matches;
    const handleChange = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      dotsRef.current = placeDots(width, height, djb2Seed(pathname), dpr);
      applyFade();
      draw();
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [applyFade, draw, pathname]);

  useEffect(() => {
    let scheduledFrame: number | null = null;
    const scheduleFade = () => {
      if (scheduledFrame !== null) return;
      scheduledFrame = requestAnimationFrame(() => {
        scheduledFrame = null;
        applyFade();
      });
    };

    scheduleFade();
    window.addEventListener("scroll", scheduleFade, { passive: true });
    window.addEventListener("resize", scheduleFade);

    const observer = new MutationObserver(scheduleFade);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style", "data-fade-source"],
      childList: true,
      subtree: true,
    });

    return () => {
      window.removeEventListener("scroll", scheduleFade);
      window.removeEventListener("resize", scheduleFade);
      observer.disconnect();
      if (scheduledFrame !== null) cancelAnimationFrame(scheduledFrame);
    };
  }, [applyFade]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      data-atlas-canvas-backdrop
      className="fixed inset-0 z-0 h-screen w-screen pointer-events-none"
    />
  );
}
