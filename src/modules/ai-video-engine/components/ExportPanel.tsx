'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Mic, MicOff, Upload, Video } from 'lucide-react';
import { captureElementAsPng } from '../utils/capture-scene';
import type { GeneratedVideoPlan } from '../types/video-engine.types';
import { downloadBlob, isSpeechSupported, recordPlanAsWebM, speakText, stopSpeech } from '../production';
import type { RecordProgress } from '../production';

type CloudinaryStatus = 'idle' | 'capturing' | 'uploading' | 'done' | 'error';
type RecordStatus = 'idle' | 'recording' | 'done' | 'error';

export function ExportPanel({
  plan,
  activeSceneIndex,
  runId,
}: {
  plan: GeneratedVideoPlan;
  activeSceneIndex: number;
  runId: string | null;
}) {
  // ── Cloudinary PNG export ──
  const [cloudStatus, setCloudStatus] = useState<CloudinaryStatus>('idle');
  const [cloudUrl, setCloudUrl] = useState<string | null>(null);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [cloudCustomName, setCloudCustomName] = useState('');

  // ── WebM video recording ──
  const [recordStatus, setRecordStatus] = useState<RecordStatus>('idle');
  const [recordProgress, setRecordProgress] = useState<RecordProgress | null>(null);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordBlobRef, setRecordBlobRef] = useState<Blob | null>(null);
  const [recordBlobUrl, setRecordBlobUrl] = useState<string | null>(null);
  const abortRef = useRef(false);

  // Revoke object URL on unmount or when a new recording replaces it
  useEffect(() => {
    return () => {
      if (recordBlobUrl) URL.revokeObjectURL(recordBlobUrl);
    };
  }, [recordBlobUrl]);

  // ── Web Speech voiceover ──
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSupported = typeof window !== 'undefined' ? isSpeechSupported() : false;

  // Stop speech on unmount
  useEffect(() => () => { stopSpeech(); }, []);

  const scene = plan.scenes[activeSceneIndex];
  const canExport = plan.scenes.length > 0;

  // ── Cloudinary PNG upload (existing route) ──
  async function uploadActiveScene() {
    const element = document.getElementById('fabrick-video-preview-capture');
    if (!element || !scene) return;

    setCloudStatus('capturing');
    setCloudUrl(null);
    setCloudError(null);

    try {
      const dataUrl = await captureElementAsPng(element);
      setCloudStatus('uploading');

      const response = await fetch('/api/ai-video-engine/upload-cloudinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          videoTitle: cloudCustomName.trim() || plan.title,
          sceneId: scene.id,
          dataUrl,
        }),
      });

      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || 'No se pudo subir.');
      setCloudUrl(data.url);
      setCloudStatus('done');
    } catch (err) {
      setCloudError(err instanceof Error ? err.message : 'Error subiendo la escena.');
      setCloudStatus('error');
    }
  }

  // ── WebM video recording (Canvas + MediaRecorder) ──
  async function startRecording() {
    if (!canExport) return;
    abortRef.current = false;
    setRecordStatus('recording');
    setRecordProgress(null);
    setRecordError(null);

    try {
      const blob = await recordPlanAsWebM(plan, (p) => {
        setRecordProgress(p);
      });

      if (abortRef.current) return;

      const safeTitle = plan.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'video';
      const filename = `${safeTitle}-${plan.format.replace(':', 'x')}.webm`;

      // Store blob + URL for inline playback
      if (recordBlobUrl) URL.revokeObjectURL(recordBlobUrl);
      const url = URL.createObjectURL(blob);
      setRecordBlobRef(blob);
      setRecordBlobUrl(url);

      downloadBlob(blob, filename);
      setRecordStatus('done');
    } catch (err) {
      setRecordError(err instanceof Error ? err.message : 'Error grabando el video.');
      setRecordStatus('error');
    }
  }

  function cancelRecording() {
    abortRef.current = true;
    setRecordStatus('idle');
    setRecordProgress(null);
    if (recordBlobUrl) URL.revokeObjectURL(recordBlobUrl);
    setRecordBlobUrl(null);
    setRecordBlobRef(null);
  }

  // ── Voiceover preview ──
  function handleVoiceover() {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    if (!scene) return;
    setIsSpeaking(true);
    speakText(scene.voiceover, {
      lang: 'es-CL',
      onEnd: () => setIsSpeaking(false),
    });
  }

  function handleFullVoiceover() {
    if (isSpeaking) {
      stopSpeech();
      setIsSpeaking(false);
      return;
    }
    const fullText = plan.scenes.map((s) => s.voiceover).join(' … ');
    setIsSpeaking(true);
    speakText(fullText, {
      lang: 'es-CL',
      rate: 0.9,
      onEnd: () => setIsSpeaking(false),
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.26em] text-zinc-600">Exportar</p>
      </div>

      {/* ── Video recording ── */}
      <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
        <div className="flex items-center gap-2">
          <Video className="h-3.5 w-3.5 text-yellow-400" />
          <p className="text-[11px] font-bold text-zinc-300">Grabar video WebM</p>
        </div>
        <p className="text-[10px] leading-relaxed text-zinc-700">
          Graba todas las escenas animadas como un archivo <code className="text-zinc-500">.webm</code> descargable.
          {plan.duration ? ` (~${plan.duration}s de grabación)` : ''}
        </p>

        {recordStatus === 'recording' && recordProgress && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-zinc-600">
              <span>Escena {recordProgress.scene}/{recordProgress.totalScenes} · {recordProgress.status}</span>
              <span className="tabular-nums">{recordProgress.percent}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-yellow-400 transition-all duration-300"
                style={{ width: `${recordProgress.percent}%` }}
              />
            </div>
          </div>
        )}

        {recordStatus === 'done' && recordBlobUrl && (
          <div className="space-y-2">
            <video
              src={recordBlobUrl}
              controls
              playsInline
              className="w-full rounded-xl border border-emerald-400/20 shadow-lg"
              style={{ maxHeight: '240px' }}
            />
            <button
              type="button"
              onClick={() => {
                if (recordBlobRef) {
                  const safeTitle = plan.title
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '') || 'video';
                  downloadBlob(recordBlobRef, `${safeTitle}-${plan.format.replace(':', 'x')}.webm`);
                }
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] font-bold text-emerald-300 transition hover:bg-emerald-400/10"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar .webm
            </button>
          </div>
        )}

        {recordStatus === 'error' && recordError && (
          <p className="text-[10px] text-red-400">{recordError}</p>
        )}

        <div className="flex gap-2">
          {recordStatus === 'recording' ? (
            <button
              type="button"
              onClick={cancelRecording}
              className="flex items-center gap-1.5 rounded-xl border border-red-400/20 bg-red-500/5 px-3 py-2 text-[10px] font-bold text-red-400 transition hover:bg-red-500/10"
            >
              Cancelar
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={!canExport}
              className="flex items-center gap-1.5 rounded-xl border border-yellow-400/30 bg-yellow-400/8 px-3 py-2 text-[10px] font-bold text-yellow-300 transition hover:bg-yellow-400/15 disabled:opacity-40"
            >
              <Video className="h-3.5 w-3.5" />
              {recordStatus === 'done' ? 'Grabar de nuevo' : 'Grabar video'}
            </button>
          )}
        </div>
      </div>

      {/* ── Cloudinary PNG upload ── */}
      <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
        <div className="flex items-center gap-2">
          <Upload className="h-3.5 w-3.5 text-sky-400" />
          <p className="text-[11px] font-bold text-zinc-300">Subir escena a Cloudinary</p>
        </div>
        <p className="text-[10px] text-zinc-700">
          {scene ? `Escena ${scene.id} · ${scene.start}s–${scene.end}s` : 'Selecciona una escena'}
        </p>

        {/* Custom filename */}
        <input
          type="text"
          placeholder={`Nombre personalizado (por defecto: ${plan.title || 'escena'})`}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] text-white outline-none transition focus:border-sky-400/40 placeholder:text-zinc-700"
          value={cloudCustomName}
          onChange={(e) => setCloudCustomName(e.target.value)}
        />

        {cloudStatus === 'done' && cloudUrl && (
          <div className="space-y-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-2 text-[10px]">
            <p className="font-bold text-emerald-400">Subida exitosa</p>
            <img
              src={cloudUrl}
              alt="Escena subida"
              className="w-full rounded-lg border border-white/10 object-cover"
              style={{ maxHeight: '160px' }}
            />
            <a
              href={cloudUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-emerald-300/60 underline hover:text-emerald-300"
            >
              {cloudUrl}
            </a>
          </div>
        )}

        {cloudStatus === 'error' && cloudError && (
          <p className="text-[10px] text-red-400">{cloudError}</p>
        )}

        <button
          type="button"
          onClick={uploadActiveScene}
          disabled={!canExport || cloudStatus === 'capturing' || cloudStatus === 'uploading'}
          className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold text-zinc-400 transition hover:border-sky-400/30 hover:text-sky-300 disabled:opacity-40"
        >
          {cloudStatus === 'capturing' || cloudStatus === 'uploading' ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              {cloudStatus === 'capturing' ? 'Capturando…' : 'Subiendo…'}
            </>
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              {cloudStatus === 'done' ? 'Subir otra' : 'Subir a Cloudinary'}
            </>
          )}
        </button>
      </div>

      {/* ── Voiceover preview ── */}
      {speechSupported && (
        <div className="space-y-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
          <div className="flex items-center gap-2">
            <Mic className="h-3.5 w-3.5 text-purple-400" />
            <p className="text-[11px] font-bold text-zinc-300">Voiceover preview</p>
          </div>
          <p className="text-[10px] text-zinc-700">Escucha el guión con la voz del navegador (Web Speech API)</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleVoiceover}
              disabled={!scene}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-bold transition disabled:opacity-40 ${
                isSpeaking
                  ? 'border-red-400/20 bg-red-500/5 text-red-400 hover:bg-red-500/10'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:border-purple-400/30 hover:text-purple-300'
              }`}
            >
              {isSpeaking ? <><MicOff className="h-3.5 w-3.5" /> Detener</> : <><Mic className="h-3.5 w-3.5" /> Escena actual</>}
            </button>
            <button
              type="button"
              onClick={handleFullVoiceover}
              disabled={plan.scenes.length === 0}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px] font-bold text-zinc-500 transition hover:border-purple-400/20 hover:text-purple-300 disabled:opacity-40"
            >
              Todo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
