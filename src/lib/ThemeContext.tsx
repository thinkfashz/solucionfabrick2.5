'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Theme = 'dark' | 'light' | 'gold';

const THEMES: readonly Theme[] = ['dark', 'light', 'gold'] as const;

const THEME_VARS: Record<Theme, Record<string, string>> = {
  dark: {
    '--bg': '#000',
    '--bg2': '#0a0a0a',
    '--bg3': '#18181b',
    '--fg': '#fff',
    '--fg2': '#a1a1aa',
    '--accent': '#facc15',
    '--accent2': '#d97706',
    '--border': 'rgba(255,255,255,0.08)',
    '--glass': 'rgba(0,0,0,0.6)',
  },
  light: {
    '--bg': '#fafaf9',
    '--bg2': '#f5f5f4',
    '--bg3': '#e7e5e4',
    '--fg': '#0c0a09',
    '--fg2': '#44403c',
    '--accent': '#d97706',
    '--accent2': '#92400e',
    '--border': 'rgba(0,0,0,0.1)',
    '--glass': 'rgba(255,255,255,0.7)',
  },
  gold: {
    '--bg': '#0a0800',
    '--bg2': '#120f00',
    '--bg3': '#1a1500',
    '--fg': '#fffbe6',
    '--fg2': '#fef9c3',
    '--accent': '#ffd700',
    '--accent2': '#facc15',
    '--border': 'rgba(255,215,0,0.15)',
    '--glass': 'rgba(10,8,0,0.7)',
  },
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
});

function applyTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  const vars = THEME_VARS[theme];
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('fabrick-theme') as Theme | null;
      const initial: Theme =
        stored && (THEMES as readonly string[]).includes(stored) ? stored : 'dark';
      setThemeState(initial);
      applyTheme(initial);
    } catch {
      applyTheme('dark');
    }
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem('fabrick-theme', t);
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
    applyTheme(t);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
