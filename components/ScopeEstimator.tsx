'use client';

import React, { useMemo, useState } from 'react';
import {
  PLATFORM_TIERS,
  ARCHITECTURE_MODULES,
  DELIVERY_CADENCES,
  estimateProjectScope,
  type PlatformTierId,
  type DeliveryCadenceId,
  type ScopeEstimateResult,
} from '@/lib/scope-estimator';
import { GsapMagnetic } from '@/components/ReactBitsEffects';
import { ParallaxSection } from '@/components/ParallaxSection';
import { Calculator, Check, ArrowRight, Layers, Clock, DollarSign } from 'lucide-react';

interface ScopeEstimatorProps {
  onApplyScope: (estimate: ScopeEstimateResult) => void;
}

export const ScopeEstimator = React.memo(function ScopeEstimator({
  onApplyScope,
}: ScopeEstimatorProps) {
  const [platformId, setPlatformId] = useState<PlatformTierId>('webapp');
  const [moduleIds, setModuleIds] = useState<string[]>(['neon-postgres', 'auth-rbac']);
  const [cadenceId, setCadenceId] = useState<DeliveryCadenceId>('standard');

  const estimate = useMemo(
    () =>
      estimateProjectScope({
        platformId,
        moduleIds,
        cadenceId,
      }),
    [platformId, moduleIds, cadenceId]
  );

  const toggleModule = (modId: string) => {
    setModuleIds((prev) =>
      prev.includes(modId) ? prev.filter((id) => id !== modId) : [...prev, modId]
    );
  };

  return (
    <ParallaxSection
      id="estimator"
      ariaLabelledBy="estimator-heading"
      offsetPx={20}
      className="py-16 sm:py-24 bg-[#FFFFFF] dark:bg-[#0B0B0B] text-[#171717] dark:text-[#F8F8F8] border-t border-[#E5E2DC] dark:border-[#242424]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mb-10">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-[#FF4B1F] font-semibold mb-2">
            <Calculator className="h-3.5 w-3.5" />
            <span>07 — INTERACTIVE ARCHITECTURE &amp; SPRINT ESTIMATOR</span>
          </div>
          <h2
            id="estimator-heading"
            className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display leading-[1.04]"
          >
            Scope Your System.{' '}
            <span className="font-serif-editorial italic font-normal text-[#FF4B1F]">
              Transparent Estimates.
            </span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#666666] dark:text-[#A1A1A1] leading-relaxed">
            Configure your target platform, technical modules, and sprint cadence below, then lock your blueprint directly into the project specification ledger.
          </p>
        </div>

        <div
          data-testid="scope-estimator-card"
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 rounded-[28px] border border-[#E5E2DC] dark:border-[#242424] bg-[#FAF9F6] dark:bg-[#111111] p-6 sm:p-8 lg:p-10 shadow-[0_24px_70px_-20px_rgba(23,23,23,0.06)] dark:shadow-[0_28px_80px_-20px_rgba(0,0,0,0.75)]"
        >
          {/* Left 7 Columns: 3-Step Configuration */}
          <div className="lg:col-span-7 space-y-7">
            {/* Step 1: Target Platform */}
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider font-semibold text-[#171717] dark:text-white">
                Step 01 · Select Target Platform Architecture
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORM_TIERS.map((tier) => {
                  const selected = tier.id === platformId;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      aria-pressed={selected}
                      data-testid={`estimator-platform-${tier.id}`}
                      onClick={() => setPlatformId(tier.id)}
                      className={`text-left rounded-2xl border p-4 transition-all cursor-pointer ${
                        selected
                          ? 'border-[#FF4B1F] bg-[#FF4B1F] text-white shadow-sm'
                          : 'border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#171717] text-[#171717] dark:text-[#F8F8F8] hover:border-[#FF4B1F]'
                      }`}
                    >
                      <span
                        className={`block text-[10px] font-mono uppercase tracking-wider font-semibold ${
                          selected ? 'text-white/85' : 'text-[#FF4B1F]'
                        }`}
                      >
                        {tier.shortLabel}
                      </span>
                      <span className="mt-1 block text-sm font-bold font-display leading-snug">
                        {tier.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Technical Modules */}
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider font-semibold text-[#171717] dark:text-white">
                Step 02 · Toggle Production Modules ({moduleIds.length} selected)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ARCHITECTURE_MODULES.map((mod) => {
                  const checked = moduleIds.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      aria-pressed={checked}
                      data-testid={`estimator-module-${mod.id}`}
                      onClick={() => toggleModule(mod.id)}
                      className={`text-left rounded-xl border px-3.5 py-3 flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                        checked
                          ? 'border-[#FF4B1F] bg-[#FF4B1F]/10 text-[#171717] dark:text-white'
                          : 'border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#171717] text-[#525252] dark:text-[#A1A1A1] hover:border-[#FF4B1F]/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <span className="block text-xs font-semibold truncate">
                          {mod.label}
                        </span>
                        <span className="block text-[10px] font-mono text-[#FF4B1F]">
                          +{mod.minUsdDelta}–{mod.maxUsdDelta} USD
                        </span>
                      </div>
                      <span
                        className={`inline-flex h-5 w-5 items-center justify-center rounded-md border shrink-0 ${
                          checked
                            ? 'bg-[#FF4B1F] border-[#FF4B1F] text-white'
                            : 'border-[#D4D4D4] dark:border-[#333333] bg-transparent'
                        }`}
                      >
                        {checked && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Delivery Cadence */}
            <div className="space-y-3">
              <p className="text-xs font-mono uppercase tracking-wider font-semibold text-[#171717] dark:text-white">
                Step 03 · Delivery Velocity &amp; Cadence
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {DELIVERY_CADENCES.map((cad) => {
                  const active = cad.id === cadenceId;
                  return (
                    <button
                      key={cad.id}
                      type="button"
                      aria-pressed={active}
                      data-testid={`estimator-cadence-${cad.id}`}
                      onClick={() => setCadenceId(cad.id)}
                      className={`text-left rounded-xl border px-3.5 py-3 text-xs font-mono transition-all cursor-pointer ${
                        active
                          ? 'border-[#FF4B1F] bg-[#FF4B1F]/10 text-[#C82808] dark:bg-[#FF4B1F] dark:text-white font-semibold'
                          : 'border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#171717] text-[#666666] dark:text-[#A1A1A1] hover:border-[#FF4B1F]'
                      }`}
                    >
                      {cad.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 Columns: Live Architectural Estimate Output (Dual-Theme Parity) */}
          <div className="lg:col-span-5 rounded-[24px] bg-[#FFFFFF] dark:bg-[#0B0B0B] text-[#171717] dark:text-white border border-[#E5E2DC] dark:border-[#262626] p-5 sm:p-7 flex flex-col justify-between gap-6 shadow-[0_18px_50px_-18px_rgba(23,23,23,0.08)] dark:shadow-xl">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] dark:border-white/10 pb-4">
                <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-[#FF4B1F] dark:text-[#FF6B45] font-semibold">
                  LIVE ESTIMATE BLUEPRINT
                </span>
                <span className="text-[11px] font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  Fixed-Scope Milestone
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#E5E2DC] dark:border-white/10 bg-[#FAF9F6] dark:bg-[#141414] p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#666666] dark:text-[#A1A1A1]">
                    <Clock className="h-3 w-3 text-[#FF4B1F]" />
                    <span>Delivery Horizon</span>
                  </div>
                  <p
                    data-testid="estimator-weeks-output"
                    className="mt-1.5 text-lg sm:text-xl font-extrabold font-display tabular-nums whitespace-nowrap text-[#171717] dark:text-white"
                  >
                    {estimate.estimatedWeeksMin}–{estimate.estimatedWeeksMax} Wks
                  </p>
                </div>

                <div className="rounded-xl border border-[#E5E2DC] dark:border-white/10 bg-[#FAF9F6] dark:bg-[#141414] p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase text-[#666666] dark:text-[#A1A1A1]">
                    <DollarSign className="h-3 w-3 text-[#FF4B1F]" />
                    <span>Estimated Range</span>
                  </div>
                  <p
                    data-testid="estimator-budget-output"
                    className="mt-1.5 text-lg sm:text-xl font-extrabold font-display tabular-nums whitespace-nowrap text-[#FF4B1F]"
                  >
                    ${estimate.estimatedBudgetMinUsd.toLocaleString('en-US')}–$
                    {estimate.estimatedBudgetMaxUsd.toLocaleString('en-US')}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                  <Layers className="h-3.5 w-3.5 text-[#FF4B1F]" />
                  <span>Recommended Stack Signature</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {estimate.recommendedStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-md border border-[#E5E2DC] dark:border-white/15 bg-[#FAF9F6] dark:bg-white/[0.06] px-2.5 py-1 text-[10.5px] font-mono text-[#171717] dark:text-white/90"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E2DC] dark:border-white/10 bg-[#FAF9F6] dark:bg-[#121212] p-3.5 text-xs font-mono text-[#525252] dark:text-[#D4D4D4] leading-relaxed">
                <span className="text-[#FF4B1F] dark:text-[#FF6B45] block mb-1 font-semibold">
                  Mapped Ledger Scope:
                </span>
                <span>{estimate.mappedServiceScope}</span>
              </div>
            </div>

            <GsapMagnetic strength={0.16} className="w-full">
              <button
                type="button"
                data-testid="estimator-lock-scope-btn"
                onClick={() => onApplyScope(estimate)}
                className="cta-tactile-primary w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white px-6 py-3.5 text-xs font-mono uppercase tracking-wider font-bold cursor-pointer"
              >
                <span>Lock Scope into Brief</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </GsapMagnetic>
          </div>
        </div>
      </div>
    </ParallaxSection>
  );
});
