'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  ArrowLeft,
  X,
  Route,
  Footprints,
  Clapperboard,
  Video,
  Map as MapIcon,
  Lightbulb,
  DoorOpen,
  Hand,
  Sun,
  Sunset,
  Moon,
  SlidersHorizontal,
  Eye,
  EyeOff,
  ChevronRight,
  Info,
  ScanLine,
  TriangleAlert,
} from 'lucide-react';
import { PHOTO_SPOTS, CCTV_CAMERAS, TOUR_STOPS, SCENES, WALLS, ROOMS, OPENINGS, FURNITURE_2D } from '@/lib/plano390Data';
import type { SceneView } from '@/lib/plano390Data';
import Plano390Map2D from './Plano390Map2D';
import { auditPlano, auditSummary } from '@/lib/plano390Audit';

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
  onScene,
  cctvIndex = 0,
  tourIndex = 0,
  lightsOn = true,
  onToggleLights,
  openHouse = false,
  onToggleOpen,
  showHands = true,
  onToggleHands,
  onCctvSelect,
  light = 'day',
  onLightChange,
  planView = false,
  audit = false,
  onToggleAudit,
}: {
  stage: Stage;
  onEnter: () => void;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  activeSpot: number | null;
  onSpotChange: (i: number) => void;
  roomLabel: string;
  onCloseSpot: () => void;
  onScene: (scene: SceneView) => void;
  cctvIndex?: number;
  tourIndex?: number;
  lightsOn?: boolean;
  onToggleLights?: () => void;
  openHouse?: boolean;
  onToggleOpen?: () => void;
  showHands?: boolean;
  onToggleHands?: () => void;
  onCctvSelect?: (i: number) => void;
  light?: 'day' | 'sunset' | 'night';
  onLightChange?: (l: 'day' | 'sunset' | 'night') => void;
  /** Está activa la vista de planta elevada. */
  planView?: boolean;
  /** Capa de códigos M-xx / F-xx / P-xx. */
  audit?: boolean;
  onToggleAudit?: () => void;
}): ReactElement | null {
  const GOLD = '#F6C64A';
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [showFiche, setShowFiche] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showTourInfo, setShowTourInfo] = useState(true);
  const [clock, setClock] = useState('');
  // La auditoría es pura y barata (48 muros, 45 muebles): se calcula una vez.
  const issues = useMemo(() => auditPlano(), []);
  const summary = useMemo(() => auditSummary(issues), [issues]);
  const findings = useMemo(() => issues.filter((i) => i.severity !== 'info'), [issues]);

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

  // Al entrar al recorrido la ficha vuelve a aparecer aunque se haya ocultado.
  useEffect(() => {
    if (mode === 'tour') setShowTourInfo(true);
  }, [mode]);

  // El menú plegable se cierra solo al cambiar de modo o de escena.
  useEffect(() => {
    setShowMenu(false);
  }, [mode, activeSpot]);

  // ESC cierra el menú, el plano y la ficha.
  useEffect(() => {
    if (stage !== 'in') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShowMenu(false);
      setShowPlan(false);
      setShowFiche(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stage]);

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
  const lightLabel = light === 'day' ? 'Día' : light === 'sunset' ? 'Atardecer' : 'Noche';
  const LightIcon = light === 'day' ? Sun : light === 'sunset' ? Sunset : Moon;
  const cycleLight = () => {
    const order = ['day', 'sunset', 'night'] as const;
    const next = order[(order.indexOf(light) + 1) % order.length];
    onLightChange?.(next);
  };

  // Paradas informativas: los puntos de paso no cuentan para el progreso.
  const infoStops = useMemo(() => TOUR_STOPS.filter((s) => s.info !== false), []);
  const lastInfo = useMemo(() => {
    const upto = Math.min(tourIndex, TOUR_STOPS.length - 1);
    for (let i = upto; i >= 0; i--) {
      if (TOUR_STOPS[i].info !== false) return TOUR_STOPS[i];
    }
    return TOUR_STOPS[0];
  }, [tourIndex]);
  const infoIndex = Math.max(0, infoStops.indexOf(lastInfo));
  const mapMarker: [number, number] = [
    Math.min(14.2, Math.max(0.4, lastInfo.pos[0])),
    Math.min(12.4, Math.max(0.4, lastInfo.pos[2])),
  ];

  const exitTour = () => onModeChange('free');

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
            Casa 390-1 <span style={{ color: GOLD }}>148 m²</span>
          </h1>
          <p className="mt-3 max-w-[440px] text-balance text-[11px] leading-5 text-white/40 sm:text-xs select-none touch-none">
            Recorrido 3D primera persona · 3 dormitorios · 2 baños · garaje y porche
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

  // stage === 'in' -> HUD con controles ocultos tras un botón sutil
  return (
    <>
      {/* ── Barra superior mínima ── */}
      <header className="absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-2 p-3 sm:p-4">
        <Link
          href="/herramientas"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/12 bg-black/55 px-3.5 text-[10px] font-black backdrop-blur-xl transition active:scale-95"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Herramientas</span>
        </Link>

        <div className="pointer-events-none rounded-full border border-white/10 bg-black/50 px-4 py-2 text-center backdrop-blur-xl">
          <span className="block text-[8px] font-black uppercase tracking-[.18em] text-[#F6C64A]">
            {mode === 'cctv' ? 'Cine CCTV · En directo' : mode === 'tour' ? 'Recorrido guiado' : 'Proyecto 390-1'}
          </span>
          <b className="text-[10px]">
            {mode === 'cctv' && activeCam ? `${activeCam.id} · ${activeCam.zone}` : roomLabel}
          </b>
        </div>

        <button
          onClick={() => setShowMenu((v) => !v)}
          aria-label="Mostrar controles"
          aria-expanded={showMenu}
          className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl transition active:scale-95 ${
            showMenu ? 'border-[#F6C64A]/60 bg-[#F6C64A] text-black' : 'border-white/12 bg-black/55 text-white/85'
          }`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </header>

      {/* ── Recorrido: barras de cine + ficha lateral con miniatura ── */}
      {mode === 'tour' ? (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3vh] bg-black/80" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[3vh] bg-black/80" />

          <aside
            className={`absolute left-3 right-3 z-40 transition-all duration-500 sm:right-auto sm:w-[344px] ${
              showTourInfo ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
            }`}
            style={{ bottom: 'max(14px, env(safe-area-inset-bottom))' }}
          >
            <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#071017]/84 shadow-2xl backdrop-blur-2xl">
              <div className="flex gap-3 p-3">
                <div className="relative h-[86px] w-[104px] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#0a1218]">
                  <Plano390Map2D
                    compact
                    showCams={false}
                    marker={mapMarker}
                    className="h-full w-full"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.2em] text-[#F6C64A]">
                    <Info size={10} />
                    Recorrido · {infoIndex + 1}/{infoStops.length}
                  </p>
                  <h2 className="mt-0.5 text-[15px] font-black leading-tight text-white">{lastInfo.label}</h2>
                  {lastInfo.note ? (
                    <p className="mt-1 line-clamp-3 text-[10px] leading-4 text-white/60">{lastInfo.note}</p>
                  ) : null}
                  {lastInfo.meta ? (
                    <p className="mt-1 truncate text-[8px] font-bold tracking-wide text-[#c9ef63]/80">{lastInfo.meta}</p>
                  ) : null}
                </div>
                <button
                  onClick={() => setShowTourInfo(false)}
                  aria-label="Ocultar información"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[.06] text-white/70 transition active:scale-95"
                >
                  <EyeOff size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 pb-3">
                <div className="flex flex-1 flex-wrap items-center gap-1">
                  {infoStops.map((s, i) => (
                    <span
                      key={s.label}
                      className={`h-1 rounded-full transition-all duration-500 ${
                        i === infoIndex
                          ? 'w-4 bg-[#F6C64A]'
                          : i < infoIndex
                            ? 'w-1.5 bg-[#F6C64A]/50'
                            : 'w-1.5 bg-white/20'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={exitTour}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-white/15 bg-white/[.04] px-3 text-[9px] font-black uppercase tracking-[.12em] text-white/80 transition active:scale-95"
                >
                  <X size={12} /> Salir
                </button>
              </div>
            </div>
          </aside>

          {!showTourInfo ? (
            <button
              onClick={() => setShowTourInfo(true)}
              className="absolute left-3 z-40 inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-black/60 px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-white/80 backdrop-blur-xl transition active:scale-95"
              style={{ bottom: 'max(14px, env(safe-area-inset-bottom))' }}
            >
              <Eye size={13} /> Info
            </button>
          ) : null}
        </>
      ) : null}

      {/* ── Overlay de Cine CCTV (marco fino + REC + reloj) ── */}
      {mode === 'cctv' ? (
        <div className="pointer-events-none absolute inset-0 z-20">
          {[
            'left-3 top-3 border-l-2 border-t-2',
            'right-3 top-3 border-r-2 border-t-2',
            'left-3 bottom-3 border-l-2 border-b-2',
            'right-3 bottom-3 border-r-2 border-b-2',
          ].map((cls) => (
            <span key={cls} className={`absolute h-7 w-7 border-white/30 ${cls}`} />
          ))}
          <div className="absolute left-6 top-16 flex items-center gap-2 rounded-md bg-black/55 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
            </span>
            <span className="text-[9px] font-black tracking-[.2em] text-white">REC</span>
            <span className="text-[9px] font-bold text-white/55">{activeCam?.id}</span>
          </div>
          <div className="absolute left-6 top-[96px] max-w-[260px] text-[9px] font-black uppercase tracking-[.18em] text-white/70">
            {activeCam?.name}
          </div>
          <div className="absolute right-6 top-16 rounded-md bg-black/55 px-2.5 py-1.5 text-[9px] font-black tracking-[.14em] text-white/70 backdrop-blur-sm">
            {String(cctvIndex + 1).padStart(2, '0')}
            <span className="text-white/35"> / {String(CCTV_CAMERAS.length).padStart(2, '0')}</span>
          </div>
          <div className="absolute left-6 bottom-6 flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-white/60">
            <Video size={12} />
            <span>{clock}</span>
          </div>
        </div>
      ) : null}

      {/* ── Foto card (puntos de foto) ── */}
      {activeSpot !== null && !showMenu ? (
        <div
          className="absolute left-3 right-3 z-40 sm:left-auto sm:right-3 sm:w-[300px]"
          style={{ bottom: 'calc(84px + env(safe-area-inset-bottom))' }}
        >
          <div
            className="relative rounded-xl border bg-[#0b0f13]/95 p-3.5 backdrop-blur-sm"
            style={{ borderColor: `${PHOTO_SPOTS[activeSpot].color}66` }}
          >
            <div className="flex items-center gap-2">
              <svg width="34" height="34" viewBox="0 0 100 100" aria-label="Cuña de visión" className="shrink-0">
                <polygon points="50,10 30,90 70,90" fill={PHOTO_SPOTS[activeSpot].color} opacity="0.18" />
                <rect x="20" y="20" width="60" height="60" fill="none" stroke="#fff" strokeWidth="0.5" opacity="0.2" />
              </svg>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-[11px] font-black text-white">{PHOTO_SPOTS[activeSpot].label}</h3>
                <p className="text-[9px] leading-4 text-white/55">Quedate en el objetivo para clavar la foto</p>
              </div>
              <button
                onClick={handleCloseSpot}
                aria-label="Cerrar punto de foto"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[.08] transition active:scale-95"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Menú plegable de controles ── */}
      {showMenu ? (
        <div className="absolute inset-0 z-[80]" onClick={() => setShowMenu(false)}>
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" aria-hidden />
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-2 bottom-2 max-h-[80dvh] overflow-y-auto rounded-[1.6rem] border border-white/12 bg-[#071017]/97 p-3.5 shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:right-3 sm:w-[392px]"
            style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Controles</p>
                <h2 className="text-[13px] font-black text-white">Casa 390-1 · 148 m²</h2>
              </div>
              <button
                onClick={() => setShowMenu(false)}
                aria-label="Cerrar controles"
                className="grid h-9 w-9 place-items-center rounded-full bg-white/[.07] transition active:scale-95"
              >
                <X size={15} />
              </button>
            </div>

            {/* Modo */}
            <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[.03] p-1.5">
              {([
                { key: 'free' as const, label: 'Libre', Icon: Footprints },
                { key: 'tour' as const, label: 'Recorrido', Icon: Route },
                { key: 'cctv' as const, label: 'Cámaras', Icon: Clapperboard },
              ]).map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => onModeChange(key)}
                  aria-pressed={mode === key}
                  className={`flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl text-[8px] font-black uppercase tracking-[.06em] transition active:scale-95 ${
                    mode === key ? 'bg-[#F6C64A] text-black' : 'text-white/65'
                  }`}
                >
                  <Icon size={16} />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>

            {/* Interruptores */}
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              <button
                onClick={onToggleLights}
                aria-pressed={lightsOn}
                className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-[8px] font-black uppercase tracking-[.05em] transition active:scale-95 ${
                  lightsOn ? 'border-[#F6C64A]/45 bg-[#F6C64A]/15 text-[#F6C64A]' : 'border-white/10 bg-white/[.03] text-white/55'
                }`}
              >
                <Lightbulb size={15} /> Luces
              </button>
              <button
                onClick={onToggleOpen}
                aria-pressed={openHouse}
                className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-[8px] font-black uppercase tracking-[.05em] transition active:scale-95 ${
                  openHouse ? 'border-[#F6C64A]/45 bg-[#F6C64A]/15 text-[#F6C64A]' : 'border-white/10 bg-white/[.03] text-white/55'
                }`}
              >
                <DoorOpen size={15} /> Puertas
              </button>
              <button
                onClick={onToggleHands}
                aria-pressed={showHands}
                className={`flex h-14 flex-col items-center justify-center gap-1 rounded-xl border text-[8px] font-black uppercase tracking-[.05em] transition active:scale-95 ${
                  showHands ? 'border-[#F6C64A]/45 bg-[#F6C64A]/15 text-[#F6C64A]' : 'border-white/10 bg-white/[.03] text-white/55'
                }`}
              >
                <Hand size={15} /> Manos
              </button>
              <button
                onClick={cycleLight}
                aria-label={`Iluminación: ${lightLabel}. Cambiar`}
                className="flex h-14 flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[.03] text-[8px] font-black uppercase tracking-[.05em] text-white/70 transition active:scale-95"
              >
                <LightIcon size={15} /> {lightLabel}
              </button>
            </div>

            {/* Cámaras (solo modo CCTV) */}
            {mode === 'cctv' ? (
              <div className="mt-3">
                <p className="mb-2 text-[8px] font-black uppercase tracking-[.16em] text-white/40">
                  Circuito · {CCTV_CAMERAS.length} cámaras
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {CCTV_CAMERAS.map((cam, i) => (
                    <button
                      key={cam.id}
                      onClick={() => onCctvSelect?.(i)}
                      aria-label={`Ver ${cam.id} ${cam.name}`}
                      className={`rounded-xl border p-1 text-left transition active:scale-95 ${
                        i === cctvIndex ? 'border-[#F6C64A] bg-[#F6C64A]/10' : 'border-white/10 bg-white/[.03]'
                      }`}
                    >
                      <Plano390Map2D
                        compact
                        onlyCam={i}
                        focus={[cam.pos[0], cam.pos[2]]}
                        className="h-[58px] w-full rounded-md"
                        selectedCam={i}
                      />
                      <p className="mt-1 truncate text-[7px] font-black text-white/85">{cam.id}</p>
                      <p className="truncate text-[7px] text-white/40">{cam.zone}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Escenas */}
            <div className="mt-3">
              <p className="mb-2 text-[8px] font-black uppercase tracking-[.16em] text-white/40">
                Ir a un ambiente
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {SCENES.map((scene) => {
                  const sceneActive = scene.label === roomLabel;
                  return (
                    <button
                      key={scene.id}
                      onClick={() => {
                        onScene(scene);
                        setShowMenu(false);
                      }}
                      className={`inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-xl border px-2 text-[9px] font-black transition active:scale-95 ${
                        sceneActive
                          ? 'border-[#F6C64A]/50 bg-[#F6C64A]/18 text-[#F6C64A]'
                          : 'border-white/10 bg-white/[.03] text-white/80'
                      }`}
                    >
                      <span className="truncate">{scene.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Plano y ficha */}
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setShowPlan(true);
                  setShowMenu(false);
                }}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] text-[10px] font-black text-white/85 transition active:scale-95"
              >
                <MapIcon size={14} /> Plano 2D
              </button>
              <button
                onClick={() => {
                  setShowFiche(true);
                  setShowMenu(false);
                }}
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[.04] text-[10px] font-black text-white/85 transition active:scale-95"
              >
                Ficha técnica <ChevronRight size={13} />
              </button>
              <button
                onClick={() => {
                  onToggleAudit?.();
                  setShowMenu(false);
                }}
                aria-pressed={audit}
                className={`col-span-2 inline-flex h-11 items-center justify-between gap-2 rounded-xl border px-3 text-[10px] font-black transition active:scale-95 ${
                  audit
                    ? 'border-[#F6C64A]/55 bg-[#F6C64A]/15 text-[#F6C64A]'
                    : 'border-white/10 bg-white/[.04] text-white/85'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <ScanLine size={14} /> Auditoría del plano
                </span>
                <span className={`rounded-full px-2 py-1 text-[8px] tracking-[.08em] ${summary.errors ? 'bg-red-500/20 text-red-200' : 'bg-[#c9ef63]/15 text-[#d8ff8a]'}`}>
                  {summary.errors} err · {summary.warnings} avisos
                </span>
              </button>
            </div>

            <p className="mt-3 text-center text-[8px] uppercase tracking-[.16em] text-white/30">
              Arrastrá para mirar · joystick para caminar
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Plano 2D (panel completo) ── */}
      {showPlan ? (
        <div className="absolute inset-0 z-[90] flex flex-col bg-[#050b0e]/97 backdrop-blur-xl">
          <header className="flex items-center justify-between gap-2 px-4 pt-4">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Planta · vista desde arriba</p>
              <h2 className="mt-0.5 text-base font-black">Casa 390-1 · 148 m²</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const planScene = SCENES.find((s) => s.id === 'plano');
                  if (planScene) onScene(planScene);
                  setShowPlan(false);
                }}
                className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#c9ef63]/40 bg-[#c9ef63]/12 px-3 text-[9px] font-black uppercase tracking-[.12em] text-[#d8ff8a] transition active:scale-95"
              >
                <MapIcon size={13} />
                Ver 3D
              </button>
              <button
                onClick={() => setShowPlan(false)}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/[.08]"
                aria-label="Cerrar plano"
              >
                <X size={16} />
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-3 pb-6">
            <Plano390Map2D
              className="w-full"
              selectedCam={mode === 'cctv' ? cctvIndex : -1}
              onSelectCam={(i) => {
                onCctvSelect?.(i);
                setShowPlan(false);
              }}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Leyenda</p>
                <ul className="mt-2 space-y-1 text-[9px] text-white/65">
                  <li>
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#c9ef63]" />
                    Muro
                  </li>
                  <li>
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#7fd3ff]" />
                    Ventana / corredera
                  </li>
                  <li>
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#f0c46a]" />
                    Puerta / portón
                  </li>
                  <li>
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#F6C64A]" />
                    Cámara y cono de visión
                  </li>
                  {audit ? (
                    <li className="pt-1 text-[8px] leading-4 text-white/45">
                      Los códigos M-xx / F-xx / P-xx se leen en el Plano 3D; reportá el código al detectar un error.
                    </li>
                  ) : null}
                </ul>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[.03] p-3">
                <p className="text-[8px] font-black uppercase tracking-[.16em] text-white/40">Superficies</p>
                <ul className="mt-2 space-y-1 text-[9px] text-white/65">
                  <li className="flex justify-between">
                    <span>Living</span>
                    <b>28,22 m²</b>
                  </li>
                  <li className="flex justify-between">
                    <span>Cocina</span>
                    <b>13,24 m²</b>
                  </li>
                  <li className="flex justify-between">
                    <span>Despensa / café</span>
                    <b>6,51 m²</b>
                  </li>
                  <li className="flex justify-between">
                    <span>Garaje</span>
                    <b>25,57 m²</b>
                  </li>
                  <li className="flex justify-between">
                    <span>Dormitorios</span>
                    <b>40,31 m²</b>
                  </li>
                </ul>
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-white/10 bg-white/[.03] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="inline-flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.16em] text-white/40">
                  <TriangleAlert size={11} /> Auditoría geométrica
                </p>
                <span className={`rounded-full px-2 py-0.5 text-[8px] font-black ${
                  summary.errors ? 'bg-red-500/20 text-red-200' : summary.warnings ? 'bg-[#F6C64A]/20 text-[#F6C64A]' : 'bg-[#c9ef63]/15 text-[#d8ff8a]'
                }`}>
                  {summary.errors} errores · {summary.warnings} avisos
                </span>
              </div>
              {findings.length ? (
                <ul className="mt-2 space-y-1.5">
                  {findings.slice(0, 6).map((it) => (
                    <li key={it.code} className="flex gap-2 text-[9px] leading-4">
                      <span className={`mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full ${
                        it.severity === 'error' ? 'bg-red-400' : 'bg-[#F6C64A]'
                      }`} />
                      <span className="min-w-0 text-white/60">
                        <b className="text-white/85">{it.code}</b> · {it.detail}{' '}
                        <span className="text-[#c9ef63]/80">{it.refs.join(' · ')}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-lg border border-[#c9ef63]/20 bg-[#c9ef63]/[.06] px-2.5 py-2 text-[9px] leading-4 text-[#d8ff8a]">
                  Geometría coherente: {WALLS.length} muros, {ROOMS.length} ambientes, {OPENINGS.length} vanos y{' '}
                  {FURNITURE_2D.length} muebles sin solapes ni muebles montados. Las {issues.length} notas son
                  ambientes contenidos válidos (ensuite y lavandería).
                </p>
              )}
              <button
                onClick={() => {
                  if (!audit) onToggleAudit?.();
                  const planScene = SCENES.find((s) => s.id === 'plano');
                  if (planScene) onScene(planScene);
                  setShowPlan(false);
                }}
                className="mt-2 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-[#F6C64A]/35 bg-[#F6C64A]/10 text-[9px] font-black uppercase tracking-[.1em] text-[#F6C64A] transition active:scale-95"
              >
                <ScanLine size={13} /> Abrir Plano 3D con códigos
              </button>
              <p className="mt-2 text-[8px] leading-4 text-white/40">
                Se valida el mismo contrato que dibuja el 3D: muros que se cruzan, vanos sin apoyo,
                superficies declaradas, muebles fuera de ambiente o montados, y barrido de puertas.
              </p>
            </div>
            <p className="mt-2 text-center text-[8px] uppercase tracking-[.18em] text-white/30">
              Tocá una cámara del plano para verla en vivo
            </p>
          </div>
        </div>
      ) : null}

      {/* ── Ayuda del plano elevado ── */}
      {planView && stage === 'in' ? (
        <div className="pointer-events-none absolute inset-x-0 top-[4.9rem] z-[70] flex justify-center px-3">
          <span className="rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-center text-[8px] font-black uppercase tracking-[.13em] text-white/60 backdrop-blur-xl">
            Tocá un ambiente para entrar · arrastrá para orbitar · pinza para zoom
          </span>
        </div>
      ) : null}

      {/* ── Ficha técnica ── */}
      {showFiche ? (
        <aside className="absolute inset-x-3 z-[85] max-h-[62dvh] overflow-y-auto rounded-[1.5rem] border border-white/12 bg-[#071017]/97 p-4 shadow-2xl backdrop-blur-2xl sm:inset-x-auto sm:right-3 sm:w-[400px]"
          style={{ bottom: 'calc(16px + env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#F6C64A]">Ficha técnica</p>
              <h2 className="mt-1 text-sm font-black">Casa 390-1 · Mediterránea 148 m²</h2>
            </div>
            <button
              onClick={() => setShowFiche(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/[.06]"
              aria-label="Cerrar ficha"
            >
              <X size={15} />
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[9px] font-black text-white/60">Superficie</p>
                <p className="text-[11px] font-black text-white">148 m²</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/60">Dormitorios</p>
                <p className="text-[11px] font-black text-white">3</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/60">Baños</p>
                <p className="text-[11px] font-black text-white">2 (baño + ensuite)</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/60">Garaje</p>
                <p className="text-[11px] font-black text-white">25,6 m²</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/60">Living</p>
                <p className="text-[11px] font-black text-white">28,2 m²</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-white/60">Porche</p>
                <p className="text-[11px] font-black text-white">6,1 m²</p>
              </div>
            </div>
            <p className="text-[9px] leading-5 text-white/50">
              Casa mediterránea de una planta sobre el plano del cliente: muros verde limón, porcelanato cálido
              tipo piedra clara y franja blanca con portal de piedra. Tres dormitorios y dos baños (baño 1,80 × 2,20 m
              útil con ducha de 0,90 × 1,20 m y vanitorio de 0,80 m). Living de 28,2 m² con muro de TV de 3,80 m
              (TV 1,40 × 0,79 m y mueble flotante de 2,60 m), cocina abierta con isla de 2,40 × 1,00 m y barra de
              1,05 m, despensa/café de 6,5 m², garaje de 25,6 m² con lavadora y secadora, portón seccional de 3,60 m,
              porche de acceso y quincho exterior con parrilla. Puertas y ventanas animadas, luces
              encendidas/apagadas, interruptores y enchufes a la vista, vegetación en movimiento y circuito de 14 cámaras.
              Vista de plano 3D elevada y recorrido humano con ficha que se desvanece.
            </p>
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-white/40">Puntos de foto</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PHOTO_SPOTS.map((spot, idx) => (
                  <button
                    key={spot.id}
                    onClick={() => {
                      setShowFiche(false);
                      handleSpotClick(idx);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[.04] px-2.5 py-1.5 text-[9px] font-black"
                    style={activeSpot === idx ? { borderColor: spot.color, color: spot.color } : undefined}
                  >
                    <span className="h-[6px] w-[6px] rounded-full" style={{ background: spot.color }} />
                    {spot.label.split('·')[0].trim()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      ) : null}
    </>
  );
}
