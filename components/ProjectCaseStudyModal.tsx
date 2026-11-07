'use client';

import React, { useEffect, useState } from 'react';
import type { ProjectCaseStudy } from '@/lib/studio-data';
import { X, ArrowUpRight, Layers, Monitor, Cpu } from 'lucide-react';

interface ProjectCaseStudyModalProps {
  project: ProjectCaseStudy | null;
  onClose: () => void;
  onSelectForInquiry: (projectTitle: string) => void;
}

export function ProjectCaseStudyModal({
  project,
  onClose,
  onSelectForInquiry,
}: ProjectCaseStudyModalProps) {
  const [viewState, setViewState] = useState<{ id?: string; mode: 'live' | 'studio' }>({
    id: project?.id,
    mode: 'live',
  });

  const activeView = viewState.id === project?.id ? viewState.mode : 'live';
  const setActiveView = (mode: 'live' | 'studio') => {
    setViewState({ id: project?.id, mode });
  };

  useEffect(() => {
    if (!project) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project, onClose]);

  if (!project) return null;

  const currentImage = activeView === 'live' ? project.liveScreenshot : project.studioVisual;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="case-study-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-md border border-[#D5D0C5] dark:border-[#2A2925] bg-[#F5F3EE] dark:bg-[#111110] text-[#111110] dark:text-[#F4F1EA] shadow-2xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-[#D5D0C5] dark:border-[#262522]">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#223FD9] dark:text-[#6E88FF] font-mono mb-1.5">
              <span>{project.index}</span>
              <span aria-hidden="true">·</span>
              <span>{project.category}</span>
              <span aria-hidden="true">·</span>
              <span>{project.displayUrl}</span>
            </div>
            <h2
              id="case-study-modal-title"
              className="text-2xl sm:text-3xl font-bold tracking-tight font-display"
            >
              {project.title}{' '}
              <span className="font-serif-editorial italic font-normal text-[#4A4843] dark:text-[#B8B3A8]">
                — {project.subtitle}
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close case study modal"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D5D0C5] dark:border-[#2A2925] text-[#4A4843] dark:text-[#B8B3A8] hover:bg-[#E8E4DA] dark:hover:bg-[#1C1C1A] hover:scale-105 transition-all duration-200 shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Media Switcher (Live Production Screenshot vs Studio Showcase) */}
        <div className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-1 rounded-full border border-[#D5D0C5] dark:border-[#262522] bg-[#EAE6DC] dark:bg-[#161614] p-1">
              <button
                type="button"
                onClick={() => setActiveView('live')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono rounded-full transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'live'
                    ? 'bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white font-medium shadow-sm'
                    : 'text-[#5C5952] dark:text-[#9E9A90] hover:text-[#111110] dark:hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Live Production Capture ({project.displayUrl})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('studio')}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono rounded-full transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === 'studio'
                    ? 'bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white font-medium shadow-sm'
                    : 'text-[#5C5952] dark:text-[#9E9A90] hover:text-[#111110] dark:hover:text-white'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Studio Hardware Presentation</span>
              </button>
            </div>

            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group/link inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#223FD9] dark:text-[#6E88FF] hover:underline whitespace-nowrap shrink-0"
            >
              <span>Visit Live System ({project.url})</span>
              <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
            </a>
          </div>

          <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-[#D5D0C5] dark:border-[#262522] bg-[#0A0A09]">
            <img
              src={currentImage}
              alt={`${project.title} ${activeView === 'live' ? 'live website screenshot' : 'studio presentation'}`}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-top"
            />
          </div>
        </div>

        {/* Case Study Content Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#5C5952] dark:text-[#9E9A90] mb-2">
                01. System Overview
              </h3>
              <p className="text-sm sm:text-base text-[#2E2D2A] dark:text-[#D5D1C7] leading-relaxed">
                {project.summary}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#5C5952] dark:text-[#9E9A90] mb-2">
                02. Engineering &amp; Architecture
              </h3>
              <p className="text-sm sm:text-base text-[#2E2D2A] dark:text-[#D5D1C7] leading-relaxed mb-4">
                {project.architectureOverview}
              </p>
              <ul className="space-y-2.5">
                {project.engineeringHighlights.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-[#1C1B19] dark:text-[#E5E1D8]"
                  >
                    <span className="font-mono text-xs text-[#D94E28] mt-0.5">
                      0{idx + 1}.
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-6 rounded-sm border border-[#D5D0C5] dark:border-[#262522] bg-[#FDFCF9] dark:bg-[#161614] p-5">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#5C5952] dark:text-[#9E9A90] mb-2 flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-[#223FD9] dark:text-[#6E88FF]" />
                <span>Technology Stack</span>
              </h4>
              <p className="text-xs font-mono text-[#111110] dark:text-[#F4F1EA] leading-relaxed">
                {project.stack.join(' · ')}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E0D5] dark:border-[#262522]">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#5C5952] dark:text-[#9E9A90] mb-2">
                Delivered Capabilities
              </h4>
              <p className="text-xs text-[#2E2D2A] dark:text-[#D5D1C7] leading-relaxed">
                {project.deliverables.join(' · ')}
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E0D5] dark:border-[#262522]">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#5C5952] dark:text-[#9E9A90] mb-1">
                Engineered By
              </h4>
              <p className="text-xs font-medium text-[#111110] dark:text-[#F4F1EA]">
                CROSX DEV STUDIO · Founded by IRON CLAD
              </p>
            </div>

            <div className="pt-4 flex flex-col gap-2.5">
              <a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                className="cta-tactile-primary group/btn inline-flex items-center justify-center gap-2 rounded-full bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white px-5 py-2.5 text-xs font-mono font-semibold hover:bg-[#223FD9] dark:hover:bg-[#3B5BFF] whitespace-nowrap shrink-0"
              >
                <span>Launch {project.displayUrl}</span>
                <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
              </a>
              <button
                type="button"
                onClick={() => {
                  onSelectForInquiry(project.title);
                  onClose();
                }}
                className="cta-tactile-secondary inline-flex items-center justify-center rounded-full border border-[#D5D0C5] dark:border-[#2A2925] px-5 py-2.5 text-xs font-mono font-medium text-[#111110] dark:text-[#F4F1EA] hover:border-[#2544E8] dark:hover:border-[#6E88FF] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Request Similar Architecture
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
