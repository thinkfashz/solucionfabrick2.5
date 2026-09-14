'use client';

import Link from 'next/link';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Sky } from '@react-three/drei';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  Eye,
  Gauge,
  Hammer,
  Home,
  Menu,
  Move,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Vector3 } from 'three';
import {
  METALCON_HOUSE_PRESET_ORDER,
  METALCON_HOUSE_PRESETS,
  wallLengthM,
  wallYawRad,
  type MetalconHousePreset,
  type MetalconHousePresetId,
} from '@/lib/metalconAssembly';
import { MetalconAssembly3D, type MetalconSeismicVisual } from './MetalconAssembly3D';

type Soil = 'rock' | 'firm' | 'soft';
type Drawer = 'controls' | 'analytics' | 'repairs' | null;
type ViewMode = 'interior' | 'exterior';
type Movement = { forward: boolean; back: boolean; left: boolean; right: boolean };

type Config = {
  modelId: MetalconHousePresetId;
  magnitude: number;
  depthKm: number;
  epicentralDistanceKm: number;
  duration: number;
  soil: Soil;
  directionDeg: number;
  frequencyHz: number;
  playbackRate: 0.5 | 1 | 2;
};

type PanelDiagnostic = {
  id: string;
  label: string;
  score: number;
  driftProxyPct: number;
  level: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';
  cause: string;
};

type Analysis = {
  estimatedMmi: number;
  hazard: number;
  pgaProxyG: number;
  driftProxyPct: number;
  support: number;
  critical: number;
  high: number;
  affectedWallM: number;
  repairLow: number;
  repairHigh: number;
  panelScores: Record<string, number>;
  panels: PanelDiagnostic[];
};

const SOIL: Record<Soil, { label: string; factor: number; mmiBoost: number }> = {
  rock: { label: 'Roca / suelo muy firme', factor: 0.78, mmiBoost: -0.7 },
  firm: { label: 'Suelo firme', factor: 1, mmiBoost: 0 },
  soft: { label: 'Suelo blando', factor: 1.22, mmiBoost: 0.8 },
};

const MMI_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const mmiLabel = (value: number) => MMI_ROMAN[clampNumber(Math.round(value), 1, 12) - 1];

function levelFromScore(score: number): PanelDiagnostic['level'] {
  if (score >= 0.76) return 'Crítico';
  if (score >= 0.56) return 'Alto';
  if (score >= 0.34) return 'Moderado';
  return 'Bajo';
}

function estimateMmi(config: Config) {
  const hypocentralDistance = Math.sqrt(config.depthKm ** 2 + config.epicentralDistanceKm ** 2);
  const distanceLoss = Math.log10(hypocentralDistance + 12) * 2.05;
  return clampNumber(
    2.3 + (config.magnitude - 4) * 1.48 + (2.8 - distanceLoss) + SOIL[config.soil].mmiBoost,
    1,
    12,
  );
}

