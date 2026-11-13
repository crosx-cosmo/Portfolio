'use client';

import React, { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  SELECTED_PROJECTS,
  TECH_STACK_ARSENAL,
  EXPERTISE_DOMAINS,
  STUDIO_SERVICES,
  PROCESS_STAGES,
  type ProjectCaseStudy,
} from '@/lib/studio-data';
import type { ScopeEstimateResult } from '@/lib/scope-estimator';
import { useStudioTheme } from '@/lib/use-studio-theme';
import { ScrollProgressBar } from '@/components/ScrollProgressBar';
import { ParticleCloudCanvas } from '@/components/ParticleCloudCanvas';
import { FloatingCodeTerminal } from '@/components/FloatingCodeTerminal';
import { ParallaxSection } from '@/components/ParallaxSection';
import {
  ProjectInquirySection,
  type EstimatorSeedPayload,
} from '@/components/ProjectInquirySection';
import { ProjectShowcaseCarousel } from '@/components/ProjectShowcaseCarousel';
import { ScopeEstimator } from '@/components/ScopeEstimator';
import { CommandPalette } from '@/components/CommandPalette';
import { TrustedByStrip } from '@/components/TrustedByStrip';
import {
  GsapSplitText,
  GsapMagnetic,
  SpotlightCard,
  DecryptedMono,
} from '@/components/ReactBitsEffects';
import {
  ArrowUpRight,
  ArrowRight,
  Sun,
  Moon,
  Menu,
  X,
  Eye,
  Check,
  Code2,
  Layers,
  Terminal,
  Sparkles,
  Cpu,
  Box,
  Compass,
  Hexagon,
  Wifi,
  BatteryCharging,
  Search,
  Globe,
  Command,
} from 'lucide-react';

const ProjectCaseStudyModal = dynamic(
  () =>
    import('@/components/ProjectCaseStudyModal').then((m) => m.ProjectCaseStudyModal),
  { ssr: false }
);

const SERVICE_VISUALS = [
  '/projects/crosx-live.png',
  '/projects/crosx-studio.jpg',
  '/projects/rca-live.png',
  '/projects/sohan-live.png',
];

interface StudioClientProps {
  initialProjects: ProjectCaseStudy[];
}

