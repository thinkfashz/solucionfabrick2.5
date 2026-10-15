'use client';

import { useEffect, useRef } from 'react';

/**
 * Audio inmersivo del sismo generado íntegramente con Web Audio API (sin assets).
 *
 * Fases ligadas al `progress` de la simulación:
 * - AVISO (progress < .18): sirena de alerta civil que ALTERNA 4 TONOS
 *   (alto–bajo–medio–bajo) con envolvente por tono, saturación (WaveShaper)
 *   y eco corto (delay con feedback filtrado). Entra desde el instante 0, es
 *   decir 1–2 s antes de la sacudida fuerte, enlazando con la fase de alerta
 *   de los personajes, y se atenúa al llegar la sacudida (.18–.33).
 * - RUPTURA (~.13–.28): "boom" grave de la ruptura: ruido con barrido
 *   pasa-bajos + envolvente exponencial + transitorio senoidal (una sola vez
 *   por corrida), sincronizado con la aparición de la fisura.
 * - SACUDIDA (.28–.85): rumor orgánico continuo = 3 capas de ruido filtrado
 *   con modulaciones cruzadas (LFOs compartidos entre filtros y ganancias) +
 *   2 sub-senos graves (38/57 Hz) modulados; crepitación de madera con
 *   transitorios secos y filtros variables por impulso; THUD/impactos graves
 *   espaciados cada ~0,7–1,5 s.
 * - RÉPLICAS (> .85): el rumor decae y la sirena vuelve intermitente.
 *
 * Todo se crea bajo demanda tras un gesto del usuario (política autoplay), se
 * modula sin amontonar eventos de automatización, se corta al pausar/mutear y
 * se destruye al desmontar. Los buffers de ruido se reutilizan: cero
 * asignaciones de buffers por impulso.
 */

type RumbleRig = {
  bus: GainNode;
  oscFilter: BiquadFilterNode;
  noiseMix: GainNode;
  noiseFilters: BiquadFilterNode[];
};

type SirenRig = {
  bus: GainNode;
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  env: GainNode;
  timer: number | null;
  toneIndex: number;
  currentFreq: number;
};

type BurstRig = { bus: GainNode; timer: number | null };
type ThudRig = { bus: GainNode; timer: number | null };
type BoomRig = { bus: GainNode; fired: boolean };

const MASTER_LEVEL = 0.6;
const SIREN_TONES = [670, 430, 590, 430]; // alto · bajo · medio · bajo
const SIREN_STEP_S = 0.43;
const BOOM_WINDOW: [number, number] = [0.13, 0.28];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** setTargetAtTime sin amontonar eventos cuando el valor ya está donde toca. */
function smooth(param: AudioParam, target: number, tau: number, t: number): void {
  if (Math.abs(param.value - target) < 0.0015) return;
  param.setTargetAtTime(target, t, tau);
}

function createNoiseBuffer(ctx: AudioContext, seconds = 3): AudioBuffer {
  const length = Math.ceil(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Curva de saturación suave tipo tanh: "amplificador barato" sin picos duros. */
function makeSaturationCurve(drive: number) {
  const n = 1024;
  const curve = new Float32Array(n);
  const norm = Math.tanh(drive);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * drive) / norm;
  }
  return curve;
}

function releaseOnEnd(src: AudioScheduledSourceNode, nodes: AudioNode[]): void {
  src.onended = () => {
    for (let i = 0; i < nodes.length; i++) {
      try {
        nodes[i].disconnect();
      } catch {
        /* ya desconectado */
      }
    }
    try {
      src.disconnect();
    } catch {
      /* noop */
    }
  };
}

// ---------------------------------------------------------------- BOOM ----
/** Ruptura: ruido grave barrido + transitorio tonal, envolvente exponencial. */
function fireBoom(ctx: AudioContext, bus: GainNode, noise: AudioBuffer | null, level: number): void {
  if (!noise) return;
  const t = ctx.currentTime;
  const peak = 0.55 + 0.45 * clamp01(level);

  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  src.playbackRate.setValueAtTime(1, t);
  src.playbackRate.exponentialRampToValueAtTime(0.3, t + 1.2);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.Q.value = 1.1;
  lp.frequency.setValueAtTime(1500, t);
  lp.frequency.exponentialRampToValueAtTime(55, t + 0.9);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.018); // transitorio de apertura
  g.gain.exponentialRampToValueAtTime(peak * 0.35, t + 0.16);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.25);
  src.connect(lp).connect(g).connect(bus);
  src.start(t, Math.random() * 2);
  src.stop(t + 1.3);
  releaseOnEnd(src, [lp, g]);

  // transitorio: golpe tonal que cae de golpe (rotura del terreno)
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(120, t);
  o.frequency.exponentialRampToValueAtTime(26, t + 0.35);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(peak * 0.85, t + 0.008);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(og).connect(bus);
  o.start(t);
  o.stop(t + 0.55);
  releaseOnEnd(o, [og]);
}

