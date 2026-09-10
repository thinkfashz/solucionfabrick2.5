'use client';

import Link from 'next/link';
import { Html, OrbitControls, Sky } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CircleDollarSign,
  Gauge,
  Info,
  Pause,
  Play,
  Radar,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Waves,
  Wrench,
} from 'lucide-react';
import type { Group, Mesh } from 'three';
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
import { StoreBottomNav, StorefrontHeader } from './StorefrontChrome';

type Soil = 'rock' | 'firm' | 'soft';
type IntensityMode = 'estimated' | 'manual';

type SeismicConfig = {
  modelId: MetalconHousePresetId;
  magnitude: number;
  intensityMode: IntensityMode;
  manualMmi: number;
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
  effectiveMmi: number;
  hazard: number;
  pgaProxyG: number;
  driftProxyPct: number;
  support: number;
  critical: number;
  high: number;
  affectedWallM: number;
  repairLow: number;
  repairHigh: number;
  level: 'Bajo' | 'Moderado' | 'Alto' | 'Crítico';
  panelScores: Record<string, number>;
  panels: PanelDiagnostic[];
};

const SOIL: Record<Soil, { label: string; factor: number; mmiBoost: number; text: string }> = {
  rock: { label: 'Roca / suelo muy firme', factor: 0.78, mmiBoost: -0.7, text: 'Menor amplificación visual' },
  firm: { label: 'Suelo firme', factor: 1, mmiBoost: 0, text: 'Escenario de referencia' },
  soft: { label: 'Suelo blando', factor: 1.22, mmiBoost: 0.8, text: 'Mayor amplificación visual' },
};

const MMI_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const clp = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function mmiLabel(value: number) {
  return MMI_ROMAN[clampNumber(Math.round(value), 1, 12) - 1];
}

function levelFromScore(score: number): PanelDiagnostic['level'] {
  if (score >= 0.76) return 'Crítico';
  if (score >= 0.56) return 'Alto';
  if (score >= 0.34) return 'Moderado';
  return 'Bajo';
}

function estimateMmi(config: SeismicConfig) {
  const hypocentralDistance = Math.sqrt(config.depthKm ** 2 + config.epicentralDistanceKm ** 2);
  const distanceLoss = Math.log10(hypocentralDistance + 12) * 2.05;
  const raw = 2.3 + (config.magnitude - 4) * 1.48 + (2.8 - distanceLoss) + SOIL[config.soil].mmiBoost;
  return clampNumber(raw, 1, 12);
}

