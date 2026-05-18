'use client';

import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';

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

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) ?? '';
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function toggle() {
    const next = theme === STUDIO ? '' : STUDIO;
    setTheme(next);
    applyTheme(next);
    if (next) {
      localStorage.setItem(LS_KEY, next);
    } else {
      localStorage.removeItem(LS_KEY);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="admin-theme-toggle"
      title={theme === STUDIO ? 'Volver al tema Fabrick' : 'Cambiar a Studio Admin'}
      aria-label="Cambiar tema del admin"
    >
      <Palette className="h-3 w-3 flex-shrink-0" />
      <span className="hidden md:inline">{theme === STUDIO ? 'Studio' : 'Tema'}</span>
    </button>
  );
}
