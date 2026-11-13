'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface AdminDropdownOption<T extends string = string> {
  value: T;
  label: string;
  sublabel?: string;
  badge?: string;
  dotColorClass?: string;
}

interface AdminCustomDropdownProps<T extends string = string> {
  id?: string;
  ariaLabel: string;
  value: T;
  options: AdminDropdownOption<T>[];
  onChange: (nextValue: T) => void;
  prefixLabel?: string;
  icon?: React.ReactNode;
  align?: 'left' | 'right';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  testId?: string;
}

export function AdminCustomDropdown<T extends string = string>({
  id,
  ariaLabel,
  value,
  options,
  onChange,
  prefixLabel,
  icon,
  align = 'left',
  size = 'md',
  fullWidth = false,
  testId,
}: AdminCustomDropdownProps<T>) {
  const generatedId = useId();
  const controlId = id || `admin-dropdown-${generatedId}`;
  const listboxId = `${controlId}-listbox`;

  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  );

  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const selectedOption =
    options.find((opt) => opt.value === value) ?? options[0] ?? { value, label: String(value) };

  const toggleMenu = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        const idx = options.findIndex((o) => o.value === value);
        setHighlightedIdx(idx >= 0 ? idx : 0);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        e.target instanceof Node &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setHighlightedIdx((prev) => (prev + 1) % options.length);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        setHighlightedIdx((prev) => (prev - 1 + options.length) % options.length);
      }
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
      } else {
        const chosen = options[highlightedIdx];
        if (chosen) {
          onChange(chosen.value);
          setOpen(false);
        }
      }
    } else if (e.key === 'Home' && open) {
      e.preventDefault();
      setHighlightedIdx(0);
    } else if (e.key === 'End' && open) {
      e.preventDefault();
      setHighlightedIdx(Math.max(0, options.length - 1));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${fullWidth ? 'w-full' : 'inline-block'}`}
      data-testid={testId}
    >
      <button
        ref={triggerRef}
        id={controlId}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={toggleMenu}
        onKeyDown={handleTriggerKeyDown}
        className={`group flex items-center justify-between gap-2.5 rounded-xl border transition-all duration-200 cursor-pointer select-none ${
          fullWidth ? 'w-full' : 'min-w-[170px]'
        } ${
          size === 'sm' ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-xs sm:text-sm'
        } ${
          open
            ? 'border-[#7545E8] bg-white dark:bg-[#231B42] text-[#211B35] dark:text-[#F7F5FC] ring-2 ring-[#7545E8]/25 shadow-[0_8px_24px_-6px_rgba(117,69,232,0.22)]'
            : 'border-[#E2D9F3] dark:border-[#312655] bg-white dark:bg-[#1D1636] text-[#211B35] dark:text-[#F4F0FF] hover:border-[#9B63F5] dark:hover:border-[#7545E8] shadow-[0_2px_10px_-3px_rgba(33,24,61,0.06)]'
        }`}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          {icon && (
            <span className="text-[#7545E8] dark:text-[#DCC7FF] shrink-0">{icon}</span>
          )}
          {selectedOption.dotColorClass && (
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${selectedOption.dotColorClass}`}
            />
          )}
          {prefixLabel && (
            <span className="text-[#89839A] dark:text-[#A59EC0] font-medium shrink-0">
              {prefixLabel}:
            </span>
          )}
          <span className="font-semibold truncate">{selectedOption.label}</span>
          {selectedOption.badge && (
            <span className="ml-1 rounded-md bg-[#F3EEFF] dark:bg-[#2D2256] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#7545E8] dark:text-[#DCC7FF]">
              {selectedOption.badge}
            </span>
          )}
        </span>

        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#89839A] dark:text-[#B8AFE6] transition-transform duration-200 group-hover:text-[#7545E8] dark:group-hover:text-[#DCC7FF] ${
            open ? 'rotate-180 text-[#7545E8] dark:text-[#DCC7FF]' : ''
          }`}
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`absolute z-50 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-[#DFD4F7] dark:border-[#392C63] bg-white/98 dark:bg-[#1B1433]/98 backdrop-blur-xl p-1.5 shadow-[0_20px_48px_-12px_rgba(23,19,45,0.28)] dark:shadow-[0_24px_54px_-12px_rgba(5,3,14,0.78)] ${
            fullWidth ? 'w-full left-0' : align === 'right' ? 'right-0 min-w-[230px]' : 'left-0 min-w-[230px]'
          }`}
        >
          {options.map((opt, idx) => {
            const isSelected = opt.value === value;
            const isHighlighted = idx === highlightedIdx;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlightedIdx(idx)}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#7545E8] to-[#9B63F5] text-white font-semibold shadow-[0_6px_16px_-4px_rgba(117,69,232,0.45)]'
                    : isHighlighted
                    ? 'bg-[#F4EEFF] dark:bg-[#291F4B] text-[#211B35] dark:text-white'
                    : 'text-[#211B35] dark:text-[#E5DDF7] hover:bg-[#F7F5FC] dark:hover:bg-[#241B42]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 truncate">
                    {opt.dotColorClass && (
                      <span
                        className={`h-2 w-2 rounded-full shrink-0 ${
                          isSelected ? 'bg-white' : opt.dotColorClass
                        }`}
                      />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </div>
                  {opt.sublabel && (
                    <span
                      className={`mt-0.5 block text-[11px] truncate ${
                        isSelected
                          ? 'text-white/85'
                          : 'text-[#89839A] dark:text-[#A39BBF]'
                      }`}
                    >
                      {opt.sublabel}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {opt.badge && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-[#F2ECFF] dark:bg-[#2C2152] text-[#7545E8] dark:text-[#DCC7FF]'
                      }`}
                    >
                      {opt.badge}
                    </span>
                  )}
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