function analyze(config: SeismicConfig, preset: MetalconHousePreset): Analysis {
  const estimatedMmi = estimateMmi(config);
  const effectiveMmi = config.intensityMode === 'manual' ? config.manualMmi : estimatedMmi;
  const magnitude = clamp((config.magnitude - 4) / 5.5);
  const intensity = clamp((effectiveMmi - 1) / 11);
  const shallow = clamp(1 - config.depthKm / 150);
  const distance = clamp(1 - config.epicentralDistanceKm / 250);
  const duration = clamp((config.duration - 5) / 55);
  const hazard = clamp((magnitude * 0.34 + intensity * 0.38 + shallow * 0.1 + distance * 0.08 + duration * 0.06 + 0.04) * SOIL[config.soil].factor);
  const pgaProxyG = Math.round((0.015 + Math.pow(hazard, 1.72) * 0.72) * 100) / 100;
  const driftProxyPct = Math.round((Math.pow(hazard, 1.58) * 1.9) * 100) / 100;
  const direction = (config.directionDeg * Math.PI) / 180;
  const panelScores: Record<string, number> = {};

  const panels = preset.walls.map<PanelDiagnostic>((wall) => {
    const wallAngle = wallYawRad(wall);
    const orientation = 0.82 + 0.3 * Math.abs(Math.cos(wallAngle - direction));
    const openingRatio = Math.min(0.35, wall.openings.reduce((sum, opening) => sum + opening.widthM, 0) / Math.max(0.5, wallLengthM(wall)));
    const openingPenalty = 1 + openingRatio * 0.38;
    const braceBenefit = wall.braced ? 0.86 : 1.02;
    const structuralFactor = wall.structural ? 0.95 : 1.05;
    const score = clamp(hazard * orientation * openingPenalty * braceBenefit * structuralFactor);
    panelScores[wall.id] = score;
    const localDrift = Math.round(driftProxyPct * (0.82 + score * 0.46) * 100) / 100;
    const cause = wall.openings.length
      ? `${wall.openings.length} vano(s): revisar jambas, dinteles, soleras y fijaciones.`
      : wall.braced
        ? 'Tramo continuo con pletina localizada y anclajes visualizados.'
        : 'Tramo interior: revisar encuentros y continuidad de fijaciones.';
    return { id: wall.id, label: wall.label, score, driftProxyPct: localDrift, level: levelFromScore(score), cause };
  });

  const sorted = [...panels].sort((a, b) => b.score - a.score);
  const critical = panels.filter((panel) => panel.level === 'Crítico').length;
  const high = panels.filter((panel) => panel.level === 'Alto').length;
  const affectedWallM = Math.round(preset.walls.reduce((sum, wall) => sum + (panelScores[wall.id] >= 0.34 ? wallLengthM(wall) : 0), 0) * 10) / 10;
  const bracedRatio = preset.walls.filter((wall) => wall.braced).length / Math.max(1, preset.walls.length);
  const support = Math.round(clamp(1 - hazard * 0.62 + bracedRatio * 0.12) * 100);
  const inspectionBase = affectedWallM * 42000 + high * 68000 + critical * 145000 + 120000;
  const repairLow = Math.max(120000, Math.round(inspectionBase * (0.82 + hazard * 0.45)));
  const repairHigh = Math.round(repairLow * (1.55 + hazard * 0.35));
  const level = sorted[0]?.level ?? 'Bajo';

  return {
    estimatedMmi,
    effectiveMmi,
    hazard,
    pgaProxyG,
    driftProxyPct,
    support,
    critical,
    high,
    affectedWallM,
    repairLow,
    repairHigh,
    level,
    panelScores,
    panels: sorted,
  };
}

