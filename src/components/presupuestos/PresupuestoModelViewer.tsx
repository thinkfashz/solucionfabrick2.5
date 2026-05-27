'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Copy, Download, ExternalLink, Loader2, Play } from 'lucide-react';
import type { PresupuestoArchivo } from '@/lib/presupuestosBuilder';

type ViewerStatus = 'idle' | 'checking' | 'ready' | 'error';

function isModel(file: PresupuestoArchivo) {
  const ext = (file.formato || file.url.split('?')[0].split('.').pop() || '').toLowerCase();
  return file.mostrar_cliente !== false && file.url && ['glb', 'gltf'].includes(ext);
}

function proxiedUrl(url: string) {
  return `/api/presupuestos/model-proxy?url=${encodeURIComponent(url)}`;
}

export default function PresupuestoModelViewer({ archivos }: { archivos?: PresupuestoArchivo[] }) {
  const models = useMemo(() => (archivos || []).filter(isModel).sort((a, b) => a.orden - b.orden), [archivos]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<ViewerStatus>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const selected = models[selectedIndex];
  const proxy = selected?.url ? proxiedUrl(selected.url) : '';

  if (!models.length) return null;

  async function validateModel() {
    if (!proxy) return;
    setStatus('checking');
    setError('');
    try {
      const res = await fetch(proxy, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${body ? ` · ${body.slice(0, 140)}` : ''}`);
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) throw new Error('La URL devuelve HTML, no un archivo GLB/GLTF directo.');
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message || 'No se pudo validar el modelo.');
    }
  }

  async function copyDiagnostics() {
    await navigator.clipboard.writeText(JSON.stringify({
      modulo: 'PresupuestoModelViewer',
      status,
      error,
      url_original: selected?.url,
      url_proxy: proxy,
      nota: 'Visor 3D pesado desactivado para evitar crash SSR require() of ES Module en Vercel.',
      fecha: new Date().toISOString(),
    }, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-yellow-400/20 bg-zinc-950/90 shadow-2xl shadow-black/30">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.16),transparent_42%),#050505] p-6 text-center">
          <p className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-1 text-xs font-black uppercase tracking-[0.28em] text-yellow-200">Archivo 3D</p>
          <h3 className="mt-5 max-w-xl text-3xl font-black text-white sm:text-5xl">Modelo técnico del proyecto</h3>
          <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-400">El archivo GLB está asociado al presupuesto. Esta versión valida el link y permite descargarlo sin romper la página pública.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <button onClick={() => void validateModel()} className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black hover:bg-yellow-300">
              {status === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {status === 'checking' ? 'Validando...' : 'Validar modelo'}
            </button>
            {selected?.url && <a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-bold text-white hover:border-yellow-400/40"><Download className="h-4 w-4" /> Descargar GLB</a>}
          </div>
          {status === 'ready' && <p className="mt-5 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100"><CheckCircle2 className="mr-2 inline h-4 w-4" />Link validado correctamente.</p>}
          {status === 'error' && <p className="mt-5 max-w-xl rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-7 text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</p>}
        </div>

        <aside className="border-t border-white/10 bg-black/50 p-5 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Archivo técnico</p>
          <h3 className="mt-2 text-xl font-black text-white">{selected?.nombre || 'Modelo 3D'}</h3>
          <p className="mt-3 break-all text-xs leading-6 text-zinc-500">{selected?.url}</p>
          <div className="mt-5 grid gap-2">
            <button onClick={() => void validateModel()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-black hover:bg-yellow-300"><Play className="h-4 w-4" /> Validar link</button>
            {selected?.url && <a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white hover:border-yellow-400/40"><ExternalLink className="h-4 w-4" /> Abrir archivo</a>}
            <button onClick={() => void copyDiagnostics()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white hover:border-yellow-400/40"><Copy className="h-4 w-4" /> {copied ? 'Copiado' : 'Copiar diagnóstico'}</button>
          </div>
          {models.length > 1 && <div className="mt-5 grid gap-2">{models.map((model, index) => <button key={model.id} onClick={() => setSelectedIndex(index)} className={`rounded-2xl border px-3 py-2 text-left text-xs font-bold ${index === selectedIndex ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-200' : 'border-white/10 text-zinc-400'}`}>{model.nombre || `Modelo ${index + 1}`}</button>)}</div>}
        </aside>
      </div>
    </section>
  );
}
