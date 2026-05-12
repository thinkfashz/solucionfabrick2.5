'use client';

/**
 * SplashScreen — Pantalla de carga inicial.
 *
 * Rediseñada como un "system boot" cinematográfico: logo SF, barra de
 * progreso real animada de 0→100, líneas de estado tipo terminal,
 * salida con fade + escala + blur. Sólo se muestra una vez por sesión
 * (sessionStorage) y nunca bloquea más de 1.6s — hay un kill-switch
 * por timeout que la quita aunque el RAF falle.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';

const SESSION_FLAG = 'fabrick.splash.seen.v2';
/** Clave usada por la versión anterior del splash. La limpiamos al inicializar
 *  para no dejar basura en sessionStorage. */
const LEGACY_SESSION_FLAG = 'fabrick.loadingScreen.seen.v1';

const BOOT_LINES = [
  { label: 'Verificando estructura',    pct: 22 },
  { label: 'Cargando proyectos',        pct: 48 },
  { label: 'Sincronizando catálogo',    pct: 72 },
  { label: 'Listo para construir',      pct: 100 },
];

export default function SplashScreen() {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();

  // El panel admin nunca debe quedar tapado por el splash.
  const isAdmin = pathname?.startsWith('/admin') ?? false;

  // Always start hidden so the server never emits black-screen HTML.
  // The useEffect below reads sessionStorage (client-only, after hydration)
  // and flips visible to true only when the splash should actually show.
  // This eliminates the server/client mismatch that caused the black screen
  // on reload: previously the server rendered visible=true (no window) while
  // the client hydrated with visible=false (sessionStorage flag set), leaving
  // the server-rendered black div on screen until React finished reconciling.
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  // Hard kill switch — si AnimatePresence o framer-motion fallan al hacer
  // el exit, este flag oculta el splash retirándolo del DOM.
  const [hardHidden, setHardHidden] = useState(false);

  // Decide client-side visibility once after hydration.
  // Also clears the legacy LoadingScreen flag regardless of whether we show.
  useEffect(() => {
    if (isAdmin) return;
    try { window.sessionStorage.removeItem(LEGACY_SESSION_FLAG); } catch { /* ignore */ }
    try {
      if (window.sessionStorage.getItem(SESSION_FLAG) !== '1') {
        setVisible(true);
      }
    } catch {
      // sessionStorage unavailable (private mode, quota) — skip splash silently
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!visible) return;

    try { window.sessionStorage.setItem(SESSION_FLAG, '1'); } catch { /* private mode / quota */ }

    const startTime = Date.now();
    const duration = prefersReduced ? 400 : 1200;
    let rafId: number | null = null;

    const ease = (t: number) => 1 - Math.pow(1 - t, 3); // easeOutCubic

    const frame = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      setProgress(ease(t) * 100);
      if (t < 1) {
        rafId = requestAnimationFrame(frame);
      } else {
        // Pequeño hold antes del exit para sentir un "boot completo".
        window.setTimeout(() => setVisible(false), 120);
      }
    };

    rafId = requestAnimationFrame(frame);

    // Failsafe: si el RAF muere, cualquiera que sea la causa, retiramos
    // el splash del DOM en 1.6s (o 600ms en reduced-motion).
    const safety = window.setTimeout(() => {
      setProgress(100);
      setVisible(false);
      setHardHidden(true);
    }, prefersReduced ? 600 : 1600);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.clearTimeout(safety);
    };
  }, [visible, prefersReduced]);

  // Línea de estado activa según progreso.
  const activeLine = BOOT_LINES.findIndex((l) => progress < l.pct);
  const activeIdx = activeLine === -1 ? BOOT_LINES.length - 1 : activeLine;

  if (isAdmin) return null;
  if (hardHidden) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: prefersReduced ? 1 : 1.04,
            filter: prefersReduced ? 'none' : 'blur(14px)',
            transition: { duration: prefersReduced ? 0.25 : 0.55, ease: [0.4, 0, 0.2, 1] },
          }}
          aria-hidden
        >
          {/* Capas de fondo: vignette dorada + ruido sutil */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(250,204,21,0.10)_0%,rgba(0,0,0,0)_55%),radial-gradient(circle_at_80%_85%,rgba(56,189,248,0.06)_0%,rgba(0,0,0,0)_55%)]" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)',
            }}
          />

          {/* Flash de salida */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-yellow-400"
            initial={{ opacity: 0 }}
            exit={{ opacity: [0, 0.16, 0], transition: { duration: 0.55, times: [0, 0.2, 1] } }}
          />

          {/* Tarjeta principal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-[min(92vw,460px)] rounded-3xl border border-white/10 bg-zinc-950/85 px-7 py-7 shadow-[0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur"
          >
            {/* Glow superior */}
            <div className="pointer-events-none absolute -inset-px rounded-3xl bg-[radial-gradient(circle_at_50%_-10%,rgba(250,204,21,0.25),rgba(0,0,0,0)_55%)]" />

            {/* Cabecera: logo + nombre */}
            <div className="relative flex items-center gap-4">
              {/* Logo SF — cuadro dorado con SF y reflejo */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 shadow-[0_10px_30px_rgba(250,204,21,0.4)]">
                <span className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.55),rgba(255,255,255,0)_60%)]" />
                <span className="relative text-base font-black uppercase tracking-[0.22em] text-black">SF</span>
                {/* Anillo rotando — sólo motion-safe */}
                <motion.span
                  aria-hidden
                  className="absolute -inset-1 rounded-2xl border border-yellow-300/40"
                  animate={prefersReduced ? {} : { rotate: 360 }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <div className="min-w-0">
                <p className="font-playfair text-lg font-black tracking-[0.12em] text-white">
                  SOLUCIONES <span className="text-yellow-400">FABRICK</span>
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-zinc-500">
                  Build System · v9.0
                </p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="relative mt-7">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.24em]">
                <span className="text-zinc-500">Booting</span>
                <span className="text-yellow-400">{Math.round(progress)}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-900 ring-1 ring-white/5">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-yellow-200 shadow-[0_0_18px_rgba(250,204,21,0.6)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Líneas de estado tipo terminal */}
            <ul className="relative mt-5 space-y-1.5 text-[11px] font-mono">
              {BOOT_LINES.map((line, i) => {
                const done = i < activeIdx || progress >= line.pct;
                const active = i === activeIdx && !done;
                return (
                  <li
                    key={line.label}
                    className={`flex items-center gap-2 transition ${
                      done ? 'text-emerald-300' : active ? 'text-yellow-200' : 'text-zinc-600'
                    }`}
                  >
                    <span aria-hidden className="w-3 text-center">
                      {done ? '✓' : active ? (
                        <motion.span
                          className="inline-block"
                          animate={prefersReduced ? {} : { rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                        >
                          ⟳
                        </motion.span>
                      ) : '·'}
                    </span>
                    <span className="truncate">{line.label}</span>
                    {active && (
                      <motion.span
                        className="ml-auto inline-block h-2 w-1 bg-yellow-300"
                        animate={prefersReduced ? {} : { opacity: [1, 0, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        aria-hidden
                      />
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Footer mini */}
            <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3 text-[9px] font-semibold uppercase tracking-[0.28em] text-zinc-600">
              <span>Linares · Maule</span>
              <span className="text-yellow-400/80">Tu obra en buenas manos</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

