'use client';

import { useEffect, useRef, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface UiverseSearchModalProps {
  open: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onFilterClick?: () => void;
  resultCount?: number;
}

/**
 * Full-screen search overlay with Uiverse animated search bar.
 * Colors adapted from the original purple/pink to Fabrick amber/gold.
 * The glowing border animation only works on dark backgrounds — hence
 * the dark overlay wrapper.
 */
export default function UiverseSearchModal({
  open,
  value,
  onChange,
  onClose,
  onFilterClick,
  resultCount,
}: UiverseSearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus the input when modal opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="search-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-start pt-[18vh] bg-black/85 backdrop-blur-xl"
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          {/* ── Close button ───────────────────────────────────────── */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full border border-white/10 bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            aria-label="Cerrar búsqueda"
          >
            <X size={18} />
          </button>

          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4 w-full px-4"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 font-bold">
              Buscar producto
            </p>

            {/* ── Uiverse animated search bar ────────────────────── */}
            <style>{`
              #fabrick-search-poda {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
              }
              .fsb-layer {
                max-height: 58px;
                max-width: min(440px, calc(100vw - 2rem));
                height: 100%;
                width: 100%;
                position: absolute;
                overflow: hidden;
                z-index: -1;
                border-radius: 12px;
                filter: blur(3px);
              }
              .fsb-layer::before {
                content: "";
                z-index: -2;
                position: absolute;
                top: 50%; left: 50%;
                width: 600px; height: 600px;
                background-repeat: no-repeat;
                background-position: 0 0;
                transition: all 2s;
              }
              .fsb-glow {
                overflow: hidden;
                filter: blur(28px);
                opacity: 0.45;
                max-height: 110px;
                max-width: min(480px, calc(100vw - 1rem));
              }
              .fsb-glow::before {
                transform: translate(-50%, -50%) rotate(60deg);
                background-image: conic-gradient(#000, #b8860b 5%, #000 38%, #000 50%, #d97706 60%, #000 87%);
              }
              .fsb-dark::before {
                transform: translate(-50%, -50%) rotate(82deg);
                background-image: conic-gradient(rgba(0,0,0,0), #78350f, rgba(0,0,0,0) 10%, rgba(0,0,0,0) 50%, #a16207, rgba(0,0,0,0) 60%);
              }
              .fsb-white {
                max-height: 52px;
                max-width: min(436px, calc(100vw - 1.5rem));
                border-radius: 10px;
                filter: blur(2px);
              }
              .fsb-white::before {
                transform: translate(-50%, -50%) rotate(83deg);
                filter: brightness(1.4);
                background-image: conic-gradient(rgba(0,0,0,0), #fef08a, rgba(0,0,0,0) 8%, rgba(0,0,0,0) 50%, #f59e0b, rgba(0,0,0,0) 58%);
              }
              .fsb-border {
                max-height: 48px;
                max-width: min(432px, calc(100vw - 2rem));
                border-radius: 11px;
                filter: blur(0.5px);
              }
              .fsb-border::before {
                transform: translate(-50%, -50%) rotate(70deg);
                filter: brightness(1.3);
                background-image: conic-gradient(#0f0f10, #b8860b 5%, #0f0f10 14%, #0f0f10 50%, #d97706 60%, #0f0f10 64%);
              }
              #fabrick-search-poda:hover .fsb-dark::before  { transform: translate(-50%, -50%) rotate(-98deg); }
              #fabrick-search-poda:hover .fsb-glow::before  { transform: translate(-50%, -50%) rotate(-120deg); }
              #fabrick-search-poda:hover .fsb-white::before { transform: translate(-50%, -50%) rotate(-97deg); }
              #fabrick-search-poda:hover .fsb-border::before { transform: translate(-50%, -50%) rotate(-110deg); }
              #fabrick-search-poda:focus-within .fsb-dark::before  { transform: translate(-50%, -50%) rotate(442deg); transition: all 4s; }
              #fabrick-search-poda:focus-within .fsb-glow::before  { transform: translate(-50%, -50%) rotate(420deg); transition: all 4s; }
              #fabrick-search-poda:focus-within .fsb-white::before { transform: translate(-50%, -50%) rotate(443deg); transition: all 4s; }
              #fabrick-search-poda:focus-within .fsb-border::before { transform: translate(-50%, -50%) rotate(430deg); transition: all 4s; }
              #fsb-main { position: relative; }
              #fsb-main:focus-within > #fsb-input-mask { display: none; }
              #fsb-input-mask {
                pointer-events: none;
                width: 100px; height: 22px;
                position: absolute;
                background: linear-gradient(90deg, transparent, #0a0a0a);
                top: 17px; left: 62px;
              }
              #fsb-pink-mask {
                pointer-events: none;
                width: 30px; height: 22px;
                position: absolute;
                background: #d97706;
                top: 10px; left: 5px;
                filter: blur(18px);
                opacity: 0.7;
                transition: all 2s;
              }
              #fsb-main:hover > #fsb-pink-mask { opacity: 0; }
              .fsb-filter-border {
                height: 42px; width: 40px;
                position: absolute;
                overflow: hidden;
                top: 7px; right: 7px;
                border-radius: 10px;
              }
              .fsb-filter-border::before {
                content: "";
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%) rotate(90deg);
                width: 600px; height: 600px;
                filter: brightness(1.35);
                background-image: conic-gradient(rgba(0,0,0,0), #4a4030, rgba(0,0,0,0) 50%, rgba(0,0,0,0) 50%, #4a4030, rgba(0,0,0,0) 100%);
                animation: fsb-rotate 4s linear infinite;
              }
              @keyframes fsb-rotate { 100% { transform: translate(-50%, -50%) rotate(450deg); } }
              .fsb-input {
                background-color: #080808;
                border: none;
                width: min(420px, calc(100vw - 2.5rem));
                height: 58px;
                border-radius: 10px;
                color: white;
                padding-left: 56px;
                padding-right: 58px;
                font-size: 16px;
                font-family: inherit;
              }
              .fsb-input::placeholder { color: #a09070; }
              .fsb-input:focus { outline: none; }
              #fsb-filter-btn {
                position: absolute;
                top: 8px; right: 8px;
                display: flex; align-items: center; justify-content: center;
                z-index: 2;
                width: 42px; height: 42px;
                isolation: isolate;
                overflow: hidden;
                border-radius: 10px;
                background: linear-gradient(180deg, #1a1200, #0a0a0a, #1a1000);
                border: 1px solid rgba(184,134,11,0.2);
                cursor: pointer;
                transition: all 0.2s;
              }
              #fsb-filter-btn:hover {
                background: linear-gradient(180deg, #2a1f00, #0a0a0a, #2a1800);
                border-color: rgba(217,119,6,0.5);
                box-shadow: 0 0 12px rgba(250,204,21,0.2);
              }
              #fsb-search-icon { position: absolute; left: 18px; top: 50%; transform: translateY(-50%); }
            `}</style>

            <div id="fabrick-search-poda">
              <div className="fsb-layer fsb-glow" />
              <div className="fsb-layer fsb-dark" />
              <div className="fsb-layer fsb-dark" />
              <div className="fsb-layer fsb-dark" />
              <div className="fsb-layer fsb-white" />
              <div className="fsb-layer fsb-border" />

              <div id="fsb-main">
                <input
                  ref={inputRef}
                  type="text"
                  className="fsb-input"
                  placeholder="Buscar en el catálogo…"
                  value={value}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                  autoComplete="off"
                />
                <div id="fsb-input-mask" />
                <div id="fsb-pink-mask" />
                <div className="fsb-filter-border" />
                <button
                  id="fsb-filter-btn"
                  type="button"
                  onClick={onFilterClick}
                  aria-label="Filtros"
                >
                  {/* Filter icon */}
                  <svg
                    preserveAspectRatio="none"
                    height="22"
                    width="22"
                    viewBox="4.8 4.56 14.832 15.408"
                    fill="none"
                  >
                    <path
                      d="M8.16 6.65002H15.83C16.47 6.65002 16.99 7.17002 16.99 7.81002V9.09002C16.99 9.56002 16.7 10.14 16.41 10.43L13.91 12.64C13.56 12.93 13.33 13.51 13.33 13.98V16.48C13.33 16.83 13.1 17.29 12.81 17.47L12 17.98C11.24 18.45 10.2 17.92 10.2 16.99V13.91C10.2 13.5 9.97 12.98 9.73 12.69L7.52 10.36C7.23 10.08 7 9.55002 7 9.20002V7.87002C7 7.17002 7.52 6.65002 8.16 6.65002Z"
                      stroke="#d97706"
                      strokeWidth="1.2"
                      strokeMiterlimit="10"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <div id="fsb-search-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    height="22"
                    fill="none"
                  >
                    <circle stroke="url(#fsb-sg)" r="8" cy="11" cx="11" />
                    <line stroke="url(#fsb-sl)" y2="16.65" y1="22" x2="16.65" x1="22" />
                    <defs>
                      <linearGradient gradientTransform="rotate(50)" id="fsb-sg">
                        <stop stopColor="#fef9c3" offset="0%" />
                        <stop stopColor="#d97706" offset="50%" />
                      </linearGradient>
                      <linearGradient id="fsb-sl">
                        <stop stopColor="#d97706" offset="0%" />
                        <stop stopColor="#a16207" offset="50%" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
            </div>

            {/* Result count hint */}
            {value.trim() && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-zinc-500"
              >
                {resultCount === 0
                  ? 'Sin resultados'
                  : `${resultCount} producto${resultCount === 1 ? '' : 's'} encontrado${resultCount === 1 ? '' : 's'}`}
              </motion.p>
            )}

            <p className="text-[10px] text-zinc-700 uppercase tracking-widest mt-1">
              Presiona <kbd className="px-1.5 py-0.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 font-mono text-[9px]">Esc</kbd> para cerrar
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