// ------------------------------------------------------------- CRACKLE ----
function fireCrackle(ctx: AudioContext, bus: GainNode, noise: AudioBuffer | null, level: number): void {
  if (!noise) return;
  const t = ctx.currentTime;
  const roll = Math.random();

  if (roll < 0.62) {
    // SNAP seco: transitorio muy corto, filtro agudo variando y caída exponencial
    const dur = 0.02 + Math.random() * 0.045;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 800;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3.5 + Math.random() * 5;
    const f0 = 1200 + Math.random() * 3200;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(400, f0 * 0.5), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5 + Math.random() * 0.5, t + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(hp).connect(bp).connect(g).connect(bus);
    src.start(t, Math.random() * 2);
    src.stop(t + dur + 0.03);
    releaseOnEnd(src, [hp, bp, g]);
  } else if (roll < 0.93) {
    // DESGARRO: ruido más largo con barrido descendente (entablado cediendo)
    const dur = 0.1 + Math.random() * 0.2;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.1 + Math.random();
    const f0 = 2200 + Math.random() * 1200;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(450 + Math.random() * 350, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35 + Math.random() * 0.3, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(bus);
    src.start(t, Math.random() * 2);
    src.stop(t + dur + 0.03);
    releaseOnEnd(src, [bp, g]);
  } else {
    // CREAK: madera gimiendo (tono filtrado con caída lenta)
    const dur = 0.22 + Math.random() * 0.3;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    const f0 = 130 + Math.random() * 140;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 5 + Math.random() * 4;
    bp.frequency.value = f0 * 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16 + 0.12 * clamp01(level), t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp).connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
    releaseOnEnd(o, [bp, g]);
  }
}

// ---------------------------------------------------------------- THUD -----
/** Impacto grave espaciado durante la fase fuerte. */
function fireThud(ctx: AudioContext, bus: GainNode, noise: AudioBuffer | null, level: number): void {
  if (!noise) return;
  const t = ctx.currentTime;

  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(72 + Math.random() * 34, t);
  o.frequency.exponentialRampToValueAtTime(30, t + 0.25);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.5 + 0.4 * clamp01(level), t + 0.007);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(og).connect(bus);
  o.start(t);
  o.stop(t + 0.55);
  releaseOnEnd(o, [og]);

  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(140, t + 0.22);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.45, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  src.connect(lp).connect(g).connect(bus);
  src.start(t, Math.random() * 2);
  src.stop(t + 0.35);
  releaseOnEnd(src, [lp, g]);
}

// --------------------------------------------------------------- SIRENA ----
/** Un paso: tono siguiente con barrido corto + envolvente de golpe y caída. */
function sirenStep(ctx: AudioContext, siren: SirenRig): void {
  const t = ctx.currentTime + 0.02;
  const prev = siren.currentFreq;
  const next = SIREN_TONES[siren.toneIndex % SIREN_TONES.length];
  siren.toneIndex++;

  const fa = siren.oscA.frequency;
  fa.cancelScheduledValues(t);
  fa.setValueAtTime(prev, t);
  fa.linearRampToValueAtTime(next, t + 0.06);

  const fb = siren.oscB.frequency;
  fb.cancelScheduledValues(t);
  fb.setValueAtTime(prev * 1.5, t);
  fb.linearRampToValueAtTime(next * 1.5, t + 0.06);

  // envolvente: golpe al entrar el tono y desvanecido hacia el siguiente
  const g = siren.env.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(0.6, t);
  g.linearRampToValueAtTime(1, t + 0.045);
  g.linearRampToValueAtTime(0.6, t + SIREN_STEP_S * 0.95);

  siren.currentFreq = next;
}

function startSiren(ctx: AudioContext, siren: SirenRig): void {
  sirenStep(ctx, siren);
  siren.timer = window.setInterval(() => sirenStep(ctx, siren), SIREN_STEP_S * 1000);
}

function stopSiren(siren: SirenRig | null): void {
  if (!siren || siren.timer === null) return;
  window.clearInterval(siren.timer);
  siren.timer = null;
}

