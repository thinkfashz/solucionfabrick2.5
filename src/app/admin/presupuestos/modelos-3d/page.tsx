'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Box, Check, CheckCircle2, Cloud, Copy, ExternalLink, FileArchive, Loader2, RefreshCw, UploadCloud, XCircle } from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';

type MediaAsset = { id?: string; url: string; path?: string; alt?: string | null; folder?: string | null; mime_type?: string | null; size_bytes?: number | null; created_at?: string | null };
type UploadedAsset = { url: string; path: string; warning?: string; asset?: MediaAsset | null };
type UploadAttempt = { id: string; name: string; size: number; status: 'success' | 'failed'; method: 'api' | 'cloudinary'; message: string; url?: string; created_at: string };

type CloudinaryUploadResponse = { secure_url?: string; url?: string; public_id?: string; resource_type?: string; bytes?: number; format?: string; error?: { message?: string } };

const HISTORY_KEY = 'sf_presupuesto_modelos3d_upload_history_v1';
const CLOUDINARY_SETTINGS_KEY = 'sf_presupuesto_modelos3d_cloudinary_settings_v1';
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
  if (typeof window !== 'undefined') window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 60)));
}

function attemptId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function readCloudinarySettings() {
  if (typeof window === 'undefined') return { cloudName: '', uploadPreset: '', folder: 'presupuestos/modelos-3d' };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CLOUDINARY_SETTINGS_KEY) || '{}');
    return {
      cloudName: parsed.cloudName || '',
      uploadPreset: parsed.uploadPreset || '',
      folder: parsed.folder || 'presupuestos/modelos-3d',
    };
  } catch {
    return { cloudName: '', uploadPreset: '', folder: 'presupuestos/modelos-3d' };
  }
}

function saveCloudinarySettings(settings: { cloudName: string; uploadPreset: string; folder: string }) {
  if (typeof window !== 'undefined') window.localStorage.setItem(CLOUDINARY_SETTINGS_KEY, JSON.stringify(settings));
}

