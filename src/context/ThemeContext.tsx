'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeCtxValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeCtx = createContext<ThemeCtxValue>({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const saved = (localStorage.getItem('fabrick-theme') as Theme) || 'dark';
    setTheme(saved);
    document.documentElement.classList.toggle('theme-light', saved === 'light');
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('fabrick-theme', next);
      document.documentElement.classList.toggle('theme-light', next === 'light');
      return next;
    });
  }, []);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
