'use client';

import { useEffect, useRef } from 'react';

/**
 * Audio inmersivo del sismo generado con Web Audio API (sin assets externos).
 *
 * Fases ligadas al `progress` de la simulación:
 * - AVISO (progress < .18): sirena de alerta civil que barre dos tonos con
 *   saturación suave (WaveShaper) y eco corto (delay con feedback).
 * - RUPTURA (~.18-.28): "boom" grave de energías liberadas (ruido + seno con
 *   envolvente exponencial) que impacta con la aparición de la fisura.
 * - SACUDIDA (.28-.85): rumble orgánico de 3 capas (ruido filtrado + 2 senos
 *   graves modulados en cruz) + crepitación de estructura con filtros que
 *   varían por impulso.
 * - RÉPLICAS (> .85): rumble decae y la sirena vuelve intermitente.
 *
 * Todo se crea bajo demanda tras un gesto del usuario (política autoplay), se
 * suspende al pausar/reiniciar y se destruye al desmontar.
 */

type SirenVoice = {
  oscA: OscillatorNode;
  oscB: OscillatorNode;
  gain: GainNode;
  lfo: OscillatorNode;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Curva de saturación suave tipo "amplificador barato" para la sirena. */
function makeSaturationCurve(amount = 4): Float32Array {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

export function useSeismicAudio(playing: boolean, progress: number, intensity: number, muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const rumbleRef = useRef<{ filter: BiquadFilterNode; gain: GainNode; sub: GainNode } | null>(null);
  const sirenRef = useRef<SirenVoice | null>(null);
  const crackleRef = useRef<{ filter: BiquadFilterNode; gain: GainNode; timer: number | null } | null>(null);
  const boomRef = useRef<{ played: boolean }>({ played: false });
  // Refs espejo para el scheduler de crackle (evitan closures viejas).
  const playingRef = useRef(false);
  const crackleActiveRef = useRef(false);
  const progressRef = useRef(0);

  // --- construcción del grafo de audio (una sola vez, tras primer gesto) ---
  const ensureGraph = () => {
    if (ctxRef.current) return ctxRef.current;
    const CtxCtor: typeof AudioContext | undefined =
      typeof window !== 'undefined'
        ? window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!CtxCtor) return null;
    const ctx = new CtxCtor();
    ctxRef.current = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    masterRef.current = master;

    // --- RUMBLE: ruido filtrado + 2 sub senos modulados en cruz ---
    // Piso de ruido blanco generado una vez (2 s en loop).
    const noiseBuffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 2), ctx.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
    const noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;
    noiseSrc.loop = true;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 130;
    rumbleFilter.Q.value = 0.7;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    noiseSrc.connect(rumbleFilter).connect(rumbleGain).connect(master);
    noiseSrc.start();

    // Modulación lenta del corte: el suelo "respira".
    const sweepLfo = ctx.createOscillator();
    sweepLfo.frequency.value = 0.23;
    const sweepAmp = ctx.createGain();
    sweepAmp.gain.value = 55;
    sweepLfo.connect(sweepAmp).connect(rumbleFilter.frequency);
    sweepLfo.start();

    // Sub-senos graves desfasados (38 Hz + 57 Hz) con amplitudes cruzadas.
    const sub = ctx.createGain();
    sub.gain.value = 0;
    sub.connect(master);
    const subs = [38, 57].map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.31 + i * 0.19;
      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = 0.5;
      // Amplitud modulada (no frecuencia): los dos "respiran" en contrafase.
      const vca = ctx.createGain();
      vca.gain.value = i === 0 ? 0.5 : 0.75;
      lfo.connect(lfoAmp).connect(vca.gain);
      lfo.start();
      osc.connect(vca).connect(sub);
      osc.start();
      return osc;
    });
    rumbleRef.current = { filter: rumbleFilter, gain: rumbleGain, sub };
    void subs;

    // --- SIRENA de alerta civil: 2 tonos + saturación + eco corto ---
    const sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    // Saturador suave.
    const shaper = ctx.createWaveShaper();
    shaper.curve = makeSaturationCurve(3.2) as Float32Array<ArrayBuffer>;
    // Eco corto tipo calle (delay 220 ms, feedback bajo).
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.22;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const delayMix = ctx.createGain();
    delayMix.gain.value = 0.35;
    // Filtro tras el eco: apaga los armónicos para que el eco se aleje.
    const ecoTone = ctx.createBiquadFilter();
    ecoTone.type = 'lowpass';
    ecoTone.frequency.value = 1600;

    sirenGain.connect(shaper);
    shaper.connect(master);
    shaper.connect(delay);
    delay.connect(ecoTone).connect(feedback).connect(delay);
    ecoTone.connect(delayMix).connect(master);

    // Portadora: seno + segundo armónico afinado (quinta) para sonido "eléctrico".
    const oscA = ctx.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 585;
    const oscB = ctx.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 877; // ~quinta justa arriba
    const oscBGain = ctx.createGain();
    oscBGain.gain.value = 0.3;
    // Barrido lento de frecuencia tipo wail (±140 Hz, 0.6 Hz).
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(oscA.frequency);
    lfoGain.connect(oscB.frequency);
    oscA.connect(sirenGain);
    oscB.connect(oscBGain).connect(sirenGain);
    oscA.start();
    oscB.start();
    lfo.start();
    sirenRef.current = { oscA, oscB, gain: sirenGain, lfo };

    // --- CRACKLE: impulsos de ruido banda-media (estructura agrietándose) ---
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.value = 1500;
    crackleFilter.Q.value = 1.2;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0;
    crackleFilter.connect(crackleGain).connect(master);
    crackleRef.current = { filter: crackleFilter, gain: crackleGain, timer: null };

    return ctx;
  };

  // --- estado playing: abrir/cerrar gradas de volumen ---
  useEffect(() => {
    if (!playing) {
      const ctx = ctxRef.current;
      const master = masterRef.current;
      if (ctx && master) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
      }
      const siren = sirenRef.current;
      if (ctx && siren) siren.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      playingRef.current = false;
      return;
    }
    const ctx = ensureGraph();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    playingRef.current = true;
    boomRef.current.played = false;
    masterRef.current?.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.2);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // --- mudo: cortar master ---
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.15);
  }, [muted]);

  // --- BOOM de ruptura: transitorio grave de impacto ---
  const playBoom = () => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    const t = ctx.currentTime;
    // Capa 1: seno grave que cae en frecuencia (thump).
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(92, t);
    osc.frequency.exponentialRampToValueAtTime(28, t + 0.9);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.exponentialRampToValueAtTime(1.1, t + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
    osc.connect(env).connect(master);
    osc.start(t);
    osc.stop(t + 1.5);
    // Capa 2: ruido filtrado que estalla y se ahoga (escombro).
    const src = ctx.createBufferSource();
    const dur = 0.7;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    src.buffer = buffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(90, t + dur);
    const nEnv = ctx.createGain();
    nEnv.gain.setValueAtTime(0.5, t);
    nEnv.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(lp).connect(nEnv).connect(master);
    src.start(t);
    src.stop(t + dur);
  };

  // --- intensidad/progreso: modular parámetros ---
  useEffect(() => {
    const ctx = ctxRef.current;
    const rumble = rumbleRef.current;
    const siren = sirenRef.current;
    const crackle = crackleRef.current;
    if (!ctx || !rumble || !siren || !crackle) return;

    const t = ctx.currentTime;
    const level = clamp01(intensity / 0.22);
    const live = playing && !muted;
    progressRef.current = progress;

    // BOOM: dispara una sola vez al entrar en la fase de ruptura.
    if (live && !boomRef.current.played && progress >= 0.17) {
      boomRef.current.played = true;
      playBoom();
    }

    // SIRENA: aviso fuerte al inicio (como los personajes en estado alert) y
    // réplica intermitente al final; silencio en la fase fuerte (la tapa el rumble).
    const sirenTarget = !live
      ? 0
      : progress < 0.18
        ? 0.16 + level * 0.06
        : progress > 0.88 && progress < 0.985
          ? 0.1
          : 0;
    siren.gain.gain.setTargetAtTime(sirenTarget, t, 0.22);

    // RUMBLE: 3 capas con envolvente de ataque en la ruptura.
    const attack = progress < 0.14 ? 0.25 : Math.min(1, (progress - 0.14) / 0.12);
    const release = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) / 0.13) : 1;
    const rumbleTarget = live ? (0.16 + level * 0.62) * attack * release : 0;
    const subTarget = live ? (0.2 + level * 0.75) * attack * release : 0;
    rumble.gain.gain.setTargetAtTime(rumbleTarget, t, 0.14);
    rumble.sub.gain.setTargetAtTime(subTarget, t, 0.16);
    rumble.filter.frequency.setTargetAtTime(85 + level * 150, t, 0.25);

    // CRACKLE: solo en la respuesta estructural con nivel alto.
    const crackleActive = live && progress > 0.4 && progress < 0.88 && level > 0.22;
    crackle.gain.gain.setTargetAtTime(crackleActive ? 0.06 + level * 0.11 : 0, t, 0.12);
    if (crackleActive && crackle.timer === null) {
      const schedule = () => {
        const c = ctxRef.current;
        const cr = crackleRef.current;
        if (!c || !cr) return;
        if (!playingRef.current || !crackleActiveRef.current) {
          cr.timer = null;
          return;
        }
        const dur = 0.025 + Math.random() * 0.06;
        const env = c.createGain();
        env.gain.setValueAtTime(0.5 + Math.random() * 0.7, c.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        // Filtro variable por impulso: madera seca vs revestimiento.
        const bp = c.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 700 + Math.random() * 2600;
        bp.Q.value = 0.8 + Math.random() * 1.6;
        const noise = c.createBufferSource();
        const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        noise.connect(env).connect(bp).connect(cr.filter);
        noise.start();
        cr.timer = window.setTimeout(schedule, 110 + Math.random() * (950 - level * 750));
      };
      crackle.timer = window.setTimeout(schedule, 60);
    }

    playingRef.current = playing;
    crackleActiveRef.current = crackleActive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, progress, intensity, muted]);

  // --- limpieza total ---
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx) void ctx.close().catch(() => undefined);
      if (crackleRef.current?.timer !== null && crackleRef.current) {
        window.clearTimeout(crackleRef.current.timer!);
      }
      ctxRef.current = null;
      masterRef.current = null;
      rumbleRef.current = null;
      sirenRef.current = null;
      crackleRef.current = null;
    };
  }, []);
}
