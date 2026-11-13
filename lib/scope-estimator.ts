import { ALLOWED_SERVICE_SCOPES, ALLOWED_TIMELINES } from './inquiry-validator';

export type PlatformTierId = 'website' | 'webapp' | 'mobile' | 'ecosystem';
export type DeliveryCadenceId = 'sprint' | 'standard' | 'comprehensive';

export interface PlatformTierOption {
  id: PlatformTierId;
  label: string;
  shortLabel: string;
  baseWeeks: number;
  baseMinUsd: number;
  baseMaxUsd: number;
  mappedScope: (typeof ALLOWED_SERVICE_SCOPES)[number];
  recommendedStack: string[];
}

export interface ArchitectureModuleOption {
  id: string;
  label: string;
  weeksDelta: number;
  minUsdDelta: number;
  maxUsdDelta: number;
  stackTag: string;
}

export interface ScopeEstimateResult {
  platform: PlatformTierOption;
  selectedModules: ArchitectureModuleOption[];
  cadence: DeliveryCadenceId;
  estimatedWeeksMin: number;
  estimatedWeeksMax: number;
  estimatedBudgetMinUsd: number;
  estimatedBudgetMaxUsd: number;
  recommendedStack: string[];
  mappedServiceScope: (typeof ALLOWED_SERVICE_SCOPES)[number];
  mappedTimeline: (typeof ALLOWED_TIMELINES)[number];
  formattedBrief: string;
}

export const PLATFORM_TIERS: readonly PlatformTierOption[] = [
  {
    id: 'website',
    label: 'Editorial Flagship & Growth Website',
    shortLabel: 'Website Flagship',
    baseWeeks: 2,
    baseMinUsd: 1200,
    baseMaxUsd: 2400,
    mappedScope: 'Website Development (Next.js / Vite / Tailwind)',
    recommendedStack: ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS'],
  },
  {
    id: 'webapp',
    label: 'Full-Stack SaaS & Enterprise Web App',
    shortLabel: 'SaaS / Web App',
    baseWeeks: 4,
    baseMinUsd: 2800,
    baseMaxUsd: 5600,
    mappedScope: 'SaaS Platform (Next.js / NestJS / Neon DB & PostgreSQL)',
    recommendedStack: ['Next.js 15', 'TanStack', 'NestJS', 'Neon DB', 'PostgreSQL'],
  },
  {
    id: 'mobile',
    label: 'Cross-Platform Mobile App (iOS & Android)',
    shortLabel: 'React Native + Expo',
    baseWeeks: 4,
    baseMinUsd: 3000,
    baseMaxUsd: 6200,
    mappedScope: 'Mobile App (React Native + Expo)',
    recommendedStack: ['React Native', 'Expo Router', 'TypeScript', 'TanStack Query', 'Node.js'],
  },
  {
    id: 'ecosystem',
    label: 'Unified Web + Mobile + Admin Ecosystem',
    shortLabel: 'Web + Mobile + API',
    baseWeeks: 6,
    baseMinUsd: 5200,
    baseMaxUsd: 9800,
    mappedScope: 'Full-Stack Web App (React / TanStack / Next.js)',
    recommendedStack: ['Next.js 15', 'React Native + Expo', 'NestJS', 'Neon PostgreSQL'],
  },
] as const;

export const ARCHITECTURE_MODULES: readonly ArchitectureModuleOption[] = [
  {
    id: 'neon-postgres',
    label: 'Neon Serverless PostgreSQL',
    weeksDelta: 1,
    minUsdDelta: 450,
    maxUsdDelta: 900,
    stackTag: 'Neon DB · PostgreSQL',
  },
  {
    id: 'auth-rbac',
    label: 'Auth, Sessions & Role Access',
    weeksDelta: 1,
    minUsdDelta: 500,
    maxUsdDelta: 950,
    stackTag: 'Managed Auth · RBAC',
  },
  {
    id: 'admin-cms',
    label: 'Custom Admin Console & CMS',
    weeksDelta: 1.5,
    minUsdDelta: 750,
    maxUsdDelta: 1400,
    stackTag: 'Admin Ledger · CMS',
  },
  {
    id: 'analytics-grid',
    label: 'Executive Dashboards & TanStack Grids',
    weeksDelta: 1,
    minUsdDelta: 600,
    maxUsdDelta: 1100,
    stackTag: 'TanStack Table · Telemetry',
  },
  {
    id: 'payments-pdf',
    label: 'Billing, Webhooks & PDF Quotes',
    weeksDelta: 1,
    minUsdDelta: 550,
    maxUsdDelta: 1050,
    stackTag: 'Stripe / Razorpay · PDF Engine',
  },
] as const;

