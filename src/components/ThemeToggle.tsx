'use client';

import * as Switch from '@radix-ui/react-switch';
import { Moon, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

/**
 * ThemeToggle — Enhanced
 * ----------------------------------------------------------------
 * Improved Radix Switch with better animations and visual feedback.
 * Dark/Light theme toggle with smooth transitions.
 */
export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = theme === 'dark' || theme === 'gold';

  if (!mounted) {
    return (
      <div
        className="h-8 w-14 rounded-full border border-zinc-700 bg-zinc-900"
        aria-hidden
      />
    );
  }

  return (
    <Switch.Root
      checked={isDark}
      onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className={[
        'group relative inline-flex h-8 w-14 shrink-0 items-center rounded-full',
        'border border-zinc-700/50 bg-zinc-900/50 backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        'data-[state=checked]:border-yellow-400/30 data-[state=unchecked]:border-blue-400/30',
        'hover:border-yellow-400/50 focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-yellow-400/50 focus-visible:ring-offset-2',
        'focus-visible:ring-offset-black',
      ].join(' ')}
    >
      {/* Background shine effect */}
      <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-data-[state=checked]:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Thumb with improved styling */}
      <Switch.Thumb
        className={[
          'relative pointer-events-none flex h-7 w-7 items-center justify-center rounded-full',
          'bg-gradient-to-b from-yellow-400 to-yellow-500',
          'shadow-[0_2px_8px_rgba(250,204,21,0.3)]',
          'transition-all duration-300 will-change-transform',
          'translate-x-0.5 data-[state=checked]:translate-x-[26px]',
          'data-[state=checked]:shadow-[0_4px_12px_rgba(250,204,21,0.4)]',
        ].join(' ')}
      >
        {/* Icon container with rotation animation */}
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -120, opacity: 0, scale: 0.4 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 120, opacity: 0, scale: 0.4 }}
              transition={{
                duration: 0.3,
                ease: 'easeOut',
              }}
              className="absolute flex items-center justify-center"
            >
              <Moon size={16} className="text-black" strokeWidth={2.5} />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 120, opacity: 0, scale: 0.4 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -120, opacity: 0, scale: 0.4 }}
              transition={{
                duration: 0.3,
                ease: 'easeOut',
              }}
              className="absolute flex items-center justify-center"
            >
              <Sun size={16} className="text-black" strokeWidth={2.5} />
            </motion.div>
          )}
        </AnimatePresence>
      </Switch.Thumb>

      {/* Background label hints */}
      <span className="absolute left-2 text-[8px] font-bold text-zinc-600 pointer-events-none opacity-40 transition-opacity duration-300 data-[state=unchecked]:opacity-70">
        ☀️
      </span>
      <span className="absolute right-2 text-[8px] font-bold text-zinc-400 pointer-events-none opacity-40 transition-opacity duration-300 data-[state=checked]:opacity-70">
        🌙
      </span>
    </Switch.Root>
  );
}
