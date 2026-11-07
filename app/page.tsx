'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  SELECTED_PROJECTS,
  TECH_STACK_ARSENAL,
  BUILDABLE_CATEGORIES,
  EXPERTISE_DOMAINS,
  STUDIO_SERVICES,
  PROCESS_STAGES,
  type ProjectCaseStudy,
} from '@/lib/studio-data';
import { useStudioTheme } from '@/lib/use-studio-theme';
import { ScrollProgressBar } from '@/components/ScrollProgressBar';
import { ParticleCloudCanvas } from '@/components/ParticleCloudCanvas';
import { FloatingCodeTerminal } from '@/components/FloatingCodeTerminal';
import { TiltProjectCard } from '@/components/TiltProjectCard';
import { ParallaxSection } from '@/components/ParallaxSection';
import { ProjectCaseStudyModal } from '@/components/ProjectCaseStudyModal';
import { ProjectInquirySection } from '@/components/ProjectInquirySection';
import {
  ArrowUpRight,
  ArrowRight,
  ArrowDown,
  Sun,
  Moon,
  Menu,
  X,
  Eye,
  Check,
  Smartphone,
  Globe,
  Server,
  Code2,
  Layers,
  Terminal,
  Mail,
} from 'lucide-react';

export default function CrosxDevStudioPage() {
  const { isDark, toggleTheme } = useStudioTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectCaseStudy[]>(SELECTED_PROJECTS);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [selectedCaseStudy, setSelectedCaseStudy] = useState<ProjectCaseStudy | null>(null);
  const [activeStackTabId, setActiveStackTabId] = useState<string>(TECH_STACK_ARSENAL[0].id);
  const [activeExpertiseId, setActiveExpertiseId] = useState<string>(EXPERTISE_DOMAINS[0].id);
  const [activeProcessIndex, setActiveProcessIndex] = useState<number>(0);
  const [preselectedScope, setPreselectedScope] = useState<string | undefined>(undefined);
  const [referenceProject, setReferenceProject] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetch('/api/projects', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data || !Array.isArray(data.projects)) return;
        setProjects(data.projects as ProjectCaseStudy[]);
      })
      .catch(() => {
        // Keep initial SELECTED_PROJECTS fallback
      });
    return () => {
      active = false;
    };
  }, []);

  const structuredDataJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': ['ProfessionalService', 'Organization'],
          '@id': 'https://crosx.in/#organization',
          name: 'CROSX DEV STUDIO®',
          alternateName: 'CrosX Dev Studio',
          url: 'https://crosx.in',
          description:
            'Flagship full-stack web, mobile & cloud engineering agency founded by IRON CLAD. Architecting high-velocity Next.js 15, React Native + Expo, NestJS, and Neon Serverless PostgreSQL platforms.',
          founder: {
            '@type': 'Person',
            name: 'IRON CLAD',
            jobTitle: 'Founder & Principal Systems Architect',
          },
          knowsAbout: [
            'Next.js 15 App Router',
            'React 19 & TypeScript',
            'React Native & Expo SDK 52',
            'NestJS & Node.js Microservices',
            'Neon Serverless PostgreSQL & Drizzle ORM',
            'Enterprise SaaS Architecture',
          ],
          sameAs: ['https://crosx.in', 'https://rca.crosx.in', 'https://sohanpipeline.in'],
        },
        {
          '@type': 'WebSite',
          '@id': 'https://crosx.in/#website',
          url: 'https://crosx.in',
          name: 'CROSX DEV STUDIO® — Full-Stack Web, Mobile & Cloud Engineering',
          publisher: { '@id': 'https://crosx.in/#organization' },
          inLanguage: 'en-US',
        },
        {
          '@type': 'ItemList',
          '@id': 'https://crosx.in/#portfolio',
          name: 'CROSX DEV STUDIO® Flagship Production Systems',
          itemListElement: projects.map((proj, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'CreativeWork',
              name: proj.title,
              url: proj.url,
              description: proj.summary,
              keywords: proj.stack.join(', '),
            },
          })),
        },
      ],
    }),
    [projects]
  );

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
      'Custom Websites & High-Speed Web Apps': 'Website Development (Next.js / Vite / Tailwind)',
      'Cross-Platform Mobile Apps (React Native + Expo)': 'Mobile App (React Native + Expo)',
      'Full-Stack SaaS & Enterprise Platforms': 'SaaS Platform (Next.js / NestJS / Neon DB & PostgreSQL)',
      'Backend Systems, Dashboards & Automation': 'Backend & API Engineering (NestJS / Node.js / Neon DB & PostgreSQL)',
    };
    setPreselectedScope(scopeMap[serviceTitle] || 'Full-Stack Web App (React / TanStack / Next.js)');
    const contactEl = document.getElementById('contact');
    contactEl?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSelectProjectForInquiry = useCallback((projectTitle: string) => {
    setReferenceProject(projectTitle);
    const contactEl = document.getElementById('contact');
    contactEl?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F3EE] dark:bg-[#05060B] text-[#111110] dark:text-[#F4F1EA] overflow-x-hidden">
      {/* Public Website Schema.org JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredDataJsonLd) }}
      />

      {/* Top Horizontal Scroll Progress Indicator */}
      <ScrollProgressBar />

      {/* 1. NAVBAR — Precision Top Bar with Instant Theme Switch */}
      <header className="sticky top-0 z-40 border-b border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE]/95 dark:bg-[#05060B]/95 backdrop-blur-md text-[#111110] dark:text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6 lg:px-8">
          {/* Zone 1: Circular Emblem Badge + Studio & Founder Identity */}
          <a
            href="#home"
            className="flex items-center gap-2.5 sm:gap-3 whitespace-nowrap shrink-0 group"
          >
            <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full border border-[#2544E8]/40 dark:border-indigo-400/40 bg-[#2544E8]/10 dark:bg-indigo-500/15 text-xs font-mono font-bold text-[#2544E8] dark:text-indigo-300">
              IC
            </span>
            <div className="leading-tight">
              <span className="block text-sm sm:text-base font-extrabold tracking-tight font-display text-[#111110] dark:text-white">
                CROSX DEV STUDIO<span className="text-[#2544E8] dark:text-indigo-400">®</span>
              </span>
              <span className="block text-[10px] font-mono text-[#5C5952] dark:text-[#949CB0]">
                IRON CLAD · Senior Project Developer
              </span>
            </div>
          </a>

          {/* Zone 2: Minimalist Navigation Links */}
          <nav
            aria-label="Primary Navigation"
            className="hidden md:flex items-center gap-6 text-xs font-medium text-[#4A4843] dark:text-[#C4C9D6]"
          >
            <a
              href="#home"
              className="hover:text-[#2544E8] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Home
            </a>
            <a
              href="#about"
              className="hover:text-[#2544E8] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              About
            </a>
            <a
              href="#work"
              className="hover:text-[#2544E8] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Projects
            </a>
            <a
              href="#expertise"
              className="hover:text-[#2544E8] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Skills
            </a>
            <a
              href="#services"
              className="hover:text-[#2544E8] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Services
            </a>
            <a
              href="#process"
              className="hover:text-[#2544E8] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Process
            </a>
            <a
              href="#contact"
              className="hover:text-[#2544E8] dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              Contact
            </a>
            <a
              href="/track-ticket"
              className="hover:text-[#2544E8] dark:hover:text-white transition-colors whitespace-nowrap shrink-0 font-mono text-[11px]"
            >
              Track Ticket
            </a>
          </nav>

          {/* Zone 3: Instant Slideable Dark/Light Switch & Action Pill */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              onClick={toggleTheme}
              data-testid="theme-slide-toggle"
              className="relative inline-flex h-8 sm:h-9 w-[68px] sm:w-[74px] items-center rounded-full border border-[#C8C2B5] dark:border-[#252C40] bg-[#E8E4DA] dark:bg-[#101424] p-1 focus-visible:outline-2 focus-visible:outline-[#2544E8] shrink-0 cursor-pointer"
            >
              <span className="flex w-full items-center justify-between px-1.5 text-[#6E6A61] dark:text-[#8E93A6]">
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
              </span>
              <span
                className={`absolute top-1 bottom-1 w-6 sm:w-7 rounded-full flex items-center justify-center transition-transform duration-150 ease-out will-change-transform ${
                  isDark
                    ? 'translate-x-[34px] sm:translate-x-[37px] bg-[#2544E8] text-white'
                    : 'translate-x-0 bg-[#111110] text-white'
                }`}
              >
                {isDark ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
              </span>
            </button>

            <a
              href="#contact"
              className="cta-tactile-primary group/navcta hidden sm:inline-flex items-center gap-2 rounded-full border border-[#111110] dark:border-white/15 bg-[#111110] text-white dark:bg-[#2544E8] dark:text-white pl-4.5 pr-3 py-1.5 text-xs font-semibold hover:bg-[#2544E8] hover:border-[#2544E8] dark:hover:bg-[#3B5BFF] whitespace-nowrap shrink-0"
            >
              <span>Let&apos;s Talk</span>
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 dark:bg-white/20 transition-transform duration-300 group-hover/navcta:translate-x-0.5 group-hover/navcta:-translate-y-0.5">
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-full border border-[#C8C2B5] dark:border-[#252C40] bg-[#FDFCF9] dark:bg-[#101424] text-[#111110] dark:text-[#F4F1EA] shrink-0 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile navigation drawer */}
        {mobileMenuOpen && (
          <nav
            aria-label="Mobile Navigation"
            className="md:hidden border-t border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#080B14] px-5 py-4 space-y-3"
          >
            <div className="flex flex-col space-y-2 text-sm font-medium text-[#111110] dark:text-[#F4F1EA]">
              <a href="#home" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Home
              </a>
              <a href="#about" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                About
              </a>
              <a href="#work" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Projects
              </a>
              <a href="#expertise" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Skills
              </a>
              <a href="#services" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Services
              </a>
              <a href="#process" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Process
              </a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="py-1.5">
                Contact
              </a>
              <a href="/track-ticket" onClick={() => setMobileMenuOpen(false)} className="py-1.5 font-mono text-xs text-[#2544E8] dark:text-[#6E88FF]">
                Track Support Ticket
              </a>
            </div>
            <div className="pt-2 border-t border-[#D5D0C5] dark:border-[#1E2231]">
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="cta-tactile-primary inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#111110] text-white dark:bg-[#2544E8] px-5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold"
              >
                <span>Let&apos;s Talk</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">
        {/* 2. COMBINED HERO SECTION — Clean Atmospheric Lighting, Organic Particles & Crisp Code Terminal */}
        <ParallaxSection
          id="home"
          ariaLabelledBy="hero-heading"
          offsetPx={18}
          className="relative overflow-hidden bg-gradient-to-b from-[#ECEEFE] via-[#F5F4F0] to-[#F5F3EE] dark:from-[#04050A] dark:via-[#060913] dark:to-[#080B14] text-[#111110] dark:text-white pt-10 pb-16 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-24 border-b border-[#D5D0C5] dark:border-[#1E2231]"
        >
          {/* Reengineered Organic Floating Particle Canvas */}
          <ParticleCloudCanvas isDark={isDark} />

          <div className="relative mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            {/* UPPER STAGE: Left Identity + Right Code Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              {/* Left Column (6 cols): Developer Portfolio Typography & Pill Actions */}
              <div className="lg:col-span-6 space-y-6 z-10">
                {/* Status Pill */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-[#C8C2B5] dark:border-white/12 bg-[#FDFCF9] dark:bg-[#0D1220] px-3.5 py-1.5 text-xs font-medium text-[#2E2D2A] dark:text-[#D5DBE8]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">
                    Available for new projects · Best-in-Class at Affordable Prices
                  </span>
                </div>

                {/* Combined Display Headline */}
                <div className="space-y-2">
                  <p className="text-[11px] sm:text-xs font-mono uppercase tracking-[0.18em] text-[#2544E8] dark:text-[#7C93FF] font-semibold">
                    CROSX DEV STUDIO® · HYBRID PERSONAL BRAND &amp; PRODUCT STUDIO
                  </p>
                  <h1
                    id="hero-heading"
                    className="text-3xl sm:text-5xl lg:text-[46px] xl:text-[50px] font-extrabold tracking-tight font-display leading-[1.08] text-[#111110] dark:text-white"
                  >
                    <span className="block sm:whitespace-nowrap">
                      Hi, I&apos;m{' '}
                      <span className="text-[#2544E8] dark:text-[#7C8CFF]">
                        IRON CLAD
                      </span>
                    </span>
                    <span className="block text-xl sm:text-3xl lg:text-[31px] mt-2 font-bold text-[#22211E] dark:text-[#E5E9F2]">
                      Senior Project Developer &amp;{' '}
                      <span className="font-serif-editorial italic font-normal text-[#2544E8] dark:text-indigo-300">
                        Product Builder.
                      </span>
                    </span>
                  </h1>
                </div>

                {/* Flush-Left Editorial Mission Statement */}
                <div className="border-y border-[#D5D0C5]/85 dark:border-[#1E2231] py-4 space-y-2.5 max-w-xl">
                  <p className="text-sm sm:text-base text-[#4A4843] dark:text-[#B8C0D4] leading-relaxed">
                    Building{' '}
                    <strong className="text-[#111110] dark:text-white font-semibold">
                      scalable full-stack systems
                    </strong>
                    , high-conversion{' '}
                    <strong className="text-[#111110] dark:text-white font-semibold">
                      websites &amp; web apps
                    </strong>
                    , and{' '}
                    <strong className="text-[#111110] dark:text-white font-semibold">
                      React Native + Expo mobile apps
                    </strong>{' '}
                    that move real-world businesses forward.
                  </p>
                  <p className="text-xs font-mono text-[#5C5952] dark:text-[#8E96AA] leading-relaxed">
                    JS · TS · Vite · TanStack · React · Next.js · NestJS · Node.js · Tailwind CSS · Neon DB · PostgreSQL · React Native + Expo
                  </p>
                </div>

                {/* Pill CTA Buttons with Hand-Crafted Tactile Rounded-Edge Choreography */}
                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  <a
                    href="#contact"
                    className="cta-tactile-primary group/cta inline-flex items-center gap-3 rounded-full bg-[#111110] text-white dark:bg-white dark:text-[#080B14] pl-6 pr-3.5 py-2.5 text-xs sm:text-sm font-semibold hover:bg-[#2544E8] dark:hover:bg-[#2544E8] dark:hover:text-white whitespace-nowrap shrink-0"
                  >
                    <span>Book a Free Call</span>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/15 dark:bg-[#080B14]/12 group-hover/cta:bg-white/20 dark:group-hover/cta:bg-white/20 transition-all duration-300 group-hover/cta:translate-x-0.5 group-hover/cta:scale-105">
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/cta:translate-x-0.5" />
                    </span>
                  </a>

                  <a
                    href="#work"
                    className="cta-tactile-secondary group/cta2 inline-flex items-center gap-3 rounded-full border border-[#C8C2B5] dark:border-[#28314A] bg-[#FDFCF9] dark:bg-[#0D1220] pl-6 pr-3.5 py-2.5 text-xs sm:text-sm font-semibold text-[#111110] dark:text-[#E5E9F2] hover:border-[#2544E8] dark:hover:border-[#6E88FF] whitespace-nowrap shrink-0"
                  >
                    <span>View Projects</span>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D5D0C5] dark:border-[#252C40] bg-[#F5F3EE] dark:bg-[#141C30] group-hover/cta2:border-[#2544E8]/40 dark:group-hover/cta2:border-[#6E88FF]/40 group-hover/cta2:bg-[#2544E8]/10 dark:group-hover/cta2:bg-[#2544E8]/25 transition-all duration-300 group-hover/cta2:translate-x-0.5">
                      <ArrowRight className="h-3.5 w-3.5 text-[#2544E8] dark:text-[#7C93FF] transition-transform duration-300 group-hover/cta2:translate-x-0.5" />
                    </span>
                  </a>
                </div>

                {/* Quick Icon & Live Domain Bar */}
                <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-[#5C5952] dark:text-[#8E96AA]">
                  <a
                    href="#work"
                    aria-label="Inspect code architecture"
                    className="inline-flex items-center gap-1.5 hover:text-[#2544E8] dark:hover:text-white transition-colors"
                  >
                    <Code2 className="h-4 w-4 text-[#2544E8] dark:text-indigo-400" />
                    <span>crosx.in</span>
                  </a>
                  <a
                    href="#work"
                    aria-label="Inspect RCA forensics system"
                    className="inline-flex items-center gap-1.5 hover:text-[#2544E8] dark:hover:text-white transition-colors"
                  >
                    <Terminal className="h-4 w-4 text-[#2544E8] dark:text-indigo-400" />
                    <span>rca.crosx.in</span>
                  </a>
                  <a
                    href="#work"
                    aria-label="Inspect Sohan Pipelines system"
                    className="inline-flex items-center gap-1.5 hover:text-[#2544E8] dark:hover:text-white transition-colors"
                  >
                    <Layers className="h-4 w-4 text-[#2544E8] dark:text-indigo-400" />
                    <span>sohanpipeline.in</span>
                  </a>
                  <a
                    href="#contact"
                    aria-label="Direct inquiry"
                    className="inline-flex items-center gap-1.5 hover:text-[#2544E8] dark:hover:text-white transition-colors"
                  >
                    <Mail className="h-4 w-4 text-[#2544E8] dark:text-indigo-400" />
                    <span>Direct Quote</span>
                  </a>
                </div>
              </div>

              {/* Center Spacer Column (1 col on desktop) */}
              <div className="hidden lg:block lg:col-span-1 pointer-events-none" aria-hidden="true" />

              {/* Right Column (5 cols): Crisp Code Specification Terminal (Zero Blur Bleeding) */}
              <div className="lg:col-span-5 z-10 min-w-0">
                <FloatingCodeTerminal />
              </div>
            </div>

            {/* LOWER HORIZON STAGE: Editorial Horizon Strip + Manifesto */}
            <div className="mt-14 pt-8 border-t border-[#D5D0C5] dark:border-[#1E2231]">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <a
                  href="#work"
                  className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#4A4843] dark:text-[#A3A8B8] hover:text-[#2544E8] dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
                >
                  SEE OUR PORTFOLIO ({String(projects.length).padStart(2, '0')})
                </a>

                {/* Center 3-Frame Miniature Cinema Strip */}
                <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 max-w-md w-full">
                  {projects.slice(0, 3).map((proj) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => setSelectedCaseStudy(proj)}
                      aria-label={`Preview ${proj.title} case study`}
                      className="group relative aspect-[16/10] overflow-hidden rounded-md border border-[#C8C2B5] dark:border-[#252C40] bg-[#0A0D16] hover:border-[#2544E8] transition-colors cursor-pointer"
                    >
                      <img
                        src={proj.studioVisual}
                        alt={proj.title}
                        width={240}
                        height={150}
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-2 py-1 text-left">
                        <span className="block text-[10px] font-mono font-semibold text-white truncate">
                          {proj.title}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right Horizon Label & Circular Down Button */}
                <a
                  href="#work"
                  className="inline-flex items-center gap-2.5 text-[11px] font-mono uppercase tracking-[0.22em] text-[#4A4843] dark:text-[#A3A8B8] hover:text-[#2544E8] dark:hover:text-indigo-400 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>SCROLL NOW</span>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#C8C2B5] dark:border-[#252C40]">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </span>
                </a>
              </div>

              {/* Editorial Manifesto & 3-Row Interactive Capability Strip */}
              <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center rounded-xl border border-[#D5D0C5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0F1A] p-6 sm:p-10 shadow-sm">
                <div className="lg:col-span-6 space-y-4">
                  <p className="text-xs font-mono uppercase tracking-widest text-[#2544E8] dark:text-[#7C93FF]">
                    STUDIO MANIFESTO · FOUNDED BY IRON CLAD
                  </p>
                  <h2 className="text-2xl sm:text-3xl lg:text-[32px] font-bold tracking-tight font-display leading-[1.15] text-[#111110] dark:text-white">
                    At CROSX DEV STUDIO® — we believe engineering is not just about appearance, but about creating{' '}
                    <span className="font-serif-editorial italic font-normal text-[#2544E8] dark:text-indigo-300">
                      immersive &amp; meaningful
                    </span>{' '}
                    digital products.
                  </h2>
                  <p className="text-sm text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed max-w-lg">
                    We combine senior full-stack architecture with intentional art direction to deliver best-in-class Websites, Web Apps, and Mobile Apps that exceed expectations at affordable prices.
                  </p>
                  <div className="pt-1">
                    <a
                      href="#about"
                      className="cta-tactile-secondary group/craft inline-flex items-center gap-2.5 rounded-full border border-[#C8C2B5] dark:border-[#252C40] bg-[#F5F3EE] dark:bg-[#111626] pl-5 pr-3 py-2 text-xs font-mono uppercase tracking-wider font-semibold text-[#111110] dark:text-white hover:border-[#2544E8] dark:hover:border-[#6E88FF] hover:bg-[#2544E8] hover:text-white dark:hover:bg-[#2544E8] whitespace-nowrap shrink-0"
                    >
                      <span>LEARN MORE ABOUT OUR CRAFT</span>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 group-hover/craft:bg-white/20 transition-transform duration-300 group-hover/craft:translate-x-0.5">
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </a>
                  </div>
                </div>

                {/* Right 3-Row Visual Service Breakdown */}
                <div className="lg:col-span-6 divide-y divide-[#E2DDD2] dark:divide-[#1E2231] border-t border-b border-[#E2DDD2] dark:border-[#1E2231]">
                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[#2544E8] dark:text-[#7C93FF]">
                        01 / Cross-Platform Mobile
                      </p>
                      <h3 className="text-base font-bold font-display text-[#111110] dark:text-white">
                        Mobile App Design &amp; Dev
                      </h3>
                    </div>
                    <div className="h-12 w-20 rounded-sm overflow-hidden border border-[#D5D0C5] dark:border-[#252C40] shrink-0 hidden sm:block">
                      <img
                        src="/projects/crosx-studio.jpg"
                        alt="Mobile app development preview"
                        width={80}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-[#5C5952] dark:text-[#949CB0] max-w-[190px] text-right">
                      Native iOS &amp; Android apps built with React Native + Expo.
                    </p>
                  </div>

                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[#2544E8] dark:text-[#7C93FF]">
                        02 / Websites &amp; Web Apps
                      </p>
                      <h3 className="text-base font-bold font-display text-[#111110] dark:text-white">
                        Website &amp; SaaS Engineering
                      </h3>
                    </div>
                    <div className="h-12 w-20 rounded-sm overflow-hidden border border-[#D5D0C5] dark:border-[#252C40] shrink-0 hidden sm:block">
                      <img
                        src="/projects/rca-studio.jpg"
                        alt="Website and web app preview"
                        width={80}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-[#5C5952] dark:text-[#949CB0] max-w-[190px] text-right">
                      JavaScript, TypeScript, Vite, TanStack, React, Next.js &amp; Tailwind.
                    </p>
                  </div>

                  <div className="py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-[#2544E8] dark:text-[#7C93FF]">
                        03 / Full-Stack &amp; APIs
                      </p>
                      <h3 className="text-base font-bold font-display text-[#111110] dark:text-white">
                        Backend &amp; Neon DB Systems
                      </h3>
                    </div>
                    <div className="h-12 w-20 rounded-sm overflow-hidden border border-[#D5D0C5] dark:border-[#252C40] shrink-0 hidden sm:block">
                      <img
                        src="/projects/sohan-studio.jpg"
                        alt="Backend engineering preview"
                        width={80}
                        height={48}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-[#5C5952] dark:text-[#949CB0] max-w-[190px] text-right">
                      Scalable NestJS, Node.js, Neon DB &amp; PostgreSQL production backends.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </ParallaxSection>

        {/* 3. SELECTED WORK — Editorial Asymmetric Exhibition & Real Project Screenshots */}
        <ParallaxSection
          id="work"
          ariaLabelledBy="work-heading"
          offsetPx={30}
          className="py-20 sm:py-28 bg-[#ECE8DF] dark:bg-[#080A12] text-[#111110] dark:text-[#F4F1EA]"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-[#CFC9BC] dark:border-[#1E2231]">
              <div className="max-w-2xl">
                <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#D94E28] mb-3">
                  01 — Selected Production Works
                </p>
                <h2
                  id="work-heading"
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-display leading-[1.06] [text-wrap:balance]"
                >
                  Engineered Systems{' '}
                  <span className="font-serif-editorial italic font-normal text-[#2544E8] dark:text-[#6E88FF]">
                    Live in Production.
                  </span>
                </h2>
                <p className="mt-4 text-sm sm:text-base text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                  Every platform below is designed, architected, and shipped by CROSX DEV STUDIO. Inspect the live production interfaces or launch the deployed domains directly.
                </p>
              </div>

              {/* Interactive filter buttons */}
              <div
                role="group"
                aria-label="Filter projects by engineering category"
                className="flex flex-wrap items-center gap-1.5 rounded-full border border-[#C8C2B5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#0D101B] p-1.5 self-start lg:self-auto"
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
                      className={`px-3.5 py-1.5 text-xs font-mono rounded-full transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white font-medium shadow-sm'
                          : 'text-[#5C5952] dark:text-[#949CB0] hover:text-[#111110] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      {category === 'All' ? `All Systems (${projects.length})` : category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Asymmetric Editorial Project Showcases with Tactile Motion Tilt */}
            <div className="mt-14 space-y-16 sm:space-y-20">
              {filteredProjects.map((project, idx) => {
                const isReversed = idx % 2 === 1;
                return (
                  <TiltProjectCard key={project.id} projectId={project.id}>
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                      {/* Asymmetric Collage Visual Column (7 cols) */}
                      <div
                        className={`lg:col-span-7 ${
                          isReversed ? 'lg:order-2' : 'lg:order-1'
                        }`}
                      >
                        <div className="relative">
                          {/* Precision Browser Window Frame + Live Screenshot */}
                          <div className="relative overflow-hidden rounded-xl border border-[#C8C2B5] dark:border-[#242C42] bg-[#080A12] shadow-[0_14px_34px_-12px_rgba(0,0,0,0.45)]">
                            {/* Top Browser Chrome Bar */}
                            <div className="flex items-center justify-between gap-3 border-b border-[#22293E] bg-[#0C101C] px-3.5 py-2 text-[11px] font-mono text-[#949CB0]">
                              <div className="flex items-center gap-1.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-rose-500/75" />
                                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/75" />
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/75" />
                              </div>
                              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-0.5 text-[10px] text-[#D5DBE8] truncate">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span>https://{project.displayUrl}</span>
                              </div>
                              <span className="text-[10px] text-emerald-400 font-medium shrink-0">
                                200 OK
                              </span>
                            </div>

                            <div className="relative aspect-[16/10] overflow-hidden bg-[#080A12]">
                              <img
                                src={project.liveScreenshot}
                                alt={`${project.title} live production interface at ${project.displayUrl}`}
                                width={960}
                                height={600}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover object-top transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.028]"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCaseStudy(project)}
                                  className="cta-tactile-primary inline-flex items-center gap-2 rounded-full bg-[#F5F3EE] hover:bg-[#2544E8] hover:text-white px-5 py-2.5 text-xs font-mono font-semibold text-[#111110] whitespace-nowrap shrink-0 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-[#2544E8] group-hover:text-current" />
                                  <span>Open Full Case Study &amp; Collage</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Secondary Asymmetric Studio Collage Inset */}
                          <div className="hidden sm:block w-56 lg:w-64 -mt-16 ml-auto mr-4 relative z-10 rounded-xl border border-[#C8C2B5] dark:border-[#2A334D] bg-[#F5F3EE] dark:bg-[#101525] p-1.5 shadow-[0_18px_38px_-12px_rgba(0,0,0,0.65)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-1.5">
                            <div className="aspect-video overflow-hidden rounded-lg">
                              <img
                                src={project.studioVisual}
                                alt={`${project.title} studio display view`}
                                width={256}
                                height={144}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            </div>
                            <p className="px-2.5 pt-1.5 pb-0.5 text-[11px] font-mono text-[#4A4843] dark:text-[#B8C0D4] flex items-center justify-between">
                              <span>{project.displayUrl}</span>
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>Live</span>
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Editorial Case Study Narrative Column (5 cols) */}
                      <div
                        className={`lg:col-span-5 space-y-5 ${
                          isReversed ? 'lg:order-1' : 'lg:order-2'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#2544E8] dark:text-[#6E88FF]">
                          <span className="inline-flex items-center justify-center rounded-full border border-[#2544E8]/30 dark:border-[#6E88FF]/30 bg-[#2544E8]/10 dark:bg-[#6E88FF]/10 px-2.5 py-0.5 font-semibold">
                            {project.index}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{project.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="text-[#D94E28] font-semibold">{project.displayUrl}</span>
                        </div>

                        <div>
                          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight font-display text-[#111110] dark:text-white">
                            {project.title}
                          </h3>
                          <p className="mt-1.5 text-base sm:text-lg font-serif-editorial italic text-[#4A4843] dark:text-[#B8C0D4]">
                            {project.subtitle}
                          </p>
                        </div>

                        <p className="text-sm sm:text-base text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                          {project.summary}
                        </p>

                        <div className="space-y-2.5 pt-3 border-t border-[#E0DBD0] dark:border-[#1E2231]">
                          {project.engineeringHighlights.map((highlight, hIdx) => (
                            <div
                              key={hIdx}
                              className="flex items-start gap-2.5 text-xs sm:text-sm text-[#2E2D2A] dark:text-[#D5D8E2]"
                            >
                              <span className="font-mono text-[#D94E28] font-semibold mt-0.5">
                                0{hIdx + 1}.
                              </span>
                              <span>{highlight}</span>
                            </div>
                          ))}
                        </div>

                        {/* Individual Rounded Tech Stack Pills */}
                        <div className="pt-1 flex flex-wrap items-center gap-1.5">
                          {project.stack.map((techItem) => (
                            <span
                              key={techItem}
                              className="inline-flex items-center rounded-full border border-[#D5D0C5] dark:border-[#232A3E] bg-[#F5F3EE] dark:bg-[#101524] px-3 py-1 text-[11px] font-mono font-medium text-[#2E2D2A] dark:text-[#C8D0E4]"
                            >
                              {techItem}
                            </span>
                          ))}
                        </div>

                        {/* Rounded-Full Project Card Action CTAs with Tactile Bevel & Lift */}
                        <div className="flex flex-wrap items-center gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCaseStudy(project)}
                            className="cta-tactile-primary group/btn inline-flex items-center gap-2.5 rounded-full bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white pl-5.5 pr-4 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] hover:text-white dark:hover:bg-[#3B5BFF] whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:scale-110" />
                            <span>Inspect Dossier</span>
                          </button>

                          <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="cta-tactile-secondary group/ext inline-flex items-center gap-2 rounded-full border border-[#C8C2B5] dark:border-[#28314A] bg-[#F5F3EE]/80 dark:bg-[#101524] pl-5 pr-3.5 py-2.5 text-xs font-mono uppercase tracking-wider font-medium text-[#111110] dark:text-[#F4F1EA] hover:border-[#2544E8] dark:hover:border-[#6E88FF] whitespace-nowrap shrink-0"
                          >
                            <span>Visit {project.displayUrl}</span>
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 transition-transform duration-300 group-hover/ext:translate-x-0.5 group-hover/ext:-translate-y-0.5">
                              <ArrowUpRight className="h-3 w-3" />
                            </span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </TiltProjectCard>
                );
              })}
            </div>
          </div>
        </ParallaxSection>

        {/* 4. ABOUT & SENIOR PROJECT DEVELOPER ARSENAL SECTION */}
        <ParallaxSection
          id="about"
          ariaLabelledBy="about-heading"
          offsetPx={28}
          className="py-20 sm:py-28 bg-[#FDFCF9] dark:bg-[#05060B] text-[#111110] dark:text-[#F4F1EA] border-y border-[#D5D0C5] dark:border-[#1E2231] relative overflow-hidden"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8 relative space-y-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Left Column: Studio Story & Philosophy */}
              <div className="lg:col-span-6 space-y-6">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#D94E28] mb-3">
                    02 — Studio Philosophy &amp; Craft
                  </p>
                  <h2
                    id="about-heading"
                    className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-display text-[#111110] dark:text-[#F4F1EA] leading-[1.06] [text-wrap:balance]"
                  >
                    Senior Engineering Craft.{' '}
                    <span className="font-serif-editorial italic font-normal text-[#2544E8] dark:text-[#6E88FF]">
                      Best-in-Class Projects
                    </span>{' '}
                    at Affordable Prices.
                  </h2>
                </div>

                <p className="text-sm sm:text-base lg:text-lg text-[#4A4843] dark:text-[#B8C0D4] leading-relaxed">
                  <strong className="text-[#111110] dark:text-[#F4F1EA] font-semibold">
                    CROSX DEV STUDIO
                  </strong>
                  ,{' '}
                  <strong className="text-[#2544E8] dark:text-[#6E88FF] font-semibold">
                    Founded by IRON CLAD
                  </strong>
                  , operates with a clear mission: deliver senior-architect digital products—spanning custom Websites, full-stack Web Applications, and native iOS &amp; Android Mobile Apps—at fair, transparent, and accessible pricing.
                </p>

                <p className="text-sm sm:text-base text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                  From high-converting growth flagships like{' '}
                  <span className="font-mono text-[#111110] dark:text-[#F4F1EA]">crosx.in</span> and server-side forensic engines like{' '}
                  <span className="font-mono text-[#111110] dark:text-[#F4F1EA]">rca.crosx.in</span> to regional service commerce platforms like{' '}
                  <span className="font-mono text-[#111110] dark:text-[#F4F1EA]">sohanpipeline.in</span>, we build across almost every industry category using a unified modern TypeScript ecosystem.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-[#D5D0C5] dark:border-[#1E2231]">
                  <div>
                    <p className="text-xs font-mono text-[#D94E28]">
                      01. Web &amp; Web Apps
                    </p>
                    <h3 className="mt-1 text-base font-bold font-display text-[#111110] dark:text-[#F4F1EA]">
                      Next.js, Vite &amp; TanStack
                    </h3>
                    <p className="mt-1.5 text-xs text-[#5C5952] dark:text-[#949CB0] leading-relaxed">
                      Sub-second reactive interfaces styled with Tailwind CSS and strict TypeScript.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-mono text-[#2544E8] dark:text-[#6E88FF]">
                      02. Backend &amp; APIs
                    </p>
                    <h3 className="mt-1 text-base font-bold font-display text-[#111110] dark:text-[#F4F1EA]">
                      NestJS, Node &amp; Neon DB
                    </h3>
                    <p className="mt-1.5 text-xs text-[#5C5952] dark:text-[#949CB0] leading-relaxed">
                      Modular NestJS &amp; Node.js servers backed by Neon Serverless PostgreSQL schemas.
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-mono text-[#D94E28]">
                      03. Mobile Apps
                    </p>
                    <h3 className="mt-1 text-base font-bold font-display text-[#111110] dark:text-[#F4F1EA]">
                      React Native + Expo
                    </h3>
                    <p className="mt-1.5 text-xs text-[#5C5952] dark:text-[#949CB0] leading-relaxed">
                      60fps native iOS &amp; Android apps built from a single shared codebase.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Asymmetric Editorial Image Collage */}
              <div className="lg:col-span-6">
                <div className="grid grid-cols-12 gap-4 items-stretch">
                  <div className="col-span-12 sm:col-span-8 rounded-xl overflow-hidden border border-[#C8C2B5] dark:border-[#1E2231] bg-[#0B0E17]">
                    <img
                      src="/projects/studio-editorial.jpg"
                      alt="CROSX DEV STUDIO engineering workspace and product design floor"
                      width={640}
                      height={480}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover aspect-[4/3]"
                    />
                  </div>

                  <div className="col-span-12 sm:col-span-4 flex flex-col justify-between rounded-xl border border-[#C8C2B5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#0B0E17] p-5 sm:p-6">
                    <div>
                      <p className="text-[11px] font-mono uppercase tracking-wider text-[#D94E28]">
                        Founder &amp; Senior Developer
                      </p>
                      <p className="mt-2 text-2xl font-bold font-display tracking-tight text-[#111110] dark:text-[#F4F1EA]">
                        IRON CLAD
                      </p>
                      <p className="mt-2 text-xs text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                        Architecting Websites, Web Apps, Backend Systems, and React Native + Expo Mobile Apps with hand-crafted precision.
                      </p>
                    </div>
                    <div className="pt-6 border-t border-[#D5D0C5] dark:border-[#1E2231] mt-6">
                      <p className="text-[11px] font-mono text-[#6E6A61] dark:text-[#8E93A6]">
                        CROSX DEV STUDIO
                      </p>
                      <p className="text-xs font-semibold text-[#2544E8] dark:text-[#6E88FF] mt-0.5">
                        Best-in-Class · Affordable Pricing
                      </p>
                    </div>
                  </div>

                  {/* Bottom collage strip */}
                  <div className="col-span-12 rounded-xl border border-[#C8C2B5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#0B0E17] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-mono uppercase tracking-wider text-[#D94E28]">
                        Complete Language, Framework &amp; Database Mastery
                      </p>
                      <p className="mt-1 text-xs sm:text-sm font-mono font-medium text-[#111110] dark:text-[#F4F1EA]">
                        JS · TS · Vite · TanStack · React · Next.js · NestJS · Node.js · Neon DB · PostgreSQL · Tailwind · Expo
                      </p>
                    </div>
                    <a
                      href="#contact"
                      className="cta-tactile-primary group/quote inline-flex items-center gap-2.5 rounded-full bg-[#111110] text-white dark:bg-[#2544E8] pl-5.5 pr-3.5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] dark:hover:bg-[#3B5BFF] whitespace-nowrap shrink-0"
                    >
                      <span>Get an Affordable Quote</span>
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover/quote:translate-x-0.5">
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Full-Spectrum Tech Arsenal & All-Category Builder Showcase */}
            <div className="pt-14 border-t border-[#D5D0C5] dark:border-[#1E2231] space-y-10">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                  <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#2544E8] dark:text-[#6E88FF] mb-2">
                    Technical Architecture — Full-Spectrum Stack
                  </p>
                  <h3 className="text-2xl sm:text-4xl font-bold font-display tracking-tight text-[#111110] dark:text-[#F4F1EA]">
                    Production Arsenal Across{' '}
                    <span className="font-serif-editorial italic font-normal">
                      Web, Backend &amp; Mobile.
                    </span>
                  </h3>
                </div>

                {/* Interactive Stack Category Tabs */}
                <div
                  role="tablist"
                  aria-label="Technology Stack Layers"
                  className="flex flex-wrap items-center gap-1.5 rounded-full border border-[#C8C2B5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#0B0E17] p-1.5 self-start"
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
                        className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-mono rounded-full transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                          isSelected
                            ? 'bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white font-medium shadow-sm'
                            : 'text-[#5C5952] dark:text-[#949CB0] hover:text-[#111110] dark:hover:text-white'
                        }`}
                      >
                        {layer.id === 'web-frontend' && <Globe className="h-3.5 w-3.5" />}
                        {layer.id === 'backend-systems' && <Server className="h-3.5 w-3.5" />}
                        {layer.id === 'mobile-apps' && <Smartphone className="h-3.5 w-3.5" />}
                        <span>{layer.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
                {activeStackCategory.technologies.map((tech, idx) => (
                  <div
                    key={tech.name}
                    className="h-full rounded-xl border border-[#C8C2B5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#0B0E17] p-5 flex flex-col justify-between hover:border-[#2544E8] dark:hover:border-[#6E88FF] hover:-translate-y-1 hover:shadow-[0_14px_30px_-12px_rgba(37,68,232,0.18)] transition-all duration-300"
                  >
                    <div>
                      <p className="text-xs font-mono text-[#D94E28]">
                        0{idx + 1}. {tech.role}
                      </p>
                      <h4 className="mt-2 text-lg font-bold font-display text-[#111110] dark:text-[#F4F1EA]">
                        {tech.name}
                      </h4>
                      <p className="mt-2 text-xs text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                        {tech.highlight}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* All-Category Buildable Matrix */}
              <div className="pt-6">
                <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#D94E28] mb-4">
                  Comprehensive Engineering Coverage — Websites, Web Apps &amp; Mobile Apps
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {BUILDABLE_CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      className="h-full rounded-xl border border-[#C8C2B5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#0B0E17] p-6 flex flex-col justify-between gap-4 hover:border-[#2544E8]/60 dark:hover:border-[#6E88FF]/50 hover:-translate-y-0.5 transition-all duration-300"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#2544E8] dark:text-[#6E88FF]">
                          <span>
                            {cat.index} · {cat.platformType}
                          </span>
                          <span className="text-[#6E6A61] dark:text-[#8E93A6]">{cat.stackUsed}</span>
                        </div>
                        <h4 className="text-xl font-bold font-display text-[#111110] dark:text-[#F4F1EA]">
                          {cat.title}
                        </h4>
                        <p className="text-sm text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                          {cat.description}
                        </p>
                        <p className="text-xs font-mono text-[#6E6A61] dark:text-[#8E93A6]">
                          {cat.examples.join(' · ')}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-[#DED9CE] dark:border-[#1E2231] flex items-center justify-between gap-4">
                        <span className="text-xs font-mono text-[#D94E28]">
                          {cat.valueCommitment}
                        </span>
                        <a
                          href="#contact"
                          className="cta-tactile-secondary group/build inline-flex items-center gap-2 rounded-full border border-[#C8C2B5] dark:border-[#252C40] bg-[#FDFCF9] dark:bg-[#111626] pl-4 pr-3 py-1.5 text-xs font-mono uppercase tracking-wider font-semibold text-[#111110] dark:text-[#F4F1EA] hover:bg-[#2544E8] hover:text-white hover:border-[#2544E8] dark:hover:bg-[#2544E8] whitespace-nowrap shrink-0"
                        >
                          <span>Build This</span>
                          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/build:translate-x-0.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ParallaxSection>

        {/* 5. EXPERTISE SECTION — Interactive Engineering Capability Matrix */}
        <ParallaxSection
          id="expertise"
          ariaLabelledBy="expertise-heading"
          offsetPx={26}
          className="py-20 sm:py-28 bg-[#ECE8DF] dark:bg-[#080A12] text-[#111110] dark:text-[#F4F1EA]"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#D94E28] mb-3">
                03 — Core Engineering Expertise
              </p>
              <h2
                id="expertise-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-display leading-[1.06] [text-wrap:balance]"
              >
                Seven Disciplines.{' '}
                <span className="font-serif-editorial italic font-normal text-[#2544E8] dark:text-[#6E88FF]">
                  One Cohesive Standard.
                </span>
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                Select any engineering domain below to inspect how CROSX DEV STUDIO architects websites, SaaS web apps, React Native + Expo mobile apps, NestJS/Node.js backends, dashboards, APIs, and workflow automation.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              {/* Left Column: 7 Interactive Domain Selectors */}
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
                      className={`w-full text-left rounded-md border px-5 py-3.5 transition-colors flex items-center justify-between gap-4 cursor-pointer ${
                        isSelected
                          ? 'border-[#111110] dark:border-[#2544E8] bg-[#111110] dark:bg-[#2544E8] text-[#F5F3EE] dark:text-white'
                          : 'border-[#C8C2B5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] text-[#111110] dark:text-[#E5E9F2] hover:border-[#2544E8]'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`text-xs font-mono ${
                            isSelected
                              ? 'text-[#D94E28] dark:text-indigo-200'
                              : 'text-[#6E6A61] dark:text-[#8E93A6]'
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
                          isSelected
                            ? 'text-[#F5F3EE] dark:text-white'
                            : 'text-[#6E6A61] dark:text-[#8E93A6]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Active Expertise Detail Panel */}
              <div
                role="tabpanel"
                data-testid="expertise-detail-panel"
                className="lg:col-span-7 rounded-lg border border-[#C8C2B5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 sm:p-10 flex flex-col justify-between gap-8"
              >
                <div className="space-y-8">
                  <div className="border-b border-[#D5D0C5] dark:border-[#1E2231] pb-6">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#D94E28] mb-2">
                      <span>Discipline {activeExpertise.number}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeExpertise.kicker}</span>
                    </div>
                    <h3 className="text-2xl sm:text-4xl font-bold font-display tracking-tight">
                      {activeExpertise.title}
                    </h3>
                    <p className="mt-4 text-sm sm:text-base text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                      {activeExpertise.description}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6] mb-4">
                      Production Capabilities &amp; Deliverables
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-stretch">
                      {activeExpertise.capabilities.map((cap, idx) => (
                        <div
                          key={idx}
                          className="h-full rounded-md border border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#101422] p-4"
                        >
                          <span className="text-xs font-mono text-[#2544E8] dark:text-[#6E88FF] block mb-1">
                            0{idx + 1}.
                          </span>
                          <p className="text-sm font-semibold text-[#111110] dark:text-[#F4F1EA]">
                            {cap}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#D5D0C5] dark:border-[#1E2231]">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-[#6E6A61] dark:text-[#8E93A6] block">
                      Stack Signature
                    </span>
                    <span className="text-xs font-mono font-semibold text-[#111110] dark:text-[#6E88FF]">
                      {activeExpertise.stackSignature}
                    </span>
                  </div>

                  <a
                    href="#contact"
                    className="cta-tactile-primary group/exp inline-flex items-center gap-2.5 rounded-full bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white pl-5.5 pr-3.5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold hover:bg-[#2544E8] hover:text-white dark:hover:bg-[#3B5BFF] whitespace-nowrap shrink-0"
                  >
                    <span>Discuss {activeExpertise.title}</span>
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover/exp:translate-x-0.5 group-hover/exp:-translate-y-0.5">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </ParallaxSection>

        {/* 6. SERVICES SECTION — Bespoke Architectural Service Ledger */}
        <ParallaxSection
          id="services"
          ariaLabelledBy="services-heading"
          offsetPx={28}
          className="py-20 sm:py-28 bg-[#FDFCF9] dark:bg-[#05060B] text-[#111110] dark:text-[#F4F1EA] border-y border-[#D5D0C5] dark:border-[#1E2231]"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-12 border-b border-[#D5D0C5] dark:border-[#1E2231]">
              <div className="max-w-2xl">
                <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#D94E28] mb-3">
                  04 — Engagement Models &amp; Transparent Pricing
                </p>
                <h2
                  id="services-heading"
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-display text-[#111110] dark:text-[#F4F1EA] leading-[1.06] [text-wrap:balance]"
                >
                  Best-in-Class Engineering Services at{' '}
                  <span className="font-serif-editorial italic font-normal text-[#2544E8] dark:text-[#6E88FF]">
                    Accessible Pricing.
                  </span>
                </h2>
              </div>
              <p className="max-w-md text-sm text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                Whether launching a flagship Website, a TanStack/Next.js Web App, a NestJS + Neon PostgreSQL backend, or a React Native + Expo Mobile App, we deliver senior-grade quality at affordable budgets.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {STUDIO_SERVICES.map((service, idx) => {
                const isWide = idx === 0 || idx === 3;
                return (
                  <div
                    key={service.id}
                    className={`${
                      isWide ? 'lg:col-span-7' : 'lg:col-span-5'
                    } rounded-xl border border-[#C8C2B5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#0B0E17] p-6 sm:p-8 flex flex-col justify-between hover:border-[#2544E8] dark:hover:border-[#6E88FF] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-16px_rgba(37,68,232,0.16)] transition-all duration-300`}
                  >
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-[#D94E28]">
                        <span>{service.number} · Service Architecture</span>
                        <span className="text-[#6E6A61] dark:text-[#8E93A6]">
                          {service.architectureFocus}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold font-display text-[#111110] dark:text-[#F4F1EA]">
                          {service.title}
                        </h3>
                        <p className="mt-1 text-base font-serif-editorial italic text-[#2544E8] dark:text-[#6E88FF]">
                          {service.tagline}
                        </p>
                      </div>

                      <p className="text-sm text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                        {service.description}
                      </p>

                      <ul className="space-y-2.5 pt-4 border-t border-[#DED9CE] dark:border-[#1E2231]">
                        {service.deliverables.map((item, dIdx) => (
                          <li
                            key={dIdx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-[#2E2D2A] dark:text-[#D5D8E2]"
                          >
                            <Check className="h-4 w-4 text-[#D94E28] shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-6 mt-6 border-t border-[#DED9CE] dark:border-[#1E2231] flex flex-wrap items-center justify-between gap-4">
                      <span className="text-xs font-mono text-[#6E6A61] dark:text-[#8E93A6]">
                        {service.valueTier}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleScopeService(service.title)}
                        className="cta-tactile-primary group/scope inline-flex items-center gap-2.5 rounded-full bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white hover:bg-[#2544E8] hover:text-white dark:hover:bg-[#3B5BFF] pl-5.5 pr-3.5 py-2.5 text-xs font-mono uppercase tracking-wider font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <span>Scope This Service</span>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 group-hover/scope:translate-x-0.5">
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ParallaxSection>

        {/* 7. PROCESS SECTION — Discover → Plan → Design → Develop → Launch */}
        <ParallaxSection
          id="process"
          ariaLabelledBy="process-heading"
          offsetPx={24}
          className="py-20 sm:py-28 bg-[#ECE8DF] dark:bg-[#080A12] text-[#111110] dark:text-[#F4F1EA]"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-mono uppercase tracking-[0.18em] text-[#D94E28] mb-3">
                05 — Execution Methodology
              </p>
              <h2
                id="process-heading"
                className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight font-display leading-[1.06] [text-wrap:balance]"
              >
                Discover → Plan →{' '}
                <span className="font-serif-editorial italic font-normal text-[#2544E8] dark:text-[#6E88FF]">
                  Design → Develop
                </span>{' '}
                → Launch.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                Our five-stage engineering lifecycle eliminates guesswork. Each phase produces concrete technical artifacts and passes a strict verification gate.
              </p>
            </div>

            {/* 5-Stage Interactive Stepper */}
            <div
              role="tablist"
              aria-label="Engineering Process Stages"
              className="mt-10 grid grid-cols-2 sm:grid-cols-5 gap-3"
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
                    className={`rounded-md border p-4 text-left transition-colors cursor-pointer ${
                      isCurrent
                        ? 'border-[#111110] dark:border-[#2544E8] bg-[#111110] dark:bg-[#2544E8] text-[#F5F3EE] dark:text-white'
                        : 'border-[#C8C2B5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] text-[#2E2D2A] dark:text-[#D5D8E2] hover:border-[#2544E8]'
                    }`}
                  >
                    <span
                      className={`text-xs font-mono block ${
                        isCurrent ? 'text-[#D94E28] dark:text-indigo-200' : 'text-[#6E6A61] dark:text-[#8E93A6]'
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

            {/* Active Process Stage Detail Card */}
            <div
              role="tabpanel"
              data-testid="process-stage-panel"
              className="mt-6 rounded-lg border border-[#C8C2B5] dark:border-[#1E2231] bg-[#FDFCF9] dark:bg-[#0B0E17] p-6 sm:p-10"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#D94E28]">
                    <span>Stage {activeProcess.step} of 05</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeProcess.name} Phase</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold font-display">
                    {activeProcess.headline}
                  </h3>
                  <p className="text-sm sm:text-base text-[#4A4843] dark:text-[#A3A8B8] leading-relaxed">
                    {activeProcess.description}
                  </p>
                  <div className="pt-2">
                    <p className="text-xs font-mono text-[#6E6A61] dark:text-[#8E93A6]">
                      Verification Gate:{' '}
                      <span className="text-[#111110] dark:text-[#F4F1EA] font-semibold">
                        {activeProcess.gateCheck}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="lg:col-span-5 rounded-md border border-[#D5D0C5] dark:border-[#1E2231] bg-[#F5F3EE] dark:bg-[#101422] p-6 space-y-3">
                  <p className="text-xs font-mono uppercase tracking-wider text-[#2544E8] dark:text-[#6E88FF]">
                    Stage {activeProcess.step} Engineering Artifacts
                  </p>
                  <ul className="space-y-2.5">
                    {activeProcess.artifacts.map((artifact, aIdx) => (
                      <li
                        key={aIdx}
                        className="flex items-center gap-2.5 text-sm font-medium text-[#111110] dark:text-[#F4F1EA]"
                      >
                        <span className="font-mono text-xs text-[#D94E28]">
                          0{aIdx + 1}.
                        </span>
                        <span>{artifact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </ParallaxSection>

        {/* 8. CONTACT SECTION — Functional Project Inquiry Form with Custom Dropdowns */}
        <ProjectInquirySection
          selectedScopeProp={preselectedScope}
          referenceProjectProp={referenceProject}
        />
      </main>

      {/* 9. FOOTER — Bespoke Architectural Colophon */}
      <footer className="bg-[#ECE8DF] dark:bg-[#040509] text-[#4A4843] dark:text-[#949CB0] border-t border-[#C8C2B5] dark:border-[#1E2231] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12 pb-12 border-b border-[#C8C2B5] dark:border-[#1E2231]">
            <div className="lg:col-span-5 space-y-4">
              <a
                href="#home"
                className="text-xl font-extrabold tracking-tight font-display text-[#111110] dark:text-[#F4F1EA] flex items-center gap-2.5"
              >
                <span className="inline-block h-2.5 w-2.5 bg-[#D94E28]" aria-hidden="true" />
                <span>CROSX DEV STUDIO®</span>
              </a>
              <p className="text-sm text-[#4A4843] dark:text-[#949CB0] max-w-sm leading-relaxed">
                Bespoke digital product and software engineering studio. Building best-in-class Websites, Web Apps, Backend Systems, and React Native + Expo Mobile Apps at affordable prices.
              </p>
              <p className="text-xs font-mono text-[#2544E8] dark:text-[#6E88FF] font-medium">
                FOUNDED BY IRON CLAD · SENIOR PROJECT DEVELOPER
              </p>
            </div>

            <div className="lg:col-span-3 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-[#111110] dark:text-[#F4F1EA] font-semibold">
                Studio Index
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#home" className="hover:text-[#111110] dark:hover:text-white transition-colors">
                    Home
                  </a>
                </li>
                <li>
                  <a href="#work" className="hover:text-[#111110] dark:hover:text-white transition-colors">
                    Selected Work
                  </a>
                </li>
                <li>
                  <a href="#about" className="hover:text-[#111110] dark:hover:text-white transition-colors">
                    About Studio
                  </a>
                </li>
                <li>
                  <a href="#expertise" className="hover:text-[#111110] dark:hover:text-white transition-colors">
                    Expertise
                  </a>
                </li>
                <li>
                  <a href="#services" className="hover:text-[#111110] dark:hover:text-white transition-colors">
                    Services
                  </a>
                </li>
                <li>
                  <a href="#process" className="hover:text-[#111110] dark:hover:text-white transition-colors">
                    Process
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-[#111110] dark:hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="/track-ticket" className="hover:text-[#111110] dark:hover:text-white transition-colors font-mono text-xs text-[#2544E8] dark:text-[#6E88FF]">
                    Track Support Ticket
                  </a>
                </li>
                <li>
                  <a href="/admin" className="hover:text-[#111110] dark:hover:text-white transition-colors font-mono text-xs">
                    Admin Console
                  </a>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-4 space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider text-[#111110] dark:text-[#F4F1EA] font-semibold">
                Shipped Production Platforms
              </p>
              <ul className="space-y-2.5 text-sm font-mono">
                <li>
                  <a
                    href="https://crosx.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#111110] dark:hover:text-white transition-colors"
                  >
                    <span>CrosX — https://crosx.in</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#D94E28]" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://rca.crosx.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#111110] dark:hover:text-white transition-colors"
                  >
                    <span>CrosX RCA — https://rca.crosx.in</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#D94E28]" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://sohanpipeline.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 hover:text-[#111110] dark:hover:text-white transition-colors"
                  >
                    <span>Sohan Pipelines — https://sohanpipeline.in</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[#D94E28]" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#6E6A61] dark:text-[#8E93A6]">
            <p>
              © {new Date().getFullYear()} CROSX DEV STUDIO®. Founded by IRON CLAD. All rights reserved.
            </p>
            <p className="text-center sm:text-right">
              JS · TS · Vite · TanStack · React · Next.js · NestJS · Node.js · Neon DB · PostgreSQL · Tailwind · Expo
            </p>
          </div>
        </div>
      </footer>

      {/* Case Study Inspection Modal */}
      <ProjectCaseStudyModal
        project={selectedCaseStudy}
        onClose={() => setSelectedCaseStudy(null)}
        onSelectForInquiry={handleSelectProjectForInquiry}
      />
    </div>
  );
}
