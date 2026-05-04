'use client';

/**
 * Fabrick Theme Provider
 * ----------------------------------------------------------------
 * Thin wrapper around `next-themes` so the rest of the codebase can keep
 * importing `{ ThemeProvider, useTheme }` from `@/context/ThemeContext`
 * while we get all the SSR-safe persistence + class toggling for free.
 *
 * - Persists in localStorage under `fabrick-theme`.
 * - Applies the active theme as a class on <html> (`dark`, `light`, `gold`).
 * - Exposes `{ theme, setTheme, toggleTheme }` with the legacy `Theme` type
 *   (`'dark' | 'light' | 'gold'`) so existing callers (admin login etc.)
 *   keep compiling untouched.
 */

import { ThemeProvider as NextThemesProvider, useTheme as useNextTheme } from 'next-themes';
import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';

export type Theme = 'dark' | 'light' | 'gold';

const KNOWN_THEMES: readonly Theme[] = ['dark', 'light', 'gold'];

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={[...KNOWN_THEMES]}
      storageKey="fabrick-theme"
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  );
}

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useNextTheme();

  const current: Theme = useMemo(() => {
    const candidate = (theme ?? resolvedTheme ?? 'dark') as string;
    return (KNOWN_THEMES as readonly string[]).includes(candidate)
      ? (candidate as Theme)
      : 'dark';
  }, [theme, resolvedTheme]);

  const setThemeSafe = useCallback(
    (next: Theme) => {
      if (!(KNOWN_THEMES as readonly string[]).includes(next)) return;
      setTheme(next);
    },
    [setTheme]
  );

  const toggleTheme = useCallback(() => {
    setTheme(current === 'dark' ? 'light' : 'dark');
  }, [current, setTheme]);

  return { theme: current, setTheme: setThemeSafe, toggleTheme };
}