function analyze(config: Config, preset: MetalconHousePreset): Analysis {
  const estimatedMmi = estimateMmi(config);
  const magnitude = clamp((config.magnitude - 4) / 5.5);
  const intensity = clamp((estimatedMmi - 1) / 11);
  const shallow = clamp(1 - config.depthKm / 150);
  const distance = clamp(1 - config.epicentralDistanceKm / 250);
  const duration = clamp((config.duration - 5) / 55);
  const hazard = clamp(
    (magnitude * 0.34 + intensity * 0.38 + shallow * 0.1 + distance * 0.08 + duration * 0.06 + 0.04)
      * SOIL[config.soil].factor,
  );
  const pgaProxyG = Math.round((0.015 + Math.pow(hazard, 1.72) * 0.72) * 100) / 100;
  const driftProxyPct = Math.round((Math.pow(hazard, 1.58) * 1.9) * 100) / 100;
  const direction = (config.directionDeg * Math.PI) / 180;
  const panelScores: Record<string, number> = {};

  const panels = preset.walls.map<PanelDiagnostic>((wall) => {
    const wallAngle = wallYawRad(wall);
    const orientation = 0.82 + 0.3 * Math.abs(Math.cos(wallAngle - direction));
    const openingRatio = Math.min(
      0.35,
      wall.openings.reduce((sum, opening) => sum + opening.widthM, 0) / Math.max(0.5, wallLengthM(wall)),
    );
    const openingPenalty = 1 + openingRatio * 0.38;
    const braceBenefit = wall.braced ? 0.86 : 1.02;
    const structuralFactor = wall.structural ? 0.95 : 1.05;
    const score = clamp(hazard * orientation * openingPenalty * braceBenefit * structuralFactor);
    panelScores[wall.id] = score;

    const cause = wall.openings.length
      ? `${wall.openings.length} vano(s): revisar jambas, dintel, fijaciones y continuidad de soleras.`
      : wall.braced
        ? 'Tramo arriostrado: revisar fijaciones, anclajes y deformación permanente.'
        : 'Tramo continuo: revisar encuentros, tornillos, revestimiento y aplome.';

    return {
      id: wall.id,
      label: wall.label,
      score,
      driftProxyPct: Math.round(driftProxyPct * (0.82 + score * 0.46) * 100) / 100,
      level: levelFromScore(score),
      cause,
    };
  });

  const ordered = [...panels].sort((a, b) => b.score - a.score);
  const critical = panels.filter((panel) => panel.level === 'Crítico').length;
  const high = panels.filter((panel) => panel.level === 'Alto').length;
  const affectedWallM = Math.round(
    preset.walls.reduce((sum, wall) => sum + (panelScores[wall.id] >= 0.34 ? wallLengthM(wall) : 0), 0) * 10,
  ) / 10;
  const bracedRatio = preset.walls.filter((wall) => wall.braced).length / Math.max(1, preset.walls.length);
  const support = Math.round(clamp(1 - hazard * 0.62 + bracedRatio * 0.12) * 100);
  const inspectionBase = affectedWallM * 42000 + high * 68000 + critical * 145000 + 120000;
  const repairLow = Math.max(120000, Math.round(inspectionBase * (0.82 + hazard * 0.45)));

  return {
    estimatedMmi,
    hazard,
    pgaProxyG,
    driftProxyPct,
    support,
    critical,
    high,
    affectedWallM,
    repairLow,
    repairHigh: Math.round(repairLow * (1.55 + hazard * 0.35)),
    panelScores,
    panels: ordered,
  };
}

function stage(progress: number) {
  if (progress <= 0.01) return 'Listo';
  if (progress < 0.18) return 'Ruptura';
  if (progress < 0.38) return 'Ondas P/S';
  if (progress < 0.58) return 'Llegada a superficie';
  if (progress < 0.82) return 'Respuesta de la malla';
  if (progress < 1) return 'Evaluando daño';
  return 'Diagnóstico completo';
}

function repairAdvice(panel: PanelDiagnostic) {
  const actions = [
    'Inspeccionar tornillos, uniones C/U, anclajes y pérdida de aplome antes de intervenir.',
  ];
  if (/vano/i.test(panel.cause)) {
    actions.push('Revisar jambas, dintel y transferencia de cargas alrededor de puertas o ventanas.');
  }
  if (panel.level === 'Moderado') {
    actions.push('Comprobar revestimientos estructurales y reapriete o reposición de fijaciones dañadas.');
  }
  if (panel.level === 'Alto' || panel.level === 'Crítico') {
    actions.push('Evaluar sustitución de perfiles deformados y restitución del arriostramiento con criterio profesional.');
  }
  if (panel.level === 'Crítico') {
    actions.push('Aislar el sector y solicitar evaluación estructural antes de asumir que puede seguir en servicio.');
  }
  return actions;
}

