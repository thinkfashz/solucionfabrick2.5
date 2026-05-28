'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Loader2,
  RefreshCw,
  UploadCloud,
  Video,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';

type UploadedAsset = { url: string; path: string; warning?: string };
type UploadAttempt = {
  id: string;
  name: string;
  size: number;
  status: 'success' | 'failed';
  method: 'cloudinary-video' | 'cloudinary-auto' | 'manual';
  message: string;
  url?: string;
  created_at: string;
};
type CloudinaryUploadResponse = {
  secure_url?: string;
  url?: string;
  public_id?: string;
  resource_type?: string;
  bytes?: number;
  format?: string;
  error?: { message?: string };
};

const HISTORY_KEY = 'sf_presupuesto_videos_history_v1';
const CLOUDINARY_SETTINGS_KEY = 'sf_presupuesto_videos_cloudinary_v1';
const MB = 1024 * 1024;
const VERCEL_SOFT_LIMIT_MB = 4.5;

function fileSize(size?: number | null) {
  if (!size) return '—';
  return `${(size / MB).toFixed(2)} MB`;
}

function readHistory(): UploadAttempt[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHistory(items: UploadAttempt[]) {
  if (typeof window !== 'undefined')
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 80)));
}

function attemptId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function readCloudinarySettings() {
  if (typeof window === 'undefined')
    return { cloudName: '', uploadPreset: '', folder: 'presupuestos/videos' };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CLOUDINARY_SETTINGS_KEY) || '{}');
    return {
      cloudName: parsed.cloudName || '',
      uploadPreset: parsed.uploadPreset || '',
      folder: parsed.folder || 'presupuestos/videos',
    };
  } catch {
    return { cloudName: '', uploadPreset: '', folder: 'presupuestos/videos' };
  }
}

function saveCloudinarySettings(settings: {
  cloudName: string;
  uploadPreset: string;
  folder: string;
}) {
  if (typeof window !== 'undefined')
    window.localStorage.setItem(CLOUDINARY_SETTINGS_KEY, JSON.stringify(settings));
}

function filenameLabel(name?: string) {
  return (name || 'Video').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
}

