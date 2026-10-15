'use client';

import { useEffect, useRef } from 'react';

/**
 * Audio inmersivo del sismo generado con Web Audio API (sin assets externos).
 *
 * - Rumble grave continuo (ruido filtrado pasa-bajos) proporcional a la intensidad.
 * - Sirena de alerta civil tipo "wail" ( barrido de frecuencia ) que entra al
 *   inicio del sismo y se apaga al terminar.
 * - Cracking/crepitación opcional (impulsos de ruido) durante la respuesta.
 *
 * Todo se crea bajo demanda tras un gesto del usuario (política autoplay), se
 * suspende al pausar/reiniciar y se destruye al desmontar.
 */

type RumbleVoice = {
  osc: OscillatorNode;
  gain: GainNode;
};

type SirenVoice = {
  osc: OscillatorNode;
  lfo: OscillatorNode;
  lfoGain: GainNode;
  gain: GainNode;
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function useSeismicAudio(playing: boolean, progress: number, intensity: number, muted: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);
  const rumbleRef = useRef<{ filter: BiquadFilterNode; gain: GainNode; voices: RumbleVoice[] } | null>(null);
  const sirenRef = useRef<SirenVoice | null>(null);
  const crackleRef = useRef<{ filter: BiquadFilterNode; gain: GainNode; timer: number | null } | null>(null);
  const startedRef = useRef(false);
  // Refs espejo para el scheduler de crackle (evita closures viejas).
  const playingRef = useRef(false);
  const crackleActiveRef = useRef(false);

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

    // --- Rumble: dos osciladores graves + ruido filtrado ---
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 140;
    rumbleFilter.Q.value = 0.8;
    const rumbleGain = ctx.createGain();
    rumbleGain.gain.value = 0;
    rumbleFilter.connect(rumbleGain).connect(master);

    const voices: RumbleVoice[] = [38, 57].map((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'sawtooth' : 'sine';
      osc.frequency.value = freq;
      // Frecuencia modulada lentamente para simular el movimiento del suelo.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.35 + i * 0.22;
      const lfoAmp = ctx.createGain();
      lfoAmp.gain.value = 4 + i * 3;
      lfo.connect(lfoAmp).connect(osc.frequency);
      lfo.start();
      const gain = ctx.createGain();
      gain.gain.value = i === 0 ? 0.55 : 0.8;
      osc.connect(gain).connect(rumbleFilter);
      osc.start();
      return { osc, gain };
    });
    rumbleRef.current = { filter: rumbleFilter, gain: rumbleGain, voices };

    // --- Sirena tipo wail: seno con LFO de frecuencia + ganancia ---
    const sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenGain.connect(master);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = 620;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.55; // barrido lento tipo sirena civil
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 240;
    lfo.connect(lfoGain).connect(osc.frequency);
    // Armónico para que suene más "eléctrico"
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 930;
    const gain2 = ctx.createGain();
    gain2.gain.value = 0.35;
    osc.connect(sirenGain);
    osc2.connect(gain2).connect(sirenGain);
    osc.start();
    osc2.start();
    lfo.start();
    sirenRef.current = { osc, lfo, lfoGain, gain: sirenGain };

    // --- Crackle: impulsos de ruido pasa-altos (estructura agrietándose) ---
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.value = 1800;
    crackleFilter.Q.value = 1.4;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0;
    crackleFilter.connect(crackleGain).connect(master);
    crackleRef.current = { filter: crackleFilter, gain: crackleGain, timer: null };

    return ctx;
  };

  // --- estado playing: abrir/cerrar gradas de volumen ---
  useEffect(() => {
    if (!playing) {
      // Fade out suave al pausar/terminar.
      const ctx = ctxRef.current;
      const master = masterRef.current;
      if (ctx && master) {
        master.gain.cancelScheduledValues(ctx.currentTime);
        master.gain.setTargetAtTime(0, ctx.currentTime, 0.35);
      }
      // Parar sirena.
      const siren = sirenRef.current;
      if (ctx && siren) siren.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
      startedRef.current = false;
      return;
    }
    const ctx = ensureGraph();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    startedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // --- mudo: cortar master ---
  useEffect(() => {
    const ctx = ctxRef.current;
    const master = masterRef.current;
    if (!ctx || !master) return;
    master.gain.setTargetAtTime(muted ? 0 : 0.6, ctx.currentTime, 0.15);
  }, [muted]);

  // --- intensidad/progreso por frame: modular parámetros ---
  useEffect(() => {
    const ctx = ctxRef.current;
    const rumble = rumbleRef.current;
    const siren = sirenRef.current;
    const crackle = crackleRef.current;
    if (!ctx || !rumble || !siren || !crackle) return;

    const t = ctx.currentTime;
    const playingGain = playing && !muted ? 0.6 : 0;
    // intensidad 0..~0.3 (shakeIntensity viene como response*.22)
    const level = clamp01(intensity / 0.22);

    // Fase de la sirena: suena al inicio (progress < .35) y de forma intermitente al final.
    const sirenTarget =
      playing && !muted && (progress < 0.3 || (progress > 0.92 && progress < 0.99))
        ? 0.12 + level * 0.08
        : 0;
    siren.gain.gain.setTargetAtTime(sirenTarget, t, 0.25);

    // Rumble proporcional al nivel sísmico + subida general al estar sonando.
    const rumbleTarget = playingGain * (0.18 + level * 0.75);
    rumble.gain.gain.setTargetAtTime(rumbleTarget, t, 0.12);
    rumble.filter.frequency.setTargetAtTime(90 + level * 160, t, 0.2);

    // Crackle solo en la respuesta estructural (0.45..0.9) con intensidad alta.
    const crackleActive = playing && !muted && progress > 0.45 && progress < 0.9 && level > 0.25;
    const crackleTarget = crackleActive ? 0.05 + level * 0.1 : 0;
    crackle.gain.gain.setTargetAtTime(crackleTarget, t, 0.15);
    if (crackleActive && crackle.timer === null) {
      // Programar impulsos irregulares.
      const schedule = () => {
        const c = ctxRef.current;
        const cr = crackleRef.current;
        if (!c || !cr) return;
        if (!playingRef.current || !crackleActiveRef.current) {
          cr.timer = null;
          return;
        }
        const dur = 0.03 + Math.random() * 0.07;
        const env = c.createGain();
        env.gain.setValueAtTime(0.6 + Math.random() * 0.6, c.currentTime);
        env.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
        const noise = c.createBufferSource();
        const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        noise.connect(env).connect(cr.filter);
        noise.start();
        cr.timer = window.setTimeout(schedule, 120 + Math.random() * (900 - level * 700));
      };
      crackle.timer = window.setTimeout(schedule, 60);
    }

    playingRef.current = playing;
    crackleActiveRef.current = crackleActive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, progress, intensity, muted]);

  // refs espejo para el scheduler
  // (declarados arriba junto a los demás refs)

  // --- limpieza total ---
  useEffect(() => {
    return () => {
      const ctx = ctxRef.current;
      if (ctx) void ctx.close().catch(() => undefined);
      ctxRef.current = null;
      masterRef.current = null;
      rumbleRef.current = null;
      sirenRef.current = null;
      if (crackleRef.current?.timer !== null && crackleRef.current) {
        window.clearTimeout(crackleRef.current.timer!);
      }
      crackleRef.current = null;
    };
  }, []);
}