export default function StructuralMonitoringGameShell() {
  const [config, setConfig] = useState<Config>({
    modelId: 'family-6x8',
    magnitude: 7.2,
    depthKm: 28,
    epicentralDistanceKm: 35,
    duration: 22,
    soil: 'firm',
    directionDeg: 25,
    frequencyHz: 2.4,
    playbackRate: 1,
  });
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [drawer, setDrawer] = useState<Drawer>('controls');
  const [showDamage, setShowDamage] = useState(true);
  const [showSupports, setShowSupports] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('exterior');
  const [movement, setMovement] = useState<Movement>({ forward: false, back: false, left: false, right: false });

  const preset = METALCON_HOUSE_PRESETS[config.modelId];
  const result = useMemo(() => analyze(config, preset), [config, preset]);

  useEffect(() => {
    if (!playing) return;
    const intervalMs = 50;
    const visualSeconds = clampNumber(10 + config.duration * 0.22, 10, 24) / config.playbackRate;
    const timer = window.setInterval(() => {
      setProgress((current) => {
        const next = current + intervalMs / (visualSeconds * 1000);
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, config.duration, config.playbackRate]);

  useEffect(() => {
    if (progress >= 1) setDrawer('analytics');
  }, [progress]);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
  }, [config.modelId]);

  const play = () => {
    setProgress((current) => current >= 0.999 ? 0 : current);
    setPlaying(true);
  };

  const reset = () => {
    setPlaying(false);
    setProgress(0);
  };

  const seismicVisual: MetalconSeismicVisual = {
    active: playing,
    progress,
    amplitude: result.hazard * 0.22,
    frequencyHz: config.frequencyHz,
    directionDeg: config.directionDeg,
    panelScores: result.panelScores,
    showDamage,
    showSupports,
  };

  const topPanels = result.panels.slice(0, 3);

  return (
    <section className="relative h-[100dvh] min-h-[620px] overflow-hidden bg-[#05090d] text-white">
      <Canvas
        shadows
        dpr={[1, 1.55]}
        camera={{ position: [8.2, 5.2, 9.2], fov: 48, near: 0.05, far: 180 }}
      >
        <Suspense fallback={null}>
          <ImmersiveEnvironment active={playing} hazard={result.hazard} progress={progress} />
          <MetalconAssembly3D
            preset={preset}
            spacingCm={40}
            profileDepthMm={90}
            displayMode="bracing"
            seismic={seismicVisual}
          />
          <WalkRig movement={movement} viewMode={viewMode} />
          <OrbitControls
            makeDefault
            enableDamping
            dampingFactor={0.08}
            enablePan
            panSpeed={0.6}
            rotateSpeed={0.55}
            zoomSpeed={0.8}
            minDistance={1.4}
            maxDistance={28}
            target={[0, 1.25, 0]}
            maxPolarAngle={Math.PI * 0.88}
          />
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,5,8,.54),transparent_18%,transparent_72%,rgba(2,5,8,.7))]" />

      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 pt-[max(.75rem,env(safe-area-inset-top))] sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <Link href="/herramientas/metalcon" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-black/55 backdrop-blur-xl" aria-label="Volver a Metalcon">
            <ChevronLeft size={18} />
          </Link>
          <div className="min-w-0 rounded-2xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-xl">
            <p className="truncate text-[8px] font-black uppercase tracking-[.16em] text-[#F6C64A]">Laboratorio sísmico inmersivo</p>
            <div className="mt-1 flex items-center gap-2">
              <b className="truncate text-[11px]">{preset.shortLabel}</b>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[7px] font-black text-white/55">MMI {mmiLabel(result.estimatedMmi)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <HudButton active={drawer === 'analytics'} label="Analíticas" icon={<BarChart3 size={16} />} onClick={() => setDrawer(drawer === 'analytics' ? null : 'analytics')} />
          <HudButton active={drawer === 'repairs'} label="Reparar" icon={<Wrench size={16} />} onClick={() => setDrawer(drawer === 'repairs' ? null : 'repairs')} />
          <HudButton active={drawer === 'controls'} label="Menú" icon={<Menu size={17} />} onClick={() => setDrawer(drawer === 'controls' ? null : 'controls')} />
        </div>
      </div>

      <div className="absolute left-3 top-[84px] z-10 rounded-2xl border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-xl sm:left-5">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${playing ? 'animate-pulse bg-[#F6C64A]' : progress >= 1 ? 'bg-emerald-400' : 'bg-white/35'}`} />
          <b className="text-[9px] uppercase tracking-[.14em]">{stage(progress)}</b>
        </div>
        <p className="mt-1 text-[7px] text-white/45">Mw {config.magnitude.toFixed(1)} · {config.depthKm} km · {Math.round(result.hazard * 100)}% demanda visual</p>
      </div>

      {progress > 0.58 ? (
        <div className="absolute left-3 top-[145px] z-10 w-[min(320px,calc(100%-24px))] space-y-1.5 sm:left-5">
          {topPanels.map((panel) => (
            <div key={panel.id} className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <b className="truncate text-[9px]">{panel.label}</b>
                <span className={`rounded-full px-2 py-0.5 text-[7px] font-black ${panel.level === 'Crítico' ? 'bg-red-500/20 text-red-200' : panel.level === 'Alto' ? 'bg-orange-400/20 text-orange-100' : panel.level === 'Moderado' ? 'bg-yellow-300/20 text-yellow-100' : 'bg-emerald-300/20 text-emerald-100'}`}>{panel.level}</span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#F6C64A]" style={{ width: `${Math.round(panel.score * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      ) : null}

      {drawer ? (
        <aside className="absolute inset-x-3 bottom-[116px] z-30 max-h-[64dvh] overflow-y-auto rounded-[1.4rem] border border-white/12 bg-[#071016]/94 p-4 shadow-[0_28px_90px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-[82px] sm:w-[370px] sm:max-h-[calc(100dvh-110px)]">
          <div className="sticky top-0 z-10 -mx-1 mb-3 flex items-center justify-between bg-[#071016]/95 px-1 pb-2">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[.18em] text-[#F6C64A]">{drawer === 'controls' ? 'Simulación' : drawer === 'analytics' ? 'Analíticas' : 'Afectación y reparación'}</p>
              <b className="mt-1 block text-sm">{drawer === 'controls' ? 'Configura el evento' : drawer === 'analytics' ? 'Lee la respuesta visual' : 'Qué revisar primero'}</b>
            </div>
            <button type="button" onClick={() => setDrawer(null)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/[.05]" aria-label="Cerrar panel"><X size={15} /></button>
          </div>

          {drawer === 'controls' ? (
            <ControlsPanel config={config} setConfig={setConfig} showDamage={showDamage} setShowDamage={setShowDamage} showSupports={showSupports} setShowSupports={setShowSupports} />
          ) : drawer === 'analytics' ? (
            <AnalyticsPanel result={result} config={config} />
          ) : (
            <RepairsPanel result={result} />
          )}
        </aside>
      ) : null}

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-20 w-[min(640px,calc(100%-130px))] -translate-x-1/2 rounded-2xl border border-white/10 bg-black/62 p-2.5 backdrop-blur-xl sm:w-[min(720px,calc(100%-280px))]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={playing ? () => setPlaying(false) : play} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-black" aria-label={playing ? 'Pausar simulación' : 'Iniciar simulación'}>
            {playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between text-[7px] font-black uppercase tracking-[.12em] text-white/45"><span>{stage(progress)}</span><span>{Math.round(progress * 100)}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#F6C64A] transition-[width] duration-75" style={{ width: `${progress * 100}%` }} /></div>
          </div>
          <button type="button" onClick={reset} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[.06] text-white/65" aria-label="Reiniciar"><RotateCcw size={15} /></button>
        </div>
      </div>

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-3 z-20 grid grid-cols-3 gap-1 sm:left-5">
        <span />
        <HoldButton label="Avanzar" onChange={(active) => setMovement((value) => ({ ...value, forward: active }))}>▲</HoldButton>
        <span />
        <HoldButton label="Izquierda" onChange={(active) => setMovement((value) => ({ ...value, left: active }))}>◀</HoldButton>
        <div className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/55 text-white/35"><Move size={14} /></div>
        <HoldButton label="Derecha" onChange={(active) => setMovement((value) => ({ ...value, right: active }))}>▶</HoldButton>
        <span />
        <HoldButton label="Retroceder" onChange={(active) => setMovement((value) => ({ ...value, back: active }))}>▼</HoldButton>
        <span />
      </div>

      <div className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-20 flex flex-col gap-1.5 sm:right-5">
        <button type="button" onClick={() => setViewMode('interior')} className={`flex h-10 items-center gap-2 rounded-full border px-3 text-[8px] font-black backdrop-blur-xl ${viewMode === 'interior' ? 'border-[#F6C64A]/50 bg-[#F6C64A] text-black' : 'border-white/10 bg-black/55 text-white/65'}`}><Eye size={13} /> Interior</button>
        <button type="button" onClick={() => setViewMode('exterior')} className={`flex h-10 items-center gap-2 rounded-full border px-3 text-[8px] font-black backdrop-blur-xl ${viewMode === 'exterior' ? 'border-[#F6C64A]/50 bg-[#F6C64A] text-black' : 'border-white/10 bg-black/55 text-white/65'}`}><Home size={13} /> Exterior</button>
      </div>

      <div className="pointer-events-none absolute bottom-[88px] left-1/2 z-10 hidden -translate-x-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1.5 text-[7px] text-white/45 backdrop-blur-md md:block">
        WASD / flechas para moverte · arrastra para mirar · rueda para acercar
      </div>
    </section>
  );
}

function HudButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`grid h-10 w-10 place-items-center rounded-full border backdrop-blur-xl sm:flex sm:w-auto sm:gap-2 sm:px-3 ${active ? 'border-[#F6C64A]/50 bg-[#F6C64A] text-black' : 'border-white/10 bg-black/55 text-white/70'}`} aria-label={label}>{icon}<span className="hidden text-[8px] font-black sm:inline">{label}</span></button>;
}

