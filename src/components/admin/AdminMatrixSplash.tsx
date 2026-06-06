'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Bot,
  Calculator,
  CheckCircle2,
  Database,
  Kanban,
  Loader2,
  Lock,
  Palette,
  ShieldCheck,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

const SESSION_KEY = 'fabrick-matrix-shown';

const BOOT_PROCESSES = [
  { icon: Lock,        label: 'Boot ROM',    detail: 'Verificando firma criptográfica' },
  { icon: ShieldCheck, label: 'TLS 1.3',     detail: 'Canal cifrado establecido' },
  { icon: Database,    label: 'InsForge DB', detail: 'Conectando base de datos' },
  { icon: Activity,    label: 'Auth',        detail: 'Validando sesión administrativa' },
  { icon: Kanban,      label: 'CRM',         detail: 'Cargando pipeline de ventas' },
  { icon: TrendingUp,  label: 'Analytics',   detail: 'Sincronizando métricas' },
  { icon: Calculator,  label: 'F29 · SII',   detail: 'Declaraciones tributarias listas' },
  { icon: Bot,         label: 'IA Engine',   detail: 'Agentes inteligentes activos' },
  { icon: Palette,     label: 'Editor',      detail: 'Módulos de contenido cargados' },
  { icon: Zap,         label: 'Panel root',  detail: 'Sistema listo' },
] as const;

const PROCESS_INTERVAL = 260; // ms between each process appearing
const MATRIX_DELAY     = 380; // ms of pure matrix before process list shows

