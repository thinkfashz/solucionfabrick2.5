'use client';
/*
 * Plano390RotateHint — onboarding de orientación del visor 390-1.
 * En retrato invita a girar el teléfono con una animación de 90°; el visor
 * gana amplitud horizontal y el HUD cabe mejor. "Girar ahora" intenta
 * fullscreen + orientation lock (si el navegador lo permite); "Seguir en
 * vertical" lo descarta solo para esta sesión.
 */
import { useEffect, useState } from 'react';
import { RotateCw, Smartphone, X } from 'lucide-react';

const KEY = 'p390-rotate-dismissed';

export default function Plano390RotateHint({ enabled }: { enabled: boolean }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!enabled) {
      setShow(false);
      return;
    }
    const check = () => {
      let dismissed = false;
      try {
        dismissed = sessionStorage.getItem(KEY) === '1';
      } catch {
        /* almacenamiento opcional */
      }
      const portrait = window.matchMedia('(orientation: portrait)').matches;
      const small = window.innerWidth < 1024;
      setShow(enabled && portrait && small && !dismissed);
    };
    const t = window.setTimeout(check, 900);
    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener?.('change', check);
    window.addEventListener('resize', check);
    return () => {
      window.clearTimeout(t);
      mq.removeEventListener?.('change', check);
      window.removeEventListener('resize', check);
    };
  }, [enabled]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(KEY, '1');
    } catch {
      /* almacenamiento opcional */
    }
    setShow(false);
  };

  const rotate = async () => {
    setBusy(true);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      const orientation = screen.orientation as unknown as {
        lock?: (o: string) => Promise<void>;
      };
      await orientation?.lock?.('landscape');
    } catch {
      /* iOS/Safari no permite lock: el usuario gira a mano. */
    } finally {
      setBusy(false);
    }
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Girar el teléfono para ver el recorrido en horizontal"
      className="absolute inset-0 z-[80] flex items-center justify-center bg-black/55 px-5 backdrop-blur-[3px]"
    >
      <style>{`
        @keyframes p390-phone-turn {
          0%, 18% { transform: rotate(0deg) translateY(0); }
          42% { transform: rotate(0deg) translateY(-4px); }
          62%, 100% { transform: rotate(90deg) translateY(0); }
        }
        @keyframes p390-phone-glow {
          0%, 100% { opacity: .28; transform: scale(.96); }
          50% { opacity: .62; transform: scale(1.04); }
        }
        @keyframes p390-arc {
          from { stroke-dashoffset: 156; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes p390-hint-in {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .p390-phone { animation: p390-phone-turn 2.8s cubic-bezier(.65,0,.35,1) infinite; }
        .p390-glow { animation: p390-phone-glow 2.8s ease-in-out infinite; }
        .p390-arc { stroke-dasharray: 156; animation: p390-arc 2.8s cubic-bezier(.65,0,.35,1) infinite; }
        .p390-card { animation: p390-hint-in .45s cubic-bezier(.2,.8,.2,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .p390-phone, .p390-glow, .p390-arc { animation: none; }
          .p390-phone { transform: rotate(90deg); }
        }
      `}</style>

      <div className="p390-card relative w-full max-w-[360px] overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0b1110]/95 p-5 shadow-[0_30px_90px_rgba(0,0,0,.65)]">
        <div
          className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full blur-3xl"
          style={{ background: 'rgba(201,239,99,.18)' }}
        />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar sugerencia de orientación"
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-white/[.06] text-white/60 transition active:scale-95"
        >
          <X size={15} />
        </button>

        <div className="relative mx-auto flex h-[132px] w-full items-center justify-center">
          <div className="p390-glow absolute h-24 w-24 rounded-full bg-[#c9ef63]/30 blur-2xl" />
          <svg viewBox="0 0 180 130" className="relative h-[126px] w-[180px]" aria-hidden>
            <path
              d="M42 96 A 58 58 0 0 1 138 96"
              fill="none"
              stroke="rgba(201,239,99,.35)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="4 7"
            />
            <path
              d="M42 96 A 58 58 0 0 1 138 96"
              fill="none"
              stroke="#c9ef63"
              strokeWidth="3"
              strokeLinecap="round"
              className="p390-arc"
            />
            <g className="p390-phone" style={{ transformOrigin: '90px 82px' }}>
              <rect x="73" y="25" width="34" height="58" rx="8" fill="#0f1a17" stroke="#c9ef63" strokeWidth="2" />
              <rect x="78" y="31" width="24" height="44" rx="4" fill="#22322a" />
              <rect x="81" y="36" width="18" height="3" rx="1.5" fill="#c9ef63" opacity=".8" />
              <rect x="81" y="43" width="12" height="3" rx="1.5" fill="#ffffff" opacity=".35" />
              <rect x="81" y="56" width="18" height="12" rx="2" fill="#c9ef63" opacity=".2" />
              <circle cx="90" cy="78" r="2" fill="#c9ef63" />
            </g>
          </svg>
          <span className="absolute right-1 top-2 inline-flex items-center gap-1 rounded-full border border-[#c9ef63]/30 bg-[#c9ef63]/10 px-2 py-1 text-[8px] font-black uppercase tracking-[.14em] text-[#d8ff8a]">
            <Smartphone size={10} /> horizontal
          </span>
        </div>

        <p className="mt-1 text-center text-[9px] font-black uppercase tracking-[.24em] text-[#c9ef63]">
          Mejor amplitud de visión
        </p>
        <h2 className="mt-2 text-center text-balance text-lg font-black leading-tight text-white">
          Gira el teléfono para recorrer la casa
        </h2>
        <p className="mx-auto mt-2 max-w-[280px] text-center text-[10px] leading-4 text-white/55">
          En horizontal ves los muros, el mobiliario y la cocina completos; el joystick y los botones se acomodan solos.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={rotate}
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#c9ef63] px-5 text-[10px] font-black uppercase tracking-[.18em] text-[#10160d] transition active:scale-[.98] disabled:opacity-60"
          >
            <RotateCw size={15} className={busy ? 'animate-spin' : ''} />
            {busy ? 'Girando…' : 'Girar ahora'}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[.03] px-5 text-[9px] font-black uppercase tracking-[.16em] text-white/55 transition active:scale-[.98]"
          >
            Seguir en vertical
          </button>
        </div>
        <p className="mt-3 text-center text-[7px] uppercase tracking-[.2em] text-white/25">
          También puedes girar el teléfono manualmente
        </p>
      </div>
    </div>
  );
}
