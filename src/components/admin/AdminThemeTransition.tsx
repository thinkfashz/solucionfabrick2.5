'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isActive: boolean;
  targetTheme: '' | 'studio';
  onComplete: () => void;
}

const TO_STUDIO = [
  { label: 'Iniciando migración visual',      detail: 'Preparando sistema de diseño Studio Admin…' },
  { label: 'Transfiriendo 62 módulos',         detail: 'Productos · Pedidos · ML · Video Engine · IA…' },
  { label: 'Adaptando componentes de UI',      detail: 'Sidebar colapsable · Header slim · Cards…' },
  { label: 'Verificando seguridad',            detail: 'Passkeys · WebAuthn · Auth tokens intactos…' },
  { label: 'Aplicando transformación total',   detail: 'Tu obra en buenas manos ✦' },
];

const TO_FABRICK = [
  { label: 'Restaurando identidad Fabrick',    detail: 'Cargando diseño original…' },
  { label: 'Recuperando acento dorado',        detail: 'Gradientes · Glassmorphism · Partículas…' },
  { label: 'Sincronizando módulos',            detail: '62 módulos operativos…' },
  { label: 'Verificando sesión',               detail: 'Auth · Passkeys · Tokens intactos…' },
  { label: 'Bienvenido de vuelta',             detail: 'Soluciones Fabrick · Tu obra en buenas manos ✦' },
];

const DURATION_MS = 2800;

export function AdminThemeTransition({ isActive, targetTheme, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(0);
  const [done, setDone] = useState(false);

  const steps = targetTheme === 'studio' ? TO_STUDIO : TO_FABRICK;
  const isStudio = targetTheme === 'studio';

  useEffect(() => {
    if (!isActive) { setProgress(0); setStepIdx(0); setDone(false); return; }

    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(p);
      setStepIdx(Math.min(steps.length - 1, Math.floor((p / 100) * steps.length)));
      if (p < 100) {
        raf = requestAnimationFrame(tick);
      } else {
        setDone(true);
        setTimeout(onComplete, 520);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const accent = isStudio ? '#f97316' : '#facc15';
  const accentGlow = isStudio ? 'rgba(249,115,22,0.55)' : 'rgba(250,204,21,0.55)';
  const accentSoft = isStudio ? 'rgba(249,115,22,0.15)' : 'rgba(250,204,21,0.15)';

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="theme-transition"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-black"
          style={{ isolation: 'isolate' }}
        >
          {/* Background glow blobs */}
          <div className="pointer-events-none absolute inset-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full blur-[120px]"
              style={{ background: accentSoft }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
              className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full blur-[120px]"
              style={{ background: isStudio ? 'rgba(249,115,22,0.10)' : 'rgba(56,189,248,0.12)' }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:100%_8px] opacity-20" />
          </div>

          {/* Main content */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex w-full max-w-md flex-col items-center px-6 text-center"
          >
            {/* Logo */}
            <motion.div
              animate={done ? { scale: [1, 1.08, 1] } : {}}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="mb-8 flex flex-col items-center gap-3"
            >
              <div
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border"
                style={{
                  background: accent,
                  borderColor: `${accent}66`,
                  boxShadow: `0 16px 56px ${accentGlow}`,
                }}
              >
                <span className="relative z-10 font-playfair text-2xl font-black tracking-[0.28em] text-black">SF</span>
              </div>

              <div className="flex flex-col items-center gap-0.5">
                <p className="font-playfair text-base font-black tracking-[0.32em]" style={{ color: accent }}>
                  SOLUCIONES FABRICK
                </p>
                <p className="text-[10px] uppercase tracking-[0.38em] text-white/40">
                  Tu obra en buenas manos
                </p>
              </div>
            </motion.div>

            {/* Progress bar */}
            <div className="w-full">
              <div className="relative h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${accent}, ${isStudio ? '#fb923c' : '#fde68a'})`,
                    boxShadow: `0 0 12px ${accentGlow}`,
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'linear', duration: 0.1 }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-[0.3em] text-white/35 tabular-nums">
                <span>{Math.round(progress).toString().padStart(3, '0')}%</span>
                <span>paso {stepIdx + 1}/{steps.length}</span>
              </div>
            </div>

            {/* Current step */}
            <AnimatePresence mode="wait">
              <motion.div
                key={stepIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.25 }}
                className="mt-7 flex flex-col items-center gap-1"
              >
                <p className="text-[13px] font-semibold text-white/90">
                  <span style={{ color: accent }}>›</span> {steps[stepIdx].label}
                </p>
                <p className="text-[10px] text-white/35">{steps[stepIdx].detail}</p>
              </motion.div>
            </AnimatePresence>

            {/* Completed steps */}
            <div className="mt-6 flex w-full flex-col gap-1 text-left">
              {steps.slice(0, stepIdx).map((s, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 text-[10px] font-mono tracking-[0.12em] text-white/30"
                >
                  <span style={{ color: isStudio ? '#22c55e' : '#34d399' }}>✓</span>
                  <span className="truncate">{s.label}</span>
                </motion.div>
              ))}
            </div>

            {/* Done message */}
            <AnimatePresence>
              {done && (
                <motion.p
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 text-[11px] font-bold uppercase tracking-[0.28em]"
                  style={{ color: accent }}
                >
                  {isStudio ? '✦ Studio Admin activado' : '✦ Fabrick restaurado'}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Footer */}
          <p className="absolute bottom-5 z-10 text-[9px] uppercase tracking-[0.4em] text-white/20">
            Acceso exclusivo · Soluciones Fabrick
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