// Amber Matrix rain — falling and rising columns
function useMatrixCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  running: boolean,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !running) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CHARS = '01';
    const FONT_SIZE = 14;
    type Col = { x: number; y: number; speed: number; dir: 1 | -1; opacity: number; chars: string[] };
    let cols: Col[] = [];
    let animId = 0;
    let lastTime = 0;

    function resize() {
      if (!canvas) return;
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = Math.floor(canvas.width / (FONT_SIZE + 2));
      cols = Array.from({ length: count }, (_, i) => ({
        x: i * (FONT_SIZE + 2),
        y: Math.random() < 0.5 ? Math.random() * canvas!.height : -FONT_SIZE * 20 * Math.random(),
        speed: 0.8 + Math.random() * 2,
        dir: (Math.random() < 0.3 ? -1 : 1) as 1 | -1,
        opacity: 0.25 + Math.random() * 0.35,
        chars: Array.from({ length: 24 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
      }));
    }

    function draw(now: number) {
      if (!canvas || !ctx) return;
      const dt = Math.min(now - lastTime, 40);
      lastTime = now;

      ctx.fillStyle = 'rgba(0,0,0,0.09)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = `bold ${FONT_SIZE}px monospace`;

      for (const col of cols) {
        const len = col.chars.length;
        for (let j = 0; j < len; j++) {
          const cy = col.y + j * FONT_SIZE * col.dir;
          if (cy < -FONT_SIZE || cy > canvas.height + FONT_SIZE) continue;

          const isLead = j === 0;
          if (isLead) {
            ctx.shadowColor = 'rgba(251,191,36,0.85)';
            ctx.shadowBlur  = 12;
            ctx.fillStyle   = `rgba(254,240,138,${col.opacity})`;
          } else {
            ctx.shadowBlur  = 0;
            const fade = 1 - j / len;
            ctx.fillStyle   = `rgba(${Math.round(180 + 71 * fade)},${Math.round(100 + 91 * fade)},${Math.round(5 + 31 * fade)},${col.opacity * fade * 0.85})`;
          }
          if (Math.random() < 0.02) col.chars[j] = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillText(col.chars[j], col.x, Math.round(cy));
        }
        col.y += col.speed * col.dir * (dt / 16);
        if (col.dir === 1 && col.y > canvas.height + len * FONT_SIZE) {
          col.y = -len * FONT_SIZE;
          col.speed = 0.8 + Math.random() * 2;
        } else if (col.dir === -1 && col.y + len * FONT_SIZE < 0) {
          col.y = canvas.height + len * FONT_SIZE;
          col.speed = 0.8 + Math.random() * 2;
        }
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame((t) => { lastTime = t; draw(t); });
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, [canvasRef, running]);
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface AdminMatrixSplashProps {
  onDone: () => void;
}

export function AdminMatrixSplash({ onDone }: AdminMatrixSplashProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exiting, setExiting]           = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [doneCount, setDoneCount]       = useState(0);
  const total = BOOT_PROCESSES.length;

  useMatrixCanvas(canvasRef, !exiting);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    for (let i = 0; i < total; i++) {
      // Process appears
      timers.push(
        setTimeout(() => setVisibleCount(i + 1), MATRIX_DELAY + i * PROCESS_INTERVAL),
      );
      // Process completes (check) 190ms after appearing
      timers.push(
        setTimeout(() => setDoneCount(i + 1), MATRIX_DELAY + i * PROCESS_INTERVAL + 190),
      );
    }

    // After all done + brief hold → exit
    const totalMs = MATRIX_DELAY + (total - 1) * PROCESS_INTERVAL + 190 + 640;
    timers.push(
      setTimeout(() => {
        setExiting(true);
        setTimeout(onDone, 560);
      }, totalMs),
    );

    return () => { timers.forEach(clearTimeout); };
  }, [onDone, total]);

  const progress = doneCount / total;

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="matrix-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.56, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] overflow-hidden bg-black"
        >
          {/* Amber matrix canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {/* Radial vignette — darkens edges so card is readable */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_18%,rgba(0,0,0,0.72)_100%)]" />

          {/* CRT scan-line overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.45) 2px,rgba(0,0,0,0.45) 4px)',
            }}
          />

          {/* Amber corner glow */}
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[520px] -translate-x-1/2 rounded-full bg-amber-400/10 blur-[80px]" />

          {/* Boot card */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 22 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-amber-400/20 bg-black/85 shadow-[0_0_100px_rgba(251,191,36,0.12),0_32px_80px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
            >
              {/* Amber top accent line */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

              <div className="p-5">
                {/* Brand header */}
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-400/25"
                    style={{ background: 'linear-gradient(135deg,#1c1200,#2e1e00)' }}
                  >
                    <FabrickPeakIcon size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-400">
                      Soluciones Fabrick
                    </p>
                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-zinc-600">
                      Panel Root · Iniciando sistema
                    </p>
                  </div>
                  {/* Pulsing live dot */}
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-55" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-amber-400/70">Live</span>
                  </div>
                </div>

                {/* Process list */}
                <div className="space-y-1">
                  {BOOT_PROCESSES.map((proc, i) => {
                    const isVisible = i < visibleCount;
                    const isDone    = i < doneCount;
                    const isActive  = visibleCount > i && !isDone;
                    const Icon      = proc.icon;

                    if (!isVisible) return null;

                    return (
                      <motion.div
                        key={proc.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors ${
                          isActive
                            ? 'border-amber-400/20 bg-amber-400/10'
                            : isDone
                              ? 'border-transparent bg-white/[0.03]'
                              : 'border-transparent bg-transparent'
                        }`}
                      >
                        {/* Status icon */}
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                            isDone
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : isActive
                                ? 'bg-amber-400/15 text-amber-400'
                                : 'bg-white/5 text-zinc-700'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : isActive ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Icon className="h-3.5 w-3.5" />
                          )}
                        </span>

                        {/* Label + detail */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-1.5">
                            <span
                              className={`text-[11px] font-black uppercase tracking-[0.12em] ${
                                isDone ? 'text-white' : isActive ? 'text-amber-300' : 'text-zinc-600'
                              }`}
                            >
                              {proc.label}
                            </span>
                            <span
                              className={`truncate text-[9px] ${
                                isDone ? 'text-zinc-500' : isActive ? 'text-amber-400/60' : 'text-zinc-700'
                              }`}
                            >
                              {proc.detail}
                            </span>
                          </div>
                        </div>

                        {/* Trailing indicator */}
                        {isDone ? (
                          <span className="shrink-0 rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400">
                            OK
                          </span>
                        ) : isActive ? (
                          <motion.span
                            animate={{ opacity: [1, 0, 1] }}
                            transition={{ duration: 0.65, repeat: Infinity }}
                            className="shrink-0 font-mono text-[11px] text-amber-400"
                          >
                            ▌
                          </motion.span>
                        ) : null}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                      Progreso del sistema
                    </span>
                    <span className="font-mono text-[10px] font-bold text-amber-400">
                      {Math.round(progress * 100)}%
                    </span>
                  </div>
                  <div className="h-[3px] overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-300"
                      initial={{ width: '0%' }}
                      animate={{ width: `${progress * 100}%` }}
                      transition={{ duration: 0.28, ease: 'easeOut' }}
                      style={{ boxShadow: '0 0 10px rgba(251,191,36,0.6)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom accent line */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Shell-level wrapper (shows once per session) ──────────────────────────────

export function AdminMatrixSplashOnce() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setShow(true);
    }
  }, []);

  if (!show) return null;
  return <AdminMatrixSplash onDone={() => setShow(false)} />;
}