function HoldButton({ children, label, onChange }: { children: ReactNode; label: string; onChange: (active: boolean) => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onChange(true);
      }}
      onPointerUp={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      onLostPointerCapture={() => onChange(false)}
      className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/60 text-[11px] font-black text-white/70 backdrop-blur-xl active:border-[#F6C64A]/60 active:bg-[#F6C64A] active:text-black"
    >
      {children}
    </button>
  );
}

function ControlsPanel({
  config,
  setConfig,
  showDamage,
  setShowDamage,
  showSupports,
  setShowSupports,
}: {
  config: Config;
  setConfig: (updater: (value: Config) => Config) => void;
  showDamage: boolean;
  setShowDamage: (value: boolean) => void;
  showSupports: boolean;
  setShowSupports: (value: boolean) => void;
}) {
  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-[8px] font-black uppercase tracking-[.12em] text-white/40">Modelo de vivienda</span>
        <select value={config.modelId} onChange={(event) => setConfig((value) => ({ ...value, modelId: event.target.value as MetalconHousePresetId }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black text-white outline-none">
          {METALCON_HOUSE_PRESET_ORDER.map((id) => <option key={id} value={id}>{METALCON_HOUSE_PRESETS[id].label}</option>)}
        </select>
      </label>

      <Range label="Magnitud" value={`Mw ${config.magnitude.toFixed(1)}`} min={4} max={9.5} step={0.1} number={config.magnitude} onChange={(magnitude) => setConfig((value) => ({ ...value, magnitude }))} />
      <Range label="Profundidad hipocentral" value={`${config.depthKm} km`} min={5} max={120} step={1} number={config.depthKm} onChange={(depthKm) => setConfig((value) => ({ ...value, depthKm }))} />
      <Range label="Distancia epicentral" value={`${config.epicentralDistanceKm} km`} min={0} max={250} step={5} number={config.epicentralDistanceKm} onChange={(epicentralDistanceKm) => setConfig((value) => ({ ...value, epicentralDistanceKm }))} />
      <Range label="Duración" value={`${config.duration} s`} min={5} max={60} step={1} number={config.duration} onChange={(duration) => setConfig((value) => ({ ...value, duration }))} />
      <Range label="Dirección dominante" value={`${config.directionDeg}°`} min={0} max={350} step={10} number={config.directionDeg} onChange={(directionDeg) => setConfig((value) => ({ ...value, directionDeg }))} />
      <Range label="Frecuencia visual" value={`${config.frequencyHz.toFixed(1)} Hz`} min={0.8} max={5} step={0.1} number={config.frequencyHz} onChange={(frequencyHz) => setConfig((value) => ({ ...value, frequencyHz }))} />

      <label className="block">
        <span className="text-[8px] font-black uppercase tracking-[.12em] text-white/40">Tipo de suelo</span>
        <select value={config.soil} onChange={(event) => setConfig((value) => ({ ...value, soil: event.target.value as Soil }))} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black text-white outline-none">
          {Object.entries(SOIL).map(([key, soil]) => <option key={key} value={key}>{soil.label}</option>)}
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2">
        {([0.5, 1, 2] as const).map((speed) => <button key={speed} type="button" onClick={() => setConfig((value) => ({ ...value, playbackRate: speed }))} className={`h-9 rounded-xl text-[8px] font-black ${config.playbackRate === speed ? 'bg-[#F6C64A] text-black' : 'border border-white/10 bg-white/[.04] text-white/55'}`}>{speed}×</button>)}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Toggle active={showDamage} label="Mapa de daño" icon={<AlertTriangle size={14} />} onClick={() => setShowDamage(!showDamage)} />
        <Toggle active={showSupports} label="Anclajes" icon={<ShieldCheck size={14} />} onClick={() => setShowSupports(!showSupports)} />
      </div>

      <p className="rounded-xl border border-amber-300/15 bg-amber-300/[.05] p-3 text-[8px] leading-4 text-amber-50/55">
        Simulación educativa/comercial. Magnitud, MMI, PGA proxy, deriva y daño no sustituyen NCh433/DS61, memoria de cálculo, estudio geotécnico ni inspección post-sismo.
      </p>
    </div>
  );
}

function AnalyticsPanel({ result, config }: { result: Analysis; config: Config }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <Metric icon={<Activity />} label="Demanda visual" value={`${Math.round(result.hazard * 100)}%`} />
        <Metric icon={<Gauge />} label="MMI estimada" value={mmiLabel(result.estimatedMmi)} />
        <Metric icon={<Zap />} label="PGA proxy" value={`${result.pgaProxyG.toFixed(2)} g`} />
        <Metric icon={<Activity />} label="Deriva proxy" value={`${result.driftProxyPct.toFixed(2)}%`} />
        <Metric icon={<ShieldCheck />} label="Soporte relativo" value={`${result.support}%`} />
        <Metric icon={<AlertTriangle />} label="Altos / críticos" value={`${result.high} / ${result.critical}`} />
      </div>
      <div className="mt-3 rounded-xl border border-white/10 bg-white/[.03] p-3">
        <p className="text-[8px] font-black uppercase tracking-[.12em] text-white/35">Escenario actual</p>
        <p className="mt-2 text-[9px] leading-4 text-white/55">Mw {config.magnitude.toFixed(1)} · profundidad {config.depthKm} km · distancia {config.epicentralDistanceKm} km · suelo {SOIL[config.soil].label.toLowerCase()} · azimut {config.directionDeg}°.</p>
      </div>
      <div className="mt-3 space-y-2">
        {result.panels.slice(0, 5).map((panel) => <PanelCard key={panel.id} panel={panel} />)}
      </div>
    </div>
  );
}

function RepairsPanel({ result }: { result: Analysis }) {
  return (
    <div>
      <div className="rounded-xl border border-[#F6C64A]/20 bg-[#F6C64A]/[.06] p-4">
        <p className="text-[8px] font-black uppercase tracking-[.14em] text-[#F6C64A]">Rango paramétrico de intervención</p>
        <b className="mt-2 block text-xl">{CLP.format(result.repairLow)} – {CLP.format(result.repairHigh)}</b>
        <p className="mt-2 text-[8px] leading-4 text-white/40">Referencia comercial para inspección, fijaciones, perfiles y mano de obra. No es peritaje ni cotización final.</p>
      </div>
      <div className="mt-3 space-y-3">
        {result.panels.slice(0, 4).map((panel) => (
          <article key={panel.id} className="rounded-xl border border-white/10 bg-white/[.025] p-3">
            <div className="flex items-center justify-between gap-2">
              <b className="text-[10px]">{panel.label}</b>
              <span className="rounded-full bg-white/[.07] px-2 py-1 text-[7px] font-black">{panel.level}</span>
            </div>
            <p className="mt-2 text-[8px] leading-4 text-white/40">{panel.cause}</p>
            <ul className="mt-2 space-y-1.5">
              {repairAdvice(panel).map((action) => <li key={action} className="flex gap-2 text-[8px] leading-4 text-white/55"><Hammer size={11} className="mt-0.5 shrink-0 text-[#F6C64A]" />{action}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </div>
  );
}

function PanelCard({ panel }: { panel: PanelDiagnostic }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[.025] p-3">
      <div className="flex items-center justify-between gap-2">
        <b className="text-[9px]">{panel.label}</b>
        <span className="text-[8px] font-black text-[#F6C64A]">{Math.round(panel.score * 100)}%</span>
      </div>
      <p className="mt-1 text-[8px] leading-4 text-white/38">{panel.cause}</p>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.025] p-3"><span className="text-[#F6C64A] [&>svg]:h-4 [&>svg]:w-4">{icon}</span><b className="mt-2 block text-base">{value}</b><small className="mt-0.5 block text-[7px] uppercase tracking-[.1em] text-white/32">{label}</small></div>;
}

function Toggle({ active, label, icon, onClick }: { active: boolean; label: string; icon: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex min-h-10 items-center justify-center gap-2 rounded-xl border px-2 text-[8px] font-black ${active ? 'border-[#F6C64A]/40 bg-[#F6C64A]/10 text-[#F6C64A]' : 'border-white/10 bg-white/[.03] text-white/45'}`}>{icon}{label}</button>;
}

function Range({ label, value, min, max, step, number, onChange }: { label: string; value: string; min: number; max: number; step: number; number: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[8px] font-black uppercase tracking-[.12em] text-white/40">{label}</span>
        <b className="rounded-full bg-white/[.07] px-2 py-1 text-[8px] text-[#F6C64A]">{value}</b>
      </div>
      <input type="range" min={min} max={max} step={step} value={number} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#F6C64A]" />
    </label>
  );
}

function ImmersiveEnvironment({ active, hazard, progress }: { active: boolean; hazard: number; progress: number }) {
  const pulse = clamp((progress - 0.28) / 0.5);
  return (
    <>
      <color attach="background" args={['#101820']} />
      <Sky distance={450000} sunPosition={[45, 38, 24]} turbidity={7} rayleigh={2.3} />
      <ambientLight intensity={0.44} />
      <hemisphereLight args={['#c7deec', '#312820', 0.58]} />
      <directionalLight position={[38, 44, 28]} intensity={1.8} castShadow shadow-mapSize={[2048, 2048]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={active ? '#58605a' : '#657064'} roughness={1} />
      </mesh>
      {active ? [0, 0.2, 0.4].map((delay, index) => {
        const local = clamp((pulse - delay) / Math.max(0.1, 1 - delay));
        return (
          <mesh key={delay} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} scale={[1 + local * (5 + hazard * 2.8), 1 + local * (5 + hazard * 2.8), 1]}>
            <ringGeometry args={[0.48, 0.54, 72]} />
            <meshBasicMaterial color={index === 0 ? '#F6C64A' : '#61D4FF'} transparent opacity={(1 - local) * 0.28} />
          </mesh>
        );
      }) : null}
    </>
  );
}

function WalkRig({ movement, viewMode }: { movement: Movement; viewMode: ViewMode }) {
  const { camera, controls } = useThree();
  const keys = useRef({ forward: false, back: false, left: false, right: false });
  const previousMode = useRef<ViewMode | null>(null);

  useEffect(() => {
    const updateKey = (code: string, pressed: boolean) => {
      if (code === 'KeyW' || code === 'ArrowUp') keys.current.forward = pressed;
      if (code === 'KeyS' || code === 'ArrowDown') keys.current.back = pressed;
      if (code === 'KeyA' || code === 'ArrowLeft') keys.current.left = pressed;
      if (code === 'KeyD' || code === 'ArrowRight') keys.current.right = pressed;
    };
    const down = (event: KeyboardEvent) => updateKey(event.code, true);
    const up = (event: KeyboardEvent) => updateKey(event.code, false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  useEffect(() => {
    if (previousMode.current === viewMode) return;
    previousMode.current = viewMode;
    const orbit = controls as { target?: Vector3; update?: () => void } | null;
    if (viewMode === 'interior') {
      camera.position.set(0.15, 1.62, 1.4);
      orbit?.target?.set(0, 1.35, -3.5);
      camera.lookAt(0, 1.35, -3.5);
    } else {
      camera.position.set(8.2, 5.2, 9.2);
      orbit?.target?.set(0, 1.2, 0);
      camera.lookAt(0, 1.2, 0);
    }
    orbit?.update?.();
  }, [camera, controls, viewMode]);

  useFrame((_, delta) => {
    const forwardActive = movement.forward || keys.current.forward;
    const backActive = movement.back || keys.current.back;
    const leftActive = movement.left || keys.current.left;
    const rightActive = movement.right || keys.current.right;
    if (!forwardActive && !backActive && !leftActive && !rightActive) return;

    const forward = new Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
    forward.normalize();

    const right = new Vector3().crossVectors(forward, new Vector3(0, 1, 0)).normalize();
    const motion = new Vector3();
    if (forwardActive) motion.add(forward);
    if (backActive) motion.sub(forward);
    if (rightActive) motion.add(right);
    if (leftActive) motion.sub(right);

    if (motion.lengthSq() > 0) {
      motion.normalize().multiplyScalar(delta * (viewMode === 'interior' ? 1.85 : 2.8));
      const previous = camera.position.clone();
      camera.position.add(motion);
      camera.position.x = clampNumber(camera.position.x, -13, 13);
      camera.position.z = clampNumber(camera.position.z, -13, 13);
      camera.position.y = clampNumber(camera.position.y, 0.9, 6.5);
      const applied = camera.position.clone().sub(previous);
      const orbit = controls as { target?: Vector3; update?: () => void } | null;
      orbit?.target?.add(applied);
      orbit?.update?.();
    }
  });

  return null;
}
