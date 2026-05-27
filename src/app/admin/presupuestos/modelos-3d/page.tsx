'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Box,
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  ExternalLink,
  Eye,
  FileArchive,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';

type MediaAsset = {
  id?: string;
  url: string;
  path?: string;
  alt?: string | null;
  folder?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string | null;
};
type UploadedAsset = { url: string; path: string; warning?: string; asset?: MediaAsset | null };
type UploadAttempt = {
  id: string;
  name: string;
  size: number;
  status: 'success' | 'failed';
  method: 'api' | 'cloudinary-auto' | 'cloudinary-raw' | 'manual';
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

const HISTORY_KEY = 'sf_presupuesto_modelos3d_upload_history_v1';
const CLOUDINARY_SETTINGS_KEY = 'sf_presupuesto_modelos3d_cloudinary_settings_v1';
const MB = 1024 * 1024;
const VERCEL_SOFT_LIMIT_MB = 4.5;

function fileSize(size?: number | null) {
  if (!size) return '—';
  return `${(size / MB).toFixed(2)} MB`;
}

function visor3dUrl(modelUrl: string, name: string) {
  return `/presupuestos/visor-3d?model=${encodeURIComponent(modelUrl)}&name=${encodeURIComponent(name)}`;
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
  if (typeof window !== 'undefined') window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 80)));
}

function attemptId() {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function readCloudinarySettings() {
  if (typeof window === 'undefined') return { cloudName: '', uploadPreset: '', folder: 'presupuestos/modelos-3d' };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CLOUDINARY_SETTINGS_KEY) || '{}');
    return { cloudName: parsed.cloudName || '', uploadPreset: parsed.uploadPreset || '', folder: parsed.folder || 'presupuestos/modelos-3d' };
  } catch {
    return { cloudName: '', uploadPreset: '', folder: 'presupuestos/modelos-3d' };
  }
}

function saveCloudinarySettings(settings: { cloudName: string; uploadPreset: string; folder: string }) {
  if (typeof window !== 'undefined') window.localStorage.setItem(CLOUDINARY_SETTINGS_KEY, JSON.stringify(settings));
}

