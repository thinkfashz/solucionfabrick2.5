'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FabrickPeakIcon } from '@/components/FabrickBrandIcon';

const SESSION_KEY = 'fabrick-matrix-shown';

// Binary Matrix rain — both falling and rising columns
function useMatrixCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>, running: boolean) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !running) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CHARS = '01';
    const FONT_SIZE = 14;
    let cols: { x: number; y: number; speed: number; dir: 1 | -1; opacity: number; chars: string[] }[] = [];
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
        speed: 1 + Math.random() * 2.2,
        dir: (Math.random() < 0.35 ? -1 : 1) as 1 | -1,  // ~35% go upward
        opacity: 0.5 + Math.random() * 0.5,
        chars: Array.from({ length: 24 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
      }));
    }

    function draw(now: number) {
      if (!canvas || !ctx) return;
      const dt = Math.min(now - lastTime, 40);
      lastTime = now;

      // Semi-transparent overlay creates the trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${FONT_SIZE}px monospace`;

      for (const col of cols) {
        const len = col.chars.length;
        for (let j = 0; j < len; j++) {
          const cy = col.y + j * FONT_SIZE * col.dir;
          if (cy < -FONT_SIZE || cy > canvas.height + FONT_SIZE) continue;

          // Lead character is brightest
          const isLead = j === 0;
          if (isLead) {
            ctx.shadowColor = '#00ff41';
            ctx.shadowBlur  = 8;
            ctx.fillStyle   = `rgba(200, 255, 200, ${col.opacity})`;
          } else {
            ctx.shadowBlur  = 0;
            const fade = 1 - j / len;
            ctx.fillStyle = `rgba(0, ${Math.round(180 + 75 * fade)}, ${Math.round(40 * fade)}, ${col.opacity * fade * 0.9})`;
          }
          // Randomly mutate chars for glitch feel
          if (Math.random() < 0.02) {
            col.chars[j] = CHARS[Math.floor(Math.random() * CHARS.length)];
          }
          ctx.fillText(col.chars[j], col.x, Math.round(cy));
        }

        // Advance column
        col.y += col.speed * col.dir * (dt / 16);

        // Wrap around edges
        if (col.dir === 1 && col.y > canvas.height + len * FONT_SIZE) {
          col.y = -len * FONT_SIZE;
          col.speed = 1 + Math.random() * 2.2;
        } else if (col.dir === -1 && col.y + len * FONT_SIZE < 0) {
          col.y = canvas.height + len * FONT_SIZE;
          col.speed = 1 + Math.random() * 2.2;
        }
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame((t) => { lastTime = t; draw(t); });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef, running]);
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface AdminMatrixSplashProps {
  onDone: () => void;
}

export function AdminMatrixSplash({ onDone }: AdminMatrixSplashProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<'matrix' | 'brand' | 'exit'>('matrix');

  useMatrixCanvas(canvasRef, phase !== 'exit');

  useEffect(() => {
    // Phase 1: matrix alone for 1.8s
    const t1 = setTimeout(() => setPhase('brand'), 1800);
    // Phase 2: brand overlaid for 1.2s more (total 3s)
    const t2 = setTimeout(() => {
      setPhase('exit');
      setTimeout(onDone, 600); // wait for fade out
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <AnimatePresence>
      {phase !== 'exit' && (
        <motion.div
          key="matrix-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] overflow-hidden bg-black"
        >
          {/* Matrix canvas */}
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

          {/* Subtle vignette */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_30%,rgba(0,0,0,0.55)_100%)]" />

          {/* Scan line overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
            }}
          />

          {/* Brand reveal — appears at 1.8s */}
          <AnimatePresence>
            {phase === 'brand' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-6"
              >
                {/* Logo */}
                <motion.div
                  animate={{ boxShadow: ['0 0 0px rgba(0,255,65,0)', '0 0 40px rgba(0,255,65,0.6)', '0 0 20px rgba(0,255,65,0.3)'] }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border border-[#00ff41]/40"
                  style={{ background: 'linear-gradient(135deg, #0a1a0a, #0d2b0d)' }}
                >
                  <FabrickPeakIcon size={38} />
                </motion.div>

                {/* Title */}
                <div className="flex flex-col items-center gap-1.5">
                  <motion.p
                    initial={{ letterSpacing: '0.5em', opacity: 0 }}
                    animate={{ letterSpacing: '0.32em', opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className="font-mono text-base font-black uppercase text-[#00ff41]"
                    style={{ textShadow: '0 0 20px rgba(0,255,65,0.7)' }}
                  >
                    SOLUCIONES FABRICK
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.25 }}
                    className="font-mono text-[10px] uppercase tracking-[0.4em] text-[#00ff41]/50"
                  >
                    Panel Root · Acceso autorizado
                  </motion.p>
                </div>

                {/* Progress bar */}
                <motion.div className="w-48 overflow-hidden rounded-full bg-[#00ff41]/10 h-0.5">
                  <motion.div
                    className="h-full rounded-full bg-[#00ff41]"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.1, ease: 'linear' }}
                    style={{ boxShadow: '0 0 8px rgba(0,255,65,0.8)' }}
                  />
                </motion.div>

                {/* Blinking cursor line */}
                <motion.p
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  className="font-mono text-[11px] text-[#00ff41]/70"
                >
                  {'> iniciando panel de control_'}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
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
