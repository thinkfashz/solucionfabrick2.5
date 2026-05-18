'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fallbackVideoPlan } from '../templates/social-reel';
import type { GeneratedVideoPlan, VideoEngineInput } from '../types/video-engine.types';

export function useVideoEngine() {
  const [input, setInput] = useState<VideoEngineInput>({
    topic: 'Video promocional sobre ampliaciones en metalcon resistentes y modernas',
    kind: 'promotional',
    format: '9:16',
    duration: 30,
    audience: 'Dueños de casa que quieren ampliar o remodelar',
    visualStyle: 'dark_editorial',
    cta: 'Cotiza tu proyecto con Soluciones Fabrick',
  });
  const [plan, setPlan] = useState<GeneratedVideoPlan>(fallbackVideoPlan);
  const [runId, setRunId] = useState<string | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Autoplay ──
  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPlayTimer = useCallback(() => {
    if (playTimerRef.current !== null) {
      clearTimeout(playTimerRef.current);
      playTimerRef.current = null;
    }
  }, []);

  // Advance to next scene after its duration, then stop at the last
  useEffect(() => {
    if (!isPlaying || plan.scenes.length === 0) return;

    const scene = plan.scenes[activeSceneIndex];
    if (!scene) { setIsPlaying(false); return; }

    const durationMs = (scene.end - scene.start) * 1000;

    playTimerRef.current = setTimeout(() => {
      const next = activeSceneIndex + 1;
      if (next < plan.scenes.length) {
        setActiveSceneIndex(next);
      } else {
        setIsPlaying(false);
        setActiveSceneIndex(0);
      }
    }, durationMs);

    return clearPlayTimer;
  }, [isPlaying, activeSceneIndex, plan.scenes, clearPlayTimer]);

  function togglePlay() {
    if (isPlaying) {
      clearPlayTimer();
      setIsPlaying(false);
    } else {
      setActiveSceneIndex(0);
      setIsPlaying(true);
    }
  }

  async function generate() {
    setIsGenerating(true);
    setError(null);
    clearPlayTimer();
    setIsPlaying(false);

    try {
      const response = await fetch('/api/ai-video-engine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as {
        plan?: GeneratedVideoPlan;
        runId?: string | null;
        error?: string;
      };

      if (!response.ok || !data.plan) {
        throw new Error(data.error || 'No se pudo generar el plan de video.');
      }

      setPlan(data.plan);
      setRunId(data.runId ?? null);
      setActiveSceneIndex(0);
    } catch (currentError) {
      setError(
        currentError instanceof Error ? currentError.message : 'Error inesperado.',
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    input,
    setInput,
    plan,
    setPlan,
    runId,
    activeSceneIndex,
    setActiveSceneIndex,
    isGenerating,
    isPlaying,
    togglePlay,
    error,
    generate,
  };
}
