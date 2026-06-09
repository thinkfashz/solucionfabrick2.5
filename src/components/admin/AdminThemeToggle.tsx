'use client';
import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { AdminThemeTransition } from './AdminThemeTransition';

const LS_KEY = 'admin-ui-theme';
type Theme = '' | 'studio' | 'neo';
const CYCLE: Theme[] = ['', 'studio', 'neo'];
const LABELS: Record<Theme, string> = { '': 'Fabrick', studio: 'Studio', neo: 'Neo' };

function applyTheme(theme: Theme) {
  if (theme === 'studio') document.body.dataset.adminTheme = 'studio';
  else if (theme === 'neo') document.body.dataset.adminTheme = 'neo';
  else delete document.body.dataset.adminTheme;
}

export function AdminThemeToggle() {
  const [theme, setTheme] = useState<Theme>('');
  const [transitioning, setTransitioning] = useState(false);
  const [targetTheme, setTargetTheme] = useState<Theme>('');

  useEffect(() => {
    const saved = (localStorage.getItem(LS_KEY) ?? '') as Theme;
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function toggle() {
    if (transitioning) return;
    const idx = CYCLE.indexOf(theme);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    setTargetTheme(next);
    setTransitioning(true);
  }

  function handleTransitionComplete() {
    applyTheme(targetTheme);
    setTheme(targetTheme);
    if (targetTheme) localStorage.setItem(LS_KEY, targetTheme);
    else localStorage.removeItem(LS_KEY);
    setTransitioning(false);
    window.dispatchEvent(new Event('admin-theme-changed'));
  }

  return (
    <>
      <AdminThemeTransition
        isActive={transitioning}
        targetTheme={targetTheme}
        onComplete={handleTransitionComplete}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={transitioning}
        className="admin-theme-toggle"
        title={`Cambiar a ${LABELS[CYCLE[(CYCLE.indexOf(theme) + 1) % CYCLE.length]]}`}
        aria-label="Cambiar tema del admin"
      >
        <Palette className="h-3 w-3 flex-shrink-0" />
        <span className="hidden md:inline">{LABELS[theme]}</span>
      </button>
    </>
  );
}