export function StudioClient({ initialProjects }: StudioClientProps) {
  const { isDark, toggleTheme } = useStudioTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectCaseStudy[]>(
    initialProjects.length > 0 ? initialProjects : SELECTED_PROJECTS
  );
  const [heroProjectIndex, setHeroProjectIndex] = useState<number>(0);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<ProjectCaseStudy | null>(null);
  const [activeStackTabId, setActiveStackTabId] = useState<string>(TECH_STACK_ARSENAL[0].id);
  const [activeExpertiseId, setActiveExpertiseId] = useState<string>(EXPERTISE_DOMAINS[0].id);
  const [activeProcessIndex, setActiveProcessIndex] = useState<number>(0);
  const [preselectedScope, setPreselectedScope] = useState<string | undefined>(undefined);
  const [referenceProject, setReferenceProject] = useState<string | undefined>(undefined);
  const [estimatorSeed, setEstimatorSeed] = useState<EstimatorSeedPayload | null>(null);
  const [activeNavSection, setActiveNavSection] = useState<string>('home');

  // Keep CMS edits fresh on client navigation without blocking SSR HTML
  useEffect(() => {
    let active = true;
    fetch('/api/projects', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.projects) || data.projects.length === 0) {
          return;
        }
        setProjects(data.projects as ProjectCaseStudy[]);
      })
      .catch(() => {
        // Keep initial SSR projects
      });
    return () => {
      active = false;
    };
  }, []);

  // Scroll-spy active section observer for header navigation indicator
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const sectionIds = [
      'home',
      'about',
      'services',
      'work',
      'expertise',
      'process',
      'estimator',
      'contact',
    ];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.target.id) {
            setActiveNavSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: 0.02 }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const heroActiveProject = projects[heroProjectIndex] ?? projects[0] ?? SELECTED_PROJECTS[0];

  const filteredProjects =
    activeCategory === 'All'
      ? projects
      : projects.filter((p) => p.category === activeCategory);

  const activeStackCategory =
    TECH_STACK_ARSENAL.find((s) => s.id === activeStackTabId) ?? TECH_STACK_ARSENAL[0];

  const activeExpertise =
    EXPERTISE_DOMAINS.find((d) => d.id === activeExpertiseId) ?? EXPERTISE_DOMAINS[0];

  const activeProcess = PROCESS_STAGES[activeProcessIndex] ?? PROCESS_STAGES[0];

  const handleScopeService = useCallback((serviceTitle: string) => {
    const scopeMap: Record<string, string> = {
      'Custom Websites & High-Speed Web Apps':
        'Website Development (Next.js / Vite / Tailwind)',
      'Cross-Platform Mobile Apps (React Native + Expo)':
        'Mobile App (React Native + Expo)',
      'Full-Stack SaaS & Enterprise Platforms':
        'SaaS Platform (Next.js / NestJS / Neon DB & PostgreSQL)',
      'Backend Systems, Dashboards & Automation':
        'Backend & API Engineering (NestJS / Node.js / Neon DB & PostgreSQL)',
    };
    setPreselectedScope(
      scopeMap[serviceTitle] || 'Full-Stack Web App (React / TanStack / Next.js)'
    );
    const contactEl = document.getElementById('contact');
    contactEl?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSelectProjectForInquiry = useCallback((projectTitle: string) => {
    setReferenceProject(projectTitle);
    const contactEl = document.getElementById('contact');
    contactEl?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleApplyEstimatorScope = useCallback((estimate: ScopeEstimateResult) => {
    setEstimatorSeed((prev) => ({
      scope: estimate.mappedServiceScope,
      timeline: estimate.mappedTimeline,
      brief: estimate.formattedBrief,
      version: (prev?.version ?? 0) + 1,
    }));
    const contactEl = document.getElementById('contact');
    contactEl?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] dark:bg-[#090909] text-[#171717] dark:text-[#F8F8F8] overflow-x-hidden">
      {/* Top Horizontal Scroll Progress Indicator */}
      <ScrollProgressBar />

      {/* ==========================================================================
          1. NAVIGATION & HEADER — Mathematically Centered Brand Pill Bar
         ========================================================================== */}
      <header className="sticky top-0 z-40 pt-3 pb-2 bg-transparent">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-full border border-[#E5E2DC]/90 dark:border-white/15 bg-white/90 dark:bg-[#111111]/95 backdrop-blur-md sm:backdrop-blur-xl px-3 sm:px-4 py-2 text-[#171717] dark:text-white shadow-[0_14px_36px_-14px_rgba(23,23,23,0.12)] dark:shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)] flex items-center justify-between gap-3 transition-colors">
            {/* Left Navigation Arm */}
            <nav
              aria-label="Primary Navigation"
              className="hidden lg:flex lg:flex-1 items-center justify-start gap-1 text-xs font-medium text-[#525252] dark:text-[#D4D4D4]"
            >
              {[
                { id: 'home', label: 'Home', href: '#home', xlOnly: false },
                { id: 'about', label: 'About', href: '#about', xlOnly: false },
                { id: 'services', label: 'Service', href: '#services', xlOnly: false },
                { id: 'work', label: 'Project', href: '#work', xlOnly: false },
                { id: 'estimator', label: 'Estimator', href: '#estimator', xlOnly: true },
              ].map((navItem) => {
                const isActive = activeNavSection === navItem.id;
                return (
                  <a
                    key={navItem.id}
                    href={navItem.href}
                    onClick={() => setActiveNavSection(navItem.id)}
                    className={`${
                      navItem.xlOnly ? 'hidden xl:inline-flex' : 'inline-flex'
                    } relative items-center justify-center rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'text-white'
                        : 'text-[#525252] dark:text-[#D4D4D4] hover:text-[#171717] dark:hover:text-white hover:bg-[#171717]/5 dark:hover:bg-white/10'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="active-header-nav-pill"
                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                        className="absolute inset-0 rounded-full bg-[#FF4B1F] -z-0"
                      />
                    )}
                    <span className="relative z-10">{navItem.label}</span>
                  </a>
                );
              })}
            </nav>

            {/* Center Brand Identity */}
            <a
              href="#home"
              className="flex items-center justify-center gap-2.5 min-w-0 shrink-0 group"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF4B1F] text-xs font-mono font-extrabold text-white shrink-0 shadow-[0_4px_14px_rgba(255,75,31,0.45)] transition-transform duration-300 group-hover:scale-105">
                IC
              </span>
              <div className="leading-tight min-w-0">
                <span className="block text-sm sm:text-base font-extrabold tracking-tight font-display text-[#171717] dark:text-white truncate">
                  CROSX DEV STUDIO<span className="text-[#FF4B1F]">®</span>
                </span>
                <span className="block text-[9.5px] font-mono text-[#666666] dark:text-[#A1A1A1] truncate">
                  IRON CLAD · Product Builder
                </span>
              </div>
            </a>

            {/* Right Navigation Arm */}
            <div className="flex lg:flex-1 items-center justify-end gap-2 shrink-0">
              <div className="hidden xl:flex items-center gap-1 text-xs font-medium text-[#525252] dark:text-[#D4D4D4]">
                <a
                  href="/track-ticket"
                  className="rounded-full px-3 py-2 font-mono text-[11px] text-[#E03912] dark:text-[#FF6B45] hover:bg-[#FF4B1F]/10 dark:hover:bg-white/10 transition-colors"
                >
                  Track Ticket
                </a>
              </div>

              {/* Quick Command Palette Trigger */}
              <button
                type="button"
                data-testid="command-palette-trigger"
                onClick={() => setCommandPaletteOpen(true)}
                aria-label="Open quick command palette (Cmd+K)"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DC] dark:border-white/15 bg-[#FAF9F6] dark:bg-[#1F1F1F] hover:border-[#FF4B1F] px-2.5 h-8 text-[11px] font-mono text-[#525252] dark:text-[#D4D4D4] hover:text-[#171717] dark:hover:text-white transition-colors cursor-pointer"
              >
                <Command className="h-3 w-3 text-[#FF4B1F]" />
                <span>K</span>
              </button>

              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                data-testid="theme-slide-toggle"
                onClick={toggleTheme}
                aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                className="relative inline-flex h-8 w-[62px] shrink-0 cursor-pointer items-center rounded-full border border-[#E5E2DC] dark:border-white/15 bg-[#F2EFE9] dark:bg-[#1F1F1F] p-1 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF4B1F]"
              >
                <span className="sr-only">Toggle color theme</span>
                <span className="pointer-events-none relative z-10 flex w-full items-center justify-between px-1.5">
                  <Sun
                    className={`h-3.5 w-3.5 transition-colors duration-200 ${
                      !isDark ? 'text-white' : 'text-[#A1A1A1]'
                    }`}
                  />
                  <Moon
                    className={`h-3.5 w-3.5 transition-colors duration-200 ${
                      isDark ? 'text-white' : 'text-[#525252]'
                    }`}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-1 bottom-1 left-1 w-6 rounded-full shadow-xs transition-transform duration-200 ease-out bg-[#FF4B1F] ${
                    isDark ? 'translate-x-[28px]' : 'translate-x-0'
                  }`}
                />
              </button>

              <GsapMagnetic strength={0.18} className="hidden sm:inline-block shrink-0">
                <a
                  href="#contact"
                  className="inline-flex items-center gap-2.5 rounded-full bg-[#171717] dark:bg-white hover:bg-[#FF4B1F] dark:hover:bg-[#FF4B1F] text-white dark:text-[#111111] hover:text-white pl-2.5 pr-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap group/contact"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#111111] text-[#171717] dark:text-white group-hover/contact:bg-white group-hover/contact:text-[#FF4B1F] transition-colors">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  <span>Contact Me</span>
                </a>
              </GsapMagnetic>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle navigation menu"
                className="lg:hidden inline-flex items-center justify-center h-9 w-9 rounded-full border border-[#E5E2DC] dark:border-white/15 bg-[#FAF9F6] dark:bg-[#1F1F1F] text-[#171717] dark:text-white cursor-pointer"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="lg:hidden mx-auto max-w-7xl px-4 sm:px-6 mt-2"
            >
              <div className="rounded-3xl border border-[#E5E2DC] dark:border-white/15 bg-[#FFFFFF] dark:bg-[#121212] text-[#171717] dark:text-white px-5 py-5 space-y-3 shadow-2xl">
                <div className="grid grid-cols-2 gap-2.5 text-sm font-medium">
                  {[
                    { label: 'Home', href: '#home' },
                    { label: 'Work Showcase', href: '#work' },
                    { label: 'About Studio', href: '#about' },
                    { label: 'My Services', href: '#services' },
                    { label: 'Manifesto', href: '#manifesto' },
                    { label: 'Expertise', href: '#expertise' },
                    { label: 'Scope Estimator', href: '#estimator' },
                    { label: 'Specs Ledger', href: '#contact' },
                    { label: 'Track Ticket', href: '/track-ticket' },
                    { label: 'Admin Console', href: '/admin' },
                  ].map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl border border-[#E5E2DC] dark:border-white/10 bg-[#FAF9F6] dark:bg-[#1B1B1B] px-3.5 py-2.5 text-xs font-mono hover:border-[#FF4B1F] transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setCommandPaletteOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#E5E2DC] dark:border-white/15 bg-[#FAF9F6] dark:bg-[#1B1B1B] text-[#171717] dark:text-white px-4 py-3 text-xs font-mono cursor-pointer"
                  >
                    <Command className="h-3.5 w-3.5 text-[#FF4B1F]" />
                    <span>Quick Search</span>
                  </button>
                  <a
                    href="#contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-[#FF4B1F] text-white px-5 py-3 text-xs font-mono uppercase tracking-wider font-semibold"
                  >
                    <span>Start a Project</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1">
        {/* ==========================================================================
            2. HERO SECTION — Dramatic Vermilion-to-Obsidian Stage + Floating Nebula
           ========================================================================== */}
        <ParallaxSection
          id="home"
          ariaLabelledBy="hero-heading"
          offsetPx={18}
          className="relative overflow-hidden pt-2 pb-14 sm:pt-5 sm:pb-24"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-[28px] sm:rounded-[40px] border border-[#E5E2DC] dark:border-[#FF4B1F]/35 bg-gradient-to-br from-[#FFFFFF] via-[#FCF8F3] to-[#F3ECE3] dark:from-[#FF3B14] dark:via-[#C82808] dark:to-[#090909] text-[#171717] dark:text-white p-5 sm:p-10 lg:p-12 shadow-[0_24px_70px_-20px_rgba(23,23,23,0.1)] dark:shadow-[0_32px_90px_-20px_rgba(255,59,20,0.4)] transition-colors">
              {/* Preserved White + Purple Floating Particle Nebula Canvas */}
              <ParticleCloudCanvas isDark={isDark} variant="hero" testId="hero-particle-canvas" />

              {/* Atmospheric Radial Vignette */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_20%,rgba(255,75,31,0.11),transparent_55%),radial-gradient(circle_at_80%_78%,rgba(139,92,246,0.09),transparent_60%)] dark:bg-[radial-gradient(circle_at_30%_25%,rgba(255,140,80,0.32),transparent_55%),radial-gradient(circle_at_75%_75%,rgba(9,9,9,0.88),transparent_70%)]"
              />

              {/* Top Editorial Kicker Bar (Clean unboxed typography, no pill clutter) */}
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-7 border-b border-[#E5E2DC] dark:border-white/20">
                <div className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#FF4B1F] dark:bg-white shrink-0" />
                  <span className="text-[10.5px] sm:text-[11px] font-mono uppercase tracking-[0.16em] sm:tracking-[0.2em] reactbits-shiny-text font-semibold">
                    CROSX DEV STUDIO® · FOUNDED BY IRON CLAD
                  </span>
                </div>

                {/* Live Domain Quick-Links */}
                <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5 sm:gap-4 text-[11px] sm:text-xs font-mono text-[#525252] dark:text-white/90">
                  <a
                    href="https://crosx.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#FF4B1F] dark:hover:text-white underline-offset-4 hover:underline"
                  >
                    <Code2 className="h-3.5 w-3.5 text-[#FF4B1F] dark:text-white" />
                    <DecryptedMono text="crosx.in" />
                  </a>
                  <a
                    href="https://rca.crosx.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#FF4B1F] dark:hover:text-white underline-offset-4 hover:underline"
                  >
                    <Terminal className="h-3.5 w-3.5 text-[#FF4B1F] dark:text-white" />
                    <DecryptedMono text="rca.crosx.in" />
                  </a>
                  <a
                    href="https://sohanpipeline.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#FF4B1F] dark:hover:text-white underline-offset-4 hover:underline"
                  >
                    <Layers className="h-3.5 w-3.5 text-[#FF4B1F] dark:text-white" />
                    <DecryptedMono text="sohanpipeline.in" />
                  </a>
                </div>
              </div>

              {/* Hero 12-Column Split */}
              <div className="relative z-10 mt-5 sm:mt-8 lg:mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
                <div className="lg:col-span-6 space-y-4 sm:space-y-6">
                  <div className="space-y-2 sm:space-y-2.5">
                    <p className="text-[11px] sm:text-sm font-mono uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#FF4B1F] dark:text-white/90 font-semibold">
                      HI, I&apos;M IRON CLAD · SENIOR PROJECT DEVELOPER &amp; PRODUCT BUILDER
                    </p>
                    <h1
                      id="hero-heading"
                      className="text-[42px] sm:text-6xl lg:text-[74px] font-extrabold tracking-[-0.04em] font-display leading-[0.95] text-[#171717] dark:text-white"
                    >
                      <GsapSplitText
                        text="Crafting Digital Products."
                        blockFromWord="Products."
                        highlightWords={[]}
                      />
                    </h1>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-1 items-stretch">
                    <div className="sm:col-span-7 flex items-center">
                      <p className="text-base sm:text-lg font-medium text-[#404040] dark:text-white/95 leading-snug">
                        We create thoughtful full-stack web platforms, SaaS applications &amp; React Native + Expo mobile apps focused on real user and business needs.
                      </p>
                    </div>
                    <div className="sm:col-span-5 rounded-2xl bg-white/85 dark:bg-black/45 backdrop-blur-md border border-[#E5E2DC] dark:border-white/15 p-3.5 text-[11px] font-mono text-[#525252] dark:text-white/85 leading-relaxed flex flex-col justify-center">
                      <span className="text-[#FF4B1F] dark:text-[#FF7854] font-bold block mb-0.5">PRODUCTION STACK:</span>
                      <span>Next.js 15 · React 19 · TS · Vite · TanStack · NestJS · Neon DB · Expo</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3.5">
                    <GsapMagnetic strength={0.2}>
                      <a
                        href="#work"
                        className="inline-flex items-center gap-3 rounded-full bg-[#171717] dark:bg-white text-white dark:text-[#111111] hover:bg-[#FF4B1F] dark:hover:bg-[#FF4B1F] hover:text-white pl-6 pr-4 py-3.5 text-xs font-mono uppercase tracking-wider font-bold shadow-lg dark:shadow-xl transition-all"
                      >
                        <span>Explore Best Work</span>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-[#111111] text-[#171717] dark:text-white">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </span>
                      </a>
                    </GsapMagnetic>

                    <GsapMagnetic strength={0.2}>
                      <a
                        href="#estimator"
                        className="inline-flex items-center gap-3 rounded-full border border-[#D8D4CB] dark:border-white/35 bg-white/90 dark:bg-black/40 hover:bg-white dark:hover:bg-black/70 hover:border-[#FF4B1F] backdrop-blur-md text-[#171717] dark:text-white pl-6 pr-4 py-3.5 text-xs font-mono uppercase tracking-wider font-semibold transition-all"
                      >
                        <span>Estimate Scope</span>
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#171717]/8 dark:bg-white/15">
                          <ArrowUpRight className="h-3.5 w-3.5 text-[#FF4B1F] dark:text-white" />
                        </span>
                      </a>
                    </GsapMagnetic>
                  </div>
                </div>

                {/* Right 6 Columns: Layered Laptop + Zero-Collision 3D Phone Showcase */}
                <div data-testid="hero-device-showcase" className="lg:col-span-6 relative">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-[#525252] dark:text-white/85 font-semibold">
                      LIVE PRODUCT MOCKUP STAGE
                    </span>
                    <div
                      role="tablist"
                      aria-label="Select flagship project preview in hero"
                      className="flex flex-wrap items-center gap-1 rounded-full bg-[#FFFFFF]/90 dark:bg-black/55 backdrop-blur-md p-1 border border-[#E5E2DC] dark:border-white/15 shadow-2xs"
                    >
                      {projects.slice(0, 3).map((proj, idx) => {
                        const isSelected = idx === heroProjectIndex;
                        return (
                          <button
                            key={proj.id}
                            role="tab"
                            type="button"
                            aria-selected={isSelected}
                            onClick={() => setHeroProjectIndex(idx)}
                            className={`px-3 py-1 rounded-full text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap ${
                              isSelected
                                ? 'bg-[#FF4B1F] text-white font-semibold shadow-xs'
                                : 'text-[#525252] dark:text-white/75 hover:text-[#171717] dark:hover:text-white'
                            }`}
                          >
                            {proj.index} · {proj.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="relative sm:pb-6">
                    {/* Widescreen Laptop Frame */}
                    <div className="overflow-hidden rounded-2xl border-2 border-[#171717]/15 dark:border-white/20 bg-[#070707] shadow-[0_24px_60px_rgba(23,23,23,0.22)] dark:shadow-[0_28px_70px_rgba(0,0,0,0.85)]">
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#141414] px-4 py-2 text-[11px] font-mono text-[#A1A1A1]">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full bg-[#FF4B1F]" />
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                        </div>
                        <a
                          href={heroActiveProject.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-0.5 text-[10.5px] text-white hover:text-[#FF4B1F] transition-colors"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          <span>https://{heroActiveProject.displayUrl}</span>
                        </a>
                        <span className="text-[10px] text-[#FF4B1F] font-semibold">
                          {heroActiveProject.index} · LIVE
                        </span>
                      </div>

                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#050505]">
                        <Image
                          src={heroActiveProject.liveScreenshot}
                          alt={`${heroActiveProject.title} live production web interface`}
                          fill
                          priority
                          sizes="(max-width: 1024px) 100vw, 560px"
                          referrerPolicy="no-referrer"
                          className="object-cover object-top"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent" />
                        <div className="absolute bottom-3.5 left-4 right-4 sm:right-52 flex items-end justify-between gap-2">
                          <div className="max-w-full">
                            <span className="inline-block rounded-md bg-[#FF4B1F] px-2 py-0.5 text-[9.5px] font-mono font-bold uppercase text-white">
                              {heroActiveProject.displayUrl}
                            </span>
                            <h2 className="mt-1 text-sm sm:text-base lg:text-lg font-bold font-display text-white leading-snug line-clamp-2">
                              {heroActiveProject.title} — {heroActiveProject.subtitle}
                            </h2>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 3D Smartphone Frame Cleanly Docked at Bottom-Right */}
                    <div className="hidden sm:flex flex-col justify-between w-44 lg:w-46 sm:absolute sm:bottom-0 sm:right-3 z-20 rounded-[26px] border-[3px] border-[#333333] bg-[#080808] p-2.5 text-white shadow-[0_24px_60px_rgba(0,0,0,0.45)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.95)]">
                      <div className="flex items-center justify-between px-1.5 pt-0.5 pb-1.5 text-[9px] font-mono text-white/80">
                        <span>9:30</span>
                        <span className="h-2.5 w-11 rounded-full bg-black border border-white/15" />
                        <span className="inline-flex items-center gap-1">
                          <Wifi className="h-2.5 w-2.5" />
                          <BatteryCharging className="h-2.5 w-2.5 text-emerald-400" />
                        </span>
                      </div>

                      <div className="px-1 pb-1.5 flex items-center justify-between">
                        <div>
                          <span className="block text-[8px] text-white/60 leading-none">
                            Welcome
                          </span>
                          <span className="text-[10.5px] font-bold text-[#FF4B1F]">
                            IRON CLAD
                          </span>
                        </div>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                          <Search className="h-2.5 w-2.5 text-white" />
                        </span>
                      </div>

                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-white/10 bg-black">
                        <Image
                          src={heroActiveProject.studioVisual}
                          alt={`${heroActiveProject.title} mobile preview`}
                          fill
                          sizes="184px"
                          referrerPolicy="no-referrer"
                          className="object-cover"
                        />
                      </div>

                      <div className="mt-2 grid grid-cols-3 gap-1 text-center">
                        <div className="rounded-lg bg-[#161616] border border-white/10 py-1 px-1">
                          <span className="block text-[9px] font-bold text-white">99%</span>
                          <span className="block text-[7px] text-white/60">Uptime</span>
                        </div>
                        <div className="rounded-lg bg-[#161616] border border-white/10 py-1 px-1">
                          <span className="block text-[9px] font-bold text-white">60fps</span>
                          <span className="block text-[7px] text-white/60">Native</span>
                        </div>
                        <div className="rounded-lg bg-[#161616] border border-white/10 py-1 px-1">
                          <span className="block text-[9px] font-bold text-white">11ms</span>
                          <span className="block text-[7px] text-white/60">Neon DB</span>
                        </div>
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between px-1">
                        <span className="text-[8.5px] font-mono text-white/80 truncate">
                          {heroActiveProject.title}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedCaseStudy(heroActiveProject)}
                          className="rounded-full bg-[#FF4B1F] px-2 py-0.5 text-[8px] font-mono font-bold text-white cursor-pointer"
                        >
                          See All
                        </button>
                      </div>
                    </div>

                    {/* Mobile-Only Telemetry Strip */}
                    <div className="sm:hidden mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-[#E5E2DC] dark:border-white/15 bg-white/90 dark:bg-black/55 p-2.5 text-center">
                      <div className="rounded-xl bg-[#FAF9F6] dark:bg-white/5 py-1.5">
                        <span className="block text-xs font-bold text-[#171717] dark:text-white">99.9%</span>
                        <span className="block text-[9px] font-mono text-[#666666] dark:text-white/70">Uptime</span>
                      </div>
                      <div className="rounded-xl bg-[#FAF9F6] dark:bg-white/5 py-1.5">
                        <span className="block text-xs font-bold text-[#FF4B1F]">60fps</span>
                        <span className="block text-[9px] font-mono text-[#666666] dark:text-white/70">Expo Mobile</span>
                      </div>
                      <div className="rounded-xl bg-[#FAF9F6] dark:bg-white/5 py-1.5">
                        <span className="block text-xs font-bold text-emerald-700 dark:text-emerald-400">11ms</span>
                        <span className="block text-[9px] font-mono text-[#666666] dark:text-white/70">Neon DB</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ParallaxSection>

        {/* ==========================================================================
            3. FOUNDER SPOTLIGHT + ORANGE DOME + DARK GLASSMORPHIC "MY SERVICES"
           ========================================================================== */}
        <ParallaxSection
          id="about"
          ariaLabelledBy="about-heading"
          offsetPx={24}
          className="py-12 sm:py-20 bg-[#FAF9F6] dark:bg-[#090909] text-[#171717] dark:text-[#F8F8F8]"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
            {/* PART A: Center-Stage Founder Spotlight with Orange Half-Circle Dome */}
            <div className="relative overflow-hidden rounded-[36px] border border-[#E5E2DC] dark:border-[#242424] bg-[#FFFFFF] dark:bg-[#121212] pt-10 sm:pt-14 px-6 sm:px-12 shadow-[0_24px_70px_-20px_rgba(23,23,23,0.08)]">
              <div className="flex flex-col items-center text-center">
                <div className="relative inline-flex items-center gap-1.5 rounded-full border border-[#171717]/25 dark:border-white/20 bg-[#FAF9F6] dark:bg-[#1B1B1B] px-4 py-1 text-xs font-semibold text-[#171717] dark:text-white shadow-2xs">
                  <span>Hello!</span>
                  <span className="text-[#FF4B1F]">✦</span>
                </div>

                <h2
                  id="about-heading"
                  className="mt-4 text-4xl sm:text-6xl lg:text-[64px] font-extrabold tracking-tight font-display leading-[1.03] text-[#171717] dark:text-white max-w-3xl"
                >
                  I&apos;m <span className="text-[#FF4B1F]">IRON CLAD</span>,
                  <span className="block">Product Builder &amp; Architect</span>
                </h2>
              </div>

              <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-3 space-y-3 text-left lg:pb-12">
                  <span className="text-3xl font-serif-editorial text-[#FF4B1F] leading-none">
                    &ldquo;
                  </span>
                  <p className="text-xs sm:text-sm font-medium text-[#525252] dark:text-[#A1A1A1] leading-relaxed">
                    CROSX DEV STUDIO&apos;s principal full-stack &amp; mobile engineering ensures our platforms scale with speed and precision. Highly Recommended.
                  </p>
                  <p className="text-[11px] font-mono font-semibold text-[#171717] dark:text-white">
                    — Websites · SaaS · Expo Mobile
                  </p>
                </div>

                <div className="lg:col-span-6 relative flex flex-col items-center justify-end pt-4 min-h-[280px] sm:min-h-[320px]">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[310px] sm:w-[480px] lg:w-[500px] h-[205px] sm:h-[260px] rounded-t-full bg-gradient-to-t from-[#FF4B1F] via-[#FF5E36] to-[#FF8566] shadow-[0_-10px_50px_rgba(255,75,31,0.28)]"
                  />

                  <div className="relative z-10 w-[230px] sm:w-[290px] lg:w-[300px] mx-auto">
                    <div className="overflow-hidden rounded-t-[26px] border-4 border-b-0 border-[#171717] dark:border-white/25 bg-[#090909] shadow-2xl">
                      <div className="flex items-center justify-between bg-[#141414] px-3 py-1.5 text-[9.5px] font-mono text-white">
                        <span className="text-[#FF4B1F] font-bold">● IRON CLAD</span>
                        <span>3 Flagships</span>
                      </div>
                      <div className="relative aspect-[4/3] w-full bg-black">
                        <Image
                          src="/projects/crosx-studio.jpg"
                          alt="CROSX DEV STUDIO flagship product showcase"
                          fill
                          sizes="(max-width: 640px) 230px, 300px"
                          referrerPolicy="no-referrer"
                          className="object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  <GsapMagnetic strength={0.16} className="relative z-20 -mt-11 mb-5">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-white/50 bg-white/25 dark:bg-black/50 backdrop-blur-md sm:backdrop-blur-xl p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.32)]">
                      <a
                        href="#work"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white px-6 py-2.5 text-xs sm:text-sm font-semibold shadow-sm transition-transform hover:scale-[1.02]"
                      >
                        <span>Portfolio</span>
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                      <a
                        href="#contact"
                        className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/15 transition-colors"
                      >
                        Hire me
                      </a>
                    </div>
                  </GsapMagnetic>
                </div>

                <div className="lg:col-span-3 text-left lg:text-right lg:pb-12 space-y-1">
                  <div className="text-lg tracking-widest text-[#FF4B1F]" aria-label="5 out of 5 stars">
                    ★★★★★
                  </div>
                  <p className="text-3xl sm:text-4xl font-extrabold font-display text-[#171717] dark:text-white">
                    03+ Flagships
                  </p>
                  <p className="text-xs font-mono text-[#666666] dark:text-[#A1A1A1]">
                    Live in Production · 12+ Core Stack Technologies
                  </p>
                </div>
              </div>
            </div>

            {/* PART B: Editorial "My Services" Stage (Dual-Theme Parity) */}
            <div
              id="services"
              className="relative overflow-hidden rounded-[36px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#0E0E0E] text-[#171717] dark:text-white p-6 sm:p-10 lg:p-12 shadow-[0_24px_70px_-20px_rgba(23,23,23,0.08)] dark:shadow-[0_32px_80px_-20px_rgba(0,0,0,0.85)] transition-colors"
            >
              <ParticleCloudCanvas
                isDark={isDark}
                variant="cinematic"
                testId="services-particle-canvas"
              />

              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 left-12 h-72 w-72 rounded-full bg-[#FF4B1F]/10 dark:bg-[#FF4B1F]/25 blur-[95px]"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-10 right-16 h-64 w-64 rounded-full bg-[#FF4B1F]/10 dark:bg-[#FF4B1F]/20 blur-[90px]"
              />

              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[#E5E2DC] dark:border-white/15">
                <div>
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF4B1F] dark:text-[#FF6B45] font-semibold block mb-2">
                    03 — FULL-STACK ENGINEERING SERVICES
                  </span>
                  <h2
                    id="services-heading"
                    className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight text-[#171717] dark:text-white"
                  >
                    My <span className="text-[#FF4B1F]">Services</span>
                  </h2>
                </div>
                <p className="max-w-md text-xs sm:text-sm text-[#525252] dark:text-[#D4D4D4] leading-relaxed">
                  Delivering principal-grade Websites, full-stack SaaS Web Applications, NestJS/Node.js + Neon PostgreSQL backends, and React Native + Expo Mobile Apps at accessible prices.
                </p>
              </div>

              <div className="relative z-10 mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                {STUDIO_SERVICES.map((service, idx) => {
                  const previewImg = SERVICE_VISUALS[idx % SERVICE_VISUALS.length];
                  return (
                    <SpotlightCard
                      key={service.id}
                      spotlightColor="rgba(255, 75, 31, 0.2)"
                      className="group rounded-[28px] border border-[#E5E2DC] dark:border-white/20 hover:border-[#FF4B1F] bg-[#FAF9F6]/90 dark:bg-white/[0.06] backdrop-blur-md sm:backdrop-blur-xl shadow-[0_14px_34px_-16px_rgba(23,23,23,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    >
                      <div className="p-5 pb-4 border-b border-[#E5E2DC] dark:border-white/10 min-h-[138px] flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-mono text-[#FF4B1F] dark:text-[#FF6B45] font-semibold block mb-1">
                            {service.number} · {service.architectureFocus.split('·')[0]}
                          </span>
                          <h3 className="text-lg font-bold font-display text-[#171717] dark:text-white leading-snug">
                            {service.title}
                          </h3>
                        </div>
                        <p className="mt-1.5 text-xs text-[#525252] dark:text-[#D4D4D4] line-clamp-2 leading-relaxed">
                          {service.description}
                        </p>
                      </div>

                      <div className="px-4 pt-4 pb-4 relative">
                        <div className="mx-auto w-[86%] h-2.5 rounded-t-xl bg-[#E5E2DC]/65 dark:bg-white/15" />
                        <div className="mx-auto w-[93%] h-2.5 rounded-t-xl bg-[#D6D2C9]/70 dark:bg-white/25 -mt-1" />
                        <div className="relative aspect-[16/11] w-full overflow-hidden rounded-2xl border border-[#E5E2DC] dark:border-white/20 bg-[#070707] shadow-md dark:shadow-lg">
                          <Image
                            src={previewImg}
                            alt={service.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                            referrerPolicy="no-referrer"
                            className="object-cover object-top group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleScopeService(service.title)}
                          aria-label={`Scope ${service.title}`}
                          className="mt-3 w-full inline-flex items-center justify-between rounded-full bg-[#FFFFFF] dark:bg-[#181818] group-hover:bg-[#FF4B1F] border border-[#E5E2DC] dark:border-white/15 group-hover:border-[#FF4B1F] pl-4 pr-1.5 py-1.5 text-xs font-mono font-semibold text-[#171717] dark:text-white group-hover:text-white transition-colors cursor-pointer"
                        >
                          <span>Scope This Service</span>
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FF4B1F] group-hover:bg-white group-hover:text-[#111111] text-white transition-colors">
                            <ArrowUpRight className="h-4 w-4" />
                          </span>
                        </button>
                      </div>
                    </SpotlightCard>
                  );
                })}
              </div>
            </div>
          </div>
        </ParallaxSection>

        {/* ==========================================================================
            4. WORK SHOWCASE (#work) — Interactive Carousel + Clean Outcome Ledger
           ========================================================================== */}
        <ParallaxSection
          id="work"
          ariaLabelledBy="work-heading"
          offsetPx={28}
          className="py-20 sm:py-28 bg-[#FFFFFF] dark:bg-[#0B0B0B] text-[#171717] dark:text-[#F8F8F8] border-t border-[#E5E2DC] dark:border-[#222222]"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 border-t border-b border-[#E5E2DC] dark:border-[#242424]">
              <div className="lg:col-span-3 py-6 lg:py-10 lg:pr-6 lg:border-r border-[#E5E2DC] dark:border-[#242424] flex items-center">
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.18em] font-bold text-[#171717] dark:text-white">
                  <span className="h-2 w-2 rounded-full bg-[#FF3B14]" />
                  <span>WORK SHOWCASE</span>
                </div>
              </div>

              <div className="lg:col-span-9 py-6 lg:py-10 lg:pl-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                <div>
                  <h2
                    id="work-heading"
                    className="text-3xl sm:text-5xl lg:text-[54px] font-extrabold tracking-tight font-display leading-[1.03] text-[#171717] dark:text-white"
                  >
                    A Selection of Our
                    <span className="block">Best Work.</span>
                  </h2>
                </div>

                <div className="flex flex-col items-start sm:items-end gap-3">
                  <div
                    role="group"
                    aria-label="Filter projects by engineering category"
                    className="flex flex-wrap items-center gap-1.5 rounded-full border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#141414] p-1"
                  >
                    {[
                      'All',
                      'Enterprise Web Platform',
                      'Engineering Tooling & SaaS',
                      'Full-Stack Service & Commerce',
                    ].map((category) => {
                      const active = activeCategory === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => setActiveCategory(category)}
                          className={`px-3 py-1 text-[11px] font-mono rounded-full transition-all cursor-pointer ${
                            active
                              ? 'bg-[#FF3B14] text-white font-semibold'
                              : 'text-[#666666] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-white'
                          }`}
                        >
                          {category === 'All' ? `View All (${projects.length})` : category}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Centerpiece Interactive Three-Project Showcase Carousel */}
            <div className="mt-10">
              <ProjectShowcaseCarousel
                projects={projects}
                isDark={isDark}
                isModalOpen={Boolean(selectedCaseStudy)}
                onExploreCaseStudy={(proj) => setSelectedCaseStudy(proj)}
                onCommissionSimilar={handleSelectProjectForInquiry}
              />
            </div>

            {/* Architectural Proof & Outcome Matrix (Eliminates redundant duplicate mockups) */}
            <div className="mt-14 space-y-6">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#FF4B1F] font-semibold">
                    ARCHITECTURAL PROOF LEDGER · {filteredProjects.length} VERIFIED DEPLOYMENT
                    {filteredProjects.length === 1 ? '' : 'S'}
                  </p>
                  <h3 className="mt-1 text-2xl sm:text-3xl font-extrabold font-display tracking-tight">
                    Challenge, Decision &amp; Production Outcome.
                  </h3>
                </div>
                <span className="text-xs font-mono text-[#666666] dark:text-[#A1A1A1]">
                  Click any dossier for live topology &amp; specifications
                </span>
              </div>

              <div
                data-testid="architectural-proof-matrix"
                className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch"
              >
                {filteredProjects.map((project) => (
                  <SpotlightCard
                    key={project.id}
                    spotlightColor="rgba(255, 75, 31, 0.16)"
                    className="group rounded-[26px] border border-[#E5E2DC] dark:border-[#242424] hover:border-[#FF4B1F] bg-[#FAF9F6] dark:bg-[#121212] p-5 flex flex-col justify-between gap-5 transition-colors"
                  >
                    <div className="space-y-4">
                      {/* Header Meta + Thumbnail */}
                      <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-[#FF4B1F] font-bold">
                          {project.index} · {project.displayUrl}
                        </span>
                        <span className="text-[#666666] dark:text-[#A1A1A1] truncate">
                          {project.category}
                        </span>
                      </div>

                      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#090909]">
                        <Image
                          src={project.liveScreenshot}
                          alt={`${project.title} production interface`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 33vw"
                          referrerPolicy="no-referrer"
                          className="object-cover object-top group-hover:scale-[1.03] transition-transform duration-300"
                        />
                      </div>

                      <div>
                        <h4 className="text-xl font-extrabold font-display text-[#171717] dark:text-white leading-snug">
                          {project.title}
                        </h4>
                        <p className="text-xs font-serif-editorial italic text-[#FF4B1F] mt-0.5">
                          {project.subtitle}
                        </p>
                      </div>

                      {/* Challenge / Decision / Deliverables Structured Specs */}
                      <div className="space-y-2.5 text-xs border-t border-[#E5E2DC] dark:border-[#242424] pt-3">
                        <div>
                          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                            Architectural Decision
                          </span>
                          <p className="mt-0.5 text-[#171717] dark:text-[#E5E5E5] line-clamp-3 leading-relaxed">
                            {project.architectureOverview}
                          </p>
                        </div>
                        <div>
                          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                            Key Capability
                          </span>
                          <p className="mt-0.5 text-[#525252] dark:text-[#B3B3B3] line-clamp-2 leading-relaxed">
                            {project.engineeringHighlights[0]}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-3 border-t border-[#E5E2DC] dark:border-[#242424]">
                      <div className="flex flex-wrap gap-1.5">
                        {project.stack.map((techItem) => (
                          <span
                            key={techItem}
                            className="rounded-md border border-[#E5E2DC] dark:border-[#2A2A2A] bg-white dark:bg-[#171717] px-2 py-0.5 text-[10.5px] font-mono font-medium text-[#171717] dark:text-[#E5E5E5]"
                          >
                            {techItem}
                          </span>
                        ))}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCaseStudy(project)}
                          className="inline-flex items-center gap-2 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white pl-2 pr-4 py-1.5 text-xs font-mono font-bold transition-colors cursor-pointer"
                        >
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#111111]">
                            <Eye className="h-3 w-3" />
                          </span>
                          <span>Dossier</span>
                        </button>

                        <a
                          href={project.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#171717] dark:border-white/25 bg-white dark:bg-[#171717] text-[#171717] dark:text-white hover:border-[#FF4B1F] px-3.5 py-1.5 text-xs font-mono font-semibold transition-colors"
                        >
                          <span>Launch</span>
                          <ArrowUpRight className="h-3.5 w-3.5 text-[#FF4B1F]" />
                        </a>
                      </div>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </div>

            {/* ==========================================================================
                5. "CREATIVE SOLUTIONS THAT WORK." 2x2 MATRIX + SUPPORTING TERMINAL
               ========================================================================== */}
            <div
              id="manifesto"
              className="mt-24 pt-16 border-t border-[#E5E2DC] dark:border-[#242424] grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch"
            >
              <div className="lg:col-span-7 flex flex-col justify-between gap-8">
                <div>
                  <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF4B1F] font-semibold block mb-2">
                    04 — STUDIO MANIFESTO &amp; SOLUTIONS
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-extrabold font-display tracking-tight leading-[1.04] text-[#171717] dark:text-white">
                    Creative Solutions
                    <span className="block">That Work.</span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
                  {[
                    {
                      icon: Hexagon,
                      title: 'Full-Stack Web Engineering.',
                      desc: 'Building fast, responsive, and high-conversion websites & SaaS web apps with Next.js 15, React 19, Vite, and TanStack.',
                    },
                    {
                      icon: Compass,
                      title: 'Mobile App Development.',
                      desc: 'Native 60fps iOS & Android mobile applications crafted from a single TypeScript & React Native + Expo codebase.',
                    },
                    {
                      icon: Box,
                      title: 'Cloud, APIs & Neon DB.',
                      desc: 'Resilient NestJS & Node.js server architectures backed by Neon Serverless PostgreSQL and strict validation.',
                    },
                    {
                      icon: Sparkles,
                      title: 'UI/UX & Product Design.',
                      desc: 'Designing intuitive, cinematic, and editorial digital experiences focused on real user and business needs.',
                    },
                  ].map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <SpotlightCard
                        key={item.title}
                        spotlightColor="rgba(255, 75, 31, 0.16)"
                        className="p-6 rounded-2xl border border-[#E5E2DC] dark:border-[#242424] hover:border-[#FF4B1F] bg-[#FAF9F6] dark:bg-[#121212] transition-colors"
                      >
                        <div className="space-y-3.5">
                          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[#E5E2DC] dark:border-white/15 bg-white dark:bg-[#1B1B1B] text-[#FF4B1F] shadow-xs">
                            <IconComponent className="h-6 w-6" />
                          </span>
                          <h3 className="text-lg font-extrabold font-display text-[#171717] dark:text-white">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-[#666666] dark:text-[#A1A1A1] leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </SpotlightCard>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5 flex flex-col justify-between gap-5">
                <div className="rounded-[28px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#121212] p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FF4B1F] font-bold">
                      SUPPORTING RUNTIME SPEC
                    </span>
                    <span className="text-[11px] font-mono text-[#666666] dark:text-[#A1A1A1]">
                      CROSX DEV STUDIO®
                    </span>
                  </div>
                  <FloatingCodeTerminal compact={true} />
                </div>

                <div className="rounded-[28px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#121212] p-5 space-y-4 flex-1 flex flex-col justify-between">
                  <div
                    role="tablist"
                    aria-label="Technology Stack Layers"
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    {TECH_STACK_ARSENAL.map((layer) => {
                      const isSelected = layer.id === activeStackCategory.id;
                      return (
                        <button
                          key={layer.id}
                          role="tab"
                          type="button"
                          aria-selected={isSelected}
                          onClick={() => setActiveStackTabId(layer.id)}
                          className={`px-3 py-1.5 text-[11px] font-mono rounded-full transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#FF4B1F] text-white font-semibold'
                              : 'bg-white dark:bg-[#1B1B1B] text-[#666666] dark:text-[#A1A1A1]'
                          }`}
                        >
                          {layer.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {activeStackCategory.technologies.map((tech) => (
                      <div
                        key={tech.name}
                        className="rounded-xl border border-[#E5E2DC] dark:border-[#242424] bg-white dark:bg-[#181818] p-3"
                      >
                        <span className="text-[10px] font-mono text-[#FF4B1F] font-semibold block">
                          {tech.role}
                        </span>
                        <span className="text-xs font-bold font-display text-[#171717] dark:text-white">
                          {tech.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ParallaxSection>

        {/* ==========================================================================
            6. TECHNICAL EXPERTISE (#expertise) & ENGINEERING PROCESS (#process)
           ========================================================================== */}
        <ParallaxSection
          id="expertise"
          ariaLabelledBy="expertise-heading"
          offsetPx={24}
          className="py-20 sm:py-28 bg-[#F2EFE9] dark:bg-[#0E0E0E] text-[#171717] dark:text-[#F8F8F8] border-t border-[#E5E2DC] dark:border-[#242424]"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-20">
            <div>
              <div className="max-w-3xl mb-10">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] text-[#FF4B1F] font-semibold mb-3">
                  <Cpu className="h-3.5 w-3.5" />
                  <span>05 — Technical Expertise</span>
                </div>
                <h2
                  id="expertise-heading"
                  className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display leading-[1.04]"
                >
                  Seven Disciplines.{' '}
                  <span className="text-[#FF4B1F]">One Principal Standard.</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div
                  role="tablist"
                  aria-label="Studio Expertise Domains"
                  className="lg:col-span-5 flex flex-col justify-between gap-2"
                >
                  {EXPERTISE_DOMAINS.map((domain) => {
                    const isSelected = domain.id === activeExpertise.id;
                    return (
                      <button
                        key={domain.id}
                        role="tab"
                        type="button"
                        aria-selected={isSelected}
                        onClick={() => setActiveExpertiseId(domain.id)}
                        className={`w-full text-left rounded-2xl border px-5 py-3.5 transition-all flex items-center justify-between gap-4 cursor-pointer ${
                          isSelected
                            ? 'border-[#FF4B1F] bg-[#FF4B1F] text-white shadow-sm'
                            : 'border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] text-[#171717] dark:text-[#F8F8F8] hover:border-[#FF4B1F]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`text-xs font-mono font-semibold ${
                              isSelected ? 'text-white/90' : 'text-[#FF4B1F]'
                            }`}
                          >
                            {domain.number}.
                          </span>
                          <span className="text-sm sm:text-base font-bold font-display truncate">
                            {domain.title}
                          </span>
                        </div>
                        <ArrowRight
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? 'text-white' : 'text-[#666666] dark:text-[#A1A1A1]'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                <div
                  role="tabpanel"
                  data-testid="expertise-detail-panel"
                  className="lg:col-span-7 rounded-[28px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] p-6 sm:p-10 flex flex-col justify-between gap-8"
                >
                  <div className="space-y-6">
                    <div className="border-b border-[#E5E2DC] dark:border-[#262626] pb-5">
                      <div className="flex items-center gap-2 text-xs font-mono text-[#FF4B1F] font-semibold mb-2">
                        <span>Discipline {activeExpertise.number}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeExpertise.kicker}</span>
                      </div>
                      <h3 className="text-2xl sm:text-4xl font-bold font-display tracking-tight">
                        {activeExpertise.title}
                      </h3>
                      <p className="mt-3 text-sm sm:text-base text-[#666666] dark:text-[#A1A1A1] leading-relaxed">
                        {activeExpertise.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {activeExpertise.capabilities.map((cap, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0D0D0D] p-4"
                        >
                          <span className="text-xs font-mono text-[#FF4B1F] font-semibold block mb-1">
                            0{idx + 1}.
                          </span>
                          <p className="text-sm font-semibold text-[#171717] dark:text-[#F8F8F8]">
                            {cap}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#E5E2DC] dark:border-[#262626]">
                    <div>
                      <span className="text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1] block">
                        Stack Signature
                      </span>
                      <span className="text-xs font-mono font-semibold text-[#FF4B1F]">
                        {activeExpertise.stackSignature}
                      </span>
                    </div>

                    <a
                      href="#contact"
                      className="inline-flex items-center gap-2.5 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold"
                    >
                      <span>Discuss {activeExpertise.title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Stage Engineering Process */}
            <div id="process" className="pt-12 border-t border-[#E5E2DC] dark:border-[#262626]">
              <div className="max-w-3xl mb-8">
                <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#FF4B1F] font-semibold block mb-2">
                  06 — ENGINEERING LIFECYCLE
                </span>
                <h2
                  id="process-heading"
                  className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display"
                >
                  Discover → Plan → <span className="text-[#FF4B1F]">Design → Develop</span> → Launch.
                </h2>
              </div>

              <div
                role="tablist"
                aria-label="Engineering Process Stages"
                className="grid grid-cols-2 sm:grid-cols-5 gap-3"
              >
                {PROCESS_STAGES.map((stage, idx) => {
                  const isCurrent = idx === activeProcessIndex;
                  return (
                    <button
                      key={stage.step}
                      role="tab"
                      type="button"
                      aria-selected={isCurrent}
                      onClick={() => setActiveProcessIndex(idx)}
                      className={`last:col-span-2 sm:last:col-span-1 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-[#FF4B1F] bg-[#FF4B1F] text-white shadow-sm'
                          : 'border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] text-[#171717] dark:text-[#F8F8F8] hover:border-[#FF4B1F]'
                      }`}
                    >
                      <span
                        className={`text-xs font-mono font-semibold block ${
                          isCurrent ? 'text-white/90' : 'text-[#FF4B1F]'
                        }`}
                      >
                        Phase {stage.step}
                      </span>
                      <span className="mt-1 text-base font-bold font-display block">
                        {stage.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                role="tabpanel"
                data-testid="process-stage-panel"
                className="mt-5 rounded-[24px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#141414] p-6 sm:p-9"
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  <div className="lg:col-span-7 space-y-3">
                    <div className="text-xs font-mono text-[#FF4B1F] font-semibold">
                      Stage {activeProcess.step} of 05 · {activeProcess.name} Phase
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold font-display">
                      {activeProcess.headline}
                    </h3>
                    <p className="text-sm sm:text-base text-[#666666] dark:text-[#A1A1A1] leading-relaxed">
                      {activeProcess.description}
                    </p>
                    <p className="text-xs font-mono text-[#666666] dark:text-[#A1A1A1] pt-1">
                      Verification Gate:{' '}
                      <span className="text-[#171717] dark:text-[#F8F8F8] font-semibold">
                        {activeProcess.gateCheck}
                      </span>
                    </p>
                  </div>

                  <div className="lg:col-span-5 rounded-2xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0D0D0D] p-5 space-y-2.5">
                    <p className="text-xs font-mono uppercase tracking-wider text-[#FF4B1F] font-semibold">
                      Stage {activeProcess.step} Engineering Artifacts
                    </p>
                    <ul className="space-y-2">
                      {activeProcess.artifacts.map((artifact, aIdx) => (
                        <li
                          key={aIdx}
                          className="flex items-center gap-2 text-sm font-medium text-[#171717] dark:text-[#F8F8F8]"
                        >
                          <Check className="h-4 w-4 text-[#FF4B1F] shrink-0" />
                          <span>{artifact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ParallaxSection>

        {/* ==========================================================================
            7. INTERACTIVE SCOPE & SPRINT ESTIMATOR (#estimator)
           ========================================================================== */}
        <ScopeEstimator onApplyScope={handleApplyEstimatorScope} />

        {/* ==========================================================================
            8. PROJECT SPECIFICATIONS LEDGER & CLIENT TICKET TRACKING (#contact)
           ========================================================================== */}
        <ProjectInquirySection
          selectedScopeProp={preselectedScope}
          referenceProjectProp={referenceProject}
          estimatorSeed={estimatorSeed}
        />

        {/* ==========================================================================
            8.5 TRUSTED BY — Grayscale Partners & Featured Studio Stack
           ========================================================================== */}
        <TrustedByStrip />
      </main>

      {/* ==========================================================================
          9. ARCHITECTURAL COLOPHON & FOOTER — Dual-Theme Parity 3-Tier Luxury Footer
         ========================================================================== */}
      <footer
        data-testid="studio-footer"
        className="relative overflow-hidden bg-[#F7F7F9] dark:bg-[#090909] text-[#111111] dark:text-[#F8F8F8] pt-4 sm:pt-6 pb-0 transition-colors"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
          {/* TIER 1: Deep Black Rounded CTA Banner Card */}
          <div
            data-testid="footer-cta-card"
            className="relative overflow-hidden rounded-[26px] sm:rounded-[32px] bg-[#040405] text-white px-6 py-16 sm:px-14 sm:py-24 text-center border border-black/15 dark:border-[#242424] shadow-[0_28px_70px_-20px_rgba(0,0,0,0.45)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_18%_0%,rgba(255,255,255,0.22),transparent_65%),radial-gradient(ellipse_65%_55%_at_86%_100%,rgba(255,255,255,0.16),transparent_65%)]"
            />

            <div className="relative z-10 max-w-3xl mx-auto space-y-4">
              <h2 className="text-2xl sm:text-4xl lg:text-[42px] font-bold font-display tracking-[-0.025em] text-white leading-[1.12] text-balance">
                Ready to transform your digital product?
              </h2>
              <p className="text-xs sm:text-[14.5px] text-[#9CA3AF] max-w-md mx-auto leading-relaxed">
                Join forward-thinking founders and teams who are creating high-conversion websites, web apps, and mobile apps in record time.
              </p>

              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <GsapMagnetic strength={0.2}>
                  <a
                    href="#contact"
                    className="inline-flex items-center justify-center rounded-full bg-white hover:bg-[#FF4B1F] text-[#0A0A0A] hover:text-white px-6 py-2.5 text-xs sm:text-[13px] font-semibold shadow-[0_8px_25px_rgba(255,255,255,0.22)] transition-all duration-150"
                  >
                    Start a Project
                  </a>
                </GsapMagnetic>
              </div>
            </div>
          </div>

          {/* TIER 2: Elevated Floating Card (Adaptive Light Alabaster / Dark Obsidian Carbon) */}
          <div
            data-testid="footer-main-card"
            className="relative z-20 mt-6 sm:mt-8 rounded-[26px] sm:rounded-[32px] bg-[#FFFFFF] dark:bg-[#121212] text-[#111111] dark:text-[#F8F8F8] border border-[#ECECEF] dark:border-[#242424] px-6 py-10 sm:px-14 sm:py-14 shadow-[0_22px_65px_-12px_rgba(17,17,26,0.08)] dark:shadow-[0_24px_70px_-15px_rgba(0,0,0,0.85)]"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pb-10 border-b border-[#EFEFF2] dark:border-[#242424]">
              <div className="lg:col-span-5 space-y-4">
                <a
                  href="#home"
                  className="inline-flex items-center gap-2.5 text-lg font-extrabold tracking-tight font-display text-[#111111] dark:text-white group"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#111111] dark:bg-white text-white dark:text-[#111111] font-mono text-xs font-extrabold tracking-tighter group-hover:bg-[#FF4B1F] group-hover:text-white transition-colors duration-150">
                    {'//'}
                  </span>
                  <span>CROSX Studio</span>
                </a>

                <p className="text-xs sm:text-[13px] text-[#686870] dark:text-[#A1A1A1] max-w-sm leading-[1.65]">
                  CROSX DEV STUDIO® empowers founders and teams to transform raw ideas into clear, compelling digital products — making websites, web apps, and mobile apps easier to share, understand, and act on.
                </p>

                <div className="pt-1 flex items-center gap-4 text-[#111111] dark:text-[#D4D4D4]">
                  <a
                    href="https://crosx.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="CrosX Flagship Platform (crosx.in)"
                    className="hover:text-[#FF4B1F] transition-colors duration-150"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                  <a
                    href="https://rca.crosx.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="CrosX RCA Forensics Engine (rca.crosx.in)"
                    className="hover:text-[#FF4B1F] transition-colors duration-150"
                  >
                    <Terminal className="h-4 w-4" />
                  </a>
                  <a
                    href="https://sohanpipeline.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Sohan Pipelines Platform (sohanpipeline.in)"
                    className="hover:text-[#FF4B1F] transition-colors duration-150"
                  >
                    <Layers className="h-4 w-4" />
                  </a>
                  <a
                    href="#contact"
                    aria-label="Direct Commission & Specifications Inquiry"
                    className="hover:text-[#FF4B1F] transition-colors duration-150"
                  >
                    <Code2 className="h-4 w-4" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
                <div className="space-y-3">
                  <p className="text-xs sm:text-[13px] font-bold font-display text-[#111111] dark:text-white">
                    Product
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#686870] dark:text-[#A1A1A1]">
                    <li>
                      <a
                        href="https://crosx.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        CrosX Platform
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://rca.crosx.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        CrosX RCA Engine
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://sohanpipeline.in"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        Sohan Pipelines
                      </a>
                    </li>
                    <li>
                      <a
                        href="#work"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        Case Studies
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <p className="text-xs sm:text-[13px] font-bold font-display text-[#111111] dark:text-white">
                    Resources
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#686870] dark:text-[#A1A1A1]">
                    <li>
                      <a
                        href="#manifesto"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        Documentation
                      </a>
                    </li>
                    <li>
                      <a
                        href="#expertise"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        7 Disciplines
                      </a>
                    </li>
                    <li>
                      <a
                        href="#estimator"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        Scope Estimator
                      </a>
                    </li>
                    <li>
                      <a
                        href="/track-ticket"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        Support
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="col-span-2 sm:col-span-1 space-y-3">
                  <p className="text-xs sm:text-[13px] font-bold font-display text-[#111111] dark:text-white">
                    Company
                  </p>
                  <ul className="space-y-2.5 text-xs sm:text-[13px] text-[#686870] dark:text-[#A1A1A1]">
                    <li>
                      <a
                        href="#about"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        About
                      </a>
                    </li>
                    <li>
                      <a
                        href="#services"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        Services
                      </a>
                    </li>
                    <li>
                      <a
                        href="#contact"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        Contact
                      </a>
                    </li>
                    <li>
                      <a
                        href="/admin"
                        className="hover:text-[#111111] dark:hover:text-white transition-colors duration-150"
                      >
                        Admin Console
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-7 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#686870] dark:text-[#A1A1A1]">
              <p>© {new Date().getFullYear()} CROSX Studio · Founded by IRON CLAD. All rights reserved.</p>

              <div className="flex flex-wrap items-center gap-6">
                <a
                  href="#contact"
                  className="underline underline-offset-4 decoration-[#C4C4CA] dark:decoration-[#404040] hover:text-[#111111] dark:hover:text-white hover:decoration-[#111111] dark:hover:decoration-white transition-colors duration-150"
                >
                  Specifications Ledger
                </a>
                <a
                  href="/track-ticket"
                  className="underline underline-offset-4 decoration-[#C4C4CA] dark:decoration-[#404040] hover:text-[#111111] dark:hover:text-white hover:decoration-[#111111] dark:hover:decoration-white transition-colors duration-150"
                >
                  Track Support Ticket
                </a>
                <a
                  href="/admin"
                  className="underline underline-offset-4 decoration-[#C4C4CA] dark:decoration-[#404040] hover:text-[#111111] dark:hover:text-white hover:decoration-[#111111] dark:hover:decoration-white transition-colors duration-150"
                >
                  Admin Console
                </a>
              </div>
            </div>
          </div>

          {/* TIER 3: Monumental Sculpted 3D-Shaded Brand Wordmark (Light & Dark Parity) */}
          <div
            aria-hidden="true"
            className="relative z-10 -mt-3 sm:-mt-5 pt-2 overflow-hidden select-none pointer-events-none text-center"
          >
            <div className="text-[20vw] sm:text-[185px] lg:text-[238px] font-extrabold font-display tracking-[-0.055em] leading-[0.76] bg-gradient-to-b from-[#DCDCE2] via-[#EAECEF]/85 to-[#F7F7F9] dark:from-[#2C2C32] dark:via-[#18181B]/90 dark:to-[#090909] bg-clip-text text-transparent drop-shadow-[0_-2px_12px_rgba(0,0,0,0.04)] dark:drop-shadow-[0_-2px_16px_rgba(0,0,0,0.65)] translate-y-2 sm:translate-y-4">
              CROSX
            </div>
          </div>
        </div>
      </footer>

      {/* Lazy-Loaded Interactive Case Study Dossier Modal */}
      {selectedCaseStudy && (
        <ProjectCaseStudyModal
          project={selectedCaseStudy}
          projects={projects}
          onClose={() => setSelectedCaseStudy(null)}
          onSelectProject={(proj) => setSelectedCaseStudy(proj)}
          onSelectForInquiry={handleSelectProjectForInquiry}
        />
      )}

      {/* Executive Command Palette (Cmd+K / Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onOpen={() => setCommandPaletteOpen(true)}
        projects={projects}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onOpenCaseStudy={(proj) => setSelectedCaseStudy(proj)}
      />
    </div>
  );
}
