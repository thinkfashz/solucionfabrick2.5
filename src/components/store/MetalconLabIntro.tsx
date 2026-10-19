'use client';
/*
 * MetalconLabIntro — pantalla de entrada estilo videojuego (negro minimalista).
 * • Fondo animado procedural en canvas (rejilla de terreno + partículas doradas)
 * • <video> opcional: si existe /public/videos/lab-intro.webm|mp4 se usa de fondo real
 * • Barra de carga por pasos + botón "Entrar a la habitación"
 * • Sonido de umbral generado en Web Audio (sin assets, funciona en producción)
 */
import { useEffect, useRef, useState } from 'react';

const GOLD = '#F6C64A';
const STEPS = [
  'Trabajando en replanteo',
  'Levantando estructura',
  'Ajustes de voltaje',
  'Vanos y refuerzos',
  'Acabados finales',
];
const STEPS_MS = [650, 850, 900, 700, 750];

/** Sonido "puerta/umbral" generado con Web Audio (sin archivo físico) */
function playEnterSiren() {
  try {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(392, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(784, ctx.currentTime + 0.26);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.55);
    o.onended = () => ctx.close();
  } catch {
    /* audio opcional */
  }
}

/** Rejilla de "terreno de juego" + partículas en canvas (siguiendo el acento de la marca). */
function GameCanvas({ accent }: { accent: string }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const resize = () => {
      w = cv.width = cv.clientWidth * 0.85;
      h = cv.height = cv.clientHeight * 0.85;
    };
    resize();
    window.addEventListener('resize', resize);
    const start = performance.now();
    const dots = Array.from({ length: 38 }, () => ({
      x: Math.random(),
      y: Math.random(),
      s: 0.4 + Math.random() * 1.6,
      v: 0.05 + Math.random() * 0.22,
      tw: Math.random() * Math.PI * 2,
    }));
    const draw = (t: number) => {
      const el = (t - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      // Terreno: rejilla en perspectiva que avanza hacia la cámara
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      const horizon = h * 0.42;
      for (let i = 0; i < 14; i++) {
        const tt = ((i / 12 + el * 0.14) % 1 + 1) % 1;
        const y = horizon + Math.pow(tt, 2.1) * (h - horizon);
        if (tt > 0.995) continue;
        ctx.globalAlpha = Math.max(0, 0.75 - tt * 0.75);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Líneas fuga (perspectiva)
      ctx.strokeStyle = 'rgba(255,255,255,0.045)';
      for (let i = 0; i <= 10; i++) {
        const x0 = (i / 10) * w;
        ctx.beginPath();
        ctx.moveTo(w / 2 + (x0 - w / 2) * 0.08, horizon);
        ctx.lineTo(x0, h);
        ctx.stroke();
      }
      // Partículas doradas flotando (motas de "polvo de obra" glow)
      for (const d of dots) {
        d.y -= d.v * 0.002 * 1000 * 0.001; // deriva muy sutil
        if (d.y < -0.05) d.y = 1.05;
        const x = d.x * w;
        const y = d.y * h;
        const a = 0.18 + 0.5 * Math.abs(Math.sin(d.tw + el * 2));
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(x, y, d.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [accent]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full opacity-70" />;
}

export default function MetalconLabIntro({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [videoOk, setVideoOk] = useState(false);
  const bg = useRef<HTMLVideoElement | null>(null);

  // Progreso por pasos
  useEffect(() => {
    let alive = true;
    const timers: number[] = [];
    let acc = 0;
    STEPS_MS.forEach((ms, i) => {
      acc += ms;
      timers.push(
        window.setTimeout(() => {
          if (alive) {
            setStep(i);
            setProgress(Math.round(((i + 1) / STEPS.length) * 100));
          }
        }, acc),
      );
    });
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  // "Todo listo" poco después de completar la carga
  useEffect(() => {
    if (progress < 100) return;
    const t = window.setTimeout(() => setReady(true), 450);
    return () => clearTimeout(t);
  }, [progress]);

  // Precarga silenciosa del video del juego mientras corre la barra
  useEffect(() => {
    const v = bg.current;
    if (!v) return;
    const p = v.play();
    if (p && typeof p.catch === 'function') {
      p.then(
        () => setVideoOk(true),
        () => setVideoOk(false),
      );
    }
  }, []);

  const enter = () => {
    if (!ready || exiting) return;
    setExiting(true);
    playEnterSiren();
    window.setTimeout(onDone, 650);
  };

  return (
    <div
      aria-hidden={exiting}
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-between overflow-hidden bg-black text-white transition-all duration-700 ${
        exiting ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
    >
      {/* Video opcional (fondo real de juego si existe el asset) */}
      <video
        ref={bg}
        muted
        playsInline
        loop
        preload="auto"
        onCanPlay={() => setVideoOk(true)}
        onError={() => setVideoOk(false)}
        className={`pointer-events-none absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          videoOk ? 'opacity-45' : 'opacity-0'
        }`}
        style={{ filter: 'grayscale(.35) contrast(1.12) saturate(.6) brightness(.66)' }}
      >
        <source src="/videos/lab-intro.webm" type="video/webm" />
        <source src="/videos/lab-intro.mp4" type="video/mp4" />
      </video>
      {/* Fondo garantizado: rejilla de juego + partículas */}
      <div className="pointer-events-none absolute inset-0">
        <GameCanvas accent={GOLD} />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(246,198,74,0.14),transparent_60%)]" />

      {/* Marca */}
      <div className="relative z-10 flex w-full items-center justify-between px-6 pt-7 sm:px-10">
        <div className="flex items-center gap-3">
          <div className="h-[10px] w-[10px] rounded-[2px]" style={{ background: GOLD }} />
          <span className="text-[9px] font-black tracking-[.42em] text-white/60">
            SOLUCIONES FABRICK
          </span>
        </div>
        <span className="hidden text-[8px] font-bold uppercase tracking-[.3em] text-white/28 sm:block">
          Laboratorio
        </span>
      </div>

      {/* Título */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <span
          className="mb-5 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.3em]"
          style={{ color: GOLD }}
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ background: GOLD }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: GOLD }}
            />
          </span>
          Lab Constructivo
        </span>
        <h1 className="max-w-[720px] text-balance text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl">
          Casa Metalcon <span style={{ color: GOLD }}>4D</span>
        </h1>
        <p className="mt-3 max-w-[440px] text-balance text-[11px] leading-5 text-white/40 sm:text-xs">
          Steel framing paso a paso, capas y acabados. Explora la casa en primera persona, desde
          solera hasta cubierta.
        </p>
      </div>

      {/* CTA o barra de carga */}
      <div className="relative z-10 flex w-full flex-col items-center gap-7 pb-12 sm:pb-16">
        {ready ? (
          <>
            <button
              onClick={enter}
              className="group relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full border border-white/20 bg-white/[.03] px-9 backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-white/40 active:scale-[.97]"
            >
              <span className="text-[11px] font-black uppercase tracking-[.28em] transition-colors group-hover:text-black">
                Entrar a la habitación
              </span>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-300 group-hover:translate-x-1"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <p className="text-center text-[8px] font-bold uppercase tracking-[.24em] text-white/26">
              WASD · caminar &nbsp;·&nbsp; Q/E · girar &nbsp;·&nbsp; tocar en móvil
            </p>
          </>
        ) : (
          <div className="flex w-[220px] flex-col items-center gap-3 sm:w-[270px]">
            <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, background: GOLD }}
              />
            </div>
            <div className="flex w-full items-center justify-between text-[8px] font-black uppercase tracking-[.22em]">
              <span className="text-white/45">{STEPS[step]}</span>
              <span style={{ color: GOLD }}>{progress}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { playEnterSiren };
