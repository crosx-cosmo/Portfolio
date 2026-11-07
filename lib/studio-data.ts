export interface ProjectCaseStudy {
  id: string;
  index: string;
  title: string;
  subtitle: string;
  category: 'Enterprise Web Platform' | 'Engineering Tooling & SaaS' | 'Full-Stack Service & Commerce';
  url: string;
  displayUrl: string;
  liveScreenshot: string;
  studioVisual: string;
  summary: string;
  architectureOverview: string;
  engineeringHighlights: string[];
  stack: string[];
  deliverables: string[];
  layoutSpan: 'wide' | 'split';
}

export interface TechStackCategory {
  id: string;
  label: string;
  subtitle: string;
  technologies: Array<{
    name: string;
    role: string;
    highlight: string;
  }>;
}

export interface BuildableCategory {
  id: string;
  index: string;
  title: string;
  platformType: 'Website & SEO Flagship' | 'Full-Stack Web App' | 'Mobile App (iOS & Android)';
  stackUsed: string;
  description: string;
  examples: string[];
  valueCommitment: string;
}

export interface ExpertiseDomain {
  id: string;
  number: string;
  title: string;
  kicker: string;
  description: string;
  capabilities: string[];
  stackSignature: string;
}

export interface StudioService {
  id: string;
  number: string;
  title: string;
  tagline: string;
  description: string;
  deliverables: string[];
  architectureFocus: string;
  valueTier: string;
}

export interface ProcessStage {
  step: string;
  name: 'Discover' | 'Plan' | 'Design' | 'Develop' | 'Launch';
  headline: string;
  description: string;
  artifacts: string[];
  gateCheck: string;
}

export interface TerminalTab {
  id: string;
  filename: string;
  language: string;
  code: string;
  outputLines: string[];
}

export const STUDIO_BRAND = {
  name: 'CROSX DEV STUDIO',
  founder: 'IRON CLAD',
  role: 'Senior Project Developer & Principal Systems Architect',
  headline: 'We Build Digital Experiences That Move Businesses Forward.',
  subheadline:
    'CROSX DEV STUDIO is a digital product and software engineering studio founded by IRON CLAD. We engineer best-in-class websites, full-stack web applications, and React Native + Expo mobile apps at accessible, transparent prices.',
  valuePromise: 'Best-in-Class Engineering Quality · Accessible & Transparent Pricing',
};

export const TECH_STACK_ARSENAL: TechStackCategory[] = [
  {
    id: 'web-frontend',
    label: 'Websites & Web Applications',
    subtitle: 'High-Velocity Reactive Frontend & State Systems',
    technologies: [
      {
        name: 'TypeScript & JavaScript (ES2026)',
        role: 'Core Languages',
        highlight: 'End-to-end strict type safety and zero-runtime-surprise execution',
      },
      {
        name: 'Next.js & React 19',
        role: 'Production Web Framework',
        highlight: 'App Router, Server Actions, SSR/ISR, and SEO-first web architecture',
      },
      {
        name: 'Vite & TanStack Suite',
        role: 'SPA & Data Orchestration',
        highlight: 'Sub-second Vite builds with TanStack Query, Router & Table state management',
      },
      {
        name: 'Tailwind CSS',
        role: 'Design System Engine',
        highlight: 'Custom dual-theme tokens, fluid responsive grids, and 60fps micro-interactions',
      },
    ],
  },
  {
    id: 'backend-systems',
    label: 'Backend, APIs & Databases',
    subtitle: 'Modular Enterprise Server & Relational Data Layer',
    technologies: [
      {
        name: 'NestJS',
        role: 'Enterprise Node Framework',
        highlight: 'Dependency-injected modular controllers, guards, interceptors & microservices',
      },
      {
        name: 'Node.js Runtime',
        role: 'High-Throughput Server',
        highlight: 'Non-blocking event pipelines, SSRF-hardened proxies, and background workers',
      },
      {
        name: 'PostgreSQL & Neon DB',
        role: 'Serverless Relational Database',
        highlight: 'Neon serverless Postgres branching, pooled connections, ACID transactions & parameterized SQL',
      },
      {
        name: 'REST, Webhooks & Automation',
        role: 'Integration Layer',
        highlight: 'Contract-validated endpoints, payment gateways, and automated PDF/dispatch workflows',
      },
    ],
  },
  {
    id: 'mobile-apps',
    label: 'Cross-Platform Mobile Apps',
    subtitle: 'Native iOS & Android Performance from a Unified Codebase',
    technologies: [
      {
        name: 'React Native',
        role: 'Native Mobile Engine',
        highlight: '60fps native gesture handling, offline-first storage, and hardware APIs',
      },
      {
        name: 'Expo Ecosystem',
        role: 'Mobile Delivery Pipeline',
        highlight: 'Expo Router, OTA updates, push notifications, and rapid App Store / Play Store builds',
      },
      {
        name: 'Shared TypeScript Core',
        role: 'Unified Web + Mobile Logic',
        highlight: 'Shared validation, TanStack Query hooks, and API contracts across Web & Mobile',
      },
      {
        name: 'Native Device Capabilities',
        role: 'Hardware Integration',
        highlight: 'Biometric auth, camera/QR scanning, geolocation dispatch, and secure keychains',
      },
    ],
  },
];

