'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, X } from 'lucide-react';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }
}

const DISMISS_KEY = 'fabrick.install.dismissed.v1';
const AUTO_DISMISS_MS = 60_000;

function trackPwa(event: string, extra?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    void fetch('/api/pwa/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, ...(extra ?? {}) }),
      keepalive: true,
    });
  } catch {}
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function InstallAppPrompt() {
  const pathname = usePathname();
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = window.navigator.userAgent.toLowerCase();
    const mobile = /iphone|ipad|ipod|android/.test(ua);
    const ios = /iphone|ipad|ipod/.test(ua);
    const hidden = window.localStorage.getItem(DISMISS_KEY) === '1';
    setIsMobile(mobile);
    setIsIos(ios);
    setDismissed(hidden || isStandaloneDisplay());

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setDismissed(hidden || isStandaloneDisplay());
      trackPwa('install_prompt_available');
    };
    const handleInstalled = () => {
      trackPwa('installed');
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const close = useCallback(() => {
    setDismissed(true);
    setExpanded(false);
    if (typeof window !== 'undefined') window.localStorage.setItem(DISMISS_KEY, '1');
    trackPwa('install_banner_dismissed');
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const timer = window.setTimeout(close, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [dismissed, close]);

  async function install() {
    if (!promptEvent) return;
    trackPwa('install_prompt_shown');
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    trackPwa(choice.outcome === 'accepted' ? 'install_accepted' : 'install_dismissed', { platform: choice.platform });
    if (choice.outcome === 'accepted') close();
  }

  const canShow = useMemo(() => {
    if (!isMobile || dismissed || isStandaloneDisplay()) return false;
    return Boolean(promptEvent) || isIos;
  }, [dismissed, isIos, isMobile, promptEvent]);

  if (pathname?.startsWith('/fundador') || !canShow) return null;

  return (
    <div className="fixed bottom-[calc(11.6rem+env(safe-area-inset-bottom))] right-4 z-[9400] md:hidden">
      {expanded ? (
        <div className="relative w-[min(19rem,calc(100vw-2rem))] rounded-[1.8rem] bg-[#FFF9EE] p-5 text-[#08090A] shadow-[0_26px_80px_rgba(23,24,32,.28)] ring-1 ring-[#08090A]/12">
          <button type="button" onClick={close} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-[#08090A]/5 text-[#BFB8AC] transition hover:bg-[#08090A] hover:text-[#FFF9EE]" aria-label="Cerrar instalación"><X className="h-4 w-4" /></button>
          <div className="flex items-center gap-3 pr-8"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]"><FabrickPeakIcon size={32} /></span><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#C97700]">Instalar Fabrick</p><p className="mt-1 text-xs font-semibold text-[#BFB8AC]">Acceso rápido · pantalla completa</p></div></div>
          <p className="mt-4 text-xs leading-6 text-[#5f5853]">Añade Soluciones Fabrick a tu pantalla de inicio para abrir la tienda, tus presupuestos y tu cuenta con menos pasos.</p>
          {isIos && !promptEvent ? <p className="mt-4 rounded-xl bg-[#f3ebe4] p-3 text-xs leading-5 text-[#625a54]">Toca <strong>Compartir</strong> y después <strong>Añadir a pantalla de inicio</strong>.</p> : null}
          <div className="mt-5 grid grid-cols-2 gap-2">
            {promptEvent ? <button type="button" onClick={() => void install()} className="rounded-full bg-[#F5871F] py-3 text-[10px] font-black uppercase tracking-[.14em] text-[#08090A] transition hover:bg-[#FFB000]">Instalar</button> : <span />}
            <button type="button" onClick={close} className="rounded-full bg-[#08090A] py-3 text-[10px] font-black uppercase tracking-[.14em] text-[#FFF9EE] transition hover:bg-[#2a2c37]">Ahora no</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setExpanded(true)} className="grid h-12 w-12 place-items-center rounded-full bg-[#F5871F] text-[#08090A] shadow-[0_14px_36px_rgba(94,65,43,.28),0_0_0_5px_rgba(248,240,233,.55)] ring-1 ring-[#C97700]/35 transition hover:-translate-y-1 active:scale-95" aria-label="Instalar aplicación"><Download className="h-5 w-5" /></button>
      )}
    </div>
  );
}