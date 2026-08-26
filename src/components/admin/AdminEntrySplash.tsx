'use client';

import { useEffect, useState } from 'react';
import AdminAccessLoader from '@/components/admin/AdminAccessLoader';

export default function AdminEntrySplash() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const closeTimer = window.setTimeout(() => setClosing(true), reduced ? 160 : 720);
    const hideTimer = window.setTimeout(() => setVisible(false), reduced ? 220 : 1040);

    return () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(hideTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={`admin-entry-splash fixed inset-0 z-[12000] ${closing ? 'is-closing' : ''}`}>
      <AdminAccessLoader
        title="Entrando al centro de control"
        description="Verificando tu sesión y preparando las herramientas administrativas."
      />
      <style jsx>{`
        .admin-entry-splash {
          opacity: 1;
          transform: scale(1);
          transition: opacity .28s ease, transform .46s cubic-bezier(.16,1,.3,1);
        }
        .admin-entry-splash.is-closing {
          opacity: 0;
          transform: scale(1.018);
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .admin-entry-splash { transition-duration: .01ms !important; }
        }
      `}</style>
    </div>
  );
}