export const BUILDABLE_CATEGORIES: BuildableCategory[] = [
  {
    id: 'cat-saas-webapps',
    index: '01',
    title: 'SaaS Platforms & Custom Web Apps',
    platformType: 'Full-Stack Web App',
    stackUsed: 'Next.js · React · TanStack · NestJS · Neon DB · PostgreSQL',
    description:
      'Multi-tenant software products, subscription portals, CRM/ERP workspaces, and diagnostic engines engineered for rapid user onboarding.',
    examples: ['Redirect Forensics & SEO Tools', 'Team Workspaces & CRMs', 'Subscription SaaS Products'],
    valueCommitment: 'Senior architecture at startup-friendly milestone pricing',
  },
  {
    id: 'cat-mobile-expo',
    index: '02',
    title: 'iOS & Android Mobile Applications',
    platformType: 'Mobile App (iOS & Android)',
    stackUsed: 'React Native · Expo · TypeScript · TanStack Query · Node.js',
    description:
      'Production-grade native mobile applications for consumer marketplaces, on-demand field dispatch, booking systems, and companion SaaS apps.',
    examples: ['On-Demand Service & Delivery Apps', 'Commerce & Loyalty Apps', 'Field Operations & Booking'],
    valueCommitment: 'Single TypeScript codebase shipping to both iOS & Android affordably',
  },
  {
    id: 'cat-ecommerce-service',
    index: '03',
    title: 'E-Commerce, Booking & Regional Dispatch',
    platformType: 'Full-Stack Web App',
    stackUsed: 'Next.js · Vite · Tailwind CSS · Node.js · Neon DB · PostgreSQL',
    description:
      'High-conversion storefronts, spare-parts catalogs, PIN-code dispatch systems, and automated PDF quotation engines.',
    examples: ['B2B/B2C Product Catalogs', 'PIN-Code Service Dispatch', 'Automated Quote & Order Tracking'],
    valueCommitment: 'Zero-bloat custom commerce built for measurable ROI',
  },
  {
    id: 'cat-flagship-websites',
    index: '04',
    title: 'Brand Flagships, Portfolios & Agency Sites',
    platformType: 'Website & SEO Flagship',
    stackUsed: 'Next.js · React · Vite · Tailwind CSS · Motion',
    description:
      'Editorial-grade corporate websites, interactive portfolios, and high-converting landing funnels with full dark/light mode choreography.',
    examples: ['Enterprise Growth Websites', 'Interactive Product Showcases', 'High-Speed SEO Landing Funnels'],
    valueCommitment: 'Best-in-class visual polish at accessible fixed-scope pricing',
  },
];

