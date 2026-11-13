'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import type { ProjectCaseStudy } from '@/lib/studio-data';
import {
  X,
  ArrowUpRight,
  CheckCircle2,
  Layers,
  Monitor,
  Camera,
  Cpu,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Server,
  LayoutGrid,
} from 'lucide-react';

interface ProjectCaseStudyModalProps {
  project: ProjectCaseStudy | null;
  projects?: ProjectCaseStudy[];
  onClose: () => void;
  onSelectForInquiry: (projectTitle: string) => void;
  onSelectProject?: (project: ProjectCaseStudy) => void;
}

export function ProjectCaseStudyModal({
  project,
  projects = [],
  onClose,
  onSelectForInquiry,
  onSelectProject,
}: ProjectCaseStudyModalProps) {
  const [activeVisualMode, setActiveVisualMode] = useState<'live' | 'studio' | 'architecture'>(
    'live'
  );

  const currentIdx =
    project && projects.length > 0
      ? projects.findIndex((p) => p.id === project.id)
      : -1;
  const hasSiblingNavigation = projects.length > 1 && currentIdx >= 0 && Boolean(onSelectProject);

  const handleStepSibling = (delta: 1 | -1) => {
    if (!hasSiblingNavigation || !onSelectProject) return;
    const nextIdx = (currentIdx + delta + projects.length) % projects.length;
    onSelectProject(projects[nextIdx]);
  };

  useEffect(() => {
    if (!project) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' && hasSiblingNavigation && onSelectProject) {
        const nextIdx = (currentIdx + 1) % projects.length;
        onSelectProject(projects[nextIdx]);
      } else if (e.key === 'ArrowLeft' && hasSiblingNavigation && onSelectProject) {
        const prevIdx = (currentIdx - 1 + projects.length) % projects.length;
        onSelectProject(projects[prevIdx]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, onClose, hasSiblingNavigation, currentIdx, projects, onSelectProject]);

  if (!project) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-study-modal-title"
      data-testid="case-study-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0E0E0E] text-[#171717] dark:text-[#F8F8F8] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6]/95 dark:bg-[#0E0E0E]/95 backdrop-blur-md px-5 py-4 sm:px-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-[#FF4B1F] font-bold uppercase tracking-wider">
              CASE DOSSIER {project.index}
            </span>
            <span className="text-[#666666] dark:text-[#A1A1A1]">·</span>
            <span className="text-[#171717] dark:text-[#F8F8F8] font-medium">
              {project.category}
            </span>
            <span className="text-[#666666] dark:text-[#A1A1A1]">·</span>
            <span className="text-[#FF4B1F] font-semibold">{project.displayUrl}</span>
          </div>

          <div className="flex items-center gap-2">
            {hasSiblingNavigation && (
              <div className="inline-flex items-center gap-1 mr-1">
                <button
                  type="button"
                  data-testid="modal-prev-project"
                  onClick={() => handleStepSibling(-1)}
                  aria-label="Previous case study dossier"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E2DC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#171717] dark:text-white hover:border-[#FF4B1F] transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-testid="modal-next-project"
                  onClick={() => handleStepSibling(1)}
                  aria-label="Next case study dossier"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E2DC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#171717] dark:text-white hover:border-[#FF4B1F] transition-colors cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close case study dossier"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E2DC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3.5 py-1.5 text-xs font-mono text-[#171717] dark:text-[#F8F8F8] hover:border-[#FF4B1F] transition-colors cursor-pointer"
            >
              <span>ESC</span>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-8 space-y-8">
          {/* Interactive 3-Tab Dossier Stage: Live View / Studio Display / System Architecture */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Case study presentation modes" className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeVisualMode === 'live'}
                  onClick={() => setActiveVisualMode('live')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                    activeVisualMode === 'live'
                      ? 'bg-[#FF4B1F] text-white font-semibold'
                      : 'border border-[#E5E2DC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#666666] dark:text-[#A1A1A1]'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                  <span>Live Production View</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeVisualMode === 'studio'}
                  onClick={() => setActiveVisualMode('studio')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                    activeVisualMode === 'studio'
                      ? 'bg-[#FF4B1F] text-white font-semibold'
                      : 'border border-[#E5E2DC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#666666] dark:text-[#A1A1A1]'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Studio Presentation</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeVisualMode === 'architecture'}
                  data-testid="modal-tab-architecture"
                  onClick={() => setActiveVisualMode('architecture')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono transition-colors cursor-pointer ${
                    activeVisualMode === 'architecture'
                      ? 'bg-[#FF4B1F] text-white font-semibold'
                      : 'border border-[#E5E2DC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#666666] dark:text-[#A1A1A1]'
                  }`}
                >
                  <Cpu className="h-3.5 w-3.5" />
                  <span>System Architecture</span>
                </button>
              </div>

              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                ● Live Production Verified
              </span>
            </div>

            {activeVisualMode === 'architecture' ? (
              <div
                data-testid="modal-architecture-panel"
                className="rounded-2xl border border-[#E5E2DC] dark:border-[#262626] bg-[#FFFFFF] dark:bg-[#0B0B0B] text-[#171717] dark:text-white p-6 sm:p-8 space-y-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E2DC] dark:border-white/10 pb-4">
                  <span className="text-xs font-mono uppercase tracking-[0.18em] text-[#FF4B1F] dark:text-[#FF6B45] font-semibold">
                    THREE-TIER TOPOLOGY · {project.displayUrl}
                  </span>
                  <span className="text-xs font-mono text-[#666666] dark:text-[#A1A1A1]">
                    {project.deliverables.length} Shipped Deliverables
                  </span>
                </div>

                {/* Layered System Topology */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-[#E5E2DC] dark:border-white/12 bg-[#FAF9F6] dark:bg-[#141414] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#FF4B1F] dark:text-[#FF6B45] font-semibold">
                      <LayoutGrid className="h-4 w-4" />
                      <span>01 · Edge &amp; UI Layer</span>
                    </div>
                    <p className="text-xs text-[#525252] dark:text-[#D4D4D4] leading-relaxed">
                      {project.deliverables[0] || 'Responsive Web Interface'} powered by{' '}
                      {project.stack.slice(0, 3).join(', ')}.
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#E5E2DC] dark:border-white/12 bg-[#FAF9F6] dark:bg-[#141414] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#FF4B1F] dark:text-[#FF6B45] font-semibold">
                      <Server className="h-4 w-4" />
                      <span>02 · Orchestration &amp; API</span>
                    </div>
                    <p className="text-xs text-[#525252] dark:text-[#D4D4D4] leading-relaxed">
                      {project.engineeringHighlights[0] || project.architectureOverview}
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#E5E2DC] dark:border-white/12 bg-[#FAF9F6] dark:bg-[#141414] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-mono text-[#FF4B1F] dark:text-[#FF6B45] font-semibold">
                      <ShieldCheck className="h-4 w-4" />
                      <span>03 · Security &amp; Persistence</span>
                    </div>
                    <p className="text-xs text-[#525252] dark:text-[#D4D4D4] leading-relaxed">
                      {project.engineeringHighlights[2] ||
                        project.engineeringHighlights[1] ||
                        project.architectureOverview}
                    </p>
                  </div>
                </div>

                {/* Challenge -> Decision -> Shipped Outcome Triad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E5E2DC] dark:border-white/10">
                  <div>
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                      Core Challenge
                    </span>
                    <p className="mt-1 text-xs text-[#171717] dark:text-white/90 leading-relaxed">
                      {project.summary}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                      Architectural Decision
                    </span>
                    <p className="mt-1 text-xs text-[#171717] dark:text-white/90 leading-relaxed">
                      {project.architectureOverview}
                    </p>
                  </div>
                  <div>
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-[#FF4B1F] dark:text-[#FF6B45]">
                      Shipped Deliverables
                    </span>
                    <p className="mt-1 text-xs text-[#171717] dark:text-white font-medium leading-relaxed">
                      {project.deliverables.join(' · ')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[#E5E2DC] dark:border-[#262626] bg-[#090909]">
                <Image
                  src={activeVisualMode === 'live' ? project.liveScreenshot : project.studioVisual}
                  alt={`${project.title} ${
                    activeVisualMode === 'live'
                      ? 'live production screenshot'
                      : 'studio presentation'
                  }`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 960px"
                  referrerPolicy="no-referrer"
                  className="object-cover object-top"
                />
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/80 backdrop-blur-md px-4 py-2.5 text-xs font-mono text-white border border-white/10">
                  <span>
                    {project.title} — {project.url}
                  </span>
                  <span className="text-[#FF4B1F] font-semibold">
                    {project.category}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Title & Executive Summary */}
          <div className="border-b border-[#E5E2DC] dark:border-[#262626] pb-6">
            <h2
              id="case-study-modal-title"
              className="text-3xl sm:text-5xl font-bold font-display tracking-tight"
            >
              {project.title}
            </h2>
            <p className="mt-2 text-lg sm:text-2xl font-serif-editorial italic text-[#FF4B1F]">
              {project.subtitle}
            </p>
            <p className="mt-4 text-sm sm:text-base text-[#666666] dark:text-[#A1A1A1] leading-relaxed max-w-3xl">
              {project.summary}
            </p>
          </div>

          {/* Architectural Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-7 space-y-4">
              <h3 className="text-xs font-mono uppercase tracking-[0.18em] text-[#FF4B1F]">
                Architectural Highlights &amp; Production Capabilities
              </h3>
              <ul className="space-y-3">
                {project.engineeringHighlights.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4"
                  >
                    <CheckCircle2 className="h-4 w-4 text-[#FF4B1F] shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-[#171717] dark:text-[#F8F8F8] leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-5 space-y-6">
              <div className="rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5 space-y-3">
                <p className="text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                  System Topology
                </p>
                <p className="text-sm font-medium text-[#171717] dark:text-[#F8F8F8] leading-relaxed">
                  {project.architectureOverview}
                </p>
              </div>

              <div className="rounded-xl border border-[#E5E2DC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#666666] dark:text-[#A1A1A1]">
                  <Layers className="h-3.5 w-3.5 text-[#FF4B1F]" />
                  <span>Production Stack</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {project.stack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg border border-[#E5E2DC] dark:border-[#262626] bg-[#FAF9F6] dark:bg-[#0E0E0E] px-2.5 py-1 text-xs font-mono text-[#171717] dark:text-[#F8F8F8]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E2DC] dark:border-[#262626] pt-6">
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="cta-tactile-primary inline-flex items-center gap-2.5 rounded-full bg-[#FF4B1F] hover:bg-[#F04424] text-white px-6 py-3 text-xs font-mono uppercase tracking-wider font-semibold transition-colors"
            >
              <span>Launch Live Domain ({project.displayUrl})</span>
              <ArrowUpRight className="h-4 w-4" />
            </a>

            <button
              type="button"
              onClick={() => {
                onSelectForInquiry(project.title);
                onClose();
              }}
              className="cta-tactile-secondary inline-flex items-center gap-2 rounded-full border border-[#171717] dark:border-[#F8F8F8] px-6 py-3 text-xs font-mono uppercase tracking-wider font-semibold text-[#171717] dark:text-[#F8F8F8] hover:bg-[#171717] hover:text-white dark:hover:bg-white dark:hover:text-[#090909] transition-colors cursor-pointer"
            >
              <span>Commission Similar Architecture</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
