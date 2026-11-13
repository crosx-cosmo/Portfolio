'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { motion, useReducedMotion } from 'motion/react';

/**
 * 1. React Bits + GSAP SplitBlurText
 * Kinetic word-by-word 3D blur reveal powered by GSAP timelines.
 * Renders the full accessible string inside direct spans so DOM text queries
 * (`textContent`) remain 100% intact.
 */
interface GsapSplitTextProps {
  text: string;
  highlightWords?: string[];
  highlightClassName?: string;
  blockFromWord?: string;
  className?: string;
  delay?: number;
}

export const GsapSplitText = React.memo(function GsapSplitText({
  text,
  highlightWords = [],
  highlightClassName = 'text-[#FF4B1F]',
  blockFromWord,
  className = '',
  delay = 0.08,
}: GsapSplitTextProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion || !containerRef.current) return;
    const words = containerRef.current.querySelectorAll<HTMLElement>('[data-gsap-word]');
    if (!words.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        {
          y: 22,
          opacity: 0,
          rotateX: -24,
          filter: 'blur(5px)',
        },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          filter: 'blur(0px)',
          duration: 0.68,
          stagger: 0.055,
          delay,
          ease: 'power3.out',
          clearProps: 'filter,transform',
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [prefersReducedMotion, delay, text]);

  const tokens = text.split(' ');

  return (
    <span ref={containerRef} className={`inline-block ${className}`} style={{ perspective: '900px' }}>
      {tokens.map((word, idx) => {
        const cleanWord = word.replace(/[.,!?:;]/g, '');
        const isHighlighted =
          highlightWords.includes(word) || highlightWords.includes(cleanWord);
        const isBlockStart = blockFromWord && (word === blockFromWord || cleanWord === blockFromWord);

        return (
          <React.Fragment key={`${word}-${idx}`}>
            {isBlockStart && <br className="hidden sm:inline" />}
            <span
              data-gsap-word
              className={`inline-block will-change-transform ${
                isHighlighted ? highlightClassName : ''
              }`}
            >
              {word}
            </span>
            {idx < tokens.length - 1 ? ' ' : ''}
          </React.Fragment>
        );
      })}
    </span>
  );
});

/**
 * 2. React Bits + GSAP Magnetic Wrapper
 * Subtle elastic cursor magnetism on primary luxury buttons and badges.
 * Automatically disables magnetic displacement on touch devices (`(hover: none)` or `(pointer: coarse)`)
 * and never intercepts or delays click/navigation events.
 */
interface GsapMagneticProps {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}

export const GsapMagnetic = React.memo(function GsapMagnetic({
  children,
  strength = 0.2,
  className = 'inline-block',
}: GsapMagneticProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canHoverRef = useRef<boolean>(false);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    canHoverRef.current = mq.matches;
    const listener = (e: MediaQueryListEvent) => {
      canHoverRef.current = e.matches;
    };
    mq.addEventListener?.('change', listener);
    return () => mq.removeEventListener?.('change', listener);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !canHoverRef.current || !wrapRef.current) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const relX = e.clientX - (rect.left + rect.width / 2);
      const relY = e.clientY - (rect.top + rect.height / 2);

      // Clamp displacement to max 8px so magnetic pull is refined and never aggressive
      const clampedX = Math.max(-8, Math.min(8, relX * strength));
      const clampedY = Math.max(-6, Math.min(6, relY * strength));

      gsap.to(wrapRef.current, {
        x: clampedX,
        y: clampedY,
        duration: 0.32,
        ease: 'power3.out',
        overwrite: 'auto',
      });
    },
    [prefersReducedMotion, strength]
  );

  const handleMouseLeave = useCallback(() => {
    if (prefersReducedMotion || !wrapRef.current) return;
    gsap.to(wrapRef.current, {
      x: 0,
      y: 0,
      duration: 0.58,
      ease: 'elastic.out(1, 0.42)',
      overwrite: 'auto',
    });
  }, [prefersReducedMotion]);

  return (
    <div
      ref={wrapRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </div>
  );
});

/**
 * 3. React Bits SpotlightCard
 * Interactive radial cursor-tracking spotlight illumination + Framer Motion spring lift.
 */
interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
}

export const SpotlightCard = React.memo(function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(255, 75, 31, 0.22)',
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState<number>(0);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseEnter = useCallback(() => {
    setOpacity(1);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setOpacity(0);
  }, []);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`relative overflow-hidden ${className}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px z-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(420px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent 65%)`,
        }}
      />
      <div className="relative z-10 h-full flex flex-col justify-between">{children}</div>
    </motion.div>
  );
});

/**
 * 4. React Bits DecryptedText
 * Cipher-scramble hover effect for monospace engineering labels & live domains.
 */
interface DecryptedMonoProps {
  text: string;
  className?: string;
}

const CIPHER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/._-';

export const DecryptedMono = React.memo(function DecryptedMono({
  text,
  className = '',
}: DecryptedMonoProps) {
  const [display, setDisplay] = useState<string>(text);
  const timerRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const triggerScramble = useCallback(() => {
    if (prefersReducedMotion) return;
    if (timerRef.current) window.clearInterval(timerRef.current);

    let iteration = 0;
    timerRef.current = window.setInterval(() => {
      setDisplay(
        text
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '.' || char === '·') return char;
            if (index < iteration) return text[index];
            return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
          })
          .join('')
      );

      iteration += 1 / 2;
      if (iteration >= text.length) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        setDisplay(text);
      }
    }, 24);
  }, [prefersReducedMotion, text]);

  useEffect(() => {
    setDisplay(text);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [text]);

  return (
    <span onMouseEnter={triggerScramble} className={className}>
      {display}
    </span>
  );
});
