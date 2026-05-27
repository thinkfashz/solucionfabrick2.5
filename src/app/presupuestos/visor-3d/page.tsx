'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Box, CheckCircle2, Copy, Download, ExternalLink, Loader2, Play, Rotate3D } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

type ViewerStatus = 'idle' | 'checking' | 'loading' | 'loaded' | 'error';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': any;
    }
  }
}

function proxyUrl(url: string) {
  return `/api/presupuestos/model-proxy?url=${encodeURIComponent(url)}`;
}

export default function PresupuestoVisor3DPage() {
  const [modelUrl, setModelUrl] = useState('');
  const [modelName, setModelName] = useState('Modelo 3D del proyecto');
  const [status, setStatus] = useState<ViewerStatus>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [debug, setDebug] = useState('');
  const [scriptReady, setScriptReady] = useState(false);

  const src = useMemo(() => (modelUrl ? proxyUrl(modelUrl) : ''), [modelUrl]);

  useEffect(() => {
    const url = new URL(window.location.href);
    setModelUrl(url.searchParams.get('model') || '');
    setModelName(url.searchParams.get('name') || url.searchParams.get('modelName') || 'Modelo 3D del proyecto');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (customElements.get('model-viewer')) {
      setScriptReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-model-viewer="true"]');
    if (existing) {
      existing.addEventListener('load', () => setScriptReady(true), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.dataset.modelViewer = 'true';
    script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
    script.onload = () => setScriptReady(true);
    script.onerror = () => {
      setStatus('error');
      setError('No se pudo cargar el motor model-viewer. Revisa conexión o CSP.');
    };
    document.head.appendChild(script);
  }, [ready]);

  async function start() {
    if (!modelUrl) {
      setStatus('error');
      setError('No se recibió URL del modelo.');
      return;
    }
    setStatus('checking');
    setError('');
    setDebug('');
    try {
      const res = await fetch(src, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`El archivo respondió HTTP ${res.status}${body ? ` · ${body.slice(0, 140)}` : ''}`);
      }
      const type = res.headers.get('content-type') || 'sin content-type';
      const size = res.headers.get('content-length') || 'sin tamaño';
      if (type.includes('text/html')) throw new Error('La URL devuelve HTML, no un GLB/GLTF directo.');
      setDebug(`Validado: ${type} · ${size} bytes`);
      setStatus('loading');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message || 'No se pudo validar el archivo.');
    }
  }

  async function copyDiagnostic() {
    await navigator.clipboard.writeText(JSON.stringify({ modelUrl, modelName, src, status, error, debug, scriptReady, fecha: new Date().toISOString() }, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.14),transparent_34%),#050505] px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-4 rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/90 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <FabrickFullLogo theme="light" tagline="visor 3D" />
            <h1 className="mt-4 break-words text-2xl font-black sm:text-4xl">{modelName}</h1>
            <p className="mt-2 text-sm text-zinc-400">Visor aislado del presupuesto con controles nativos para móvil. Puedes rotar, mover y hacer zoom sin afectar la página del cliente.</p>
            {debug && <p className="mt-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-100">{debug}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/50"><ArrowLeft className="h-4 w-4" /> Volver</button>
            {modelUrl && <a href={modelUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/50"><Download className="h-4 w-4" /> Descargar</a>}
            {modelUrl && <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-100 hover:bg-yellow-400/20"><ExternalLink className="h-4 w-4" /> Probar URL</a>}
          </div>
        </header>

        <section className="overflow-hidden rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/90 shadow-2xl shadow-black/40">
          <div className="relative h-[62vh] min-h-[420px] w-full bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.08),transparent_35%),#111] sm:h-[72vh]">
            {(status === 'loading' || status === 'loaded') && scriptReady && src && (
              <model-viewer
                src={src}
                camera-controls
                touch-action="pan-y"
                auto-rotate
                auto-rotate-delay="1200"
                rotation-per-second="18deg"
                environment-image="neutral"
                exposure="1.25"
                shadow-intensity="0.6"
                ar
                ar-modes="webxr scene-viewer quick-look"
                loading="eager"
                reveal="auto"
                bounds="tight"
                style={{ width: '100%', height: '100%', background: 'transparent' }}
                onLoad={() => {
                  setStatus('loaded');
                  setDebug((prev) => prev || 'Modelo cargado correctamente.');
                }}
                onError={(event: Event) => {
                  setStatus('error');
                  setError(`model-viewer no pudo renderizar el archivo. ${String((event as CustomEvent)?.detail || '')}`);
                }}
              />
            )}

            {status === 'idle' && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-6 text-center backdrop-blur-sm"><Box className="h-16 w-16 text-yellow-300" /><h2 className="mt-5 text-3xl font-black">Iniciar visor 3D</h2><p className="mt-3 max-w-lg text-sm leading-7 text-zinc-400">El modelo solo se carga cuando presionas Start para evitar peso innecesario en móviles.</p><button onClick={() => void start()} className="mt-6 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black hover:bg-yellow-300"><Play className="h-4 w-4" /> Start</button></div>}
            {(status === 'checking' || (status === 'loading' && !scriptReady)) && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/70 p-6 text-center backdrop-blur-sm"><Loader2 className="h-10 w-10 animate-spin text-yellow-300" /><p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-yellow-300">{status === 'checking' ? 'Validando archivo' : 'Cargando motor 3D'}</p><p className="mt-2 text-xs text-zinc-400">Preparando visor móvil nativo.</p></div>}
            {status === 'error' && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-6 text-center backdrop-blur-sm"><AlertTriangle className="h-14 w-14 text-red-300" /><h2 className="mt-4 text-2xl font-black">No se pudo abrir el visor</h2><p className="mt-3 max-w-xl rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-7 text-red-100">{error}</p><button onClick={() => void copyDiagnostic()} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-bold"><Copy className="h-4 w-4" />{copied ? 'Copiado' : 'Copiar diagnóstico'}</button></div>}
            {status === 'loaded' && <div className="absolute left-4 top-4 rounded-full border border-emerald-400/30 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200"><CheckCircle2 className="mr-1 inline h-3 w-3" /> Cargado</div>}
          </div>
        </section>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-4 text-sm leading-7 text-zinc-400"><Rotate3D className="mr-2 inline h-4 w-4 text-yellow-300" />Controles: arrastra para rotar, pellizca para zoom y toca dos veces para centrar. Este visor usa model-viewer para mejor compatibilidad móvil.</div>
      </div>
    </main>
  );
}
