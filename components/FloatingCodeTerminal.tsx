'use client';

import React, { useState } from 'react';
import { TERMINAL_TABS } from '@/lib/studio-data';
import { Terminal, Play, CheckCircle2, Copy, Check } from 'lucide-react';

export const FloatingCodeTerminal = React.memo(function FloatingCodeTerminal() {
  const [activeTabId, setActiveTabId] = useState<string>(TERMINAL_TABS[0].id);
  const [copied, setCopied] = useState(false);
  const [executionCount, setExecutionCount] = useState(1);

  const activeTab = TERMINAL_TABS.find((t) => t.id === activeTabId) ?? TERMINAL_TABS[0];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeTab.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleRunDiagnostics = () => {
    setExecutionCount((c) => c + 1);
  };

  return (
    <div
      data-testid="floating-code-terminal"
      className="relative rounded-lg border border-[#C8C2B5] dark:border-[#1E2436] bg-[#FDFCF9] dark:bg-[#0A0E19] shadow-[0_12px_30px_-10px_rgba(17,17,16,0.08)] dark:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)] overflow-hidden"
    >
      {/* Top 1px precision accent line — no blur or glow artifacts */}
      <div className="h-[1px] w-full bg-[#2544E8]/60 dark:bg-[#4F6BFF]/50" />

      {/* Header & File Selector Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DED9CE] dark:border-[#1A2030] bg-[#F5F3EE] dark:bg-[#0D1220] px-3.5 py-2.5">
        <div
          role="tablist"
          aria-label="Engineering specification files"
          className="flex flex-wrap items-center gap-1"
        >
          {TERMINAL_TABS.map((tab) => {
            const isSelected = tab.id === activeTab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={isSelected}
                onClick={() => setActiveTabId(tab.id)}
                className={`px-3 py-1 text-[11px] font-mono rounded-full transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white font-medium shadow-sm'
                    : 'text-[#5C5952] dark:text-[#949CB0] hover:text-[#111110] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {tab.filename}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyCode}
            aria-label={`Copy ${activeTab.filename} code`}
            className="cta-tactile-secondary inline-flex items-center gap-1.5 rounded-full border border-[#C8C2B5] dark:border-[#252C40] bg-[#FDFCF9] dark:bg-[#121829] px-3 py-1 text-[11px] font-mono text-[#111110] dark:text-[#D5DBE8] hover:border-[#2544E8] dark:hover:border-[#6E88FF] whitespace-nowrap shrink-0 cursor-pointer"
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
            onClick={handleRunDiagnostics}
            className="cta-tactile-primary inline-flex items-center gap-1.5 rounded-full bg-[#2544E8] px-3 py-1 text-[11px] font-mono font-medium text-white hover:bg-[#1D36BD] whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="h-2.5 w-2.5 fill-current" />
            <span>Verify</span>
          </button>
        </div>
      </div>

      {/* Code Viewport — Crisp syntax formatting with zero backdrop-blur or glow bleed */}
      <div className="relative p-4 sm:p-5 bg-[#FDFCF9] dark:bg-[#090D17] overflow-x-auto">
        {activeTab.id === 'architecture' ? (
          <div className="text-xs sm:text-[12.5px] leading-[1.68] font-mono select-all space-y-0.5 min-w-[280px]">
            <div>
              <span className="text-rose-600 dark:text-rose-400">const</span>{' '}
              <span className="text-[#2544E8] dark:text-[#7C93FF] font-semibold">developer</span>{' '}
              <span className="text-[#6E6A61] dark:text-slate-400">=</span>{' '}
              <span className="text-amber-700 dark:text-amber-300">{'{'}</span>
            </div>

            <div className="pl-4">
              <span className="text-sky-700 dark:text-sky-300">studio:</span>{' '}
              <span className="text-emerald-700 dark:text-emerald-400">
                &apos;CROSX DEV STUDIO®&apos;
              </span>
              <span className="text-slate-400">,</span>
            </div>

            <div className="pl-4">
              <span className="text-sky-700 dark:text-sky-300">founder:</span>{' '}
              <span className="text-emerald-700 dark:text-emerald-400">
                &apos;IRON CLAD (Senior Project Developer)&apos;
              </span>
              <span className="text-slate-400">,</span>
            </div>

            <div className="pl-4">
              <span className="text-sky-700 dark:text-sky-300">focus:</span>{' '}
              <span className="text-purple-700 dark:text-purple-300">[</span>
            </div>
            <div className="pl-7 text-emerald-700 dark:text-emerald-400">
              <div>&apos;Full-stack Websites &amp; Web Apps&apos;,</div>
              <div>&apos;Cross-platform Mobile Apps (Expo)&apos;,</div>
              <div>&apos;Scalable APIs, SaaS &amp; Dashboards&apos;,</div>
              <div>&apos;Best-in-Class at Affordable Prices&apos;</div>
            </div>
            <div className="pl-4">
              <span className="text-purple-700 dark:text-purple-300">]</span>
              <span className="text-slate-400">,</span>
            </div>

            <div className="pl-4">
              <span className="text-sky-700 dark:text-sky-300">stack:</span>{' '}
              <span className="text-purple-700 dark:text-purple-300">[</span>
            </div>
            <div className="pl-7 text-emerald-700 dark:text-emerald-400">
              <div>&apos;Next.js / React / Vite / TanStack&apos;,</div>
              <div>&apos;JavaScript / TypeScript / Tailwind CSS&apos;,</div>
              <div>&apos;NestJS / Node.js / Neon DB / PostgreSQL&apos;,</div>
              <div>&apos;React Native + Expo (iOS &amp; Android)&apos;</div>
            </div>
            <div className="pl-4">
              <span className="text-purple-700 dark:text-purple-300">]</span>
              <span className="text-slate-400">,</span>
            </div>

            <div className="pl-4">
              <span className="text-sky-700 dark:text-sky-300">principle:</span>{' '}
              <span className="text-amber-800 dark:text-amber-300">
                &apos;Build reliable systems that turn complex business workflows into production-ready software.&apos;
              </span>
            </div>

            <div>
              <span className="text-amber-700 dark:text-amber-300">{'}'}</span>
            </div>
          </div>
        ) : (
          <pre className="overflow-x-auto text-xs sm:text-[12.5px] leading-relaxed font-mono text-[#1C1B19] dark:text-[#E5E9F2] select-all">
            <code>{activeTab.code}</code>
          </pre>
        )}
      </div>

      {/* Compact Live Verification Bar */}
      <div className="border-t border-[#DED9CE] dark:border-[#1A2030] bg-[#F5F3EE] dark:bg-[#0D1220] px-4 py-2.5 flex items-center justify-between text-[11px] font-mono">
        <span className="inline-flex items-center gap-1.5 text-[#2544E8] dark:text-[#7C93FF] truncate">
          <Terminal className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{activeTab.outputLines[0]}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 shrink-0 ml-2">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Run #{executionCount}</span>
        </span>
      </div>
    </div>
  );
});
