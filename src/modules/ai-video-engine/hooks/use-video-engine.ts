'use client';

import { useState } from 'react';

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
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai-video-engine/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = (await response.json()) as { plan?: GeneratedVideoPlan; error?: string };

      if (!response.ok || !data.plan) {
        throw new Error(data.error || 'No se pudo generar el plan de video.');
      }

      setPlan(data.plan);
      setActiveSceneIndex(0);
    } catch (currentError) {
      const message = currentError instanceof Error ? currentError.message : 'Error inesperado.';
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    input,
    setInput,
    plan,
    setPlan,
    activeSceneIndex,
    setActiveSceneIndex,
    isGenerating,
    error,
    generate,
  };
}
