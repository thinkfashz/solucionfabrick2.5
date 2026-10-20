'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';
import { ArrowLeft, X, Route, Footprints, Clapperboard, Video } from 'lucide-react';
import { ROOMS, PHOTO_SPOTS, PLAN, CCTV_CAMERAS } from '@/lib/plano390Data';

type Stage = 'intro' | 'ready' | 'in';
type Mode = 'free' | 'tour' | 'cctv';

export default function Plano390UI({
  stage,
  onEnter,
  mode,
  onModeChange,
  activeSpot,
  onSpotChange,
  roomLabel,
  onCloseSpot,
  cctvIndex = 0,
}: {
  stage: Stage;
  onEnter: () => void;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  activeSpot: number | null;
  onSpotChange: (i: number) => void;
  roomLabel: string;
  onCloseSpot: () => void;
  cctvIndex?: number;
}): ReactElement | null {
  const GOLD = '#F6C64A';
  const ACCENT_BLUE = '#2E6FA0';
  const ACCENT_ORANGE = '#C56A3A';
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [showFiche, setShowFiche] = useState(false);
  const [prevRoomLabel, setPrevRoomLabel] = useState(roomLabel);
  const [clock, setClock] = useState('');

  // Intro loading steps
  useEffect(() => {
    if (stage !== 'intro') return;
    const STEPS = [
      'Cargando plano arquitectónico',
      'Montando los muros',
      'Mobiliario y madera',
      'Calibrando el sol del sur',
      'Listo',
    ];
    const STEPS_MS = [800, 800, 800, 800, 800]; // total ~4s
    let alive = true;
    let acc = 0;
    const timers: number[] = [];
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
  }, [stage]);

  useEffect(() => {
    if (progress < 100) return;
    const t = window.setTimeout(() => setReady(true), 450);
    return () => clearTimeout(t);
  }, [progress]);

  // Reset banner animation when roomLabel changes
  useEffect(() => {
    setPrevRoomLabel(roomLabel);
  }, [roomLabel]);

  // Reloj del circuito CCTV (solo se pinta en modo cine; client-only).
  useEffect(() => {
    if (mode !== 'cctv' || stage !== 'in') return;
    const tick = () => {
      const d = new Date();
      setClock(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`,
      );
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [mode, stage]);

  const handleEnter = () => {
    onEnter();
  };

  const handleSpotClick = (index: number) => {
    onSpotChange(index);
  };

  const handleCloseSpot = () => {
    onCloseSpot();
  };

  const activeCam = CCTV_CAMERAS[cctvIndex] ?? CCTV_CAMERAS[0];

  // Helper to determine room fill color based on floor type
  const getRoomFill = (floor: string): string => {
    if (floor === 'terrace') return 'rgba(255,205,120,0.06)'; // terrace
    if (floor === 'tile') return 'rgba(78,205,196,0.08)'; // wetrooms
    return 'rgba(255,255,255,0.05)'; // chambers (wood, corridor)
  };

  if (stage === 'intro') {
    return (
      <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between overflow-hidden bg-black text-white transition-all duration-700 select-none touch-none">
        {/* Optional video background (not required) */}

        {/* Brand */}
        <div className="relative z-10 flex w-full items-center justify-between px-6 pt-7 sm:px-10 select-none touch-none">
          <div className="flex items-center gap-3 select-none touch-none">
            <div className="h-[10px] w-[10px] rounded-[2px]" style={{ background: GOLD }} />
            <span className="text-[9px] font-black tracking-[.42em] text-white/60 select-none touch-none">
              SOLUCIONES FABRICK
            </span>
          </div>
          <span className="hidden text-[8px] font-bold uppercase tracking-[.3em] text-white/28 sm:block select-none touch-none">
            Laboratorio
          </span>
        </div>

        {/* Title */}
        <div className="relative z-10 flex flex-col items-center px-6 text-center select-none touch-none pointer-events-none">
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
            Proyecto 390-1
          </span>
          <h1 className="max-w-[720px] text-balance text-4xl font-black leading-[1.04] tracking-tight text-white sm:text-6xl">
            Casa 390-1 <span style={{ color: GOLD }}>127 m²</span>
          </h1>
          <p className="mt-3 max-w-[440px] text-balance text-[11px] leading-5 text-white/40 sm:text-xs select-none touch-none">
            Recorrido 3D primera persona · 3 dormitorios · sauna · terraza
          </p>
        </div>

        {/* CTA or loading bar */}
        <div className={`relative z-10 flex w-full flex-col items-center gap-7 pb-12 sm:pb-16 select-none touch-none ${!ready ? 'pointer-events-none' : ''}`}>
          {ready ? (
            <>
              <button
                onClick={handleEnter}
                className="group relative inline-flex h-14 items-center gap-3 overflow-hidden rounded-full border border-white/20 bg-white/[.03] px-9 backdrop-blur-sm transition-all duration-300 hover:border-white/50 hover:bg-white hover:text-black focus:outline-none focus:ring-2 focus:ring-white/40 active:scale-[.97]"
              >
                <span className="text-[11px] font-black uppercase tracking-[.28em] transition-colors group-hover:text-black">
                  Entrar al recorrido
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
              <p className="text-center text-[8px] font-bold uppercase tracking-[.24em] text-white/26 select-none touch-none">
                WASD · joysticks en móvil · E para la ficha
              </p>
            </>
          ) : (
            <div className="flex w-[220px] flex-col items-center gap-3 sm:w-[270px] select-none touch-none">
              <div className="h-[2px] w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%`, background: GOLD }}
                />
              </div>
              <div className="flex w-full items-center justify-between text-[8px] font-black uppercase tracking-[.22em]">
                <span className="text-white/45 select-none touch-none">
                  {['Cargando plano arquitectónico', 'Montando los muros', 'Mobiliario y madera', 'Calibrando el sol del sur', 'Listo'][step]}
                </span>
                <span style={{ color: GOLD }}>{progress}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (stage === 'ready') {
    // According to spec, return null (empty) as parent handles transition
    return null;
  }

  // stage === 'in' -> HUD
  return (
    <>
      {/* Top bar */}
      <header className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-2 p-3 sm:p-4">
        <Link href="/herramientas" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-black/62 px-4 text-[10px] font-black backdrop-blur-xl">
          <ArrowLeft size={15} />Herramientas
        </Link>
        {/* Center chip */}
        <div className="hidden rounded-full border border-white/10 bg-black/58 px-4 py-2 text-center backdrop-blur-xl sm:block">
          <span className="block text-[8px] font-black uppercase tracking-[.18em] text-[#F6C64A]">
            {mode === 'cctv' ? 'Cine CCTV · En directo' : 'Proyecto 390-1'}
          </span>
          <b className="text-[10px]">{mode === 'cctv' && activeCam ? `${activeCam.id} · ${activeCam.zone}` : roomLabel}</b>
        </div>
        {/* Ficha button */}
        <button
          onClick={() => setShowFiche(true)}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-white/12 bg-black/62 px-4 text-[10px] font-black backdrop-blur-xl"
        >
          Ficha
        </button>
      </header>

      {/* Room label banner (fade-in on change) */}
      <div
        className={`absolute inset-x-0 top-16 z-30 flex justify-center px-4 pointer-events-none transition-opacity duration-500 ${
          roomLabel !== prevRoomLabel ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/62 px-3 py-1 text-[9px] font-black">
          <span className="h-[6px] w-[6px] rounded-full" style={{ background: GOLD }} />
          <span>{roomLabel}</span>
        </span>
      </div>

      {/* Bottom chips */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex max-w-[96vw] flex-row gap-2 overflow-x-auto px-4 select-none touch-none">
        {/* Modos de cámara */}
        <button
          onClick={() => onModeChange('free')}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/62 px-3 py-2 text-[9px] font-black ${
            mode === 'free' ? 'bg-[#F6C64A] text-black' : ''
          }`}
        >
          <Footprints size={14} />
          <span>Libre</span>
        </button>
        <button
          onClick={() => onModeChange('tour')}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/62 px-3 py-2 text-[9px] font-black ${
            mode === 'tour' ? 'bg-[#F6C64A] text-black' : ''
          }`}
        >
          <Route size={14} />
          <span>Recorrido guiado</span>
        </button>
        <button
          onClick={() => onModeChange('cctv')}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/62 px-3 py-2 text-[9px] font-black ${
            mode === 'cctv' ? 'bg-[#F6C64A] text-black' : ''
          }`}
        >
          <Clapperboard size={14} />
          <span>Cine CCTV</span>
        </button>
        {/* Photo spots chips */}
        {PHOTO_SPOTS.map((spot, idx) => (
          <button
            key={spot.id}
            onClick={() => handleSpotClick(idx)}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-black/62 px-3 py-2 text-[9px] font-black"
            style={
              activeSpot === idx
                ? { borderColor: spot.color, color: spot.color, background: `${spot.color}22` }
                : undefined
            }
          >
            <span
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: spot.color }}
            />
            <span>{spot.label.split('·')[0].trim()}</span>
          </button>
        ))}
      </div>

      {/* ── Overlay de Cine CCTV (scanlines + REC + reloj) ── */}
      {mode === 'cctv' && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,.045)_0px,rgba(255,255,255,.045)_1px,transparent_1px,transparent_4px)] opacity-60" />
          <div className="absolute inset-0 shadow-[inset_0_0_190px_rgba(0,0,0,.85)]" />
          {/* Esquinas de encuadre */}
          {[
            'left-3 top-3 border-l-2 border-t-2',
            'right-3 top-3 border-r-2 border-t-2',
            'left-3 bottom-3 border-l-2 border-b-2',
            'right-3 bottom-3 border-r-2 border-b-2',
          ].map((cls) => (
            <span key={cls} className={`absolute h-7 w-7 border-white/35 ${cls}`} />
          ))}
          {/* REC + cámara */}
          <div className="absolute left-6 top-20 flex items-center gap-2 rounded-md bg-black/55 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-[9px] font-black tracking-[.2em] text-white">REC</span>
            <span className="text-[9px] font-bold text-white/55">{activeCam?.id}</span>
          </div>
          <div className="absolute left-6 top-28 max-w-[240px] text-[9px] font-black uppercase tracking-[.18em] text-white/70">
            {activeCam?.name}
          </div>
          {/* Contador de cámaras */}
          <div className="absolute right-6 top-20 flex items-center gap-1.5">
            {CCTV_CAMERAS.map((cam, i) => (
              <span
                key={cam.id}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === cctvIndex ? 'w-5 bg-[#F6C64A]' : 'w-1.5 bg-white/30'
                }`}
              />
            ))}
          </div>
          <div className="absolute bottom-20 left-6 flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-white/60">
            <Video size={12} />
            <span>{clock}</span>
            <span className="text-white/25">CAM {String(cctvIndex + 1).padStart(2, '0')}/{String(CCTV_CAMERAS.length).padStart(2, '0')}</span>
          </div>
        </div>
      )}

      {/* Minimap (hidden on mobile) */}
      <div className="absolute right-3 top-16 z-20 hidden sm:block select-none touch-none pointer-events-none">
        <svg width="200" height="176" viewBox="0 -3.2 14 14.4" aria-label="Minimapa del plano">
          {/* Exterior border glow */}
          <rect
            x="-0.1"
            y="-3.3"
            width="14.2"
            height="14.6"
            rx="0.5"
            fill="none"
            stroke={GOLD}
            strokeWidth="0.15"
            opacity="0.7"
          />
          {/* Rooms */}
          {ROOMS.map((room) => (
            <rect
              key={room.id}
              x={room.x0}
              y={room.z0}
              width={room.x1 - room.x0}
              height={room.z1 - room.z0}
              fill={getRoomFill(room.floor)}
              stroke="none"
            />
          ))}
          {/* Room labels */}
          {ROOMS.map((room) => (
            <text
              key={room.id + '-label'}
              x={(room.x0 + room.x1) / 2}
              y={(room.z0 + room.z1) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="0.4"
              fill="#fff"
              letterSpacing="-0.02"
              pointerEvents="none"
            >
              #{room.id}
            </text>
          ))}
          {/* Cámaras CCTV */}
          {CCTV_CAMERAS.map((cam, i) => (
            <circle
              key={cam.id}
              cx={cam.pos[0]}
              cy={cam.pos[2]}
              r={mode === 'cctv' && i === cctvIndex ? 0.38 : 0.24}
              fill={mode === 'cctv' && i === cctvIndex ? GOLD : '#ffffff'}
              opacity={mode === 'cctv' && i === cctvIndex ? 1 : 0.55}
            />
          ))}
        </svg>
      </div>

      {/* Foto card */}
      {activeSpot !== null && (
        <div
          className={`absolute bottom-[92px] left-1/2 -translate-x-1/2 z-40 flex items-center justify-center px-4 pt-2 select-none`}
        >
          <div
            className="relative w-full max-w-[360px] rounded-xl border bg-[#0b0f13]/95 p-4 backdrop-blur-sm"
            style={{ borderColor: `${PHOTO_SPOTS[activeSpot].color}66` }}
          >
            <h3 className="mb-2 text-balance text-[12px] font-black text-center">
              {PHOTO_SPOTS[activeSpot].label}
            </h3>
            {/* Wedge SVG */}
            <div className="w-16 h-16 mx-auto mb-2">
              <svg width="100" height="100" viewBox="0 0 100 100" aria-label="Cuña de visión">
                {/* Simple triangle representing cone */}
                <polygon
                  points="50,10 30,90 70,90"
                  fill={PHOTO_SPOTS[activeSpot].color}
                  opacity="0.18"
                />
                {/* Mini plan placeholder */}
                <rect x="20" y="20" width="60" height="60" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.2" />
              </svg>
            </div>
            <p className="text-center text-[9px] leading-4 text-white/60">
              Manténte en el objetivo para clavar la foto
            </p>
            <button
              onClick={handleCloseSpot}
              className="absolute top-2 right-2 p-1 rounded-full bg-white/[.1] hover:bg-white/[.2] transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Ficha drawer */}
      {showFiche && (
        <aside
          className="absolute bottom-[98px] left-3 right-3 z-40 max-h-[50dvh] overflow-y-auto rounded-[1.5rem] border border-white/12 bg-[#071017]/96 p-4 shadow-2xl backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#F6C64A]">
                Ficha técnica
              </p>
              <h2 className="mt-1 text-sm font-black">Casa 390-1 · 127 m²</h2>
            </div>
            <button onClick={() => setShowFiche(false)} className="grid h-9 w-9 place-items-center rounded-full bg-white/[.06]">
              <X size={15} />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-black text-white/60">Superficie</p>
                <p className="text-[11px] font-black text-white">127 m²</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/60">Dormitorios</p>
                <p className="text-[11px] font-black text-white">3</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/60">Baños</p>
                <p className="text-[11px] font-black text-white">1</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/60">Sauna</p>
                <p className="text-[11px] font-black text-white">5,6 m²</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/60">Terraza</p>
                <p className="text-[11px] font-black text-white">21,5 m²</p>
              </div>
            </div>
            <p className="text-[9px] leading-5 text-white/50">
              Casa unifamiliar de acero ligero con terminaciones en madera estructural, cubierta a dos aguas y terraza norte. Orientación sur para máximo ganancia solar.
            </p>
          </div>
        </aside>
      )}
    </>
  );
}
