'use client';

import { useState } from 'react';
import { captureElementAsPng } from '../utils/capture-scene';
import type { GeneratedVideoPlan } from '../types/video-engine.types';

export function ExportPanel({ plan, activeSceneIndex, runId }: { plan: GeneratedVideoPlan; activeSceneIndex: number; runId: string | null }) {
  const [status, setStatus] = useState<string>('Listo para capturar la escena activa.');

  async function uploadActiveScene() {
    const element = document.getElementById('fabrick-video-preview-capture');
    const scene = plan.scenes[activeSceneIndex];

    if (!element || !scene) return;

    try {
      setStatus('Capturando escena...');
      const dataUrl = await captureElementAsPng(element);
      setStatus('Subiendo a Cloudinary...');

      const response = await fetch('/api/ai-video-engine/upload-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, videoTitle: plan.title, sceneId: scene.id, dataUrl }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'No se pudo subir.');
      setStatus(`Escena subida: ${data.url}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Error exportando la escena.');
    }
  }

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">Exportacion</p>
      <h3 className="mt-1 text-lg font-black text-white">Imagen a Cloudinary</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{status}</p>
      <button type="button" onClick={uploadActiveScene} className="mt-4 rounded-2xl border border-yellow-400/40 px-4 py-3 text-sm font-bold text-yellow-200 hover:bg-yellow-400/10">
        Exportar escena activa
      </button>
    </section>
  );
}
