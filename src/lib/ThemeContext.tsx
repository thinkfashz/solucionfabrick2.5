'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';

// The app is locked to a single theme: yellow accent on black with white text.
// The legacy `light` and `gold` variants have been removed — there is now no
// way for the user to switch themes.
export type Theme = 'dark';

const THEME_VARS: Record<string, string> = {
  '--bg': '#000',
  '--bg2': '#0a0a0a',
  '--bg3': '#18181b',
  '--fg': '#fff',
  '--fg2': '#a1a1aa',
  '--accent': '#facc15',
  '--accent2': '#d97706',
  '--border': 'rgba(255,255,255,0.08)',
  '--glass': 'rgba(0,0,0,0.6)',
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
});

function applyTheme() {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', 'dark');
  Object.entries(THEME_VARS).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    applyTheme();
    // Clear any previously persisted theme preference so the app can never
    // reload into a non-default theme.
    try {
      localStorage.removeItem('fabrick-theme');
    } catch {
      // Ignore storage errors (private mode, quota, etc.)
    }
  }, []);

  // `setTheme` is kept as a no-op so existing consumers continue to compile,
  // but it can no longer change the active theme.
  return (
    <ThemeContext.Provider value={{ theme: 'dark', setTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