export default function PresupuestoModelos3DPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cloudUploading, setCloudUploading] = useState(false);
  const [result, setResult] = useState<UploadedAsset | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [assetsError, setAssetsError] = useState('');
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [history, setHistory] = useState<UploadAttempt[]>([]);
  const [cloudName, setCloudName] = useState('');
  const [uploadPreset, setUploadPreset] = useState('');
  const [cloudFolder, setCloudFolder] = useState('presupuestos/modelos-3d');

  useEffect(() => {
    setHistory(readHistory());
    const settings = readCloudinarySettings();
    setCloudName(settings.cloudName);
    setUploadPreset(settings.uploadPreset);
    setCloudFolder(settings.folder);
    void loadAssets();
  }, []);

  const failedHistory = useMemo(() => history.filter((item) => item.status === 'failed'), [history]);
  const successHistory = useMemo(() => history.filter((item) => item.status === 'success'), [history]);

  function addAttempt(attempt: UploadAttempt) {
    const next = [attempt, ...readHistory()].slice(0, 60);
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

  function selectedFileOrWarn() {
    if (!file) {
      setMessage('Selecciona primero un archivo .glb, .gltf, .zip, .dae o .pdf.');
      return null;
    }
    return file;
  }

  async function uploadViaApi() {
    const selectedFile = selectedFileOrWarn();
    if (!selectedFile) return;
    if (selectedFile.size > VERCEL_SOFT_LIMIT_MB * MB) {
      setMessage(`Este archivo pesa ${fileSize(selectedFile.size)}. Por API interna puede fallar con 413 en Vercel. Usa el botón Cloudinary directo.`);
    }

    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('folder', 'modelos-3d');
      form.append('alt', selectedFile.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
      const res = await fetch('/api/admin/media', { method: 'POST', body: form });
      const json = (await res.json().catch(() => ({}))) as UploadedAsset & { error?: string };
      if (!res.ok) {
        const readable = res.status === 413
          ? `Error 413: Vercel rechazó el archivo por tamaño (${fileSize(selectedFile.size)}). Usa Cloudinary directo.`
          : (json.error || `Error ${res.status}`);
        throw new Error(readable);
      }
      setResult(json);
      addAttempt({ id: attemptId(), name: selectedFile.name, size: selectedFile.size, status: 'success', method: 'api', message: json.warning ? `Subido con advertencia: ${json.warning}` : 'Subido correctamente por API interna', url: json.url, created_at: new Date().toISOString() });
      setMessage(json.warning ? `Archivo subido, pero no se registró en tabla: ${json.warning}` : 'Archivo subido correctamente. Copia la URL o pruébala en el presupuesto.');
      await loadAssets();
    } catch (err) {
      const msg = (err as Error).message;
      addAttempt({ id: attemptId(), name: selectedFile.name, size: selectedFile.size, status: 'failed', method: 'api', message: msg, created_at: new Date().toISOString() });
      setMessage(`No se pudo subir por API: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  async function uploadDirectToCloudinary() {
    const selectedFile = selectedFileOrWarn();
    if (!selectedFile) return;
    const cleanCloudName = cloudName.trim();
    const cleanPreset = uploadPreset.trim();
    const cleanFolder = cloudFolder.trim() || 'presupuestos/modelos-3d';
    if (!cleanCloudName || !cleanPreset) {
      setMessage('Completa Cloud name y Upload preset unsigned para subir directo a Cloudinary.');
      return;
    }

    saveCloudinarySettings({ cloudName: cleanCloudName, uploadPreset: cleanPreset, folder: cleanFolder });
    setCloudUploading(true);
    setResult(null);
    setMessage('Subiendo directo a Cloudinary, sin pasar por Vercel...');
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('upload_preset', cleanPreset);
      form.append('folder', cleanFolder);
      form.append('resource_type', 'raw');
      const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cleanCloudName)}/raw/upload`, { method: 'POST', body: form });
      const json = (await res.json().catch(() => ({}))) as CloudinaryUploadResponse;
      if (!res.ok || !json.secure_url) throw new Error(json.error?.message || `Cloudinary Error ${res.status}`);
      const uploaded: UploadedAsset = { url: json.secure_url, path: json.public_id || selectedFile.name, asset: { url: json.secure_url, path: json.public_id, alt: selectedFile.name, folder: cleanFolder, mime_type: selectedFile.type || 'model/gltf-binary', size_bytes: json.bytes || selectedFile.size } };
      setResult(uploaded);
      addAttempt({ id: attemptId(), name: selectedFile.name, size: selectedFile.size, status: 'success', method: 'cloudinary', message: 'Subido directo a Cloudinary correctamente', url: json.secure_url, created_at: new Date().toISOString() });
      setMessage('GLB subido directo a Cloudinary. Copia la URL o pruébala en el visor.');
    } catch (err) {
      const msg = (err as Error).message;
      addAttempt({ id: attemptId(), name: selectedFile.name, size: selectedFile.size, status: 'failed', method: 'cloudinary', message: msg, created_at: new Date().toISOString() });
      setMessage(`No se pudo subir a Cloudinary: ${msg}`);
    } finally {
      setCloudUploading(false);
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
        description="Para GLB reales usa Cloudinary directo. La API interna queda solo para archivos pequeños porque Vercel puede responder 413."
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
                <p className="mt-2 text-sm leading-7 text-zinc-400">Formatos permitidos: .glb, .gltf, .dae, .zip, .pdf e imágenes. Para visor 3D usa .glb.</p>
                <input
                  type="file"
                  accept=".glb,.gltf,.dae,.zip,.pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="mt-6 block w-full rounded-2xl border border-white/10 bg-black/50 p-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
                />
                {file && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-left text-sm text-zinc-300">
                    <FileArchive className="mr-2 inline h-4 w-4 text-yellow-300" />{file.name}<span className="ml-2 text-zinc-500">{fileSize(file.size)}</span>
                    {file.size > VERCEL_SOFT_LIMIT_MB * MB && <p className="mt-3 rounded-xl border border-orange-400/30 bg-orange-400/10 p-3 text-xs font-bold text-orange-100"><AlertTriangle className="mr-1 inline h-4 w-4" />Este tamaño normalmente falla por API en Vercel. Usa Cloudinary directo.</p>}
                  </div>
                )}
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => void uploadDirectToCloudinary()} disabled={cloudUploading} className="rounded-full px-6 font-black">
                    {cloudUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                    {cloudUploading ? 'Subiendo...' : 'Subir directo Cloudinary'}
                  </Button>
                  <Button onClick={() => void uploadViaApi()} disabled={uploading} variant="outline" className="rounded-full px-6 font-black">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    API interna
                  </Button>
                </div>
                {message && <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-zinc-200">{message}</p>}
              </div>
            </AdminCard>

            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Cloudinary directo</p>
              <h2 className="mt-1 text-xl font-black text-white">Configuración para GLB</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">Crea un upload preset unsigned en Cloudinary. Estos datos quedan guardados solo en tu navegador.</p>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Cloud name<input value={cloudName} onChange={(e) => setCloudName(e.target.value)} placeholder="tu_cloud_name" className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" /></label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Upload preset unsigned<input value={uploadPreset} onChange={(e) => setUploadPreset(e.target.value)} placeholder="presupuestos_3d" className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" /></label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Carpeta<input value={cloudFolder} onChange={(e) => setCloudFolder(e.target.value)} placeholder="presupuestos/modelos-3d" className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" /></label>
              </div>
            </AdminCard>

            <AdminCard glow className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Biblioteca API</p><h2 className="mt-1 text-xl font-black text-white">Archivos subidos</h2></div><Button onClick={() => void loadAssets()} variant="outline" className="rounded-full" disabled={loadingAssets}>{loadingAssets ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Actualizar</Button></div>
              {assetsError && <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm font-bold text-red-100">{assetsError}</p>}
              {!assets.length && !loadingAssets ? <p className="mt-4 text-sm leading-7 text-zinc-400">Aún no hay archivos registrados por API interna. Los subidos por Cloudinary directo aparecen en historial de subidos.</p> : <div className="mt-4 grid gap-3">{assets.map((asset, index) => { const preview = `/presupuestos/trima-mobiliario-modular-laboratorio-container?model=${encodeURIComponent(asset.url)}&modelName=${encodeURIComponent(asset.alt || asset.path || `Modelo ${index + 1}`)}`; return <div key={asset.id || asset.path || asset.url} className="rounded-2xl border border-white/10 bg-black/35 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="block truncate text-sm text-white">{asset.alt || asset.path?.split('/').pop() || `Archivo ${index + 1}`}</b><p className="mt-1 text-xs text-zinc-500">{fileSize(asset.size_bytes)} · {asset.mime_type || 'archivo técnico'}</p></div><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" /></div><p className="mt-2 break-all rounded-xl bg-black/50 p-2 text-[11px] text-zinc-400">{asset.url}</p><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3"><Button onClick={() => void copyText(asset.url, `asset-${index}`)} variant="outline" className="rounded-xl text-xs"><Copy className="h-4 w-4" />{copied === `asset-${index}` ? 'Copiado' : 'URL'}</Button><Button asChild variant="outline" className="rounded-xl text-xs"><Link href={preview} target="_blank"><ExternalLink className="h-4 w-4" />Probar</Link></Button><Button onClick={() => void copyText(preview, `preview-${index}`)} className="rounded-xl text-xs"><Copy className="h-4 w-4" />Link</Button></div></div>; })}</div>}
            </AdminCard>
          </div>

          <div className="grid h-max gap-5">
            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Resultado actual</p>
              {!result?.url ? <p className="mt-4 text-sm leading-7 text-zinc-400">Cuando subas el archivo aparecerá aquí la URL pública para previsualizarla en el presupuesto.</p> : <div className="mt-4 grid gap-3"><div className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-300 break-all">{result.url}</div><Button onClick={() => void copyText(result.url, 'result-url')} variant="outline" className="rounded-2xl"><Copy className="h-4 w-4" />{copied === 'result-url' ? 'Copiado' : 'Copiar URL'}</Button><Button asChild className="rounded-2xl"><Link href={resultPreviewLink} target="_blank"><ExternalLink className="h-4 w-4" />Probar en presupuesto TRIMA</Link></Button><div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-xs leading-6 text-yellow-100"><Check className="mr-2 inline h-4 w-4" />También puedes volver a /admin/presupuestos, abrir el botón flotante Visor 3D, pegar esta URL y activar/desactivar el visor.</div></div>}
            </AdminCard>

            <AdminCard glow className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300">Historial</p><h2 className="mt-1 text-xl font-black text-white">Fallidos</h2></div>{failedHistory.length > 0 && <Button onClick={clearFailed} variant="outline" className="rounded-full text-xs">Limpiar</Button>}</div>
              {!failedHistory.length ? <p className="mt-4 text-sm leading-7 text-zinc-400">No hay intentos fallidos guardados en este navegador.</p> : <div className="mt-4 grid gap-3">{failedHistory.map((item) => <div key={item.id} className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm"><XCircle className="mr-2 inline h-4 w-4 text-red-300" /><b className="text-red-100">{item.name}</b><p className="mt-1 text-xs text-red-100/80">{fileSize(item.size)} · {item.method} · {new Date(item.created_at).toLocaleString('es-CL')}</p><p className="mt-2 text-xs leading-5 text-red-100/90">{item.message}</p></div>)}</div>}
            </AdminCard>

            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">Historial</p><h2 className="mt-1 text-xl font-black text-white">Subidos recientemente</h2>
              {!successHistory.length ? <p className="mt-4 text-sm leading-7 text-zinc-400">Todavía no hay subidas exitosas desde este navegador.</p> : <div className="mt-4 grid gap-3">{successHistory.slice(0, 10).map((item) => { const preview = item.url ? `/presupuestos/trima-mobiliario-modular-laboratorio-container?model=${encodeURIComponent(item.url)}&modelName=${encodeURIComponent(item.name)}` : ''; return <div key={item.id} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm"><CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-300" /><b className="text-emerald-100">{item.name}</b><p className="mt-1 text-xs text-emerald-100/80">{fileSize(item.size)} · {item.method} · {new Date(item.created_at).toLocaleString('es-CL')}</p>{item.url && <div className="mt-2 grid grid-cols-2 gap-2"><button onClick={() => void copyText(item.url || '', item.id)} className="rounded-xl border border-emerald-400/30 px-3 py-1.5 text-xs font-black text-emerald-100">{copied === item.id ? 'Copiado' : 'Copiar URL'}</button><Link href={preview} target="_blank" className="rounded-xl border border-emerald-400/30 px-3 py-1.5 text-center text-xs font-black text-emerald-100">Probar</Link></div>}</div>; })}</div>}
            </AdminCard>
          </div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}
