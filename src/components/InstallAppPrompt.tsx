'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Download } from 'lucide-react';

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }
}

const DISMISS_KEY = 'fabrick.install.dismissed.v1';
const AUTO_DISMISS_MS = 60_000; // 60 seconds

function trackPwa(event: string, extra?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  try {
    void fetch('/api/pwa/track', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event, ...(extra ?? {}) }),
      keepalive: true,
    });
  } catch {
    /* analytics is best-effort */
  }
}

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function InstallAppPrompt() {
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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, '1');
    }
    trackPwa('install_banner_dismissed');
  }, []);

  // Auto-dismiss after 60 seconds
  useEffect(() => {
    if (dismissed) return;
    const timer = setTimeout(close, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [dismissed, close]);

  const install = async () => {
    if (!promptEvent) return;
    trackPwa('install_prompt_shown');
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    trackPwa(choice.outcome === 'accepted' ? 'install_accepted' : 'install_dismissed', {
      platform: choice.platform,
    });
    if (choice.outcome === 'accepted') {
      close();
    }
  };

  const canShow = useMemo(() => {
    if (!isMobile || dismissed || isStandaloneDisplay()) return false;
    return Boolean(promptEvent) || isIos;
  }, [dismissed, isIos, isMobile, promptEvent]);

  if (!canShow) return null;

  return (
    <div className="fixed bottom-5 right-4 z-[250] md:hidden">
      {expanded ? (
        /* Expanded card */
        <div className="w-72 rounded-[1.75rem] border border-yellow-400/20 bg-[#0a0a0b]/96 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)_both]">
          {/* Close */}
          <button
            onClick={close}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-zinc-500 hover:text-white transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black shadow-[0_0_16px_rgba(250,204,21,0.35)]">
              <span className="text-sm font-black">F</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-yellow-400">Instalar Fabrick</p>
              <p className="text-xs text-zinc-400">App rápida · Sin App Store</p>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-zinc-300 mb-4">
            Accede más rápido desde tu pantalla de inicio con experiencia de pantalla completa.
          </p>

          {isIos && !promptEvent ? (
            <p className="mb-4 text-xs text-zinc-400 bg-white/5 rounded-xl p-3">
              Toca <strong className="text-white">Compartir</strong> y luego <strong className="text-white">Añadir a pantalla de inicio</strong>.
            </p>
          ) : null}

          <div className="flex gap-2">
            {promptEvent ? (
              <button
                onClick={() => void install()}
                className="flex-1 rounded-full bg-yellow-400 py-2.5 text-[11px] font-black uppercase tracking-[0.18em] text-black hover:bg-yellow-300 transition-all"
              >
                Instalar
              </button>
            ) : null}
            <button
              onClick={close}
              className="flex-1 rounded-full border border-white/10 py-2.5 text-[11px] font-semibold text-zinc-400 hover:text-white transition-all"
            >
              No gracias
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed bubble */
        <button
          onClick={() => setExpanded(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-400 text-black shadow-[0_8px_32px_rgba(250,204,21,0.45)] hover:scale-110 active:scale-95 transition-transform duration-200 animate-[bubblePop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          aria-label="Instalar app"
        >
          <Download className="h-6 w-6" />
        </button>
      )}

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bubblePop {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

