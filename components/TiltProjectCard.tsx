'use client';

import React, { useRef, useCallback, useEffect } from 'react';
import {
  motion,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'motion/react';
import {
  computeCardTilt,
  WEIGHTLESS_TILT_SPRING,
  type RectBounds,
} from '@/lib/tilt-math';

interface TiltProjectCardProps {
  projectId: string;
  children: React.ReactNode;
}

export const TiltProjectCard = React.memo(function TiltProjectCard({
  projectId,
  children,
}: TiltProjectCardProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const cachedRectRef = useRef<RectBounds | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const prefersReducedMotion = useReducedMotion();

  // Direct useSpring motion values tuned with WEIGHTLESS_TILT_SPRING
  // (stiffness: 150, damping: 20, mass: 0.4) for weightless, fluid 60 FPS response
  const rotateX = useSpring(0, WEIGHTLESS_TILT_SPRING);
  const rotateY = useSpring(0, WEIGHTLESS_TILT_SPRING);
  const hoverProgress = useSpring(0, WEIGHTLESS_TILT_SPRING);
  const sheenOffsetX = useSpring(0, WEIGHTLESS_TILT_SPRING);
  const sheenOffsetY = useSpring(0, WEIGHTLESS_TILT_SPRING);

  // Compositor-only derived transforms (scale and opacity)
  const scale = useTransform(hoverProgress, [0, 1], [1, 1.005]);
  const sheenOpacity = useTransform(hoverProgress, [0, 1], [0, 0.85]);

  // Invalidate cached bounding box on scroll or resize so mousemove never triggers layout reflow
  useEffect(() => {
    const invalidateRect = () => {
      cachedRectRef.current = null;
    };
    window.addEventListener('scroll', invalidateRect, { passive: true });
    window.addEventListener('resize', invalidateRect, { passive: true });
    return () => {
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      window.removeEventListener('scroll', invalidateRect);
      window.removeEventListener('resize', invalidateRect);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (prefersReducedMotion || !cardRef.current) return;
    cachedRectRef.current = cardRef.current.getBoundingClientRect();
    hoverProgress.set(1);
  }, [prefersReducedMotion, hoverProgress]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (prefersReducedMotion) return;
      pointerRef.current.x = e.clientX;
      pointerRef.current.y = e.clientY;

      // Coalesce high-frequency pointer events into a single 60 FPS frame update
      if (rafIdRef.current !== null) return;

      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (!cachedRectRef.current && cardRef.current) {
          cachedRectRef.current = cardRef.current.getBoundingClientRect();
        }
        const rect = cachedRectRef.current;
        if (!rect) return;

        const tilt = computeCardTilt(
          pointerRef.current.x,
          pointerRef.current.y,
          rect,
          3.4,
          4
        );

        rotateX.set(tilt.rotateX);
        rotateY.set(tilt.rotateY);
        sheenOffsetX.set(tilt.normX * 140);
        sheenOffsetY.set(tilt.normY * 90);
        hoverProgress.set(1);
      });
    },
    [prefersReducedMotion, rotateX, rotateY, sheenOffsetX, sheenOffsetY, hoverProgress]
  );

  const handleMouseLeave = useCallback(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    rotateX.set(0);
    rotateY.set(0);
    sheenOffsetX.set(0);
    sheenOffsetY.set(0);
    hoverProgress.set(0);
    cachedRectRef.current = null;
  }, [rotateX, rotateY, sheenOffsetX, sheenOffsetY, hoverProgress]);

  return (
    <div style={{ perspective: '1500px' }}>
      <motion.article
        ref={cardRef}
        data-testid={`project-card-${projectId}`}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          scale,
          transformStyle: 'preserve-3d',
        }}
        className="group relative overflow-hidden rounded-2xl border border-[#CFC9BC] dark:border-[#1E2438] hover:border-[#2544E8]/65 dark:hover:border-[#5E7AFF]/60 bg-[#FDFCF9] dark:bg-[#090C15] p-6 sm:p-8 lg:p-10 shadow-[0_12px_34px_-16px_rgba(17,17,16,0.08)] dark:shadow-[0_22px_52px_-20px_rgba(0,0,0,0.82)] hover:shadow-[0_24px_56px_-18px_rgba(37,68,232,0.14)] dark:hover:shadow-[0_28px_64px_-20px_rgba(37,68,232,0.28)] transition-[border-color,box-shadow] duration-300 will-change-transform"
      >
        {/* Top-edge precision luminous accent line on hover */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#2544E8] dark:via-[#6E88FF] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />

        {/* GPU-composited cursor sheen (animates transform + opacity only, zero background-string re-rasterization) */}
        <motion.div
          aria-hidden="true"
          style={{
            x: sheenOffsetX,
            y: sheenOffsetY,
            opacity: sheenOpacity,
          }}
          className="pointer-events-none absolute -inset-24 z-0 bg-[radial-gradient(540px_circle_at_50%_50%,rgba(79,107,255,0.11),rgba(124,92,252,0.04)_45%,transparent_70%)] will-change-transform"
        />

        {/* Card Content */}
        <div className="relative z-10">{children}</div>
      </motion.article>
    </div>
  );
});
