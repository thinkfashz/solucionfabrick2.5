'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ShieldCheck, X } from 'lucide-react';

const STORAGE_KEY = 'fabrick_cookie_consent_v1';

export default function CookieConsentBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (pathname?.startsWith('/admin') || pathname?.startsWith('/auth')) return;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    setVisible(!saved);
  }, [pathname]);

  const save = (value: 'accepted' | 'rejected') => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, at: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9998] px-4 pb-4 md:px-6 md:pb-6">
      <div className="mx-auto max-w-4xl rounded-[1.6rem] border border-yellow-300/25 bg-zinc-950/95 p-5 text-white shadow-[0_24px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-6">
        <div className="flex gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-yellow-300 text-black">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Privacidad y cookies</p>
                <h2 className="mt-1 text-lg font-black text-white">Tu decisión importa</h2>
              </div>
              <button
                type="button"
                onClick={() => save('rejected')}
                className="rounded-full border border-white/10 p-2 text-zinc-400 transition hover:text-white"
                aria-label="Cerrar aviso de cookies"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm leading-7 text-zinc-400">
              Usamos datos de formularios para responder solicitudes, guardar seguimiento en CRM y mejorar la atención. Las cookies no esenciales solo se usarán si las aceptas.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
              <Link href="/legal/privacidad" className="text-yellow-300 underline decoration-yellow-300/40 underline-offset-4">Política de privacidad</Link>
              <Link href="/legal/cookies" className="text-yellow-300 underline decoration-yellow-300/40 underline-offset-4">Cookies</Link>
              <Link href="/legal/terminos-y-condiciones" className="text-yellow-300 underline decoration-yellow-300/40 underline-offset-4">Términos</Link>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => save('accepted')}
                className="rounded-full bg-yellow-300 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-white"
              >
                Aceptar
              </button>
              <button
                type="button"
                onClick={() => save('rejected')}
                className="rounded-full border border-white/15 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-white transition hover:border-yellow-300/40 hover:text-yellow-300"
              >
                Rechazar no esenciales
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