export const SELECTED_PROJECTS: ProjectCaseStudy[] = [
  {
    id: 'crosx-main',
    index: '01',
    title: 'CrosX',
    subtitle: 'Enterprise Performance Advertising & Digital Growth Platform',
    category: 'Enterprise Web Platform',
    url: 'https://crosx.in',
    displayUrl: 'crosx.in',
    liveScreenshot: '/projects/crosx-live.png',
    studioVisual: '/projects/crosx-studio.jpg',
    summary:
      'High-conversion digital presence and interactive marketing analytics showcase built for CrosX to present multi-channel acquisition strategy, cohort optimization workflows, and executive consultation booking.',
    architectureOverview:
      'Engineered with a modular Next.js App Router architecture, responsive dark/light surface choreography, interactive campaign telemetry visualizations, and streamlined strategy call scheduling flows.',
    engineeringHighlights: [
      'Interactive marketing analytics surface modeling campaign growth, conversion cohorts, and attribution clarity',
      'Dual-theme adaptive design system with crisp editorial grid geometry and zero-layout-shift typography',
      'Direct consultation and proposal routing pipelines engineered for rapid executive onboarding',
    ],
    stack: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Node.js'],
    deliverables: ['Brand & Editorial Design System', 'Full-Stack Web Platform', 'Interactive Telemetry Showcase'],
    layoutSpan: 'wide',
  },
  {
    id: 'crosx-rca',
    index: '02',
    title: 'CrosX RCA',
    subtitle: 'Redirect Chain Analyzer & Server-Side URL Forensics Engine',
    category: 'Engineering Tooling & SaaS',
    url: 'https://rca.crosx.in',
    displayUrl: 'rca.crosx.in',
    liveScreenshot: '/projects/rca-live.png',
    studioVisual: '/projects/rca-studio.jpg',
    summary:
      'Universal server-side redirect and URL trace engine engineered for technical SEO and performance marketing teams to inspect every HTTP hop, meta refresh, JavaScript navigation, and parameter mutation.',
    architectureOverview:
      'Built around a hardened server-side request execution engine with SSRF protection, 20-hop trace depth, multi-User-Agent simulation (Googlebot Smartphone vs Desktop Chrome), and real-time query parameter diffing.',
    engineeringHighlights: [
      'Server-side hop inspection across HTTP 301/302/307/308, HTML meta-refresh, and client-side JS redirects',
      'Automated UTM, gclid, fbclid, and click_id preservation auditing across cross-domain hops',
      'Bot cloaking detection, Strict-Transport-Security (HSTS) verification, and X-Robots-Tag header diagnostics',
    ],
    stack: ['Next.js', 'Node.js', 'TypeScript', 'TanStack', 'REST API'],
    deliverables: ['Server-Side Trace Engine', 'Bulk URL Auditing Interface', 'Public API Documentation & PWA'],
    layoutSpan: 'split',
  },
  {
    id: 'sohan-pipelines',
    index: '03',
    title: 'Sohan Pipelines',
    subtitle: 'Regional Pipeline Engineering, Service Dispatch & Spare Parts Platform',
    category: 'Full-Stack Service & Commerce',
    url: 'https://sohanpipeline.in',
    displayUrl: 'sohanpipeline.in',
    liveScreenshot: '/projects/sohan-live.png',
    studioVisual: '/projects/sohan-studio.jpg',
    summary:
      'End-to-end digital service dispatch, automated quote generation, and spare parts commerce platform for Sohan Pipeline’s & Plumbing across South Bengal.',
    architectureOverview:
      'Combines PIN-code verified service area routing, live booking status tracking, instant PDF quotation generation, bilingual localization (English & Bengali), and an authenticated spare-parts catalog.',
    engineeringHighlights: [
      'Instant regional area dispatch selector mapped to verified PIN-code service hubs',
      'Live order tracking workflow, automated PDF estimate generator, and direct WhatsApp desk integration',
      'Bilingual interface switching (English / Bengali) alongside verified on-site installation galleries',
    ],
    stack: ['Next.js', 'TypeScript', 'Neon DB', 'PostgreSQL', 'Tailwind CSS', 'Node.js'],
    deliverables: ['Service Dispatch Web App', 'Spare Parts E-Commerce Catalog', 'Booking & Quotation Engine'],
    layoutSpan: 'split',
  },
];

