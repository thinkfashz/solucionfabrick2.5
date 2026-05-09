'use client';

import { Moon, Sun, Sparkles, Palette } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useTheme, type Theme } from '@/context/ThemeContext';

/**
 * ThemeToggle — cíclico
 * ----------------------------------------------------------------
 * Cicla entre los temas disponibles (dark → light → arena → gold → dark).
 * Cada tema tiene su icono y color de feedback. La página entera reacciona
 * porque las utilidades Tailwind tipo `bg-black`, `text-white`, etc. se
 * mapean en globals.css a las variables del tema activo.
 */

const THEME_META: Record<Theme, { label: string; Icon: typeof Sun; tint: string }> = {
  dark:  { label: 'Oscuro',  Icon: Moon,     tint: 'from-yellow-400 to-amber-500' },
  light: { label: 'Claro',   Icon: Sun,      tint: 'from-amber-500 to-orange-500' },
  arena: { label: 'Arena',   Icon: Palette,  tint: 'from-orange-300 to-rose-400' },
  gold:  { label: 'Dorado',  Icon: Sparkles, tint: 'from-yellow-300 to-yellow-500' },
};

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="h-9 w-9 rounded-full border border-zinc-700 bg-zinc-900"
        aria-hidden
      />
    );
  }

  const meta = THEME_META[theme] ?? THEME_META.dark;
  const { Icon, label, tint } = meta;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Tema actual: ${label}. Cambiar al siguiente tema`}
      title={`Tema: ${label} · Click para cambiar`}
      className={[
        'group relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        'border border-[var(--border-main,rgba(255,255,255,0.12))] bg-[var(--glass-bg,rgba(255,255,255,0.04))] backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        'hover:border-[var(--accent,#facc15)]/60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent,#facc15)]/60',
      ].join(' ')}
    >
      {/* Background tint */}
      <span
        aria-hidden
        className={`absolute inset-0 rounded-full bg-gradient-to-br opacity-15 transition-opacity duration-300 group-hover:opacity-30 ${tint}`}
      />

      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          className="relative z-10 flex items-center justify-center text-[var(--accent,#facc15)]"
        >
          <Icon size={16} strokeWidth={2.4} />
        </motion.span>
      </AnimatePresence>

      {/* Pequeño dot indicador del tema */}
      <span
        aria-hidden
        className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-0.5 w-3 rounded-full bg-[var(--accent,#facc15)] opacity-70"
      />
    </button>
  );
}