export default function PresupuestoVideosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [cloudUploading, setCloudUploading] = useState(false);
  const [result, setResult] = useState<UploadedAsset | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<UploadAttempt[]>([]);
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');
  const [cloudFolder, setCloudFolder] = useState('presupuestos/videos');
  const [manualUrl, setManualUrl] = useState('');
  const [manualName, setManualName] = useState('Video manual');

  useEffect(() => {
    setHistory(readHistory());
    const settings = readCloudinarySettings();
    setCloudName(settings.cloudName);
    setUploadPreset(settings.uploadPreset);
    setCloudFolder(settings.folder);
  }, []);

  const failedHistory = useMemo(() => history.filter((item) => item.status === 'failed'), [history]);
  const successHistory = useMemo(
    () => history.filter((item) => item.status === 'success'),
    [history],
  );

  function addAttempt(attempt: UploadAttempt) {
    const next = [attempt, ...readHistory()].slice(0, 80);
    writeHistory(next);
    setHistory(next);
  }

  function selectedFileOrWarn() {
    if (!file) {
      setMessage('Selecciona primero un archivo de video (.mp4, .mov, .webm, .avi, .mkv).');
      return null;
    }
    return file;
  }

  async function sendCloudinaryUpload(
    resourceType: 'video' | 'auto',
    selectedFile: File,
    cleanCloudName: string,
    cleanPreset: string,
    cleanFolder: string,
  ) {
    const form = new FormData();
    form.append('file', selectedFile);
    form.append('upload_preset', cleanPreset);
    form.append('folder', cleanFolder);
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cleanCloudName)}/${resourceType}/upload`;
    const res = await fetch(endpoint, { method: 'POST', body: form });
    const json = (await res.json().catch(() => ({}))) as CloudinaryUploadResponse;
    if (!res.ok || !json.secure_url)
      throw new Error(json.error?.message || `Cloudinary ${resourceType} Error ${res.status}`);
    return json;
  }

  async function uploadDirectToCloudinary() {
    const selectedFile = selectedFileOrWarn();
    if (!selectedFile) return;
    const cleanCloudName = cloudName.trim();
    const cleanPreset = uploadPreset.trim();
    const cleanFolder = cloudFolder.trim() || 'presupuestos/videos';
    if (!cleanCloudName || !cleanPreset) {
      setMessage('Completa Cloud name y Upload preset unsigned para subir directo a Cloudinary.');
      return;
    }
    saveCloudinarySettings({ cloudName: cleanCloudName, uploadPreset: cleanPreset, folder: cleanFolder });
    setCloudUploading(true);
    setResult(null);
    setMessage('Subiendo directo a Cloudinary. Primero intento VIDEO; si falla, intento AUTO...');
    let videoError = '';
    try {
      let json: CloudinaryUploadResponse;
      let method: UploadAttempt['method'] = 'cloudinary-video';
      try {
        json = await sendCloudinaryUpload('video', selectedFile, cleanCloudName, cleanPreset, cleanFolder);
      } catch (err) {
        videoError = (err as Error).message;
        setMessage(`VIDEO falló: ${videoError}. Intentando AUTO...`);
        json = await sendCloudinaryUpload('auto', selectedFile, cleanCloudName, cleanPreset, cleanFolder);
        method = 'cloudinary-auto';
      }
      const uploaded: UploadedAsset = {
        url: json.secure_url || json.url || '',
        path: json.public_id || selectedFile.name,
      };
      setResult(uploaded);
      addAttempt({
        id: attemptId(),
        name: selectedFile.name,
        size: selectedFile.size,
        status: 'success',
        method,
        message: videoError
          ? `VIDEO falló (${videoError}), AUTO funcionó.`
          : 'Subido directo a Cloudinary correctamente.',
        url: uploaded.url,
        created_at: new Date().toISOString(),
      });
      setMessage(
        `Video subido a Cloudinary por ${method === 'cloudinary-auto' ? 'AUTO' : 'VIDEO'}. Copia la URL para usarla en el presupuesto.`,
      );
    } catch (err) {
      const msg = (err as Error).message;
      const detail = videoError ? `VIDEO: ${videoError} | AUTO: ${msg}` : msg;
      addAttempt({
        id: attemptId(),
        name: selectedFile.name,
        size: selectedFile.size,
        status: 'failed',
        method: 'cloudinary-auto',
        message: detail,
        created_at: new Date().toISOString(),
      });
      setMessage(`No se pudo subir a Cloudinary. ${detail}`);
    } finally {
      setCloudUploading(false);
    }
  }

  function saveManualUrl() {
    const clean = manualUrl.trim();
    if (!clean) {
      setMessage('Pega primero una URL pública de Cloudinary u otro almacenamiento.');
      return;
    }
    const uploaded: UploadedAsset = {
      url: clean,
      path: manualName || 'video-manual',
    };
    setResult(uploaded);
    addAttempt({
      id: attemptId(),
      name: manualName || 'Video manual',
      size: 0,
      status: 'success',
      method: 'manual',
      message: 'URL manual guardada.',
      url: clean,
      created_at: new Date().toISOString(),
    });
    setMessage('URL manual guardada. Puedes copiarla para insertarla en el presupuesto.');
  }

  async function copyText(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  function clearFailed() {
    const next = readHistory().filter((item) => item.status !== 'failed');
    writeHistory(next);
    setHistory(next);
  }

  function deleteAttempt(id: string) {
    const next = readHistory().filter((item) => item.id !== id);
    writeHistory(next);
    setHistory(next);
  }

  function cloneAttempt(item: UploadAttempt) {
    if (item.url) setManualUrl(item.url);
    setManualName(`${item.name} copia`);
    setMessage('Registro clonado al campo URL manual. Puedes editarlo y guardarlo.');
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Presupuestos · multimedia"
        title="Videos"
        description="Sube videos de presentación a Cloudinary y copia la URL para insertarla en un presupuesto."
        icon={Video}
        actions={
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/admin/presupuestos">Volver a presupuestos</Link>
          </Button>
        }
      />
      <AdminMotion>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">

          {/* ── Left column ──────────────────────────────────────────────── */}
          <div className="grid gap-5">

            {/* Upload form */}
            <AdminCard glow className="p-5 sm:p-6">
              <div className="rounded-[1.75rem] border border-dashed border-yellow-400/30 bg-yellow-400/5 p-6 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-yellow-300" />
                <h2 className="mt-4 text-2xl font-black text-white">Selecciona tu video</h2>
                <p className="mt-2 text-sm leading-7 text-zinc-400">
                  Formatos: <strong className="text-yellow-300">.mp4, .mov, .webm, .avi, .mkv</strong>. Se sube directo a Cloudinary.
                </p>
                <input
                  type="file"
                  accept=".mp4,.mov,.webm,.avi,.mkv"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="mt-6 block w-full rounded-2xl border border-white/10 bg-black/50 p-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
                />
                {file && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-left text-sm text-zinc-300">
                    <Video className="mr-2 inline h-4 w-4 text-yellow-300" />
                    {file.name}
                    <span className="ml-2 text-zinc-500">{fileSize(file.size)}</span>
                    {file.size > VERCEL_SOFT_LIMIT_MB * MB && (
                      <p className="mt-3 rounded-xl border border-orange-400/30 bg-orange-400/10 p-3 text-xs font-bold text-orange-100">
                        <AlertTriangle className="mr-1 inline h-4 w-4" />
                        Archivo grande — usa siempre Cloudinary directo para videos.
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-5">
                  <Button
                    onClick={() => void uploadDirectToCloudinary()}
                    disabled={cloudUploading}
                    className="w-full rounded-full px-6 font-black"
                  >
                    {cloudUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Cloud className="h-4 w-4" />
                    )}
                    {cloudUploading ? 'Subiendo...' : 'Subir a Cloudinary VIDEO/AUTO'}
                  </Button>
                </div>
                {message && (
                  <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-zinc-200">
                    {message}
                  </p>
                )}
              </div>
            </AdminCard>

            {/* Cloudinary config */}
            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">
                Cloudinary directo
              </p>
              <h2 className="mt-1 text-xl font-black text-white">Configuración para videos</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Usa tu preset unsigned. El sistema intenta primero VIDEO y luego AUTO como fallback.
              </p>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Cloud name
                  <input
                    value={cloudName}
                    onChange={(e) => setCloudName(e.target.value)}
                    placeholder="disghf6xc"
                    className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Upload preset unsigned
                  <input
                    value={uploadPreset}
                    onChange={(e) => setUploadPreset(e.target.value)}
                    placeholder="presupuestos_videos"
                    className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"
                  />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Carpeta
                  <input
                    value={cloudFolder}
                    onChange={(e) => setCloudFolder(e.target.value)}
                    placeholder="presupuestos/videos"
                    className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70"
                  />
                </label>
              </div>
            </AdminCard>

            {/* Manual URL */}
            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">
                URL manual
              </p>
              <h2 className="mt-1 text-xl font-black text-white">Pegar link de video</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Si subiste el video por otro método, pega aquí la URL pública para previsualizarlo y
                copiarlo.
              </p>
              <div className="mt-4 grid gap-3">
                <input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nombre del video"
                  className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400/70"
                />
                <textarea
                  rows={3}
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/.../video.mp4"
                  className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400/70"
                />
                <Button onClick={saveManualUrl} variant="outline" className="rounded-2xl">
                  <Check className="h-4 w-4" /> Guardar URL
                </Button>
              </div>
            </AdminCard>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="grid h-max gap-5">

            {/* Current result */}
            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">
                Resultado actual
              </p>
              {!result?.url ? (
                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  Cuando subas el video o guardes una URL manual aparecerá aquí con previsualización y
                  acceso rápido a la URL.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {/* Embedded video player */}
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                    <video
                      src={result.url}
                      controls
                      preload="metadata"
                      className="w-full max-h-64 object-contain"
                    />
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-300 break-all">
                    {result.url}
                  </div>
                  <Button
                    onClick={() => void copyText(result.url, 'result-url')}
                    className="rounded-2xl"
                  >
                    <Copy className="h-4 w-4" />
                    {copied === 'result-url' ? 'Copiado' : 'Copiar URL de video'}
                  </Button>
                </div>
              )}
            </AdminCard>

            {/* Failed history */}
            <AdminCard glow className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300">
                    Historial
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">Fallidos</h2>
                </div>
                {failedHistory.length > 0 && (
                  <Button onClick={clearFailed} variant="outline" className="rounded-full text-xs">
                    Limpiar
                  </Button>
                )}
              </div>
              {!failedHistory.length ? (
                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  No hay intentos fallidos guardados en este navegador.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {failedHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm"
                    >
                      <XCircle className="mr-2 inline h-4 w-4 text-red-300" />
                      <b className="text-red-100">{item.name}</b>
                      <p className="mt-1 text-xs text-red-100/80">
                        {fileSize(item.size)} · {item.method} ·{' '}
                        {new Date(item.created_at).toLocaleString('es-CL')}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-red-100/90">{item.message}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => cloneAttempt(item)}
                          className="rounded-xl border border-red-300/30 px-3 py-1.5 text-xs font-black text-red-100"
                        >
                          Clonar
                        </button>
                        <button
                          onClick={() => deleteAttempt(item.id)}
                          className="rounded-xl border border-red-300/30 px-3 py-1.5 text-xs font-black text-red-100"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>

            {/* Success history */}
            <AdminCard glow className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">
                    Historial
                  </p>
                  <h2 className="mt-1 text-xl font-black text-white">Subidos recientemente</h2>
                </div>
                <RefreshCw className="h-4 w-4 text-zinc-500" />
              </div>
              {!successHistory.length ? (
                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  Todavía no hay subidas exitosas desde este navegador.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {successHistory.slice(0, 10).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm"
                    >
                      <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-300" />
                      <b className="text-emerald-100">{item.name}</b>
                      <p className="mt-1 text-xs text-emerald-100/80">
                        {fileSize(item.size)} · {item.method} ·{' '}
                        {new Date(item.created_at).toLocaleString('es-CL')}
                      </p>
                      {item.url && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => void copyText(item.url || '', item.id)}
                            className="col-span-2 rounded-xl border border-emerald-400/30 px-3 py-1.5 text-xs font-black text-emerald-100 inline-flex items-center justify-center gap-1"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copied === item.id ? 'Copiado' : 'Copiar URL de video'}
                          </button>
                          <button
                            onClick={() => cloneAttempt(item)}
                            className="rounded-xl border border-emerald-400/30 px-3 py-1.5 text-xs font-black text-emerald-100"
                          >
                            Clonar
                          </button>
                          <button
                            onClick={() => deleteAttempt(item.id)}
                            className="rounded-xl border border-emerald-400/30 px-3 py-1.5 text-xs font-black text-emerald-100"
                          >
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>
          </div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}
