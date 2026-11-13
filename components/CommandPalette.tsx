'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectCaseStudy } from '@/lib/studio-data';
import {
  Search,
  X,
  ArrowUpRight,
  Compass,
  FolderKanban,
  Ticket,
  ShieldCheck,
  Sun,
  Moon,
  Calculator,
  CornerDownLeft,
} from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  projects: ProjectCaseStudy[];
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenCaseStudy: (project: ProjectCaseStudy) => void;
}

interface PaletteItem {
  id: string;
  group: 'Navigation' | 'Case Studies' | 'Live Production' | 'Studio Actions';
  label: string;
  sublabel: string;
  keywords: string;
  icon: React.ComponentType<{ className?: string }>;
  perform: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  onOpen,
  projects,
  isDark,
  onToggleTheme,
  onOpenCaseStudy,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClosePalette = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  // Global Cmd+K / Ctrl+K shortcut listener
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          handleClosePalette();
        } else {
          onOpen();
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClosePalette();
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [isOpen, onOpen, handleClosePalette]);

  useEffect(() => {
    if (!isOpen) return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [isOpen]);

  const items: PaletteItem[] = useMemo(() => {
    const jumpTo = (sectionId: string) => {
      onClose();
      const el = document.getElementById(sectionId);
      el?.scrollIntoView({ behavior: 'smooth' });
    };

    const navItems: PaletteItem[] = [
      {
        id: 'nav-work',
        group: 'Navigation',
        label: 'Work Showcase & Carousel',
        sublabel: 'Flagship builds & architectural proof ledger',
        keywords: 'work portfolio projects carousel showcase',
        icon: FolderKanban,
        perform: () => jumpTo('work'),
      },
      {
        id: 'nav-services',
        group: 'Navigation',
        label: 'Engineering Services',
        sublabel: 'Websites, SaaS platforms, Expo mobile & APIs',
        keywords: 'services capabilities stack nextjs expo',
        icon: Compass,
        perform: () => jumpTo('services'),
      },
      {
        id: 'nav-estimator',
        group: 'Navigation',
        label: 'Interactive Scope & Sprint Estimator',
        sublabel: 'Estimate delivery horizon, range & architecture stack',
        keywords: 'estimator pricing budget calculator sprint scope',
        icon: Calculator,
        perform: () => jumpTo('estimator'),
      },
      {
        id: 'nav-contact',
        group: 'Navigation',
        label: 'Commission Brief Ledger',
        sublabel: 'Submit project brief & generate tracking ticket',
        keywords: 'contact commission brief inquiry ticket',
        icon: Compass,
        perform: () => jumpTo('contact'),
      },
    ];

    const dossierItems: PaletteItem[] = projects.map((proj) => ({
      id: `dossier-${proj.id}`,
      group: 'Case Studies',
      label: `Open Dossier: ${proj.title}`,
      sublabel: `${proj.index} · ${proj.category} · ${proj.displayUrl}`,
      keywords: `${proj.title} ${proj.subtitle} ${proj.category} ${proj.stack.join(' ')}`,
      icon: FolderKanban,
      perform: () => {
        onClose();
        onOpenCaseStudy(proj);
      },
    }));

    const liveItems: PaletteItem[] = projects.map((proj) => ({
      id: `live-${proj.id}`,
      group: 'Live Production',
      label: `Launch Live: ${proj.displayUrl}`,
      sublabel: proj.url,
      keywords: `launch live url domain ${proj.displayUrl} ${proj.title}`,
      icon: ArrowUpRight,
      perform: () => {
        onClose();
        window.open(proj.url, '_blank', 'noopener,noreferrer');
      },
    }));

    const actionItems: PaletteItem[] = [
      {
        id: 'action-track-ticket',
        group: 'Studio Actions',
        label: 'Track Support Ticket Portal',
        sublabel: 'Look up CROSX-2026-XXXXX status & replies',
        keywords: 'track ticket support client portal',
        icon: Ticket,
        perform: () => {
          onClose();
          router.push('/track-ticket');
        },
      },
      {
        id: 'action-admin',
        group: 'Studio Actions',
        label: 'Studio Admin Console',
        sublabel: 'Authenticated Neon CMS & ticket dispatch desk',
        keywords: 'admin console cms dashboard neon auth',
        icon: ShieldCheck,
        perform: () => {
          onClose();
          router.push('/admin');
        },
      },
      {
        id: 'action-theme',
        group: 'Studio Actions',
        label: isDark ? 'Switch to Light Editorial Theme' : 'Switch to Dark Obsidian Theme',
        sublabel: 'Toggle dual-theme design surface',
        keywords: 'theme dark light mode switch',
        icon: isDark ? Sun : Moon,
        perform: () => {
          onToggleTheme();
          onClose();
        },
      },
    ];

    return [...navItems, ...dossierItems, ...liveItems, ...actionItems];
  }, [projects, isDark, onToggleTheme, onClose, onOpenCaseStudy, router]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.sublabel.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
    );
  }, [items, query]);

  const activeIndex =
    filteredItems.length > 0 ? Math.min(selectedIndex, filteredItems.length - 1) : 0;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0
          ? (prev - 1 + filteredItems.length) % filteredItems.length
          : 0
      );
    } else if (e.key === 'Enter' && filteredItems[activeIndex]) {
      e.preventDefault();
      filteredItems[activeIndex].perform();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="CROSX Studio Executive Command Palette"
      data-testid="command-palette-modal"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-black/75 backdrop-blur-md"
      onClick={handleClosePalette}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-[#E5E2DC] dark:border-[#2A2A2A] bg-[#FFFFFF] dark:bg-[#111111] text-[#171717] dark:text-[#F8F8F8] shadow-[0_32px_90px_rgba(0,0,0,0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 border-b border-[#E5E2DC] dark:border-[#242424] px-5 py-4">
          <Search className="h-4 w-4 text-[#FF4B1F] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Jump to section, open case dossier, launch live domain, or toggle theme..."
            aria-label="Search CROSX Studio actions"
            data-testid="command-palette-input"
            className="w-full bg-transparent text-sm font-medium text-[#171717] dark:text-white placeholder:text-[#737373] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleClosePalette}
            aria-label="Close command palette"
            className="inline-flex items-center gap-1 rounded-full border border-[#E5E2DC] dark:border-[#2A2A2A] px-2.5 py-1 text-[10px] font-mono text-[#666666] dark:text-[#A1A1A1] hover:border-[#FF4B1F] cursor-pointer"
          >
            <span>ESC</span>
            <X className="h-3 w-3" />
          </button>
        </div>

        {/* Filtered Action List */}
        <div className="max-h-[58vh] overflow-y-auto p-2.5 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center text-xs font-mono text-[#737373]">
              No matching studio routes or case dossiers for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={item.perform}
                  className={`w-full text-left rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#FF4B1F] text-white'
                      : 'hover:bg-[#FAF9F6] dark:hover:bg-[#191919] text-[#171717] dark:text-[#F8F8F8]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#FAF9F6] dark:bg-[#1B1B1B] text-[#FF4B1F] border border-[#E5E2DC] dark:border-[#262626]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-semibold truncate">
                        {item.label}
                      </span>
                      <span
                        className={`block text-[11px] font-mono truncate ${
                          isSelected
                            ? 'text-white/85'
                            : 'text-[#666666] dark:text-[#A1A1A1]'
                        }`}
                      >
                        {item.sublabel}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`hidden sm:inline text-[10px] font-mono uppercase tracking-wider ${
                        isSelected ? 'text-white/90' : 'text-[#888888]'
                      }`}
                    >
                      {item.group}
                    </span>
                    <CornerDownLeft
                      className={`h-3.5 w-3.5 ${
                        isSelected ? 'text-white' : 'text-[#A1A1A1]'
                      }`}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Hint */}
        <div className="border-t border-[#E5E2DC] dark:border-[#242424] bg-[#FAF9F6] dark:bg-[#0B0B0B] px-5 py-2.5 flex items-center justify-between text-[10.5px] font-mono text-[#666666] dark:text-[#A1A1A1]">
          <span>↑↓ Navigate · Enter Execute · ESC Close</span>
          <span>CROSX DEV STUDIO® Command Index</span>
        </div>
      </div>
    </div>
  );
}
