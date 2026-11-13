'use client';

import { useCallback, useEffect, useSyncExternalStore } from 'react';

const subscribeTheme = (onStoreChange: () => void) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', onStoreChange);
  window.addEventListener('crosx-theme-change', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener('crosx-theme-change', onStoreChange);
  };
};

const getThemeClientSnapshot = (): boolean => {
  try {
    const saved = window.localStorage.getItem('crosx-theme');
    return saved ? saved === 'dark' : false;
  } catch {
    return false;
  }
};

const getThemeServerSnapshot = (): boolean => false;

export function useStudioTheme(): {
  isDark: boolean;
  toggleTheme: () => void;
} {
  const isDark = useSyncExternalStore(
    subscribeTheme,
    getThemeClientSnapshot,
    getThemeServerSnapshot
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.dataset.theme = 'dark';
    } else {
      root.classList.remove('dark');
      root.dataset.theme = 'light';
    }
  }, [isDark]);

  const toggleTheme = useCallback(() => {
    const next = !getThemeClientSnapshot();
    const root = document.documentElement;
    if (next) {
      root.classList.add('dark');
      root.dataset.theme = 'dark';
    } else {
      root.classList.remove('dark');
      root.dataset.theme = 'light';
    }
    try {
      window.localStorage.setItem('crosx-theme', next ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
    window.dispatchEvent(new Event('crosx-theme-change'));
  }, []);

  return { isDark, toggleTheme };
}
