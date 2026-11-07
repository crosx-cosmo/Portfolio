'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
}

interface CustomSelectProps {
  id: string;
  name?: string;
  label?: string;
  value: string;
  options: readonly string[] | CustomSelectOption[];
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  testId?: string;
}

export const CustomSelect = React.memo(function CustomSelect({
  id,
  name,
  label,
  value,
  options,
  onChange,
  error,
  required,
  testId,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listboxId = useId();

  const normalizedOptions: CustomSelectOption[] = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedIndex = Math.max(
    0,
    normalizedOptions.findIndex((opt) => opt.value === value)
  );
  const selectedOption = normalizedOptions[selectedIndex] ?? normalizedOptions[0];

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 240 && rect.top > 260);
      setHighlightedIndex(selectedIndex);
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleOpen();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % normalizedOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(
        (prev) => (prev - 1 + normalizedOptions.length) % normalizedOptions.length
      );
    } else if (e.key === 'Home') {
      e.preventDefault();
      setHighlightedIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setHighlightedIndex(normalizedOptions.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const target = normalizedOptions[highlightedIndex];
      if (target) {
        handleSelect(target.value);
      }
    } else if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label
          id={`${id}-label`}
          htmlFor={id}
          className="block text-xs font-mono uppercase tracking-wider text-[#4A4843] dark:text-[#B8B3A8] mb-2"
        >
          {label} {required ? '*' : ''}
        </label>
      )}
      {name && <input type="hidden" name={name} value={selectedOption?.value || ''} />}

      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-labelledby={label ? `${id}-label` : undefined}
        aria-invalid={Boolean(error)}
        data-testid={testId || `custom-select-${id}`}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 rounded-md border px-3.5 py-2.5 text-left text-sm transition-colors cursor-pointer ${
          isOpen
            ? 'border-[#2544E8] dark:border-[#6E88FF] bg-[#FDFCF9] dark:bg-[#141724] text-[#111110] dark:text-[#F4F1EA]'
            : 'border-[#C8C2B5] dark:border-[#282B3A] bg-[#FDFCF9] dark:bg-[#10131E] text-[#111110] dark:text-[#F4F1EA] hover:border-[#8E887C] dark:hover:border-[#3D4258]'
        } focus-visible:outline-2 focus-visible:outline-[#2544E8]`}
      >
        <span className="truncate font-medium">{selectedOption?.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#6E6A61] dark:text-[#8E93A6] transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#2544E8] dark:text-[#6E88FF]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={label ? `${id}-label` : undefined}
          data-testid={`${testId || `custom-select-${id}`}-menu`}
          className={`absolute left-0 right-0 z-50 max-h-64 overflow-y-auto rounded-md border border-[#C8C2B5] dark:border-[#2A2E42] bg-[#FDFCF9] dark:bg-[#0D101B] p-1.5 shadow-[0_16px_38px_-10px_rgba(17,17,16,0.18)] dark:shadow-[0_20px_48px_-12px_rgba(0,0,0,0.85)] ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {normalizedOptions.map((option, idx) => {
            const isSelected = option.value === value;
            const isHighlighted = idx === highlightedIndex;
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onClick={() => handleSelect(option.value)}
                className={`flex items-center justify-between gap-2.5 rounded-sm px-3 py-2 text-xs sm:text-sm cursor-pointer select-none transition-colors ${
                  isSelected
                    ? 'bg-[#111110] text-[#F5F3EE] dark:bg-[#2544E8] dark:text-white font-semibold'
                    : isHighlighted
                      ? 'bg-[#EAE6DC] text-[#111110] dark:bg-white/[0.07] dark:text-white'
                      : 'text-[#2E2D2A] dark:text-[#D5D8E2]'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-1.5 text-xs font-mono text-[#D94E28]">
          {error}
        </p>
      )}
    </div>
  );
});
