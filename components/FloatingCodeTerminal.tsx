'use client';

import React, { useState } from 'react';
import { Check, Copy, Play, Terminal as TerminalIcon, Sparkles } from 'lucide-react';

interface CodeTab {
  id: string;
  filename: string;
  badge: string;
  lines: Array<{
    indent: number;
    tokens: Array<{ text: string; colorClass: string }>;
  }>;
  verifyOutput: string;
}

const CODE_TABS: CodeTab[] = [
  {
    id: 'architecture',
    filename: 'crosx.architecture.ts',
    badge: 'FULL-STACK',
    lines: [
      {
        indent: 0,
        tokens: [
          { text: 'const ', colorClass: 'text-[#FF4B1F] dark:text-[#FF6B45] font-semibold' },
          { text: 'developer', colorClass: 'text-[#171717] dark:text-[#F8F8F8] font-semibold' },
          { text: ' = {', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' },
        ],
      },
      {
        indent: 1,
        tokens: [
          { text: 'studio: ', colorClass: 'text-[#525252] dark:text-[#D4D4D4]' },
          {
            text: "'CROSX DEV STUDIO®'",
            colorClass: 'text-[#0D9488] dark:text-emerald-300',
          },
          { text: ',', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' },
        ],
      },
      {
        indent: 1,
        tokens: [
          { text: 'founder: ', colorClass: 'text-[#525252] dark:text-[#D4D4D4]' },
          {
            text: "'IRON CLAD (Senior Project Developer)'",
            colorClass: 'text-[#0D9488] dark:text-emerald-300',
          },
          { text: ',', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' },
        ],
      },
      {
        indent: 1,
        tokens: [
          { text: 'focus: ', colorClass: 'text-[#525252] dark:text-[#D4D4D4]' },
          { text: '[', colorClass: 'text-[#7C3AED] dark:text-violet-400' },
        ],
      },
      {
        indent: 2,
        tokens: [
          {
            text: "'Full-stack Websites & Web Apps',",
            colorClass: 'text-[#0D9488] dark:text-emerald-300',
          },
        ],
      },
      {
        indent: 2,
        tokens: [
          {
            text: "'Cross-platform Mobile Apps (Expo)',",
            colorClass: 'text-[#0D9488] dark:text-emerald-300',
          },
        ],
      },
      {
        indent: 2,
        tokens: [
          {
            text: "'Scalable APIs, SaaS & Dashboards',",
            colorClass: 'text-[#0D9488] dark:text-emerald-300',
          },
        ],
      },
      {
        indent: 2,
        tokens: [
          {
            text: "'Best-in-Class at Affordable Prices'",
            colorClass: 'text-[#FF4B1F] dark:text-[#FF7854] font-semibold',
          },
        ],
      },
      {
        indent: 1,
        tokens: [{ text: '],', colorClass: 'text-[#7C3AED] dark:text-violet-400' }],
      },
      {
        indent: 1,
        tokens: [
          { text: 'stack: ', colorClass: 'text-[#525252] dark:text-[#D4D4D4]' },
          { text: '[', colorClass: 'text-[#7C3AED] dark:text-violet-400' },
        ],
      },
      {
        indent: 2,
        tokens: [
          {
            text: "'Next.js / React / Vite / TanStack',",
            colorClass: 'text-[#0D9488] dark:text-emerald-300',
          },
        ],
      },
      {
        indent: 2,
        tokens: [
          {
            text: "'JavaScript / TypeScript / Tailwind CSS',",
            colorClass: 'text-[#0D9488] dark:text-emerald-300',
          },
        ],
      },
      {
        indent: 2,
        tokens: [
          {
            text: "'NestJS / Node.js / Neon DB / PostgreSQL',",
            colorClass: 'text-[#0D9488] dark:text-emerald-300',
          },
        ],
      },
      {
        indent: 2,
        tokens: [
          {
            text: "'React Native + Expo (iOS & Android)'",
            colorClass: 'text-[#0D9488] dark:text-emerald-300',
          },
        ],
      },
      {
        indent: 1,
        tokens: [{ text: '],', colorClass: 'text-[#7C3AED] dark:text-violet-400' }],
      },
      {
        indent: 1,
        tokens: [
          { text: 'principle: ', colorClass: 'text-[#525252] dark:text-[#D4D4D4]' },
          {
            text: "'Build reliable systems that turn complex business workflows into production-ready software.'",
            colorClass: 'text-[#B45309] dark:text-amber-300',
          },
        ],
      },
      {
        indent: 0,
        tokens: [{ text: '}', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' }],
      },
    ],
    verifyOutput: '✓ Loaded CROSX DEV STUDIO manifest (Founded by IRON CLAD) · 3 Flagships Live',
  },
  {
    id: 'mobile',
    filename: 'mobile.expo.tsx',
    badge: 'EXPO SDK 52',
    lines: [
      {
        indent: 0,
        tokens: [
          { text: 'export async function ', colorClass: 'text-[#FF4B1F] dark:text-[#FF6B45] font-semibold' },
          { text: 'bootMobileClient', colorClass: 'text-[#171717] dark:text-[#F8F8F8] font-semibold' },
          { text: '() {', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' },
        ],
      },
      {
        indent: 1,
        tokens: [
          { text: 'const ', colorClass: 'text-[#FF4B1F] dark:text-[#FF6B45]' },
          { text: 'runtime = ', colorClass: 'text-[#171717] dark:text-[#F8F8F8]' },
          { text: "'React Native + Expo SDK 52'", colorClass: 'text-[#0D9488] dark:text-emerald-300' },
        ],
      },
      {
        indent: 1,
        tokens: [
          { text: 'const ', colorClass: 'text-[#FF4B1F] dark:text-[#FF6B45]' },
          { text: 'targets = [', colorClass: 'text-[#171717] dark:text-[#F8F8F8]' },
          { text: "'iOS App Store', 'Google Play'", colorClass: 'text-[#0D9488] dark:text-emerald-300' },
          { text: ']', colorClass: 'text-[#171717] dark:text-[#F8F8F8]' },
        ],
      },
      {
        indent: 1,
        tokens: [
          { text: 'return ', colorClass: 'text-[#FF4B1F] dark:text-[#FF6B45]' },
          {
            text: '{ fps: 60, offlineFirst: true, otaUpdates: true }',
            colorClass: 'text-[#B45309] dark:text-amber-300',
          },
        ],
      },
      {
        indent: 0,
        tokens: [{ text: '}', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' }],
      },
    ],
    verifyOutput: '✓ Expo universal bundle verified (iOS + Android · 60fps native bridge)',
  },
  {
    id: 'database',
    filename: 'neon.postgres.ts',
    badge: 'NEON DB',
    lines: [
      {
        indent: 0,
        tokens: [
          { text: 'export const ', colorClass: 'text-[#FF4B1F] dark:text-[#FF6B45] font-semibold' },
          { text: 'dataLayer', colorClass: 'text-[#171717] dark:text-[#F8F8F8] font-semibold' },
          { text: ' = {', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' },
        ],
      },
      {
        indent: 1,
        tokens: [
          { text: 'engine: ', colorClass: 'text-[#525252] dark:text-[#D4D4D4]' },
          { text: "'Neon Serverless PostgreSQL 17'", colorClass: 'text-[#0D9488] dark:text-emerald-300' },
          { text: ',', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' },
        ],
      },
      {
        indent: 1,
        tokens: [
          { text: 'api: ', colorClass: 'text-[#525252] dark:text-[#D4D4D4]' },
          { text: "'NestJS + Node.js + TanStack Query'", colorClass: 'text-[#0D9488] dark:text-emerald-300' },
          { text: ',', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' },
        ],
      },
      {
        indent: 1,
        tokens: [
          { text: 'liveSystems: [', colorClass: 'text-[#525252] dark:text-[#D4D4D4]' },
          {
            text: "'crosx.in', 'rca.crosx.in', 'sohanpipeline.in'",
            colorClass: 'text-[#B45309] dark:text-amber-300',
          },
          { text: ']', colorClass: 'text-[#525252] dark:text-[#D4D4D4]' },
        ],
      },
      {
        indent: 0,
        tokens: [{ text: '}', colorClass: 'text-[#666666] dark:text-[#A1A1A1]' }],
      },
    ],
    verifyOutput: '✓ Neon PostgreSQL & NestJS API health check: 200 OK (11ms p95)',
  },
];

export const FloatingCodeTerminal = React.memo(function FloatingCodeTerminal({
  compact = true,
}: {
  compact?: boolean;
}) {
  const [activeTabId, setActiveTabId] = useState<string>(CODE_TABS[0].id);
  const [copied, setCopied] = useState(false);
  const [runCount, setRunCount] = useState(1);
  const [expanded, setExpanded] = useState(!compact);

  const activeTab = CODE_TABS.find((t) => t.id === activeTabId) ?? CODE_TABS[0];
  const visibleLines = expanded ? activeTab.lines : activeTab.lines.slice(0, 7);

  const handleCopy = () => {
    const plainText = activeTab.lines
      .map((l) => '  '.repeat(l.indent) + l.tokens.map((t) => t.text).join(''))
      .join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(plainText).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      data-testid="floating-code-terminal"
      className="relative w-full rounded-2xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF]/95 dark:bg-[#111111]/95 shadow-[0_20px_50px_-18px_rgba(23,23,23,0.1)] dark:shadow-[0_24px_60px_-16px_rgba(0,0,0,0.85)] overflow-hidden transition-colors duration-200"
    >
      {/* Top Cinematic Accent Line */}
      <div
        aria-hidden="true"
        className="h-[2px] w-full bg-gradient-to-r from-[#FF4B1F] via-[#F04424] to-[#9B63F5]"
      />

      {/* Top Window Chrome & Interactive File Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] dark:border-[#242424] bg-[#FAF9F6] dark:bg-[#0B0B0B] px-3.5 py-2">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full">
          <div className="hidden sm:flex items-center gap-1.5 pr-2 border-r border-[#E5E2DC] dark:border-[#262626]">
            <span className="h-2 w-2 rounded-full bg-[#FF4B1F]" />
            <span className="h-2 w-2 rounded-full bg-amber-400/80" />
            <span className="h-2 w-2 rounded-full bg-emerald-500/80" />
          </div>
          <div role="tablist" aria-label="Studio architecture files" className="flex items-center gap-1">
            {CODE_TABS.map((tab) => {
              const selected = tab.id === activeTab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`px-2.5 py-1 rounded-full text-[10.5px] font-mono transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                    selected
                      ? 'bg-[#171717] text-[#FAF9F6] dark:bg-[#FF4B1F] dark:text-white font-semibold shadow-2xs'
                      : 'text-[#666666] dark:text-[#A1A1A1] hover:text-[#171717] dark:hover:text-white'
                  }`}
                >
                  {tab.filename}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {compact && activeTab.lines.length > 7 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded-full border border-[#E5E2DC] dark:border-[#2A2A2A] bg-white dark:bg-[#171717] px-2.5 py-0.5 text-[10px] font-mono text-[#666666] dark:text-[#A1A1A1] hover:text-[#FF4B1F] dark:hover:text-white transition-colors cursor-pointer"
            >
              {expanded ? 'Collapse' : 'Full Spec'}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy code snippet"
            className="inline-flex items-center gap-1 rounded-full border border-[#E5E2DC] dark:border-[#2A2A2A] bg-white dark:bg-[#171717] px-2.5 py-0.5 text-[10px] font-mono text-[#171717] dark:text-[#E5E5E5] hover:border-[#FF4B1F] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-emerald-500" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setRunCount((c) => c + 1)}
            aria-label="Verify architecture module"
            className="inline-flex items-center gap-1 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] px-2.5 py-0.5 text-[10px] font-mono font-semibold text-white transition-colors cursor-pointer"
          >
            <Play className="h-2.5 w-2.5 fill-current" />
            <span>Verify</span>
          </button>
        </div>
      </div>

      {/* Supporting Code Body */}
      <div className="p-3.5 sm:px-4 sm:py-3 font-mono text-[11px] sm:text-[11.5px] leading-[1.58] overflow-x-auto bg-[#FFFFFF] dark:bg-[#111111]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#F2EFE9] dark:border-[#1E1E1E] text-[9.5px] text-[#666666] dark:text-[#A1A1A1]">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-[#FF4B1F]" />
            <span>SUPPORTING RUNTIME MANIFEST · {activeTab.badge}</span>
          </span>
          <span>TS 5.8 · UTF-8</span>
        </div>

        {visibleLines.map((line, idx) => (
          <div
            key={idx}
            className="whitespace-pre-wrap break-words flex items-start gap-2.5"
          >
            <span
              aria-hidden="true"
              className="select-none text-[9.5px] text-[#A1A1A1] dark:text-[#525252] w-4 text-right shrink-0 pt-0.5"
            >
              {String(idx + 1).padStart(2, '0')}
            </span>
            <div style={{ paddingLeft: `${line.indent * 0.95}rem` }} className="min-w-0 flex-1">
              {line.tokens.map((token, tIdx) => (
                <span key={tIdx} className={token.colorClass}>
                  {token.text}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Live Verification Status Bar */}
      <div className="flex items-center justify-between gap-2 border-t border-[#E5E2DC] dark:border-[#242424] bg-[#FAF9F6] dark:bg-[#0B0B0B] px-3.5 py-1.5 text-[10.5px] font-mono">
        <span className="inline-flex items-center gap-1.5 text-[#171717] dark:text-[#E5E5E5] truncate">
          <TerminalIcon className="h-3 w-3 text-[#FF4B1F] shrink-0" />
          <span className="truncate">{activeTab.verifyOutput}</span>
        </span>
        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0">
          ● Run #{runCount}
        </span>
      </div>
    </div>
  );
});
