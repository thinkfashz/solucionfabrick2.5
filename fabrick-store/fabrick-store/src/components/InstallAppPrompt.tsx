'use client';

import { useEffect, useMemo, useState } from 'react';

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }
}

const DISMISS_KEY = 'fabrick.install.dismissed.v1';

function isStandaloneDisplay() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function InstallAppPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const canShow = useMemo(() => {
    if (!isMobile || dismissed || isStandaloneDisplay()) return false;
    return Boolean(promptEvent) || isIos;
  }, [dismissed, isIos, isMobile, promptEvent]);

  const close = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, '1');
    }
  };

  const install = async () => {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      close();
    }
  };

  if (!canShow) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[250] md:inset-x-auto md:right-6 md:w-[26rem]">
      <div className="rounded-[2rem] border border-yellow-400/25 bg-black/88 p-4 text-white shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-yellow-400 text-black">
            <span className="text-lg font-black">F</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-400">Instalar Fabrick</p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-200">
              Lleva Fabrick en tu celular con una experiencia mas rapida, comoda y de pantalla completa.
            </p>
            {isIos && !promptEvent ? (
              <p className="mt-2 text-xs text-zinc-400">
                En iPhone o iPad, toca compartir y luego selecciona <strong>Añadir a pantalla de inicio</strong>.
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              {promptEvent ? (
                <button
                  onClick={() => void install()}
                  className="rounded-full bg-yellow-400 px-5 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-black transition hover:bg-white"
                >
                  Instalar ahora
                </button>
              ) : null}
              <button
                onClick={close}
                className="rounded-full border border-white/10 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-300 transition hover:border-white/30 hover:text-white"
              >
                Ahora no
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