function filenameLabel(name?: string) {
  return (name || 'Modelo 3D').replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
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
  const [manualUrl, setManualUrl] = useState('');
  const [manualName, setManualName] = useState('Modelo 3D manual');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    const next = [attempt, ...readHistory()].slice(0, 80);
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
      setMessage('Selecciona primero un archivo .glb, .gltf, .zip, .dae, .pdf, .db o .sqlite.');
      return null;
    }
    return file;
  }

  async function uploadViaApi() {
    const selectedFile = selectedFileOrWarn();
    if (!selectedFile) return;
    if (selectedFile.size > VERCEL_SOFT_LIMIT_MB * MB)
      setMessage(`Este archivo pesa ${fileSize(selectedFile.size)}. Por API interna puede fallar con 413 en Vercel. Usa Cloudinary directo.`);
    setUploading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      form.append('folder', 'modelos-3d');
      form.append('alt', filenameLabel(selectedFile.name));
      const res = await fetch('/api/admin/media', { method: 'POST', body: form });
      const json = (await res.json().catch(() => ({}))) as UploadedAsset & { error?: string };
      if (!res.ok) {
        const readable =
          res.status === 413
            ? `Error 413: Vercel rechazó el archivo por tamaño (${fileSize(selectedFile.size)}). Usa Cloudinary directo.`
            : json.error || `Error ${res.status}`;
        throw new Error(readable);
      }
      setResult(json);
      addAttempt({
        id: attemptId(),
        name: selectedFile.name,
        size: selectedFile.size,
        status: 'success',
        method: 'api',
        message: json.warning ? `Subido con advertencia: ${json.warning}` : 'Subido correctamente por API interna',
        url: json.url,
        created_at: new Date().toISOString(),
      });
      setMessage(json.warning ? `Archivo subido, pero no se registró en tabla: ${json.warning}` : 'Archivo subido. Copia la URL o ábrelo en el visor.');
      await loadAssets();
    } catch (err) {
      const msg = (err as Error).message;
      addAttempt({ id: attemptId(), name: selectedFile.name, size: selectedFile.size, status: 'failed', method: 'api', message: msg, created_at: new Date().toISOString() });
      setMessage(`No se pudo subir por API: ${msg}`);
    } finally {
      setUploading(false);
    }
  }

  async function sendCloudinaryUpload(resourceType: 'auto' | 'raw', selectedFile: File, cleanCloudName: string, cleanPreset: string, cleanFolder: string) {
    const form = new FormData();
    form.append('file', selectedFile);
    form.append('upload_preset', cleanPreset);
    form.append('folder', cleanFolder);
    const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cleanCloudName)}/${resourceType}/upload`;
    const res = await fetch(endpoint, { method: 'POST', body: form });
    const json = (await res.json().catch(() => ({}))) as CloudinaryUploadResponse;
    if (!res.ok || !json.secure_url) throw new Error(json.error?.message || `Cloudinary ${resourceType} Error ${res.status}`);
    return json;
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
    setMessage('Subiendo directo a Cloudinary. Primero intento AUTO; si falla, intento RAW...');
    let autoError = '';
    try {
      let json: CloudinaryUploadResponse;
      let method: UploadAttempt['method'] = 'cloudinary-auto';
      try {
        json = await sendCloudinaryUpload('auto', selectedFile, cleanCloudName, cleanPreset, cleanFolder);
      } catch (err) {
        autoError = (err as Error).message;
        setMessage(`AUTO falló: ${autoError}. Intentando RAW...`);
        json = await sendCloudinaryUpload('raw', selectedFile, cleanCloudName, cleanPreset, cleanFolder);
        method = 'cloudinary-raw';
      }
      const uploaded: UploadedAsset = {
        url: json.secure_url || json.url || '',
        path: json.public_id || selectedFile.name,
        asset: {
          url: json.secure_url || json.url || '',
          path: json.public_id,
          alt: selectedFile.name,
          folder: cleanFolder,
          mime_type: selectedFile.type || 'model/gltf-binary',
          size_bytes: json.bytes || selectedFile.size,
        },
      };
      setResult(uploaded);
      addAttempt({
        id: attemptId(),
        name: selectedFile.name,
        size: selectedFile.size,
        status: 'success',
        method,
        message: autoError ? `AUTO falló (${autoError}), RAW funcionó.` : 'Subido directo a Cloudinary correctamente.',
        url: uploaded.url,
        created_at: new Date().toISOString(),
      });
      setMessage(`Archivo subido a Cloudinary por ${method === 'cloudinary-raw' ? 'RAW' : 'AUTO'}. Copia la URL o ábrelo en el visor.`);
    } catch (err) {
      const msg = (err as Error).message;
      const detail = autoError ? `AUTO: ${autoError} | RAW: ${msg}` : msg;
      addAttempt({ id: attemptId(), name: selectedFile.name, size: selectedFile.size, status: 'failed', method: 'cloudinary-raw', message: detail, created_at: new Date().toISOString() });
      setMessage(`No se pudo subir a Cloudinary. ${detail}`);
    } finally {
      setCloudUploading(false);
    }
  }

  function saveManualUrl() {
    const clean = manualUrl.trim();
    if (!clean) {
      setMessage('Pega primero una URL pública de Cloudinary o de otro almacenamiento.');
      return;
    }
    const uploaded: UploadedAsset = {
      url: clean,
      path: manualName || 'modelo-manual',
      asset: { url: clean, path: manualName || 'modelo-manual', alt: manualName || 'Modelo 3D manual', folder: 'manual', mime_type: 'model/gltf-binary', size_bytes: null },
    };
    setResult(uploaded);
    addAttempt({ id: attemptId(), name: manualName || 'Modelo 3D manual', size: 0, status: 'success', method: 'manual', message: 'URL manual guardada para prueba.', url: clean, created_at: new Date().toISOString() });
    setMessage('URL manual guardada. Ahora puedes abrirla directamente en el Visor 3D.');
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

  function startEdit(asset: MediaAsset) {
    const label = asset.alt || asset.path?.split('/').pop() || '';
    setEditingId(asset.id!);
    setEditingName(filenameLabel(label));
  }

  async function saveEdit() {
    if (!editingId || !editingName.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/media/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt: editingName.trim() }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setEditingId(null);
      await loadAssets();
    } catch (err) {
      setMessage(`No se pudo renombrar: ${(err as Error).message}`);
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteAsset(id: string, label: string) {
    if (!confirm(`¿Eliminar "${label}" de la base de datos?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/media/${id}`, { method: 'DELETE' });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      await loadAssets();
    } catch (err) {
      setMessage(`No se pudo eliminar: ${(err as Error).message}`);
    } finally {
      setDeletingId(null);
    }
  }

  const resultName = file?.name || result?.path || 'Modelo 3D';
  const resultVisorUrl = result?.url ? visor3dUrl(result.url, filenameLabel(resultName)) : '';

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Presupuestos · archivos técnicos"
        title="Modelos 3D"
        description="Sube archivos GLB, gestiona la biblioteca y visualiza cualquier modelo guardado en el Visor 3D."
        icon={Box}
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
                <h2 className="mt-4 text-2xl font-black text-white">Selecciona tu archivo</h2>
                <p className="mt-2 text-sm leading-7 text-zinc-400">
                  Formatos: .glb, .gltf, .dae, .zip, .pdf, .db, .sqlite e imágenes. Para el visor 3D usa <strong className="text-yellow-300">.glb</strong>.
                </p>
                <input
                  type="file"
                  accept=".glb,.gltf,.dae,.zip,.pdf,.db,.sqlite,.sqlite3,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="mt-6 block w-full rounded-2xl border border-white/10 bg-black/50 p-3 text-sm text-zinc-300 file:mr-4 file:rounded-xl file:border-0 file:bg-yellow-400 file:px-4 file:py-2 file:text-sm file:font-black file:text-black"
                />
                {file && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-4 text-left text-sm text-zinc-300">
                    <FileArchive className="mr-2 inline h-4 w-4 text-yellow-300" />
                    {file.name}
                    <span className="ml-2 text-zinc-500">{fileSize(file.size)}</span>
                    {file.size > VERCEL_SOFT_LIMIT_MB * MB && (
                      <p className="mt-3 rounded-xl border border-orange-400/30 bg-orange-400/10 p-3 text-xs font-bold text-orange-100">
                        <AlertTriangle className="mr-1 inline h-4 w-4" />
                        Este tamaño normalmente falla por API en Vercel. Usa Cloudinary directo.
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <Button onClick={() => void uploadDirectToCloudinary()} disabled={cloudUploading} className="rounded-full px-6 font-black">
                    {cloudUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                    {cloudUploading ? 'Subiendo...' : 'Subir Cloudinary AUTO/RAW'}
                  </Button>
                  <Button onClick={() => void uploadViaApi()} disabled={uploading} variant="outline" className="rounded-full px-6 font-black">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    API interna
                  </Button>
                </div>
                {message && (
                  <p className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-3 text-sm font-bold text-zinc-200">{message}</p>
                )}
              </div>
            </AdminCard>

            {/* Cloudinary config */}
            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Cloudinary directo</p>
              <h2 className="mt-1 text-xl font-black text-white">Configuración para GLB</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Usa tu preset unsigned. El sistema intenta primero AUTO y luego RAW para evitar fallos con GLB.
              </p>
              <div className="mt-4 grid gap-3">
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Cloud name
                  <input value={cloudName} onChange={(e) => setCloudName(e.target.value)} placeholder="disghf6xc" className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Upload preset unsigned
                  <input value={uploadPreset} onChange={(e) => setUploadPreset(e.target.value)} placeholder="presupuestos_3d" className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                  Carpeta
                  <input value={cloudFolder} onChange={(e) => setCloudFolder(e.target.value)} placeholder="presupuestos/modelos-3d" className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" />
                </label>
              </div>
            </AdminCard>

            {/* Manual URL */}
            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">URL manual</p>
              <h2 className="mt-1 text-xl font-black text-white">Pegar link de modelo</h2>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                Si subes el archivo por otro método, pega aquí la URL pública .glb para visualizarla.
              </p>
              <div className="mt-4 grid gap-3">
                <input
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nombre del modelo"
                  className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400/70"
                />
                <textarea
                  rows={3}
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/.../modelo.glb"
                  className="rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-yellow-400/70"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button onClick={saveManualUrl} variant="outline" className="rounded-2xl">
                    <Check className="h-4 w-4" /> Guardar URL
                  </Button>
                  {manualUrl.trim() && (
                    <Button asChild className="rounded-2xl">
                      <Link href={visor3dUrl(manualUrl.trim(), manualName || 'Modelo 3D')} target="_blank">
                        <Eye className="h-4 w-4" /> Abrir en Visor 3D
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </AdminCard>

            {/* Asset library */}
            <AdminCard glow className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Biblioteca</p>
                  <h2 className="mt-1 text-xl font-black text-white">Modelos guardados</h2>
                </div>
                <Button onClick={() => void loadAssets()} variant="outline" className="rounded-full" disabled={loadingAssets}>
                  {loadingAssets ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Actualizar
                </Button>
              </div>
              {assetsError && (
                <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 p-3 text-sm font-bold text-red-100">{assetsError}</p>
              )}
              {!assets.length && !loadingAssets ? (
                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  Aún no hay archivos registrados por API interna. Los subidos por Cloudinary directo aparecen en el historial de subidos.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {assets.map((asset, index) => {
                    const label = asset.alt || asset.path?.split('/').pop() || `Archivo ${index + 1}`;
                    const visorLink = visor3dUrl(asset.url, filenameLabel(label));
                    const isEditing = editingId === asset.id;
                    return (
                      <div key={asset.id || asset.path || asset.url} className="rounded-2xl border border-white/10 bg-black/35 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <b className="block truncate text-sm text-white">{label}</b>
                            <p className="mt-1 text-xs text-zinc-500">
                              {fileSize(asset.size_bytes)} · {asset.mime_type || 'archivo técnico'}
                            </p>
                          </div>
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-300" />
                        </div>
                        <p className="mt-2 break-all rounded-xl bg-black/50 p-2 text-[11px] text-zinc-400">{asset.url}</p>

                        {isEditing ? (
                          <div className="mt-3 grid gap-2">
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') void saveEdit();
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              autoFocus
                              className="rounded-xl border border-yellow-400/50 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Button onClick={() => void saveEdit()} disabled={savingEdit} className="rounded-xl text-xs">
                                {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                Guardar
                              </Button>
                              <Button onClick={() => setEditingId(null)} variant="outline" className="rounded-xl text-xs">
                                <X className="h-3.5 w-3.5" /> Cancelar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button
                              onClick={() => void copyText(asset.url, `asset-${index}`)}
                              variant="outline"
                              className="rounded-xl text-xs"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              {copied === `asset-${index}` ? 'Copiado' : 'Copiar URL'}
                            </Button>
                            <Button asChild className="rounded-xl text-xs">
                              <Link href={visorLink} target="_blank">
                                <Eye className="h-3.5 w-3.5" /> Abrir visor 3D
                              </Link>
                            </Button>
                            <Button
                              onClick={() => void copyText(visorLink, `vlink-${index}`)}
                              variant="outline"
                              className="rounded-xl text-xs"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              {copied === `vlink-${index}` ? 'Copiado' : 'Copiar link visor'}
                            </Button>
                            <Button
                              onClick={() => startEdit(asset)}
                              variant="outline"
                              className="rounded-xl text-xs"
                              disabled={!asset.id}
                            >
                              <Pencil className="h-3.5 w-3.5" /> Renombrar
                            </Button>
                            <Button
                              onClick={() => void deleteAsset(asset.id!, label)}
                              variant="outline"
                              className="col-span-2 rounded-xl border-red-400/30 text-xs text-red-300 hover:bg-red-400/10"
                              disabled={deletingId === asset.id || !asset.id}
                            >
                              {deletingId === asset.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                              {deletingId === asset.id ? 'Eliminando...' : 'Eliminar de BD'}
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </AdminCard>
          </div>

          {/* ── Right column ─────────────────────────────────────────────── */}
          <div className="grid h-max gap-5">

            {/* Current result */}
            <AdminCard glow className="p-5 sm:p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Resultado actual</p>
              {!result?.url ? (
                <p className="mt-4 text-sm leading-7 text-zinc-400">
                  Cuando subas el archivo o guardes una URL manual aparecerá aquí con acceso directo al visor.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-zinc-300 break-all">
                    {result.url}
                  </div>
                  <Button onClick={() => void copyText(result.url, 'result-url')} variant="outline" className="rounded-2xl">
                    <Copy className="h-4 w-4" />
                    {copied === 'result-url' ? 'Copiado' : 'Copiar URL'}
                  </Button>
                  <Button asChild className="rounded-2xl">
                    <Link href={resultVisorUrl} target="_blank">
                      <Eye className="h-4 w-4" /> Abrir en Visor 3D
                    </Link>
                  </Button>
                  <Button
                    onClick={() => void copyText(resultVisorUrl, 'result-visor-link')}
                    variant="outline"
                    className="rounded-2xl"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {copied === 'result-visor-link' ? 'Copiado' : 'Copiar link del visor'}
                  </Button>
                </div>
              )}
            </AdminCard>

            {/* Failed history */}
            <AdminCard glow className="p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300">Historial</p>
                  <h2 className="mt-1 text-xl font-black text-white">Fallidos</h2>
                </div>
                {failedHistory.length > 0 && (
                  <Button onClick={clearFailed} variant="outline" className="rounded-full text-xs">
                    Limpiar
                  </Button>
                )}
              </div>
              {!failedHistory.length ? (
                <p className="mt-4 text-sm leading-7 text-zinc-400">No hay intentos fallidos guardados en este navegador.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {failedHistory.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm">
                      <XCircle className="mr-2 inline h-4 w-4 text-red-300" />
                      <b className="text-red-100">{item.name}</b>
                      <p className="mt-1 text-xs text-red-100/80">
                        {fileSize(item.size)} · {item.method} · {new Date(item.created_at).toLocaleString('es-CL')}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-red-100/90">{item.message}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button onClick={() => cloneAttempt(item)} className="rounded-xl border border-red-300/30 px-3 py-1.5 text-xs font-black text-red-100">
                          Clonar
                        </button>
                        <button onClick={() => deleteAttempt(item.id)} className="rounded-xl border border-red-300/30 px-3 py-1.5 text-xs font-black text-red-100">
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
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300">Historial</p>
              <h2 className="mt-1 text-xl font-black text-white">Subidos recientemente</h2>
              {!successHistory.length ? (
                <p className="mt-4 text-sm leading-7 text-zinc-400">Todavía no hay subidas exitosas desde este navegador.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {successHistory.slice(0, 10).map((item) => {
                    const visorLink = item.url ? visor3dUrl(item.url, filenameLabel(item.name)) : '';
                    return (
                      <div key={item.id} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm">
                        <CheckCircle2 className="mr-2 inline h-4 w-4 text-emerald-300" />
                        <b className="text-emerald-100">{item.name}</b>
                        <p className="mt-1 text-xs text-emerald-100/80">
                          {fileSize(item.size)} · {item.method} · {new Date(item.created_at).toLocaleString('es-CL')}
                        </p>
                        {item.url && (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => void copyText(item.url || '', item.id)}
                              className="rounded-xl border border-emerald-400/30 px-3 py-1.5 text-xs font-black text-emerald-100"
                            >
                              {copied === item.id ? 'Copiado' : 'Copiar URL'}
                            </button>
                            <Link
                              href={visorLink}
                              target="_blank"
                              className="rounded-xl border border-emerald-400/30 px-3 py-1.5 text-center text-xs font-black text-emerald-100 inline-flex items-center justify-center gap-1"
                            >
                              <Eye className="h-3.5 w-3.5" /> Abrir visor
                            </Link>
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
                    );
                  })}
                </div>
              )}
            </AdminCard>
          </div>
        </div>
      </AdminMotion>
    </AdminPage>
  );
}
