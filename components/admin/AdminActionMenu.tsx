'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface AdminActionMenuItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  tone?: 'default' | 'violet' | 'danger';
  onSelect: () => void;
}

interface AdminActionMenuProps {
  triggerLabel: string;
  triggerSublabel?: string;
  triggerBadge?: string;
  triggerIcon?: React.ReactNode;
  items: AdminActionMenuItem[];
  align?: 'left' | 'right';
  testId?: string;
}

export function AdminActionMenu({
  triggerLabel,
  triggerSublabel,
  triggerBadge,
  triggerIcon,
  items,
  align = 'right',
  testId,
}: AdminActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block" data-testid={testId}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer ${
          open
            ? 'border-[#7545E8] bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white shadow-[0_10px_24px_-6px_rgba(117,69,232,0.45)]'
            : 'border-[#E2D9F3] dark:border-[#312655] bg-white dark:bg-[#1D1636] text-[#211B35] dark:text-[#F4F0FF] hover:border-[#9B63F5] dark:hover:border-[#7545E8] shadow-[0_2px_10px_-3px_rgba(33,24,61,0.08)]'
        }`}
      >
        {triggerIcon && (
          <span
            className={
              open ? 'text-white' : 'text-[#7545E8] dark:text-[#DCC7FF] shrink-0'
            }
          >
            {triggerIcon}
          </span>
        )}
        <div className="text-left min-w-0">
          <div className="truncate">{triggerLabel}</div>
          {triggerSublabel && (
            <div
              className={`text-[10px] font-mono truncate ${
                open ? 'text-white/80' : 'text-[#89839A] dark:text-[#A59EC0]'
              }`}
            >
              {triggerSublabel}
            </div>
          )}
        </div>
        {triggerBadge && (
          <span
            className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
              open
                ? 'bg-white/20 text-white'
                : 'bg-[#F3EEFF] dark:bg-[#2E2257] text-[#7545E8] dark:text-[#DCC7FF]'
            }`}
          >
            {triggerBadge}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${
            open ? 'rotate-180 text-white' : 'text-[#89839A] dark:text-[#B8AFE6]'
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute z-50 mt-2 w-64 rounded-2xl border border-[#DFD4F7] dark:border-[#392C63] bg-white/98 dark:bg-[#1B1433]/98 backdrop-blur-xl p-1.5 shadow-[0_22px_50px_-12px_rgba(23,19,45,0.28)] dark:shadow-[0_24px_56px_-12px_rgba(5,3,14,0.82)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`w-full flex items-start gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                item.tone === 'danger'
                  ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10'
                  : item.tone === 'violet'
                  ? 'text-[#7545E8] dark:text-[#DCC7FF] hover:bg-[#F4EEFF] dark:hover:bg-[#291F4B]'
                  : 'text-[#211B35] dark:text-[#EDE8FA] hover:bg-[#F7F5FC] dark:hover:bg-[#261D47]'
              }`}
            >
              {item.icon && <span className="mt-0.5 shrink-0">{item.icon}</span>}
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{item.label}</div>
                {item.description && (
                  <div className="mt-0.5 text-[11px] text-[#89839A] dark:text-[#A39BBF] line-clamp-1">
                    {item.description}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