export const DELIVERY_CADENCES: ReadonlyArray<{
  id: DeliveryCadenceId;
  label: string;
  multiplier: number;
  speedRatio: number;
  mappedTimeline: (typeof ALLOWED_TIMELINES)[number];
}> = [
  {
    id: 'sprint',
    label: 'Accelerated Sprint (2–4 Wks)',
    multiplier: 1.15,
    speedRatio: 0.85,
    mappedTimeline: 'Immediate (2–4 Weeks)',
  },
  {
    id: 'standard',
    label: 'Standard Milestone (1–2 Mos)',
    multiplier: 1.0,
    speedRatio: 1.0,
    mappedTimeline: 'Standard (1–2 Months)',
  },
  {
    id: 'comprehensive',
    label: 'Enterprise Phased (3+ Mos)',
    multiplier: 0.95,
    speedRatio: 1.2,
    mappedTimeline: 'Comprehensive (3+ Months)',
  },
] as const;

export function estimateProjectScope(input: {
  platformId: PlatformTierId;
  moduleIds: string[];
  cadenceId: DeliveryCadenceId;
}): ScopeEstimateResult {
  const platform =
    PLATFORM_TIERS.find((p) => p.id === input.platformId) ?? PLATFORM_TIERS[0];
  const cadenceObj =
    DELIVERY_CADENCES.find((c) => c.id === input.cadenceId) ?? DELIVERY_CADENCES[1];

  const selectedModules = ARCHITECTURE_MODULES.filter((m) =>
    input.moduleIds.includes(m.id)
  );

  const rawWeeks =
    (platform.baseWeeks +
      selectedModules.reduce((acc, mod) => acc + mod.weeksDelta, 0)) *
    cadenceObj.speedRatio;

  const estimatedWeeksMin = Math.max(2, Math.round(rawWeeks));
  const estimatedWeeksMax = Math.max(estimatedWeeksMin + 1, Math.round(rawWeeks * 1.35));

  const rawMinUsd =
    (platform.baseMinUsd +
      selectedModules.reduce((acc, mod) => acc + mod.minUsdDelta, 0)) *
    cadenceObj.multiplier;
  const rawMaxUsd =
    (platform.baseMaxUsd +
      selectedModules.reduce((acc, mod) => acc + mod.maxUsdDelta, 0)) *
    cadenceObj.multiplier;

  const estimatedBudgetMinUsd = Math.round(rawMinUsd / 100) * 100;
  const estimatedBudgetMaxUsd = Math.round(rawMaxUsd / 100) * 100;

  const stackSet = new Set<string>(platform.recommendedStack);
  for (const mod of selectedModules) {
    stackSet.add(mod.stackTag);
  }
  const recommendedStack = Array.from(stackSet);

  const modulesText =
    selectedModules.length > 0
      ? selectedModules.map((m) => m.label).join(', ')
      : 'Core Architecture & Responsive UI';

  const formattedBrief = [
    `[Scope Estimator Configuration]`,
    `• Target Architecture: ${platform.label}`,
    `• Required Modules: ${modulesText}`,
    `• Delivery Target: ${cadenceObj.label} (~${estimatedWeeksMin}–${estimatedWeeksMax} weeks)`,
    `• Estimated Milestone Range: $${estimatedBudgetMinUsd.toLocaleString('en-US')}–$${estimatedBudgetMaxUsd.toLocaleString('en-US')}`,
    `• Core Objectives & Custom Workflows: `,
  ].join('\n');

  return {
    platform,
    selectedModules,
    cadence: cadenceObj.id,
    estimatedWeeksMin,
    estimatedWeeksMax,
    estimatedBudgetMinUsd,
    estimatedBudgetMaxUsd,
    recommendedStack,
    mappedServiceScope: platform.mappedScope,
    mappedTimeline: cadenceObj.mappedTimeline,
    formattedBrief,
  };
}