export const EXPERTISE_DOMAINS: ExpertiseDomain[] = [
  {
    id: 'website-development',
    number: '01',
    title: 'Website Development',
    kicker: 'Editorial & High-Conversion Web Architecture',
    description:
      'Bespoke digital flagship websites engineered with Next.js, React, Vite, and Tailwind CSS—combining sculptural typography, smooth dark/light mode transitions, and technical SEO foundations.',
    capabilities: ['Next.js & Vite Flagships', 'Interactive Editorial Collages', 'Technical SEO & Core Web Vitals'],
    stackSignature: 'Next.js · React · Vite · Tailwind CSS · TypeScript',
  },
  {
    id: 'saas',
    number: '02',
    title: 'SaaS & Web Applications',
    kicker: 'Multi-Tenant Product Engineering',
    description:
      'Production-ready web applications powered by React, Next.js, and TanStack (Query, Router, Table)—complete with workspace isolation, role-based access control, and reactive state.',
    capabilities: ['TanStack Query & Table State', 'Multi-Tenant Data Isolation', 'Interactive Onboarding Flows'],
    stackSignature: 'Next.js · TanStack · TypeScript · NestJS · PostgreSQL',
  },
  {
    id: 'mobile-development',
    number: '03',
    title: 'Mobile Apps (React Native + Expo)',
    kicker: 'Native iOS & Android Engineering',
    description:
      'Cross-platform mobile applications built with React Native and Expo Router—sharing TypeScript validation and API contracts with your web platform for rapid, cost-effective delivery.',
    capabilities: ['React Native + Expo Router', 'iOS & Android Native Builds', 'Offline Sync & Push Alerts'],
    stackSignature: 'React Native · Expo · TypeScript · TanStack Query',
  },
  {
    id: 'full-stack',
    number: '04',
    title: 'Full-Stack Development',
    kicker: 'End-to-End Application Systems',
    description:
      'Unified frontend, backend, and mobile engineering where strict TypeScript contracts flow from PostgreSQL schemas and NestJS/Node.js controllers to Next.js and Expo clients.',
    capabilities: ['End-to-End TypeScript Contracts', 'Next.js + NestJS Monorepos', 'Real-Time State Synchronization'],
    stackSignature: 'TypeScript · Next.js · NestJS · Node.js · PostgreSQL',
  },
  {
    id: 'backend-engineering',
    number: '05',
    title: 'Backend Engineering (NestJS & Node.js)',
    kicker: 'Resilient Data & Compute Layer',
    description:
      'Structured NestJS and Node.js server architectures paired with PostgreSQL relational modeling, transactional query pipelines, and SSRF-hardened network security.',
    capabilities: ['NestJS Modular Architecture', 'PostgreSQL Schema & Indexing', 'Security & Rate-Limiting Gates'],
    stackSignature: 'NestJS · Node.js · PostgreSQL · TypeScript',
  },
  {
    id: 'dashboards',
    number: '06',
    title: 'Dashboards & TanStack Data Grids',
    kicker: 'Decision-Grade Operational Interfaces',
    description:
      'High-density analytical workspaces, TanStack Table virtualized data grids, diagnostic dependency graphs, and real-time operational command centers.',
    capabilities: ['TanStack Table & Query Grids', 'Diagnostic Topology Viewers', 'Custom Filtering & Cohort Slices'],
    stackSignature: 'React · TanStack · Tailwind CSS · Real-Time Streams',
  },
  {
    id: 'apis-automation',
    number: '07',
    title: 'APIs & Workflow Automation',
    kicker: 'Deterministic Business Process Engines',
    description:
      'Cleanly versioned REST APIs, webhook consumers, automated link auditing, instant PDF quotation engines, and intelligent lead-routing pipelines.',
    capabilities: ['RESTful NestJS/Node Endpoints', 'Document & PDF Generation', 'Scheduled Background Workers'],
    stackSignature: 'NestJS · Node.js · Webhooks · Cron Pipelines',
  },
];