export function StructuralMonitoringSimulator() {
  const [config, setConfig] = useState<SeismicConfig>({
    modelId: 'family-6x8',
    magnitude: 7.2,
    intensityMode: 'estimated',
    manualMmi: 8,
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
  const [showDamage, setShowDamage] = useState(true);
  const [showSupports, setShowSupports] = useState(true);
  const preset = METALCON_HOUSE_PRESETS[config.modelId];
  const result = useMemo(() => analyze(config, preset), [config, preset]);

  useEffect(() => {
    if (!playing) return;
    const stepMs = 60;
    const visualSeconds = clampNumber(10 + config.duration * 0.22, 10, 24) / config.playbackRate;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        const next = value + stepMs / (visualSeconds * 1000);
        if (next >= 1) {
          setPlaying(false);
          return 1;
        }
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [playing, config.duration, config.playbackRate]);

  useEffect(() => {
    setPlaying(false);
    setProgress(0);
  }, [config.modelId]);

  const play = () => {
    setProgress((value) => value >= 0.999 ? 0 : value);
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

  return (
    <div className="min-h-screen bg-[#03070a] text-white">
      <StorefrontHeader />
      <main className="pb-28 md:pb-16">
        <section className="border-b border-white/10 px-3 py-9 sm:px-6 sm:py-14">
          <div className="mx-auto flex max-w-[1500px] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.24em] text-cyan-300">Digital twin · Three.js · secuencia sísmica 4D educativa</p>
              <h1 className="mt-3 max-w-5xl text-[clamp(2.8rem,7vw,6.6rem)] font-black leading-[.88] tracking-[-.065em]">Del hipocentro a toda la malla.</h1>
              <p className="mt-5 max-w-3xl text-sm leading-6 text-white/50 sm:text-base">La simulación ahora mueve la vivienda completa: propagación P/S, onda superficial, dirección de excitación, respuesta de cada panel y diagnóstico final de los tramos más exigidos.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/herramientas/metalcon" className="rounded-full border border-white/15 px-5 py-3 text-xs font-black text-white/70">← Configurar Metalcon</Link>
              <button type="button" onClick={play} className="flex items-center gap-2 rounded-full bg-[#F6C64A] px-5 py-3 text-xs font-black text-black"><Play size={14} fill="currentColor" /> Reproducir secuencia</button>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1500px] gap-5 px-3 py-6 sm:px-6 xl:grid-cols-[minmax(0,1.5fr)_420px] xl:gap-8 xl:py-10">
          <div className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#071015]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div><p className="text-[8px] font-black uppercase tracking-[.2em] text-cyan-300">{preset.shortLabel} · malla completa</p><b className="text-xs">Cámara cinemática + respuesta por panel + órbita 360°</b></div>
              <div className="flex gap-1.5"><Toggle active={showSupports} onClick={() => setShowSupports((value) => !value)} label="Anclajes" /><Toggle active={showDamage} onClick={() => setShowDamage((value) => !value)} label="Daño" /></div>
            </div>

            <div className="relative h-[610px] sm:h-[740px]">
              <Canvas shadows dpr={[1, 1.6]} camera={{ position: [9, 6.2, 10.5], fov: 42, near: 0.05, far: 150 }}>
                <Suspense fallback={null}>
                  <SeismicEnvironment />
                  <SubsurfaceSequence config={config} result={result} progress={progress} playing={playing} />
                  <MetalconAssembly3D
                    preset={preset}
                    spacingCm={40}
                    profileDepthMm={90}
                    displayMode="bracing"
                    seismic={seismicVisual}
                  />
                  <CameraSequence active={playing} progress={progress} preset={preset} />
                  <OrbitControls makeDefault enabled={!playing} target={[0, 1.05, 0]} enableDamping dampingFactor={0.08} minDistance={2.7} maxDistance={30} maxPolarAngle={Math.PI * 0.84} />
                </Suspense>
              </Canvas>

              <div className="pointer-events-none absolute left-3 top-3 rounded-xl border border-white/10 bg-black/65 px-3 py-2 backdrop-blur-md">
                <div className="text-[8px] font-black uppercase tracking-[.14em] text-cyan-100">{stage(progress)} · {Math.round(progress * 100)}%</div>
                <div className="mt-1 text-[7px] text-white/38">Mw {config.magnitude.toFixed(1)} · MMI {mmiLabel(result.effectiveMmi)} · {config.depthKm} km · dirección {config.directionDeg}°</div>
              </div>

              <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-white/10 bg-black/78 p-3 backdrop-blur-xl sm:p-4">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={playing ? () => setPlaying(false) : play} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#F6C64A] text-black">{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</button>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex justify-between text-[7px] font-black uppercase tracking-[.1em] text-white/40"><span>Ruptura</span><span>Onda P</span><span>Onda S</span><span>Superficie</span><span>Malla</span><span>Daño</span></div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-300 transition-[width] duration-75" style={{ width: `${progress * 100}%` }} /></div>
                  </div>
                  <button type="button" onClick={reset} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white/60"><RotateCcw size={15} /></button>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.6rem] border border-white/10 bg-[#0A1115] p-5">
              <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Modelo de vivienda</p><Radar size={18} className="text-cyan-300" /></div>
              <select value={config.modelId} onChange={(event) => setConfig((value) => ({ ...value, modelId: event.target.value as MetalconHousePresetId }))} className="mt-3 h-12 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black text-white outline-none">
                {METALCON_HOUSE_PRESET_ORDER.map((id) => <option key={id} value={id}>{METALCON_HOUSE_PRESETS[id].label}</option>)}
              </select>
              <p className="mt-2 text-[8px] leading-4 text-white/30">{preset.sourceNote}</p>
            </div>

            <div className="rounded-[1.6rem] border border-white/10 bg-[#0A1115] p-5">
              <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Parámetros del evento</p><Waves size={18} className="text-cyan-300" /></div>
              <Range label="Magnitud del escenario" value={`Mw ${config.magnitude.toFixed(1)}`} min={4} max={9.5} step={0.1} number={config.magnitude} onChange={(magnitude) => setConfig((value) => ({ ...value, magnitude }))} />

              <div className="mt-4 rounded-xl border border-white/8 bg-white/[.025] p-3">
                <div className="flex items-center justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-[.12em] text-white/40">Intensidad MMI</span><span className="rounded-full bg-cyan-300 px-2 py-1 text-[8px] font-black text-black">MMI {mmiLabel(result.effectiveMmi)}</span></div>
                <div className="mt-2 grid grid-cols-2 gap-1"><ModeButton active={config.intensityMode === 'estimated'} onClick={() => setConfig((value) => ({ ...value, intensityMode: 'estimated' }))} label="Estimada" /><ModeButton active={config.intensityMode === 'manual'} onClick={() => setConfig((value) => ({ ...value, intensityMode: 'manual' }))} label="Manual" /></div>
                {config.intensityMode === 'manual' ? <Range compact label="MMI objetivo visual" value={`${config.manualMmi}/12`} min={1} max={12} step={1} number={config.manualMmi} onChange={(manualMmi) => setConfig((value) => ({ ...value, manualMmi }))} /> : <p className="mt-2 text-[8px] leading-4 text-white/35">Estimación visual: MMI {mmiLabel(result.estimatedMmi)} ({result.estimatedMmi.toFixed(1)}) a partir de magnitud, profundidad, distancia y suelo.</p>}
              </div>

              <Range label="Profundidad hipocentral" value={`${config.depthKm} km`} min={5} max={120} step={1} number={config.depthKm} onChange={(depthKm) => setConfig((value) => ({ ...value, depthKm }))} />
              <Range label="Distancia epicentral" value={`${config.epicentralDistanceKm} km`} min={0} max={250} step={5} number={config.epicentralDistanceKm} onChange={(epicentralDistanceKm) => setConfig((value) => ({ ...value, epicentralDistanceKm }))} />
              <Range label="Duración del movimiento" value={`${config.duration} s`} min={5} max={60} step={1} number={config.duration} onChange={(duration) => setConfig((value) => ({ ...value, duration }))} />
              <Range label="Dirección dominante" value={`${config.directionDeg}°`} min={0} max={350} step={10} number={config.directionDeg} onChange={(directionDeg) => setConfig((value) => ({ ...value, directionDeg }))} />
              <Range label="Frecuencia visual dominante" value={`${config.frequencyHz.toFixed(1)} Hz`} min={0.8} max={5} step={0.1} number={config.frequencyHz} onChange={(frequencyHz) => setConfig((value) => ({ ...value, frequencyHz }))} />

              <label className="mt-4 block"><span className="mb-2 block text-[9px] font-black uppercase tracking-[.14em] text-white/40">Suelo</span><select value={config.soil} onChange={(event) => setConfig((value) => ({ ...value, soil: event.target.value as Soil }))} className="h-12 w-full rounded-xl border border-white/10 bg-[#11181d] px-3 text-xs font-black text-white outline-none">{Object.entries(SOIL).map(([id, soil]) => <option key={id} value={id}>{soil.label} · {soil.text}</option>)}</select></label>

              <div className="mt-4 flex items-center justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-[.12em] text-white/40">Velocidad reproducción</span><div className="flex gap-1">{([0.5, 1, 2] as const).map((speed) => <button key={speed} type="button" onClick={() => setConfig((value) => ({ ...value, playbackRate: speed }))} className={`rounded-full px-2.5 py-1.5 text-[8px] font-black ${config.playbackRate === speed ? 'bg-[#F6C64A] text-black' : 'bg-white/[.06] text-white/45'}`}>{speed}×</button>)}</div></div>
            </div>

            <div className="rounded-[1.6rem] border border-white/10 bg-[#0A1115] p-5">
              <div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[.2em] text-white/40">Analítica paramétrica</p><Activity size={18} className={result.level === 'Crítico' ? 'text-red-400' : 'text-[#F6C64A]'} /></div>
              <div className="mt-3 flex items-end gap-3"><b className={`text-6xl tracking-[-.07em] ${result.hazard >= 0.76 ? 'text-red-400' : result.hazard >= 0.56 ? 'text-orange-300' : 'text-[#F6C64A]'}`}>{Math.round(result.hazard * 100)}%</b><span className="pb-2 text-xs font-black text-white/55">demanda visual · {result.level}</span></div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric icon={<ShieldCheck />} label="Soporte relativo" value={`${result.support}%`} />
                <Metric icon={<Gauge />} label="PGA proxy" value={`${result.pgaProxyG.toFixed(2)} g`} />
                <Metric icon={<SlidersHorizontal />} label="Deriva proxy" value={`${result.driftProxyPct.toFixed(2)}%`} />
                <Metric icon={<AlertTriangle />} label="Paneles altos/críticos" value={`${result.high}/${result.critical}`} />
                <Metric icon={<Wrench />} label="Muro a inspeccionar" value={`${result.affectedWallM} m`} />
                <Metric icon={<Waves />} label="MMI efectiva" value={mmiLabel(result.effectiveMmi)} />
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-[#F6C64A]/20 bg-[#F6C64A]/[.06] p-5">
              <div className="flex items-center gap-2 text-[#F6C64A]"><CircleDollarSign size={17} /><p className="text-[9px] font-black uppercase tracking-[.16em]">Reparación referencial</p></div>
              <b className="mt-2 block text-xl tracking-[-.03em]">{clp.format(result.repairLow)} – {clp.format(result.repairHigh)}</b>
              <p className="mt-2 text-[9px] leading-4 text-white/38">Rango paramétrico para inspección/reposición de perfiles, fijaciones y mano de obra de los tramos marcados. No es cotización ni peritaje.</p>
            </div>
          </aside>
        </section>

        <section className="mx-auto max-w-[1500px] px-3 pb-12 sm:px-6">
          <div className="grid gap-3 lg:grid-cols-[1.1fr_.9fr]">
            <div className="rounded-[1.6rem] border border-white/10 bg-[#0A1115] p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-300">Ranking de paneles</p><h2 className="mt-2 text-2xl font-black">Dónde mirar primero</h2></div><AlertTriangle size={20} className="text-[#F6C64A]" /></div>
              <div className="mt-4 space-y-2">{result.panels.slice(0, 6).map((panel) => <PanelRow key={panel.id} panel={panel} />)}</div>
            </div>
            <div className="space-y-3">
              <Process number="01" title="Ruptura" text={`Foco visual a ${config.depthKm} km y crecimiento de una falla idealizada. La escala subterránea está comprimida para poder verla.`} />
              <Process number="02" title="Ondas P y S" text="La onda P aparece primero; la S se representa después con mayor desplazamiento. No se calculan tiempos de viaje geofísicos reales." />
              <Process number="03" title="Superficie → malla" text={`La excitación entra a la vivienda con azimut ${config.directionDeg}° y cada panel recibe un factor por orientación, vanos y arriostramiento.`} />
              <Process number="04" title="Diagnóstico" text="El resultado ordena paneles y zonas de vano para inspección visual prioritaria y genera un rango económico referencial." />
            </div>
          </div>

          <div className="mt-5 flex gap-3 rounded-[1.4rem] border border-amber-300/20 bg-amber-300/[.05] p-4 text-[10px] leading-5 text-amber-50/60"><Info size={17} className="mt-0.5 shrink-0 text-amber-300" /><p><b className="text-amber-100">Herramienta educativa/comercial, no un modelo de ingeniería sísmica.</b> MMI estimada, PGA proxy, deriva proxy, daño, soporte y costos son índices visuales para comparar escenarios. No sustituyen espectro de diseño, análisis modal/no lineal, NCh aplicable, estudio geotécnico, memoria estructural, inspección post-sismo ni evaluación de un profesional competente. No uses este resultado para decidir habitabilidad.</p></div>
        </section>
      </main>
      <StoreBottomNav />
    </div>
  );
}

function Toggle({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`rounded-full px-3 py-2 text-[8px] font-black ${active ? 'bg-cyan-300 text-black' : 'bg-white/[.07] text-white/45'}`}>{label}</button>;
}

function ModeButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return <button type="button" onClick={onClick} className={`rounded-lg py-2 text-[8px] font-black ${active ? 'bg-white text-black' : 'bg-white/[.05] text-white/45'}`}>{label}</button>;
}

function Range({ label, value, min, max, step, number, onChange, compact = false }: { label: string; value: string; min: number; max: number; step: number; number: number; onChange: (value: number) => void; compact?: boolean }) {
  return <label className={compact ? 'mt-3 block' : 'mt-4 block'}><div className="mb-2 flex items-center justify-between gap-2"><span className="text-[8px] font-black uppercase tracking-[.12em] text-white/40">{label}</span><b className="rounded-full bg-white/[.07] px-2 py-1 text-[8px] text-cyan-200">{value}</b></div><input type="range" min={min} max={max} step={step} value={number} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-cyan-300" /></label>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-xl border border-white/8 bg-white/[.025] p-3"><span className="text-cyan-300 [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span><b className="mt-2 block text-base">{value}</b><small className="text-[8px] text-white/35">{label}</small></div>;
}

function Process({ number, title, text }: { number: string; title: string; text: string }) {
  return <article className="rounded-[1.4rem] border border-white/10 bg-[#0A1115] p-5"><span className="text-[9px] font-black text-cyan-300">{number}</span><h3 className="mt-3 text-lg font-black">{title}</h3><p className="mt-2 text-[10px] leading-5 text-white/40">{text}</p></article>;
}

function PanelRow({ panel }: { panel: PanelDiagnostic }) {
  const tone = panel.level === 'Crítico' ? 'text-red-300 bg-red-400/10 border-red-400/20' : panel.level === 'Alto' ? 'text-orange-200 bg-orange-300/10 border-orange-300/20' : panel.level === 'Moderado' ? 'text-yellow-100 bg-yellow-300/10 border-yellow-300/20' : 'text-emerald-200 bg-emerald-300/10 border-emerald-300/20';
  return <div className="grid gap-2 rounded-xl border border-white/8 bg-white/[.025] p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><b className="text-xs">{panel.label}</b><span className={`rounded-full border px-2 py-1 text-[7px] font-black ${tone}`}>{panel.level}</span></div><p className="mt-1 text-[8px] leading-4 text-white/35">{panel.cause}</p></div><div className="text-right"><b className="text-lg text-[#F6C64A]">{Math.round(panel.score * 100)}%</b><small className="block text-[7px] text-white/30">deriva proxy {panel.driftProxyPct.toFixed(2)}%</small></div></div>;
}

function SeismicEnvironment() {
  return <>
    <color attach="background" args={['#101922']} />
    <Sky distance={450000} sunPosition={[55, 42, 26]} turbidity={7} rayleigh={2.6} />
    <ambientLight intensity={0.42} />
    <hemisphereLight args={['#bcd6e8', '#3b2e25', 0.52]} />
    <directionalLight position={[50, 42, 26]} intensity={1.9} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]} receiveShadow><planeGeometry args={[70, 70]} /><meshStandardMaterial color="#687264" roughness={1} /></mesh>
  </>;
}

function SubsurfaceSequence({ config, result, progress, playing }: { config: SeismicConfig; result: Analysis; progress: number; playing: boolean }) {
  const glow = useRef<Mesh>(null);
  const hypocenterY = -2.4 - clamp(config.depthKm / 120) * 1.7;
  const ruptureProgress = clamp(progress / 0.16);
  const pProgress = clamp((progress - 0.1) / 0.24);
  const sProgress = clamp((progress - 0.2) / 0.28);
  const surfaceProgress = clamp((progress - 0.38) / 0.2);
  useFrame(({ clock }) => {
    if (!glow.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * (playing ? 8 : 2)) * 0.16;
    glow.current.scale.setScalar(pulse);
  });

  return <group>
    <mesh position={[0, -0.65, 0]}><boxGeometry args={[10, 1.0, 8]} /><meshStandardMaterial color="#74593f" transparent opacity={0.36} roughness={1} /></mesh>
    <mesh position={[0, -1.45, 0]}><boxGeometry args={[10, 0.6, 8]} /><meshStandardMaterial color="#4b3b31" transparent opacity={0.45} roughness={1} /></mesh>
    <mesh position={[0, -2.25, 0]}><boxGeometry args={[10, 0.95, 8]} /><meshStandardMaterial color="#262b30" transparent opacity={0.58} roughness={0.95} /></mesh>

    <group position={[0, hypocenterY, 0]} rotation={[0.18, ((config.directionDeg + 25) * Math.PI) / 180, -0.32]}>
      <mesh position={[-1.7 + ruptureProgress * 1.7, 0, 0]}>
        <boxGeometry args={[Math.max(0.08, ruptureProgress * 3.4), 0.035, 0.16]} />
        <meshStandardMaterial color="#ff552f" emissive="#ff2700" emissiveIntensity={2.8} />
      </mesh>
    </group>

    <group position={[0, hypocenterY, 0]}>
      <mesh ref={glow}><sphereGeometry args={[0.14 + result.hazard * 0.12, 24, 24]} /><meshStandardMaterial color="#ff3b23" emissive="#ff2100" emissiveIntensity={5} /></mesh>
      <WaveShell scale={0.35 + pProgress * (3.5 + result.hazard * 2.2)} opacity={(1 - pProgress) * 0.34 + 0.04} color="#ffcf7b" />
      <WaveShell scale={0.28 + sProgress * (3.0 + result.hazard * 2.8)} opacity={(1 - sProgress) * 0.4 + 0.04} color="#ff6540" />
      <Html center distanceFactor={8} position={[0, -0.34, 0]}><span className="whitespace-nowrap rounded-lg bg-black/85 px-2 py-1 text-[7px] font-black uppercase text-[#ff9a70]">Hipocentro visual · {config.depthKm} km</span></Html>
    </group>

    {surfaceProgress > 0 ? (
      <group position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {[0, 0.22, 0.44].map((delay, index) => {
          const local = clamp((surfaceProgress - delay) / Math.max(0.1, 1 - delay));
          return <mesh key={index} scale={[1 + local * (4 + result.hazard * 2), 1 + local * (4 + result.hazard * 2), 1]}><ringGeometry args={[0.45, 0.49, 64]} /><meshBasicMaterial color={index === 0 ? '#ffb05f' : '#57D4FF'} transparent opacity={(1 - local) * 0.32} /></mesh>;
        })}
      </group>
    ) : null}

    {progress > 0.46 && result.hazard > 0.42 ? <group position={[0, -0.015, 0]}><SurfaceCrack x={-1.35} z={0.35} rot={0.48} /><SurfaceCrack x={0.2} z={-0.55} rot={-0.32} /><SurfaceCrack x={1.55} z={0.62} rot={0.86} /></group> : null}
  </group>;
}

function WaveShell({ scale, opacity, color }: { scale: number; opacity: number; color: string }) {
  return <mesh scale={scale}><sphereGeometry args={[0.5, 28, 18]} /><meshBasicMaterial color={color} wireframe transparent opacity={opacity} /></mesh>;
}

function SurfaceCrack({ x, z, rot }: { x: number; z: number; rot: number }) {
  return <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, rot]}><planeGeometry args={[1.35, 0.045]} /><meshBasicMaterial color="#ff4b2e" transparent opacity={0.65} /></mesh>;
}

function CameraSequence({ active, progress, preset }: { active: boolean; progress: number; preset: MetalconHousePreset }) {
  const { camera } = useThree();
  const desired = useRef(new Vector3());
  const target = useRef(new Vector3());
  useFrame(() => {
    if (!active) return;
    const maxDimension = Math.max(preset.widthM, preset.depthM);
    if (progress < 0.16) {
      desired.current.set(4.4, -2.1, 5.4);
      target.current.set(0, -2.7, 0);
    } else if (progress < 0.4) {
      desired.current.set(6.1, 0.3, 7.0);
      target.current.set(0, -0.8, 0);
    } else if (progress < 0.58) {
      desired.current.set(7.2, 2.6, 8.2);
      target.current.set(0, 0.25, 0);
    } else if (progress < 0.84) {
      const local = (progress - 0.58) / 0.26;
      const angle = local * Math.PI * 0.7 + 0.5;
      const radius = Math.max(6.8, maxDimension * 1.05);
      desired.current.set(Math.cos(angle) * radius, 4.4, Math.sin(angle) * radius);
      target.current.set(0, 1.0, 0);
    } else {
      desired.current.set(Math.max(7.5, preset.widthM * 1.15), 7.2, Math.max(8.2, preset.depthM * 1.05));
      target.current.set(0, 1.0, 0);
    }
    camera.position.lerp(desired.current, 0.055);
    camera.lookAt(target.current);
  });
  return null;
}

function stage(progress: number) {
  if (progress < 0.12) return 'Nucleación y ruptura de falla';
  if (progress < 0.26) return 'Propagación de onda P';
  if (progress < 0.43) return 'Llegada de onda S';
  if (progress < 0.58) return 'Onda superficial';
  if (progress < 0.84) return 'Respuesta de la malla completa';
  return 'Mapa final de paneles y vanos';
}