// ----------------------------------------------------------------- HOOK ----
export function useSeismicAudio(playing: boolean, progress: number, intensity: number, muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const noiseRef = useRef<AudioBuffer | null>(null);
  const rumbleRef = useRef<RumbleRig | null>(null);
  const sirenRef = useRef<SirenRig | null>(null);
  const crackleRef = useRef<BurstRig | null>(null);
  const thudRef = useRef<ThudRig | null>(null);
  const boomRef = useRef<BoomRig | null>(null);

  // refs espejo para los schedulers (evitan closures viejas)
  const levelRef = useRef(0);
  const crackleActiveRef = useRef(false);
  const thudActiveRef = useRef(false);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // --- construcción del grafo (una sola vez, tras el primer gesto) ---------
  const ensureGraph = (): AudioContext | null => {
    if (ctxRef.current) return ctxRef.current;
    const CtxCtor: typeof AudioContext | undefined =
      typeof window !== 'undefined'
        ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!CtxCtor) return null;
    let created: AudioContext | null = null;
    try {
      created = new CtxCtor();
    } catch {
      return null; // sin AudioContext disponible (contexto restringido)
    }
    if (!created) return null;
    const ctx = created;
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    // limitador: evita que las capas sumadas recorten en pequeños parlantes
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 18;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    master.connect(comp).connect(ctx.destination);
    masterRef.current = master;

    const noise = createNoiseBuffer(ctx);
    noiseRef.current = noise;

    // --- RUMBLE: 3 capas de ruido con LFOs cruzados + 2 sub-senos graves ----
    const rumbleBus = ctx.createGain();
    rumbleBus.gain.value = 0;
    rumbleBus.connect(master);

    const oscFilter = ctx.createBiquadFilter();
    oscFilter.type = 'lowpass';
    oscFilter.frequency.value = 140;
    oscFilter.Q.value = 0.8;
    oscFilter.connect(rumbleBus);

    const noiseMix = ctx.createGain();
    noiseMix.gain.value = 0;
    noiseMix.connect(rumbleBus);

    const mkLayer = (rate: number, type: BiquadFilterType, freq: number, q: number, gain: number) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      src.playbackRate.value = rate;
      src.start(ctx.currentTime + Math.random() * 0.4, Math.random() * 2);
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(filter).connect(g).connect(noiseMix);
      return { filter, g };
    };
    const layerA = mkLayer(1.0, 'lowpass', 115, 0.7, 0.3); // murmullo del suelo
    const layerB = mkLayer(0.62, 'bandpass', 72, 1.3, 0.36); // barrido lejano
    const layerC = mkLayer(0.35, 'lowpass', 46, 0.6, 0.45); // sub de fondo

    // modulaciones cruzadas: A respira sobre los tres filtros; B modula las
    // ganancias de B y C; C modula el murmullo de A ⇒ nunca suenan periódicos.
    const lfoA = ctx.createOscillator();
    lfoA.type = 'sine';
    lfoA.frequency.value = 0.13;
    const ampA1 = ctx.createGain();
    ampA1.gain.value = 30;
    const ampA2 = ctx.createGain();
    ampA2.gain.value = 11;
    lfoA.connect(ampA1).connect(layerA.filter.frequency);
    ampA1.connect(layerB.filter.frequency);
    lfoA.connect(ampA2).connect(layerC.filter.frequency);

    const lfoB = ctx.createOscillator();
    lfoB.type = 'sine';
    lfoB.frequency.value = 0.29;
    const ampB1 = ctx.createGain();
    ampB1.gain.value = 0.18;
    const ampB2 = ctx.createGain();
    ampB2.gain.value = 0.1;
    lfoB.connect(ampB1).connect(layerB.g.gain);
    lfoB.connect(ampB2).connect(layerC.g.gain);

    const lfoC = ctx.createOscillator();
    lfoC.type = 'sine';
    lfoC.frequency.value = 0.07;
    const ampC = ctx.createGain();
    ampC.gain.value = 0.1;
    lfoC.connect(ampC).connect(layerA.g.gain);

    lfoA.start();
    lfoB.start();
    lfoC.start();

    // sub-senos graves desfasados (38 + 57 Hz) que "respiran" en contrafase
    [38, 57].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.31 + i * 0.19;
      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = 0.5;
      const vca = ctx.createGain();
      vca.gain.value = i === 0 ? 0.5 : 0.75;
      lfo.connect(lfoAmp).connect(vca.gain);
      lfo.start();
      osc.connect(vca).connect(oscFilter);
      osc.start();
    });

    rumbleRef.current = {
      bus: rumbleBus,
      oscFilter,
      noiseMix,
      noiseFilters: [layerA.filter, layerB.filter, layerC.filter],
    };

    // --- SIRENA: 4 tonos alternantes + saturación + eco ---------------------
    const sirenBus = ctx.createGain();
    sirenBus.gain.value = 0;
    sirenBus.connect(master);

    const env = ctx.createGain();
    env.gain.value = 0.6;

    const shaper = ctx.createWaveShaper();
    shaper.curve = makeSaturationCurve(2.6);
    shaper.oversample = '2x';
    const makeup = ctx.createGain();
    makeup.gain.value = 1;
    env.connect(shaper).connect(makeup);

    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.26;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const fbLp = ctx.createBiquadFilter();
    fbLp.type = 'lowpass';
    fbLp.frequency.value = 2200;
    const wet = ctx.createGain();
    wet.gain.value = 0.32;
    makeup.connect(delay);
    delay.connect(fbLp).connect(fb).connect(delay);
    delay.connect(wet).connect(sirenBus);
    makeup.connect(sirenBus);

    const oscA = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscA.frequency.value = SIREN_TONES[0];
    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = SIREN_TONES[0] * 1.5;
    const oscBGain = ctx.createGain();
    oscBGain.gain.value = 0.42;
    oscA.connect(env);
    oscB.connect(oscBGain).connect(env);

    // deriva lenta de "motor" + temblor eléctrico de amplitud
    const drift = ctx.createOscillator();
    drift.type = 'sine';
    drift.frequency.value = 0.42;
    const driftAmp = ctx.createGain();
    driftAmp.gain.value = 7;
    drift.connect(driftAmp).connect(oscA.frequency);
    const flutter = ctx.createOscillator();
    flutter.type = 'sine';
    flutter.frequency.value = 6.4;
    const flutterAmp = ctx.createGain();
    flutterAmp.gain.value = 0.09;
    flutter.connect(flutterAmp).connect(env.gain);

    oscA.start();
    oscB.start();
    drift.start();
    flutter.start();

    sirenRef.current = {
      bus: sirenBus,
      oscA,
      oscB,
      env,
      timer: null,
      toneIndex: 0,
      currentFreq: SIREN_TONES[0],
    };

    // --- CRACKLE: bus (cada impulso lleva su propio filtro y envolvente) -----
    const crackleBus = ctx.createGain();
    crackleBus.gain.value = 0;
    crackleBus.connect(master);
    crackleRef.current = { bus: crackleBus, timer: null };

    // --- THUD: impactos graves espaciados ------------------------------------
    const thudBus = ctx.createGain();
    thudBus.gain.value = 0;
    thudBus.connect(master);
    thudRef.current = { bus: thudBus, timer: null };

    // --- BOOM de ruptura ------------------------------------------------------
    const boomBus = ctx.createGain();
    boomBus.gain.value = 0.5;
    boomBus.connect(master);
    boomRef.current = { bus: boomBus, fired: false };

    return ctx;
  };

  // --- schedulers (leen refs: nunca se quedan con closures obsoletas) ------
  const scheduleCrackle = (): void => {
    const c = ctxRef.current;
    const rig = crackleRef.current;
    if (!c || !rig) return;
    if (!crackleActiveRef.current) {
      rig.timer = null;
      return;
    }
    fireCrackle(c, rig.bus, noiseRef.current, levelRef.current);
    const lv = levelRef.current;
    rig.timer = window.setTimeout(scheduleCrackle, 80 + Math.random() * (720 - lv * 560));
  };

  const scheduleThud = (): void => {
    const c = ctxRef.current;
    const rig = thudRef.current;
    if (!c || !rig) return;
    if (!thudActiveRef.current) {
      rig.timer = null;
      return;
    }
    fireThud(c, rig.bus, noiseRef.current, levelRef.current);
    rig.timer = window.setTimeout(scheduleThud, 700 + Math.random() * 900 - levelRef.current * 300);
  };

  // --- estado playing: construir el grafo tras el primer gesto -------------
  useEffect(() => {
    if (!playing) return;
    const ctx = ensureGraph();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    masterRef.current?.gain.setTargetAtTime(mutedRef.current ? 0 : MASTER_LEVEL, ctx.currentTime, 0.2);
    if (boomRef.current) boomRef.current.fired = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // --- mudo: cortar master -------------------------------------------------
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    smooth(master.gain, muted ? 0 : MASTER_LEVEL, 0.15, ctx.currentTime);
    if (muted) stopSiren(sirenRef.current);
  }, [muted]);

  // --- intensidad/progreso: modular parámetros y disparar eventos ----------
  useEffect(() => {
    const ctx = ctxRef.current;
    const rumble = rumbleRef.current;
    const siren = sirenRef.current;
    const crackle = crackleRef.current;
    const thud = thudRef.current;
    const boom = boomRef.current;
    if (!ctx || !rumble || !siren || !crackle || !thud || !boom) return;

    const t = ctx.currentTime;
    const live = playing && !muted;
    const level = clamp01(intensity / 0.22);
    levelRef.current = level;

    // RUMBLE: ataque en la ruptura, decaimiento en las réplicas + apertura
    // progresiva de las capas de ruido según la intensidad.
    const attack = progress < 0.14 ? 0.25 : Math.min(1, (progress - 0.14) / 0.12);
    const release = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) / 0.13) : 1;
    smooth(rumble.bus.gain, live ? (0.36 * (0.35 + level * 0.65) * attack * release) : 0, 0.12, t);
    smooth(rumble.noiseMix.gain, live ? (0.3 + level * 0.7) * attack : 0, 0.25, t);
    smooth(rumble.oscFilter.frequency, 85 + level * 170, 0.22, t);
    smooth(rumble.noiseFilters[0].frequency, 75 + level * 150, 0.25, t);
    smooth(rumble.noiseFilters[1].frequency, 55 + level * 95, 0.25, t);
    smooth(rumble.noiseFilters[2].frequency, 35 + level * 30, 0.3, t);

    // SIRENA: aviso fuerte desde el instante 0 (1–2 s antes de la sacudida,
    // enlazando con la alerta de los personajes), atenúa al entrar la fuerte
    // y reaparece intermitente al evaluar.
    const warning = progress < 0.18;
    const alert = progress >= 0.18 && progress < 0.33;
    const coda = progress > 0.88 && progress < 0.985;
    const sirenWanted = live && (warning || alert || coda);
    smooth(
      siren.bus.gain,
      sirenWanted ? (warning ? 0.16 + level * 0.06 : alert ? 0.08 : 0.1) : 0,
      warning ? 0.3 : 0.22,
      t,
    );
    if (sirenWanted) {
      if (siren.timer === null) startSiren(ctx, siren);
    } else {
      stopSiren(siren);
    }

    // BOOM de ruptura: un solo disparo por corrida
    if (!playing || progress < 0.08) boom.fired = false;
    if (playing && !boom.fired && progress >= BOOM_WINDOW[0] && progress <= BOOM_WINDOW[1]) {
      boom.fired = true;
      fireBoom(ctx, boom.bus, noiseRef.current, level);
    }

    // CRACKLE: madera agrietándose durante la respuesta estructural
    const crackleActive = live && progress > 0.4 && progress < 0.88 && level > 0.2;
    smooth(crackle.bus.gain, crackleActive ? 0.07 + level * 0.12 : 0, 0.12, t);
    crackleActiveRef.current = crackleActive;
    if (crackleActive && crackle.timer === null) {
      crackle.timer = window.setTimeout(scheduleCrackle, 70);
    }

    // THUD: impactos espaciados durante la fase fuerte
    const thudActive = live && progress > 0.3 && progress < 0.85 && level > 0.2;
    smooth(thud.bus.gain, thudActive ? 0.5 : 0, 0.15, t);
    thudActiveRef.current = thudActive;
    if (thudActive && thud.timer === null) {
      thud.timer = window.setTimeout(scheduleThud, 450 + Math.random() * 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, progress, intensity, muted]);

  // --- limpieza total ------------------------------------------------------
  useEffect(
    () => () => {
      stopSiren(sirenRef.current);
      const crackle = crackleRef.current;
      if (crackle && crackle.timer !== null) {
        window.clearTimeout(crackle.timer);
        crackle.timer = null;
      }
      const thud = thudRef.current;
      if (thud && thud.timer !== null) {
        window.clearTimeout(thud.timer);
        thud.timer = null;
      }
      const ctx = ctxRef.current;
      ctxRef.current = null;
      masterRef.current = null;
      noiseRef.current = null;
      rumbleRef.current = null;
      sirenRef.current = null;
      crackleRef.current = null;
      thudRef.current = null;
      boomRef.current = null;
      if (ctx) void ctx.close().catch(() => undefined);
    },
    [],
  );
}