export const STUDIO_SERVICES: StudioService[] = [
  {
    id: 'flagship-web',
    number: '01',
    title: 'Custom Websites & High-Speed Web Apps',
    tagline: 'Editorial craft meets Next.js, Vite & TanStack engineering.',
    description:
      'We design and engineer distinctive websites and reactive web apps that command authority—blending agency-grade layouts, smooth dark/light mode switches, and sub-second performance.',
    deliverables: [
      'Custom Responsive Design System (Full Dark & Light Mode)',
      'Next.js App Router or Vite + TanStack Reactive Architecture',
      'Semantic SEO, OpenGraph & Core Web Vitals Optimization',
    ],
    architectureFocus: 'Next.js · React · Vite · TanStack · Tailwind CSS',
    valueTier: 'Best-in-Class Quality · Affordable Fixed-Scope Pricing',
  },
  {
    id: 'mobile-apps-expo',
    number: '02',
    title: 'Cross-Platform Mobile Apps (React Native + Expo)',
    tagline: 'Native iOS & Android apps engineered from a unified TypeScript core.',
    description:
      'Launch on both Apple App Store and Google Play without doubling your engineering budget. We build smooth 60fps mobile apps using React Native and Expo.',
    deliverables: [
      'Universal iOS & Android App with Expo Router Navigation',
      'Shared TypeScript API Contracts & TanStack Query Caching',
      'Push Notifications, Deep Linking & OTA Update Readiness',
    ],
    architectureFocus: 'React Native · Expo · TypeScript · Node.js',
    valueTier: 'Dual-Platform Delivery · Startup-Friendly Budget',
  },
  {
    id: 'custom-saas',
    number: '03',
    title: 'Full-Stack SaaS & Enterprise Platforms',
    tagline: 'From PostgreSQL blueprint to deployed multi-tenant product.',
    description:
      'End-to-end engineering of specialized SaaS products, diagnostic tools, e-commerce catalogs, and regional dispatch portals—modeled on CrosX RCA and Sohan Pipelines.',
    deliverables: [
      'Relational PostgreSQL Schema & NestJS / Node.js Backend',
      'Authenticated Client Workspaces & TanStack Admin Consoles',
      'Automated PDF Quotation, Dispatch & Payment Workflows',
    ],
    architectureFocus: 'Next.js · NestJS · Node.js · PostgreSQL · TypeScript',
    valueTier: 'Production-Ready Architecture · Transparent Milestones',
  },
  {
    id: 'backend-api-systems',
    number: '04',
    title: 'Backend Systems, Dashboards & Automation',
    tagline: 'Hardened NestJS/Node.js infrastructure and analytical clarity.',
    description:
      'We architect the backbone of digital businesses: modular NestJS APIs, PostgreSQL data models, executive telemetry dashboards, and automated workflow engines.',
    deliverables: [
      'Modular NestJS & Node.js REST APIs with Strict Validation',
      'High-Density Executive Dashboards & Forensic Trace Tools',
      'SSRF-Protected Server Proxies & Webhook Automation',
    ],
    architectureFocus: 'NestJS · Node.js · PostgreSQL · TanStack',
    valueTier: 'Senior Systems Engineering · High-ROI Delivery',
  },
];

