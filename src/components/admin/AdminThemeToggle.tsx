'use client';

import { useEffect } from 'react';

const STUDIO = 'studio';

export function AdminThemeToggle() {
  useEffect(() => {
    document.body.dataset.adminTheme = STUDIO;
    localStorage.setItem('admin-ui-theme', STUDIO);
  }, []);

  return null;
}
