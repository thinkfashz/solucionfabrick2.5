'use client';

import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import { AdminThemeTransition } from './AdminThemeTransition';

const LS_KEY = 'admin-ui-theme';
const STUDIO = 'studio';

function applyTheme(theme: string) {
  if (theme === STUDIO) {
    document.body.dataset.adminTheme = STUDIO;
  } else {
    delete document.body.dataset.adminTheme;
  }
}

export function AdminThemeToggle() {
  const [theme, setTheme] = useState<string>('');
  const [transitioning, setTransitioning] = useState(false);
  const [targetTheme, setTargetTheme] = useState<'' | 'studio'>('');

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) ?? '';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function toggle() {
    if (transitioning) return;
    const next: '' | 'studio' = theme === STUDIO ? '' : STUDIO;
    setTargetTheme(next);
    setTransitioning(true);
  }

  function handleTransitionComplete() {
    applyTheme(targetTheme);
    setTheme(targetTheme);
    if (targetTheme) {
      localStorage.setItem(LS_KEY, targetTheme);
    } else {
      localStorage.removeItem(LS_KEY);
    }
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
        title={theme === STUDIO ? 'Volver al tema Fabrick' : 'Cambiar a Studio Admin'}
        aria-label="Cambiar tema del admin"
      >
        <Palette className="h-3 w-3 flex-shrink-0" />
        <span className="hidden md:inline">{theme === STUDIO ? 'Studio' : 'Tema'}</span>
      </button>
    </>
  );
}
