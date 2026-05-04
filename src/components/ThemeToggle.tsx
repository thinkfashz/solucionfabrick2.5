'use client';

import * as Switch from '@radix-ui/react-switch';
import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

/**
 * ThemeToggle
 * ----------------------------------------------------------------
 * Radix Switch styled with sun/moon icons. Animates icon swap with
 * Framer Motion. Persistence is handled by next-themes (storageKey
 * `fabrick-theme`).
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render a same-size placeholder until mount.
  useEffect(() => setMounted(true), []);

  const isDark = theme === 'dark' || theme === 'gold';

  if (!mounted) {
    return <div className="h-7 w-12 rounded-full border border-[var(--border)] bg-[var(--bg2)]" aria-hidden />;
  }

  return (
    <Switch.Root
      checked={isDark}
      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className={[
        'group relative inline-flex h-7 w-12 shrink-0 items-center rounded-full',
        'border border-[var(--accent)]/30 bg-[var(--bg2)]',
        'transition-colors duration-300',
        'data-[state=checked]:bg-black/70 data-[state=unchecked]:bg-[#f1eadc]',
        'hover:border-[var(--accent)]/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60',
      ].join(' ')}
    >
      <Switch.Thumb
        className={[
          'pointer-events-none flex h-6 w-6 items-center justify-center rounded-full',
          'bg-gradient-to-br from-[var(--accent)] to-[var(--accent2,#b8860b)]',
          'shadow-[0_2px_8px_rgba(0,0,0,0.35)]',
          'transition-transform duration-300 will-change-transform',
          'translate-x-0.5 data-[state=checked]:translate-x-[22px]',
        ].join(' ')}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.25 }}
              className="text-black"
            >
              <Moon size={12} strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.25 }}
              className="text-black"
            >
              <Sun size={12} strokeWidth={2.5} />
            </motion.span>
          )}
        </AnimatePresence>
      </Switch.Thumb>
    </Switch.Root>
  );
}
