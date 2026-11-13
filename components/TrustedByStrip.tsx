import React from 'react';
import {
  Globe,
  Terminal,
  Layers,
  Zap,
  Code2,
  Server,
  Database,
  Smartphone,
} from 'lucide-react';

interface TrustedLogoItem {
  id: string;
  name: string;
  category: string;
  href?: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TRUSTED_PARTNERS_AND_STACK: readonly TrustedLogoItem[] = [
  {
    id: 'crosx',
    name: 'CrosX',
    category: 'Growth Platform',
    href: 'https://crosx.in',
    Icon: Globe,
  },
  {
    id: 'crosx-rca',
    name: 'CrosX RCA',
    category: 'Forensics SaaS',
    href: 'https://rca.crosx.in',
    Icon: Terminal,
  },
  {
    id: 'sohan-pipelines',
    name: 'Sohan Pipelines',
    category: 'Dispatch Portal',
    href: 'https://sohanpipeline.in',
    Icon: Layers,
  },
  {
    id: 'nextjs',
    name: 'Next.js 15',
    category: 'Web Architecture',
    Icon: Zap,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    category: 'Strict Systems',
    Icon: Code2,
  },
  {
    id: 'nestjs',
    name: 'NestJS',
    category: 'Modular APIs',
    Icon: Server,
  },
  {
    id: 'neon-postgres',
    name: 'Neon Postgres',
    category: 'Serverless SQL',
    Icon: Database,
  },
  {
    id: 'react-native-expo',
    name: 'Expo Mobile',
    category: 'React Native',
    Icon: Smartphone,
  },
];

export const TrustedByStrip = React.memo(function TrustedByStrip() {
  return (
    <section
      aria-labelledby="trusted-by-heading"
      data-testid="trusted-by-section"
      className="bg-[#F7F7F9] dark:bg-[#090909] text-[#111111] dark:text-[#F8F8F8] border-t border-[#E5E2DC] dark:border-[#222222] pt-10 sm:pt-14 pb-2 sm:pb-4 transition-colors"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[26px] sm:rounded-[32px] bg-[#FFFFFF] dark:bg-[#111113] border border-[#ECECEF] dark:border-[#242424] px-5 py-7 sm:px-10 sm:py-9 shadow-[0_18px_50px_-18px_rgba(17,17,26,0.06)] dark:shadow-[0_22px_60px_-20px_rgba(0,0,0,0.7)]">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-6 border-b border-[#EFEFF2] dark:border-[#222225]">
            <h2
              id="trusted-by-heading"
              className="text-xl sm:text-2xl font-bold font-display tracking-tight text-[#111111] dark:text-white"
            >
              Trusted By
            </h2>
            <p className="text-xs sm:text-[13px] text-[#686870] dark:text-[#A1A1AA]">
              Production client platforms &amp; core full-stack infrastructure
            </p>
          </div>

          {/* Unified Architectural Hairline Grayscale Logo Grid */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden bg-[#ECECEF] dark:bg-[#222225] border border-[#ECECEF] dark:border-[#222225]">
            {TRUSTED_PARTNERS_AND_STACK.map((item) => {
              const Icon = item.Icon;
              const innerContent = (
                <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                  <span className="inline-flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl border border-[#E6E6EA] dark:border-[#2A2A2E] bg-[#F7F7F9] dark:bg-[#18181B] text-[#52525B] dark:text-[#A1A1AA] group-hover:text-[#111111] dark:group-hover:text-white transition-colors duration-150">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate text-xs sm:text-[13.5px] font-bold font-display tracking-tight text-[#27272A] dark:text-[#E4E4E7] group-hover:text-[#09090B] dark:group-hover:text-white transition-colors duration-150">
                      {item.name}
                    </span>
                    <span className="block truncate text-[10.5px] sm:text-[11px] font-mono text-[#71717A] dark:text-[#8E8E95]">
                      {item.category}
                    </span>
                  </div>
                </div>
              );

              if (item.href) {
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid={`trusted-logo-${item.id}`}
                    className="group bg-[#FFFFFF] dark:bg-[#111113] hover:bg-[#FAF9FB] dark:hover:bg-[#161619] px-3.5 py-3.5 sm:px-5 sm:py-4.5 grayscale opacity-75 hover:opacity-100 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#FF4B1F]"
                  >
                    {innerContent}
                  </a>
                );
              }

              return (
                <div
                  key={item.id}
                  data-testid={`trusted-logo-${item.id}`}
                  className="group bg-[#FFFFFF] dark:bg-[#111113] hover:bg-[#FAF9FB] dark:hover:bg-[#161619] px-3.5 py-3.5 sm:px-5 sm:py-4.5 grayscale opacity-75 hover:opacity-100 transition-all duration-150"
                >
                  {innerContent}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
});
