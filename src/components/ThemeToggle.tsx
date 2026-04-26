'use client';

import { useTheme, Theme } from '@/lib/ThemeContext';

const THEMES: { id: Theme; label: string; icon: React.ReactNode }[] = [
  {
    id: 'dark',
    label: 'Oscuro',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="w-4 h-4">
        <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
      </svg>
    ),
  },
  {
    id: 'light',
    label: 'Claro',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="w-4 h-4">
        <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z" />
      </svg>
    ),
  },
  {
    id: 'gold',
    label: 'Dorado',
    icon: (
      <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="w-4 h-4">
        <path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z" />
      </svg>
    ),
  },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const activeTheme = THEMES.find((t) => t.id === theme) ?? THEMES[0];

  return (
    <>
      {/* Mobile: floating icon button showing active theme */}
      <button
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-200"
        style={{
          background: 'var(--glass)',
          borderColor: 'var(--border)',
          color: 'var(--accent)',
          backdropFilter: 'blur(12px)',
        }}
        onClick={() => {
          const idx = THEMES.findIndex((t) => t.id === theme);
          setTheme(THEMES[(idx + 1) % THEMES.length].id);
        }}
        aria-label={`Tema: ${activeTheme.label}`}
        title={`Tema: ${activeTheme.label}`}
      >
        {activeTheme.icon}
      </button>

      {/* Desktop: pill with all 3 options */}
      <div
        className="hidden lg:flex items-center gap-0.5 rounded-full p-1 border"
        style={{
          background: 'var(--glass)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            aria-label={t.label}
            title={t.label}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all duration-200"
            style={{
              background: theme === t.id ? 'var(--accent)' : 'transparent',
              color: theme === t.id ? '#000' : 'var(--fg2)',
            }}
          >
            {t.icon}
          </button>
        ))}
      </div>
    </>
  );
}