export const PROCESS_STAGES: ProcessStage[] = [
  {
    step: '01',
    name: 'Discover',
    headline: 'Domain Immersion & Affordable Scope Alignment',
    description:
      'We dissect your business goals, target platform (Website, Web App, or React Native Mobile App), and budget parameters to lock in maximum ROI without unnecessary agency bloat.',
    artifacts: ['System Requirements Brief', 'Transparent Cost & Milestone Plan', 'User Journey Map'],
    gateCheck: 'Problem definition & affordable fixed-scope roadmap approved',
  },
  {
    step: '02',
    name: 'Plan',
    headline: 'System Architecture & Data Modeling',
    description:
      'We define the PostgreSQL relational schema, NestJS/Node.js API contracts, TanStack state flows, and component taxonomy so web and mobile move in lockstep.',
    artifacts: ['PostgreSQL Entity-Relationship Schema', 'NestJS / Next.js API Spec', 'Web & Expo Architecture'],
    gateCheck: 'Data contracts & technical specification verified',
  },
  {
    step: '03',
    name: 'Design',
    headline: 'Editorial Direction & Dual-Theme Prototyping',
    description:
      'We craft a bespoke visual language combining high-contrast typography, asymmetric layouts, and complete Dark & Light mode surface tokens.',
    artifacts: ['Switchable Dark/Light Theme Tokens', 'Asymmetric Section Wireframes', 'Interactive Component Specs'],
    gateCheck: 'Visual direction & responsive breakpoints approved',
  },
  {
    step: '04',
    name: 'Develop',
    headline: 'Full-Stack & Mobile TypeScript Execution',
    description:
      'Senior developer execution across Next.js, React, Vite, TanStack, NestJS, Node.js, Tailwind CSS, and React Native + Expo—enforcing strict type safety and automated tests.',
    artifacts: ['Production TypeScript Codebase', 'Validated API & Database Layer', 'Unit & Accessibility Verification'],
    gateCheck: 'Zero build errors, strict lint pass & end-to-end journey verification',
  },
  {
    step: '05',
    name: 'Launch',
    headline: 'Production Deployment & Handover',
    description:
      'We deploy your web application or mobile build with production optimization, SEO metadata verification, and clean documentation for long-term growth.',
    artifacts: ['Cloud & App Store Deployment', 'SEO & Performance Audit', 'Complete Codebase Ownership'],
    gateCheck: 'Live production verification across desktop, tablet & mobile',
  },
];

export const TERMINAL_TABS: TerminalTab[] = [
  {
    id: 'architecture',
    filename: 'crosx.architecture.ts',
    language: 'typescript',
    code: `// CROSX DEV STUDIO — Full-Spectrum Stack
import { defineStudio } from '@crosx/core';

export const studio = defineStudio({
  studio: 'CROSX DEV STUDIO',
  founder: 'IRON CLAD (Senior Project Developer)',
  webAndApps: [
    'JavaScript & TypeScript 5.9',
    'React 19 · Next.js 15 · Vite',
    'TanStack (Query · Router · Table)',
    'Tailwind CSS v4 (Full Dark/Light)',
  ],
  backendAndMobile: [
    'NestJS · Node.js · Neon DB · PostgreSQL',
    'React Native + Expo (iOS & Android)',
  ],
  mission: 'Best-in-Class Projects at Affordable Prices',
});`,
    outputLines: [
      '✓ Loaded CROSX DEV STUDIO manifest (Founded by IRON CLAD)',
      '✓ Web Stack Ready: JS · TS · Vite · TanStack · React · Next.js · Tailwind',
      '✓ Backend & Mobile Ready: NestJS · Node.js · Neon DB · PostgreSQL · Expo',
    ],
  },
  {
    id: 'mobile-expo',
    filename: 'mobile.expo.tsx',
    language: 'typescript',
    code: `// Cross-Platform Mobile App (React Native + Expo)
import { Stack } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

export function CrosxMobileShell() {
  const { data } = useQuery({
    queryKey: ['studio-sync'],
    queryFn: () => fetch('https://crosx.in/api/sync'),
  });

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}`,
    outputLines: [
      '✓ Compiled React Native + Expo Router universal navigation tree',
      '✓ Shared TanStack Query cache & TypeScript schemas with Web App',
      '✓ Verified 60fps native gesture & dark/light theme adaptation',
    ],
  },
  {
    id: 'database',
    filename: 'neon.postgres.ts',
    language: 'typescript',
    code: `// NestJS + Node.js + Neon Serverless PostgreSQL
import { Injectable } from '@nestjs/common';
import { neon } from '@neondatabase/serverless';

@Injectable()
export class ProjectInquiryService {
  private readonly sql = neon(process.env.NEON_DATABASE_URL!);

  async commitInquiry(dto: CreateInquiryDto) {
    return this.sql(
      'INSERT INTO studio_project_inquiries VALUES ($1, $2) RETURNING *',
      [dto.clientName, dto.serviceScope],
    );
  }
}`,
    outputLines: [
      '✓ Connected to Neon Serverless PostgreSQL (studio_project_inquiries)',
      '✓ Initialized NestJS dependency-injected controller & service layer',
      '✓ Ready for parameterized INSERT statements via /api/inquiries',
    ],
  },
];
