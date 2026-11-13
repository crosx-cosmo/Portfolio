'use client';

import React, { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from 'motion/react';
import { getSectionParallaxKeyframes } from '@/lib/tilt-math';

interface ParallaxSectionProps {
  id: string;
  ariaLabelledBy: string;
  className?: string;
  offsetPx?: number;
  children: React.ReactNode;
}

/**
 * High-performance scroll-linked parallax section wrapper built on Framer Motion's
 * `useScroll` and `useTransform`.
 *
 * Keeps the outer `<section>` stationary so section borders and scroll offsets
 * remain pixel-accurate, while driving GPU-composited `y`, `scale`, and `opacity`
 * transforms on the inner content plane. Respects `prefers-reduced-motion`.
 */
export const ParallaxSection = React.memo(function ParallaxSection({
  id,
  ariaLabelledBy,
  className = '',
  offsetPx = 28,
  children,
}: ParallaxSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = Boolean(useReducedMotion());

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start 0.96', 'end 0.08'],
  });

  const keyframes = getSectionParallaxKeyframes(prefersReducedMotion, offsetPx);

  const y = useTransform(scrollYProgress, keyframes.inputRange, keyframes.yRange);
  const opacity = useTransform(scrollYProgress, keyframes.inputRange, keyframes.opacityRange);

  return (
    <section
      ref={sectionRef}
      id={id}
      aria-labelledby={ariaLabelledBy}
      data-testid={`parallax-section-${id}`}
      className={className}
    >
      <motion.div
        style={{
          y,
          opacity,
        }}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </section>
  );
});
