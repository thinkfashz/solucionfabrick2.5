'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Box, Check, CheckCircle2, Copy, ExternalLink, FileArchive, Loader2, RefreshCw, UploadCloud, XCircle } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';

type MediaAsset = { id?: string; url: string; path?: string; alt?: string | null; folder?: string | null; mime_type?: string | null; size_bytes?: number | null; created_at?: string | null };
type UploadedAsset = { url: string; path: string; warning?: string; asset?: MediaAsset | null };
type UploadAttempt = { id: string; name: string; size: number; status: 'success' | 'failed'; message: string; url?: string; created_at: string };

const HISTORY_KEY = 'sf_presupuesto_modelos3d_upload_history_v1';
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
  if (typeof window !== 'undefined') window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 40)));
}

function attemptId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function PresupuestoModelos3DPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadedAsset | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [assetsError, setAssetsError] = useState('');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [history, setHistory] = useState<UploadAttempt[]>([]);

  useEffect(() => {
    setHistory(readHistory());
    void loadAssets();
  }, []);

  const failedHistory = useMemo(() => history.filter((item) => item.status === 'failed'), [history]);
  const successHistory = useMemo(() => history.filter((item) => item.status === 'success'), [history]);

  function addAttempt(attempt: UploadAttempt) {
    const next = [attempt, ...readHistory()].slice(0, 40);
    writeHistory(next);
    setHistory(next);
  }

  async function loadAssets() {
    setLoadingAssets(true);
    setAssetsError('');
    try {
      const res = await fetch('/api/admin/media?folder=modelos-3d&limit=50', { cache: 'no-store' });
      const json = (await res.json().catch(() => ({}))) as { assets?: MediaAsset[]; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setAssets((json.assets || []).filter((asset) => asset.url));
    } catch (err) {
      setAssetsError((err as Error).message);
    } finally {
      setLoadingAssets(false);
    }
  }

  async function upload() {
    if (!file) {
      setMessage('Selecciona primero un archivo .glb, .gltf, .zip, .dae o .pdf.');
      return;
    }

    if (file.size > VERCEL_SOFT_LIMIT_MB * MB) {
      setMessage(`Advertencia: tu archivo pesa ${fileSize(file.size)}. En Vercel puede fallar con 413 antes de llegar a la API. Puedes intentarlo, pero para modelos pesados conviene subir por Cloudinary o almacenamiento directo.`);
    }

    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'modelos-3d');
      form.append('alt', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
      const res = await fetch('/api/admin/media', { method: 'POST', body: form });
      const json = (await res.json().catch(() => ({}))) as UploadedAsset & { error?: string };
      if (!res.ok) {
        const readable = res.status === 413
          ? `Error 413: el servidor/deploy rechazó el archivo por tamaño (${fileSize(file.size)}). Sube un .glb más liviano o usa Cloudinary directo.`
          : (json.error || `Error ${res.status}`);
        throw new Error(readable);
      }
      setResult(json);
      addAttempt({ id: attemptId(), name: file.name, size: file.size, status: 'success', message: json.warning ? `Subido con advertencia: ${json.warning}` : 'Subido correctamente', url: json.url, created_at: new Date().toISOString() });
      setMessage(json.warning ? `Archivo subido, pero no se registró en tabla: ${json.warning}` : 'Archivo subido correctamente. Copia la URL o pruébala en el presupuesto.');
      await loadAssets();
    } catch (err) {
      const msg = (err as Error).message;
      addAttempt({ id: attemptId(), name: file.name, size: file.size, status: 'failed', message: msg, created_at: new Date().toISOString() });
      setMessage(`No se pudo subir: ${msg}`);
    } finally {
      setUploading(false);
    }
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

  const resultPreviewLink = result?.url ? `/presupuestos/trima-mobiliario-modular-laboratorio-container?model=${encodeURIComponent(result.url)}&modelName=${encodeURIComponent(file?.name || 'Modelo 3D')}` : '';

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Presupuestos · archivos técnicos"
        title="Subir modelo 3D para propuesta"
        description="Sube archivos GLB/GLTF. La pantalla ahora muestra subidos, fallidos y la biblioteca existente para reutilizar modelos."
        icon={Box}
        actions={<Button asChild variant="outline" className="rounded-full"><Link href="/admin/presupuestos">Volver a presupuestos</Link></Button>}
      />
      <AdminMotion>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-5">
            <AdminCard glow className="p-5 sm:p-6">
              <div className="rounded-[1.75rem] border border-dashed border-yellow-400/30 bg-yellow-400/5 p-6 text-center">
                <UploadCloud className="mx-auto h-12 w-12 text-yellow-300" />
                <h2 className="mt-4 text-2xl font-black text-white">Selecciona tu archivo</h2>
                <p className="mt-2 text-sm leading-7 text-zinc-400">Formatos permitidos: .glb, .gltf, .dae, .zip, .pdf e imágenes. Recomendado para visor: .glb.</p>
                <input
                  type="file"
                  accept=".glb,.gltf,.dae,.zip,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="mt-6 block w-full rounded-2xl border border-white/10 bg-black/50 p-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
                />
                {file && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-left text-sm text-zinc-300">
                    <FileArchive className="mr-2 inline h-4 w-4 text-yellow-300" />{file.name}<span className="ml-2 text-zinc-500">{fileSize(file.size)}</span>
                    {file.size > VERCEL_SOFT_LIMIT_MB * MB && <p className="mt-3 rounded-xl border border-orange-400/30 bg-orange-400/10 p-3 text-xs font-bold text-orange-100"><AlertTriangle className="mr-1 inline h-4 w-4" />Puede fallar con 413 en Vercel. Optimiza el GLB o súbelo directo a Cloudinary.</p>}
                  </div>
                )}
                <Button onClick={() => void upload()} disabled={uploading} className="mt-5 rounded-full px-6 font-black">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  {uploading ? 'Subiendo...' : 'Subir archivo'}
                </Button>
                {message && <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-zinc-200">{message}</p>}
              </div>
            </AdminCard>

            <AdminCard glow className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Biblioteca</p>
                  <h2 className="mt-1 text-xl font-black text-white">Archivos subidos</h2>
                </div>
                <Button onClick={() => void loadAssets()} variant="outline" className="rounded-full" disabled={loadingAssets}>{loadingAssets ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Actualizar</Button>
              </div>
              {assetsError && <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm font-bold text-red-100">{assetsError}</p>}
              {!assets.length && !loadingAssets ? <p className="mt-4 text-sm leading-7 text-zinc-400">Aún no hay archivos registrados en la carpeta modelos-3d.</p> : (
                <div className="mt-4 grid gap-3">
                  {assets.map((asset, index) => {
                    const preview = `/presupuestos/trima-mobiliario-modular-laboratorio-container?model=${encodeURIComponent(asset.url)}&modelName=${encodeURIComponent(asset.alt || asset.path || `Modelo ${index + 1}`)}`;
                    return <div key={asset.id || asset.path || asset.url} className="rounded-2xl border border-white/10 bg-black/35 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><b className="block truncate text-sm text-white">{asset.alt || asset.path?.split('/').pop() || `Archivo ${index + 1}`}</b><p className="mt-1 text-xs text-zinc-500">{fileSize(asset.size_bytes)} · {asset.mime_type || 'archivo técnico'}</p></div>
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                      </div>
                      <p className="mt-2 break-all rounded-xl bg-black/50 p-2 text-[11px] text-zinc-400">{asset.url}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <Button onClick={() => void copyText(asset.url, `asset-${index}`)} variant="outline" className="rounded-xl text-xs"><Copy className="h-4 w-4" />{copied === `asset-${index}` ? 'Copiado' : 'URL'}</Button>
                        <Button asChild variant="outline" className="rounded-xl text-xs"><Link href={preview} target="_blank"><ExternalLink className="h-4 w-4" />Probar</Link></Button>
                        <Button onClick={() => void copyText(preview, `preview-${index}`)} className="rounded-xl text-xs"><Copy className="h-4 w-4" />Link</Button>
                      </div>
                    </div>;
                  })}
                </div>
              )}
            </AdminCard>
          </div>

          <div className="grid h-max gap-5">
            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Resultado actual</p>
              {!result?.url ? <p className="mt-4 text-sm leading-7 text-zinc-400">Cuando subas el archivo aparecerá aquí la URL pública para previsualizarla en el presupuesto.</p> : (
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-300 break-all">{result.url}</div>
                  <Button onClick={() => void copyText(result.url, 'result-url')} variant="outline" className="rounded-2xl"><Copy className="h-4 w-4" />{copied === 'result-url' ? 'Copiado' : 'Copiar URL'}</Button>
                  <Button asChild className="rounded-2xl"><Link href={resultPreviewLink} target="_blank"><ExternalLink className="h-4 w-4" />Probar en presupuesto TRIMA</Link></Button>
                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-xs leading-6 text-yellow-100">
                    <Check className="mr-2 inline h-4 w-4" />También puedes volver a /admin/presupuestos, abrir el botón flotante Visor 3D, pegar esta URL y activar/desactivar el visor.
                  </div>
                </div>
              )}
            </AdminCard>

            <AdminCard glow className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300">Historial</p><h2 className="mt-1 text-xl font-black text-white">Fallidos</h2></div>
                {failedHistory.length > 0 && <Button onClick={clearFailed} variant="outline" className="rounded-full text-xs">Limpiar</Button>}
              </div>
              {!failedHistory.length ? <p className="mt-4 text-sm leading-7 text-zinc-400">No hay intentos fallidos guardados en este navegador.</p> : (
                <div className="mt-4 grid gap-3">
                  {failedHistory.map((item) => <div key={item.id} className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm"><XCircle className="mr-2 inline h-4 w-4 text-red-300" /><b className="text-red-100">{item.name}</b><p className="mt-1 text-xs text-red-100/80">{fileSize(item.size)} · {new Date(item.created_at).toLocaleString('es-CL')}</p><p className="mt-2 text-xs leading-5 text-red-100/90">{item.message}</p></div>)}
                </div>
              )}
            </AdminCard>

            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">Historial</p>
              <h2 className="mt-1 text-xl font-black text-white">Subidos recientemente</h2>
              {!successHistory.length ? <p className="mt-4 text-sm leading-7 text-zinc-400">Todavía no hay subidas exitosas desde este navegador.</p> : (
                <div className="mt-4 grid gap-3">
                  {successHistory.slice(0, 6).map((item) => <div key={item.id} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-300" /><b className="text-emerald-100">{item.name}</b><p className="mt-1 text-xs text-emerald-100/80">{fileSize(item.size)} · {new Date(item.created_at).toLocaleString('es-CL')}</p>{item.url && <button onClick={() => void copyText(item.url || '', item.id)} className="mt-2 rounded-xl border border-emerald-400/30 px-3 py-1.5 text-xs font-black text-emerald-100">{copied === item.id ? 'Copiado' : 'Copiar URL'}</button>}</div>)}
                </div>
              )}
            </AdminCard>
          </div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}
