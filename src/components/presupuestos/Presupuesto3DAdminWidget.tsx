'use client';

import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Box, CheckCircle2, Copy, Database, Eye, EyeOff, ExternalLink, Loader2, RefreshCw, UploadCloud, X } from 'lucide-react';
import { calculateBudget, createBudgetId, fileTypeFromUrl, loadBudgets, saveBudgets, type PresupuestoPro } from '@/lib/presupuestosBuilder';

function modelFormat(url: string) {
  return url.split('?')[0].split('.').pop()?.toLowerCase() || 'glb';
}

function labelFromFilename(name: string) {
  return name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim() || 'Modelo 3D del proyecto';
}

function dispatchBudgetSync() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('presupuestos:updated'));
}

export default function Presupuesto3DAdminWidget() {
  const pathname = usePathname();
  const visibleInPath = pathname === '/admin/presupuestos' || pathname?.startsWith('/admin/presupuestos/');
  const [open, setOpen] = useState(false);
  const [budgets, setBudgets] = useState<PresupuestoPro[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [url, setUrl] = useState('');
  const [name, setName] = useState('Modelo 3D del proyecto');
  const [description, setDescription] = useState('Modelo 3D interactivo para revisión del cliente.');
  const [enabled, setEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [migrating, setMigrating] = useState(false);

  useEffect(() => {
    if (!visibleInPath || typeof window === 'undefined') return;
    refreshBudgets();
    const onSync = () => refreshBudgets();
    window.addEventListener('storage', onSync);
    window.addEventListener('presupuestos:updated', onSync as EventListener);
    return () => {
      window.removeEventListener('storage', onSync);
      window.removeEventListener('presupuestos:updated', onSync as EventListener);
    };
  }, [visibleInPath]);

  const selected = useMemo(() => budgets.find((budget) => budget.id === selectedId) || budgets[0], [budgets, selectedId]);
  const currentModel = useMemo(() => selected?.archivos?.find((file) => file.tipo === 'modelo_3d' || ['glb', 'gltf'].includes(file.formato)) || null, [selected]);

  useEffect(() => {
    if (!currentModel) {
      setUrl('');
      setName('Modelo 3D del proyecto');
      setDescription('Modelo 3D interactivo para revisión del cliente.');
      setEnabled(false);
      return;
    }
    setUrl(currentModel.url || '');
    setName(currentModel.nombre || 'Modelo 3D del proyecto');
    setDescription(currentModel.descripcion || 'Modelo 3D interactivo para revisión del cliente.');
    setEnabled(currentModel.mostrar_cliente !== false);
  }, [currentModel?.id, currentModel?.url, selectedId]);

  if (!visibleInPath) return null;

  const publicLink = selected ? `${typeof window !== 'undefined' ? window.location.origin : ''}/presupuestos/${selected.slug}` : '';
  const viewerLink = url ? `${typeof window !== 'undefined' ? window.location.origin : ''}/presupuestos/visor-3d?model=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}` : '';

  function refreshBudgets() {
    const loaded = loadBudgets();
    setBudgets(loaded);
    if (!selectedId && loaded[0]) setSelectedId(loaded[0].id);
  }

  function withModel(modelUrl: string, modelName: string, modelDescription: string, nextEnabled: boolean) {
    if (!selected) return null;
    const cleanUrl = modelUrl.trim();
    const format = modelFormat(cleanUrl);
    return budgets.map((budget) => {
      if (budget.id !== selected.id) return budget;
      const others = (budget.archivos || []).filter((file) => !(file.tipo === 'modelo_3d' || ['glb', 'gltf'].includes(file.formato)));
      return calculateBudget({
        ...budget,
        archivos: [
          ...others,
          {
            id: currentModel?.id || createBudgetId('file'),
            nombre: modelName || 'Modelo 3D del proyecto',
            url: cleanUrl,
            descripcion: modelDescription || 'Modelo 3D interactivo para revisión del cliente.',
            tipo: fileTypeFromUrl(cleanUrl, format),
            formato: format,
            mostrar_cliente: nextEnabled,
            orden: 1,
          },
        ],
        updated_at: new Date().toISOString(),
      });
    });
  }

  function saveList(nextBudgets: PresupuestoPro[], nextEnabled: boolean, nextUrl = url, nextName = name, nextDescription = description) {
    saveBudgets(nextBudgets);
    setBudgets(nextBudgets);
    setUrl(nextUrl);
    setName(nextName);
    setDescription(nextDescription);
    setEnabled(nextEnabled);
    dispatchBudgetSync();
  }

  async function migrateList(nextBudgets: PresupuestoPro[]) {
    const res = await fetch('/api/admin/presupuestos/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presupuestos: nextBudgets }),
    });
    const json = (await res.json().catch(() => ({}))) as { migrated?: number; error?: string; hint?: string };
    if (!res.ok) throw new Error(`${json.error || `Error ${res.status}`}${json.hint ? ` · ${json.hint}` : ''}`);
    return json.migrated || nextBudgets.length;
  }

  function persistModel(nextEnabled = enabled) {
    if (!selected) return setMessage('No hay presupuesto seleccionado.');
    if (!url.trim()) return setMessage('Pega primero la URL del modelo .glb o .gltf, o súbelo desde este panel.');
    setLoading(true);
    const nextBudgets = withModel(url, name, description, nextEnabled);
    if (!nextBudgets) {
      setLoading(false);
      return setMessage('No se pudo asociar el modelo al presupuesto.');
    }
    saveList(nextBudgets, nextEnabled);
    setMessage(nextEnabled ? 'Visor 3D activado y sincronizado con la página del cliente.' : 'Visor 3D desactivado y oculto para el cliente.');
    window.setTimeout(() => setMessage(''), 3500);
    setLoading(false);
  }

  async function uploadAndAttach(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!selected) return setMessage('Selecciona primero un presupuesto.');

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['glb', 'gltf', 'dae', 'zip', 'pdf', 'db', 'sqlite', 'sqlite3'].includes(ext)) {
      return setMessage('Formato no permitido. Para visor usa GLB o GLTF. También puedes adjuntar DAE/ZIP/PDF/DB como técnico.');
    }

    setUploading(true);
    setMessage('Subiendo archivo desde el activador...');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('folder', 'modelos-3d');
      form.append('alt', labelFromFilename(file.name));
      const res = await fetch('/api/admin/media', { method: 'POST', body: form });
      const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string; warning?: string };
      if (!res.ok || !json.url) throw new Error(json.error || `Error ${res.status}`);

      const isViewerFile = ['glb', 'gltf'].includes(ext);
      const nextName = labelFromFilename(file.name);
      const nextDescription = `Archivo técnico subido desde el activador del visor (${ext.toUpperCase()}).`;
      const nextBudgets = withModel(json.url, nextName, nextDescription, isViewerFile);
      if (!nextBudgets) throw new Error('No se pudo asociar el archivo al presupuesto.');
      saveList(nextBudgets, isViewerFile, json.url, nextName, nextDescription);

      let migration = '';
      try {
        const migrated = await migrateList(nextBudgets);
        migration = ` Migrado a base de datos (${migrated}).`;
      } catch (err) {
        migration = ` Guardado local; migración pendiente: ${(err as Error).message}`;
      }
      setMessage(`${isViewerFile ? 'Modelo subido y visor activado.' : 'Archivo subido como técnico; visor no activado porque no es GLB/GLTF.'}${json.warning ? ` Advertencia: ${json.warning}.` : ''}${migration}`);
    } catch (err) {
      setMessage(`No se pudo subir: ${(err as Error).message}`);
    } finally {
      setUploading(false);
      window.setTimeout(() => setMessage(''), 9000);
    }
  }

  async function migrateToDatabase() {
    setMigrating(true);
    setMessage('Migrando presupuestos a base de datos...');
    try {
      const migrated = await migrateList(loadBudgets());
      setMessage(`Migración lista: ${migrated} presupuesto(s) guardado(s) en la base de datos.`);
      dispatchBudgetSync();
    } catch (err) {
      setMessage(`No se pudo migrar: ${(err as Error).message}`);
    } finally {
      setMigrating(false);
      window.setTimeout(() => setMessage(''), 6500);
    }
  }

  async function copyPublicLink() {
    if (!publicLink) return;
    await navigator.clipboard.writeText(publicLink);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-[80] mx-auto w-[calc(100vw-1rem)] max-w-md px-2 print:hidden sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-auto sm:max-w-none sm:px-0">
      {!open ? (
        <button onClick={() => { refreshBudgets(); setOpen(true); }} className="mx-auto flex w-full max-w-[320px] items-center justify-center gap-2 rounded-full border border-yellow-400/40 bg-black/95 px-4 py-3 text-sm font-black text-yellow-200 shadow-2xl shadow-black/50 backdrop-blur-xl transition hover:bg-yellow-400 hover:text-black sm:w-auto">
          <Box className="h-4 w-4" /> Visor 3D <span className={`ml-1 rounded-full px-2 py-0.5 text-[10px] ${enabled ? 'bg-emerald-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}>{enabled ? 'Activo' : 'Off'}</span>
        </button>
      ) : (
        <div className="max-h-[calc(100vh-1.5rem)] w-full overflow-y-auto rounded-[1.5rem] border border-yellow-400/30 bg-zinc-950/95 text-white shadow-2xl shadow-black/60 backdrop-blur-xl sm:w-[430px]">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/10 bg-zinc-950/95 p-4 backdrop-blur">
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300">Presupuesto</p><h3 className="mt-1 text-lg font-black">Control del visor 3D</h3><p className="mt-1 text-xs text-zinc-500">Sube, activa, sincroniza o migra.</p></div>
            <button onClick={() => setOpen(false)} className="shrink-0 rounded-full border border-white/10 p-2 text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-200"><X className="h-4 w-4" /></button>
          </div>

          <div className="grid gap-3 p-4">
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Presupuesto<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="min-w-0 rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70">{budgets.map((budget) => <option key={budget.id} value={budget.id}>{budget.cliente} · {budget.titulo}</option>)}</select></label>

            <div className="grid gap-2 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3">
              <p className="text-sm font-black text-yellow-100">Subir desde este activador</p>
              <p className="text-xs leading-5 text-yellow-100/75">Elige un GLB/GLTF desde tu galería o archivos. Se sube, se asocia, se activa y se intenta migrar automáticamente.</p>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-3 py-2.5 text-xs font-black text-black hover:bg-yellow-300">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{uploading ? 'Subiendo...' : 'Elegir y subir archivo'}
                <input type="file" accept=".glb,.gltf,.dae,.zip,.pdf,.db,.sqlite,.sqlite3" onChange={(event) => void uploadAndAttach(event)} disabled={uploading} className="hidden" />
              </label>
            </div>

            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">URL .glb / .gltf<input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://.../modelo.glb" className="min-w-0 rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" /></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Nombre<input value={name} onChange={(event) => setName(event.target.value)} className="min-w-0 rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" /></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Descripción<textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="min-w-0 rounded-2xl border border-white/10 bg-black/50 px-3 py-2.5 text-sm normal-case tracking-normal text-white outline-none focus:border-yellow-400/70" /></label>

            <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/40 p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-sm font-black text-white">Mostrar visor al cliente</p><p className="text-xs text-zinc-500">Si está activo, aparece una sola card “Abrir visor 3D”.</p></div><button onClick={() => persistModel(!enabled)} disabled={loading} className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-black sm:w-auto ${enabled ? 'bg-emerald-400 text-black' : 'bg-zinc-800 text-zinc-300'}`}>{enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}{enabled ? 'Activo' : 'Inactivo'}</button></div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button onClick={() => persistModel(true)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-3 py-2.5 text-xs font-black text-black disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Guardar y activar</button><button onClick={() => persistModel(false)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-xs font-black text-zinc-200 disabled:opacity-60"><EyeOff className="h-4 w-4" />Desactivar</button></div>
            <button onClick={migrateToDatabase} disabled={migrating} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-400/10 px-3 py-2.5 text-xs font-black text-sky-100 hover:bg-sky-400/20 disabled:opacity-60">{migrating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}{migrating ? 'Migrando...' : 'Migrar a base de datos'}</button>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><button onClick={copyPublicLink} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-xs font-black text-zinc-200 hover:border-yellow-400/40"><Copy className="h-4 w-4" />{copied ? 'Copiado' : 'Copiar link'}</button><button onClick={refreshBudgets} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2.5 text-xs font-black text-zinc-200 hover:border-yellow-400/40"><RefreshCw className="h-4 w-4" />Sincronizar</button></div>
            {publicLink && <Link href={publicLink} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2.5 text-xs font-black text-emerald-200 hover:bg-emerald-400/20"><ExternalLink className="h-4 w-4" />Ver página cliente</Link>}
            {viewerLink && enabled && <Link href={viewerLink} target="_blank" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2.5 text-xs font-black text-yellow-200 hover:bg-yellow-400/20"><Box className="h-4 w-4" />Probar visor 3D</Link>}
            {message && <p className="max-h-36 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-3 text-xs font-bold leading-5 text-yellow-100">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
