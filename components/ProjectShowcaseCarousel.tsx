'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import type { ProjectCaseStudy } from '@/lib/studio-data';
import {
  computeCarouselIndices,
  stepCarouselIndex,
  resolveSwipeAction,
  shouldCarouselAutoplayRun,
  CAROUSEL_SWIPE_TRANSITION_SEC,
  CAROUSEL_SWIPE_EASING,
  CAROUSEL_SWIPE_OFFSET_PX,
  DEFAULT_SWIPE_THRESHOLD_PX,
} from '@/lib/carousel-engine';
import { ParticleCloudCanvas } from '@/components/ParticleCloudCanvas';
import { GsapMagnetic } from '@/components/ReactBitsEffects';
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  ArrowUpRight,
  Eye,
  Wifi,
  BatteryCharging,
  Globe,
  Sparkles,
} from 'lucide-react';

interface ProjectShowcaseCarouselProps {
  projects: ProjectCaseStudy[];
  isDark?: boolean;
  isModalOpen: boolean;
  onExploreCaseStudy: (project: ProjectCaseStudy) => void;
  onCommissionSimilar: (projectTitle: string) => void;
}

const AUTOPLAY_INTERVAL_MS = 4800;

export const ProjectShowcaseCarousel = React.memo(function ProjectShowcaseCarousel({
  projects,
  isDark = false,
  isModalOpen,
  onExploreCaseStudy,
}: ProjectShowcaseCarouselProps) {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [isManuallyPaused, setIsManuallyPaused] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isFocusWithin, setIsFocusWithin] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isInViewport, setIsInViewport] = useState<boolean>(true);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; swiped?: boolean } | null>(null);
  const prefersReducedMotion = Boolean(useReducedMotion());

  const safeProjects = projects.length > 0 ? projects : [];
  const total = safeProjects.length;
  const indices = computeCarouselIndices(activeIndex, total);

  const activeProject = safeProjects[indices.activeIndex];
  const prevProject = safeProjects[indices.prevIndex];
  const nextProject = safeProjects[indices.nextIndex];

  const isAutoplayActive = shouldCarouselAutoplayRun({
    isManuallyPaused,
    isHovered,
    isFocusWithin,
    isDragging,
    isInViewport,
    prefersReducedMotion,
    isModalOpen,
  });

  useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setIsInViewport(entry.isIntersecting);
        }
      },
      { threshold: 0.18 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const handleStep = useCallback(
    (dir: 1 | -1) => {
      setActiveIndex((prev) => {
        const res = stepCarouselIndex(prev, dir, total);
        setDirection(res.direction);
        return res.nextActiveIndex;
      });
    },
    [total]
  );

  const handleSelectIndex = useCallback(
    (targetIdx: number) => {
      if (targetIdx === indices.activeIndex) return;
      const dir: 1 | -1 = targetIdx > indices.activeIndex ? 1 : -1;
      setDirection(dir);
      setActiveIndex(targetIdx);
    },
    [indices.activeIndex]
  );

  useEffect(() => {
    if (!isAutoplayActive || total <= 1) return;
    const timer = window.setInterval(() => {
      handleStep(1);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isAutoplayActive, total, handleStep]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleStep(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleStep(-1);
      }
    },
    [handleStep]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, swiped: false };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      const start = touchStartRef.current;
      if (!start || start.swiped) return;
      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const action = resolveSwipeAction(deltaX, deltaY, DEFAULT_SWIPE_THRESHOLD_PX);
      if (action === 'next') {
        start.swiped = true;
        handleStep(1);
      } else if (action === 'prev') {
        start.swiped = true;
        handleStep(-1);
      }
    },
    [handleStep]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      setIsDragging(false);
      const start = touchStartRef.current;
      touchStartRef.current = null;
      if (!start || start.swiped) return;
      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = touch.clientY - start.y;
      const action = resolveSwipeAction(deltaX, deltaY, DEFAULT_SWIPE_THRESHOLD_PX);
      if (action === 'next') {
        handleStep(1);
      } else if (action === 'prev') {
        handleStep(-1);
      }
    },
    [handleStep]
  );

  if (!activeProject) return null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Interactive Three-Project Production Showcase"
      data-testid="project-showcase-carousel"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setIsFocusWithin(false);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden rounded-[32px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#080808] text-[#171717] dark:text-white p-5 sm:p-8 lg:p-10 shadow-[0_24px_70px_-20px_rgba(23,23,23,0.08)] dark:shadow-[0_32px_90px_-20px_rgba(0,0,0,0.88)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4B1F]"
    >
      {/* Preserved White & Purple Floating Particles */}
      <ParticleCloudCanvas
        isDark={isDark}
        variant="cinematic"
        testId="work-particle-canvas"
      />

      {/* Ambient Orange Perimeter Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 left-1/2 -translate-x-1/2 h-72 w-[520px] rounded-full bg-[#FF4B1F]/10 dark:bg-[#FF4B1F]/18 blur-[110px]"
      />

      {/* Top Control & Telemetry Bar (Unboxed editorial status labels; pill buttons only for interactive controls) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#E5E2DC] dark:border-white/12">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[#FF4B1F] dark:text-[#FF6B45] font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>INTERACTIVE SHOWCASE STAGE</span>
          </span>
          <span
            data-testid="carousel-status-badge"
            className="inline-flex items-center gap-2 text-[11px] font-mono text-[#525252] dark:text-[#D4D4D4] border-l border-[#E5E2DC] dark:border-white/15 pl-4"
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isAutoplayActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span>
              {isManuallyPaused
                ? 'PAUSED'
                : isHovered || isFocusWithin
                ? 'PAUSED ON INTERACTION'
                : 'AUTO-CYCLE ACTIVE'}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <GsapMagnetic strength={0.18}>
            <button
              type="button"
              data-testid="carousel-prev-btn"
              onClick={() => handleStep(-1)}
              aria-label="Previous project"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E2DC] dark:border-white/15 bg-[#FFFFFF] dark:bg-[#141414] hover:bg-[#FF4B1F] hover:border-[#FF4B1F] text-[#171717] dark:text-white hover:text-white transition-colors duration-150 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </GsapMagnetic>

          <GsapMagnetic strength={0.18}>
            <button
              type="button"
              data-testid="carousel-play-pause"
              onClick={() => setIsManuallyPaused((v) => !v)}
              aria-pressed={isManuallyPaused}
              aria-label={
                isManuallyPaused
                  ? 'Resume project carousel autoplay'
                  : 'Pause project carousel autoplay'
              }
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DC] dark:border-white/15 bg-[#FFFFFF] dark:bg-[#141414] hover:border-[#FF4B1F] px-3.5 h-10 text-[11px] font-mono font-semibold text-[#171717] dark:text-white transition-colors duration-150 cursor-pointer"
            >
              {isManuallyPaused ? (
                <>
                  <Play className="h-3.5 w-3.5 text-[#FF4B1F]" />
                  <span>Resume</span>
                </>
              ) : (
                <>
                  <Pause className="h-3.5 w-3.5 text-[#FF4B1F]" />
                  <span>Pause</span>
                </>
              )}
            </button>
          </GsapMagnetic>

          <GsapMagnetic strength={0.18}>
            <button
              type="button"
              data-testid="carousel-next-btn"
              onClick={() => handleStep(1)}
              aria-label="Next project"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E2DC] dark:border-white/15 bg-[#FFFFFF] dark:bg-[#141414] hover:bg-[#FF4B1F] hover:border-[#FF4B1F] text-[#171717] dark:text-white hover:text-white transition-colors duration-150 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </GsapMagnetic>
        </div>
      </div>

      {/* Main 3-Project Stage */}
      <div className="relative z-10 mt-7 grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        {/* Left Side Preview Card */}
        {prevProject && (
          <button
            type="button"
            data-testid="carousel-side-prev"
            onClick={() => handleStep(-1)}
            aria-label={`Switch to previous project: ${prevProject.title}`}
            className="hidden xl:flex xl:col-span-2 flex-col justify-between text-left rounded-2xl border border-[#E5E2DC] dark:border-white/10 hover:border-[#FF4B1F]/70 bg-[#FFFFFF]/90 dark:bg-[#111111]/85 p-3 opacity-80 hover:opacity-100 transition-all duration-150 hover:scale-[1.02] cursor-pointer group/side"
          >
            <div>
              <span className="text-[10px] font-mono text-[#FF4B1F] dark:text-[#FF6B45] font-semibold block">
                ← PREV · {prevProject.index}
              </span>
              <span className="mt-0.5 text-sm font-bold font-display text-[#171717] dark:text-white block truncate">
                {prevProject.title}
              </span>
              <span className="text-[10px] font-mono text-[#666666] dark:text-[#A1A1A1] block truncate">
                {prevProject.displayUrl}
              </span>
            </div>
            <div className="relative mt-3 aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#E5E2DC] dark:border-white/10 bg-black">
              <Image
                src={prevProject.liveScreenshot}
                alt={`${prevProject.title} preview`}
                fill
                sizes="220px"
                referrerPolicy="no-referrer"
                className="object-cover object-top group-hover/side:scale-105 transition-transform duration-200"
              />
            </div>
          </button>
        )}

        {/* Center Active Stage */}
        <div className="xl:col-span-8">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={activeProject.id}
              data-testid="carousel-active-slide"
              initial={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, x: direction * CAROUSEL_SWIPE_OFFSET_PX, scale: 0.99 }
              }
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 1 }
                  : { opacity: 0, x: -direction * CAROUSEL_SWIPE_OFFSET_PX, scale: 0.99 }
              }
              transition={{ duration: CAROUSEL_SWIPE_TRANSITION_SEC, ease: CAROUSEL_SWIPE_EASING }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center"
            >
              {/* Left 7 Cols: Laptop Mockup + Docked Mobile Preview */}
              <div className="lg:col-span-7 relative sm:pb-4">
                <div className="overflow-hidden rounded-2xl border-2 border-white/20 bg-[#050505] shadow-[0_24px_65px_rgba(0,0,0,0.9)]">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#141414] px-3.5 py-2 text-[10.5px] font-mono text-[#A1A1A1]">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#FF4B1F]" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <a
                      href={activeProject.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-0.5 text-[10.5px] text-white hover:text-[#FF4B1F] transition-colors"
                    >
                      <Globe className="h-3 w-3 text-[#FF4B1F]" />
                      <span>https://{activeProject.displayUrl}</span>
                    </a>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {activeProject.index} · LIVE
                    </span>
                  </div>

                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-black">
                    <Image
                      src={activeProject.liveScreenshot}
                      alt={`${activeProject.title} flagship web platform`}
                      fill
                      sizes="(max-width: 1024px) 100vw, 560px"
                      referrerPolicy="no-referrer"
                      className="object-cover object-top"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3.5 right-3.5 sm:right-40 flex items-center justify-between">
                      <span className="rounded-md bg-[#FF4B1F] px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase text-white">
                        {activeProject.category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Docked Mobile Companion Device Preview */}
                <div className="hidden sm:flex flex-col justify-between w-36 sm:absolute sm:bottom-0 sm:right-3 z-20 rounded-[20px] border-2 border-[#333333] bg-[#0B0B0B] p-2 text-white shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
                  <div className="flex items-center justify-between px-1 pb-1 text-[8px] font-mono text-white/75">
                    <span>9:30</span>
                    <span className="h-2 w-8 rounded-full bg-black border border-white/15" />
                    <span className="inline-flex items-center gap-0.5">
                      <Wifi className="h-2 w-2" />
                      <BatteryCharging className="h-2 w-2 text-emerald-400" />
                    </span>
                  </div>
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-white/10 bg-black">
                    <Image
                      src={activeProject.studioVisual}
                      alt={`${activeProject.title} mobile companion view`}
                      fill
                      sizes="144px"
                      referrerPolicy="no-referrer"
                      className="object-cover"
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between px-0.5 text-[8px] font-mono">
                    <span className="text-white/80 truncate">{activeProject.displayUrl}</span>
                    <span className="text-[#FF4B1F] font-bold">60fps</span>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Editorial Case Study Details & CTAs */}
              <div className="lg:col-span-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#FF4B1F] dark:text-[#FF6B45] font-semibold">
                    <span>PROJECT {activeProject.index} OF 0{total}</span>
                    <span>·</span>
                    <span>{activeProject.displayUrl}</span>
                  </div>
                  <h3
                    data-testid="carousel-active-title"
                    className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-[#171717] dark:text-white leading-tight"
                  >
                    {activeProject.title} — {activeProject.subtitle}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-[#525252] dark:text-[#D4D4D4] leading-relaxed">
                  {activeProject.summary}
                </p>

                {/* Stack Tags (architectural micro-badges, not interactive pills) */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {activeProject.stack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-md border border-[#E5E2DC] dark:border-white/15 bg-[#FFFFFF] dark:bg-white/[0.05] px-2 py-0.5 text-[10.5px] font-mono text-[#171717] dark:text-white/90"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <GsapMagnetic strength={0.18}>
                    <button
                      type="button"
                      onClick={() => onExploreCaseStudy(activeProject)}
                      className="inline-flex items-center gap-2 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white pl-2.5 pr-4 py-2 text-xs font-mono font-bold transition-all cursor-pointer"
                    >
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#111111]">
                        <Eye className="h-3.5 w-3.5" />
                      </span>
                      <span>Explore Case Study</span>
                    </button>
                  </GsapMagnetic>

                  <GsapMagnetic strength={0.18}>
                    <a
                      href={activeProject.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-[#E5E2DC] dark:border-white/25 bg-[#FFFFFF] dark:bg-[#141414] hover:border-[#FF4B1F] text-[#171717] dark:text-white px-4 py-2 text-xs font-mono font-semibold transition-colors"
                    >
                      <span>Visit {activeProject.displayUrl}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#FF4B1F]" />
                    </a>
                  </GsapMagnetic>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Side Preview Card */}
        {nextProject && (
          <button
            type="button"
            data-testid="carousel-side-next"
            onClick={() => handleStep(1)}
            aria-label={`Switch to next project: ${nextProject.title}`}
            className="hidden xl:flex xl:col-span-2 flex-col justify-between text-left rounded-2xl border border-[#E5E2DC] dark:border-white/10 hover:border-[#FF4B1F]/70 bg-[#FFFFFF]/90 dark:bg-[#111111]/85 p-3 opacity-80 hover:opacity-100 transition-all duration-150 hover:scale-[1.02] cursor-pointer group/side"
          >
            <div>
              <span className="text-[10px] font-mono text-[#FF4B1F] dark:text-[#FF6B45] font-semibold block">
                NEXT · {nextProject.index} →
              </span>
              <span className="mt-0.5 text-sm font-bold font-display text-[#171717] dark:text-white block truncate">
                {nextProject.title}
              </span>
              <span className="text-[10px] font-mono text-[#666666] dark:text-[#A1A1A1] block truncate">
                {nextProject.displayUrl}
              </span>
            </div>
            <div className="relative mt-3 aspect-[16/10] w-full overflow-hidden rounded-xl border border-[#E5E2DC] dark:border-white/10 bg-black">
              <Image
                src={nextProject.liveScreenshot}
                alt={`${nextProject.title} preview`}
                fill
                sizes="220px"
                referrerPolicy="no-referrer"
                className="object-cover object-top group-hover/side:scale-105 transition-transform duration-200"
              />
            </div>
          </button>
        )}
      </div>

      {/* Bottom Thumbnail Strip */}
      <div
        role="tablist"
        aria-label="Select production project slide"
        className="relative z-10 mt-7 pt-6 border-t border-[#E5E2DC] dark:border-white/12 grid grid-cols-1 sm:grid-cols-3 gap-3"
      >
        {safeProjects.map((proj, idx) => {
          const isSelected = idx === indices.activeIndex;
          return (
            <button
              key={proj.id}
              role="tab"
              type="button"
              aria-selected={isSelected}
              data-testid={`carousel-thumb-${idx}`}
              onClick={() => handleSelectIndex(idx)}
              className={`group/thumb relative overflow-hidden rounded-2xl border p-3 text-left transition-all flex items-center gap-3 cursor-pointer ${
                isSelected
                  ? 'border-[#FF4B1F] bg-[#FFFFFF] dark:bg-[#181818] shadow-[0_10px_28px_rgba(255,75,31,0.12)] dark:shadow-[0_10px_30px_rgba(255,75,31,0.18)]'
                  : 'border-[#E5E2DC] dark:border-white/10 bg-[#FFFFFF]/70 dark:bg-[#111111]/70 hover:border-[#FF4B1F]/50 dark:hover:border-white/30'
              }`}
            >
              <div className="relative h-12 w-18 shrink-0 overflow-hidden rounded-lg border border-[#E5E2DC] dark:border-white/15 bg-black">
                <Image
                  src={proj.liveScreenshot}
                  alt={proj.title}
                  fill
                  sizes="72px"
                  referrerPolicy="no-referrer"
                  className="object-cover object-top"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono text-[#FF4B1F] dark:text-[#FF6B45] font-bold">
                    {proj.index} · {proj.displayUrl}
                  </span>
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-[#FF4B1F]" />
                  )}
                </div>
                <span className="block text-sm font-bold font-display text-[#171717] dark:text-white truncate">
                  {proj.title}
                </span>
                <span className="block text-[10.5px] text-[#666666] dark:text-[#A1A1A1] truncate">
                  {proj.category}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
