'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';
import { captureElementAsPng } from '../utils/capture-scene';
import type { GeneratedVideoPlan } from '../types/video-engine.types';

export function ExportPanel({
  plan,
  activeSceneIndex,
  runId,
}: {
  plan: GeneratedVideoPlan;
  activeSceneIndex: number;
  runId: string | null;
}) {
  const [status, setStatus] = useState<'idle' | 'capturing' | 'uploading' | 'done' | 'error'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function uploadActiveScene() {
    const element = document.getElementById('fabrick-video-preview-capture');
    const scene = plan.scenes[activeSceneIndex];
    if (!element || !scene) return;

    setStatus('capturing');
    setResultUrl(null);
    setErrorMsg(null);

    try {
      const dataUrl = await captureElementAsPng(element);
      setStatus('uploading');

      const response = await fetch('/api/ai-video-engine/upload-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, videoTitle: plan.title, sceneId: scene.id, dataUrl }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'No se pudo subir.');
      setResultUrl(data.url);
      setStatus('done');
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Error exportando la escena.');
      setStatus('error');
    }
  }

  const canExport = plan.scenes.length > 0;
  const scene = plan.scenes[activeSceneIndex];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-600">Exportar</p>
        <p className="mt-0.5 text-[11px] text-zinc-500">
          {scene ? `Escena ${scene.id} · ${scene.start}s–${scene.end}s` : 'Selecciona una escena'}
        </p>
      </div>

      <button
        type="button"
        onClick={uploadActiveScene}
        disabled={!canExport || status === 'capturing' || status === 'uploading'}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-2.5 text-[11px] font-bold text-zinc-300 transition hover:border-yellow-400/30 hover:bg-yellow-400/5 hover:text-yellow-200 disabled:opacity-40"
      >
        {status === 'capturing' || status === 'uploading' ? (
          <>
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            {status === 'capturing' ? 'Capturando…' : 'Subiendo…'}
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" />
            Subir a Cloudinary
          </>
        )}
      </button>

      {status === 'done' && resultUrl && (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-2.5 text-[10px]">
          <p className="font-bold text-emerald-400">Subida exitosa</p>
          <a
            href={resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-emerald-300/70 underline"
          >
            {resultUrl}
          </a>
        </div>
      )}

      {status === 'error' && errorMsg && (
        <p className="rounded-xl border border-red-400/20 bg-red-500/5 p-2.5 text-[10px] text-red-300">
          {errorMsg}
        </p>
      )}
    </div>
  );
}
