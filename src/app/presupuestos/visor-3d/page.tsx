'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanSearch,
} from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

// Declare the <model-viewer> custom element for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          'auto-rotate'?: boolean | '';
          'camera-controls'?: boolean | '';
          'shadow-intensity'?: string;
          'shadow-softness'?: string;
          'environment-image'?: string;
          exposure?: string;
          ar?: boolean | '';
          'ar-modes'?: string;
          loading?: string;
          reveal?: string;
          'interaction-prompt'?: string;
          'rotation-per-second'?: string;
          'field-of-view'?: string;
        },
        HTMLElement
      >;
    }
  }
}

function proxyUrl(url: string) {
  return `/api/presupuestos/model-proxy?url=${encodeURIComponent(url)}`;
}

function fileExt(url: string) {
  return url.split('?')[0].toLowerCase().split('.').pop() || '';
}

type Status = 'idle' | 'loading' | 'loaded' | 'error';

export default function PresupuestoVisor3DPage() {
  const [modelUrl, setModelUrl] = useState('');
  const [modelName, setModelName] = useState('Modelo 3D');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const viewerRef = useRef<HTMLElement | null>(null);

  // ── Bootstrap: read URL params, register model-viewer, start loading
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const model = params.get('model') || '';
    const name = params.get('name') || params.get('modelName') || 'Modelo 3D';
    setModelUrl(model);
    setModelName(name);
    setReady(true);
    if (model) {
      const ext = fileExt(model);
      if (ext === 'dae') {
        setStatus('error');
        setError('El formato .dae (Collada) no es compatible con el visor. Convierte el archivo a .glb para visualizarlo. Puedes usar Blender (gratis) para exportarlo.');
      } else {
        // Dynamically import model-viewer to register the custom element
        import('@google/model-viewer').then(() => setStatus('loading')).catch(() => setStatus('loading'));
      }
    }
  }, []);

  function retry() {
    setError('');
    const ext = fileExt(modelUrl);
    if (ext === 'dae') {
      setStatus('error');
      setError('El formato .dae no es compatible. Convierte a .glb con Blender.');
      return;
    }
    setStatus('idle');
    setTimeout(() => setStatus('loading'), 50);
  }

  async function copyDiagnostic() {
    await navigator.clipboard.writeText(
      JSON.stringify({ modelUrl, modelName, status, error, proxy: proxyUrl(modelUrl), fecha: new Date().toISOString() }, null, 2),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function resetCamera() {
    const mv = viewerRef.current as any;
    mv?.resetTurntableRotation?.();
    mv?.jumpCameraToGoal?.();
  }

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.10),transparent_34%),#050505] px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-7xl gap-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/90 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <FabrickFullLogo theme="light" tagline="visor 3D" />
            <h1 className="mt-4 break-words text-2xl font-black sm:text-4xl">{modelName}</h1>
            <p className="mt-1 text-sm text-zinc-500">Visor 3D · arrastra para rotar · pellizca para zoom</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <button
              onClick={resetCamera}
              disabled={status !== 'loaded'}
              className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-100 hover:bg-yellow-400/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ScanSearch className="h-4 w-4" /> Centrar
            </button>
            {modelUrl && (
              <a
                href={modelUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/50 transition-colors"
              >
                <Download className="h-4 w-4" /> Descargar
              </a>
            )}
          </div>
        </header>

        {/* ── Viewer ─────────────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950 shadow-2xl shadow-black/40">
          <div className="relative h-[65vh] min-h-[440px] w-full sm:h-[75vh]">

            {/* model-viewer — Google's official 3D web component.
                Kept mounted across loading→loaded to prevent remount/re-download. */}
            {(status === 'loading' || status === 'loaded') && (
              <>
                <model-viewer
                  ref={viewerRef}
                  src={proxyUrl(modelUrl)}
                  alt={modelName}
                  auto-rotate=""
                  camera-controls=""
                  shadow-intensity="1.2"
                  shadow-softness="0.8"
                  exposure="1.1"
                  loading="eager"
                  reveal="auto"
                  rotation-per-second="20deg"
                  interaction-prompt="none"
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'block',
                    background: 'linear-gradient(180deg,#1a1a2e 0%,#0f0f1a 100%)',
                    // @ts-expect-error – CSS custom properties for model-viewer
                    '--poster-color': '#0f0f1a',
                    '--progress-bar-color': '#facc15',
                    '--progress-bar-height': '3px',
                  }}
                  onLoad={() => setStatus('loaded')}
                  onError={() => {
                    setStatus('error');
                    setError('No se pudo cargar el modelo. Verifica que el archivo sea un .glb o .gltf válido y esté accesible.');
                  }}
                />
                {status === 'loaded' && (
                  <>
                    <div className="pointer-events-none absolute left-4 top-4 z-10 flex gap-2">
                      <span className="rounded-full border border-emerald-400/30 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300 backdrop-blur-sm">
                        <CheckCircle2 className="mr-1 inline h-3 w-3" /> Cargado
                      </span>
                    </div>
                    <div className="pointer-events-none absolute bottom-4 right-4 z-10">
                      <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] text-zinc-400 backdrop-blur-sm">
                        Powered by Google model-viewer
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Loading spinner */}
            {status === 'idle' && modelUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 text-center">
                <Loader2 className="h-10 w-10 animate-spin text-yellow-400" />
                <p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-yellow-400">Iniciando visor</p>
              </div>
            )}

            {/* No URL */}
            {status === 'idle' && !modelUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
                <RotateCcw className="h-12 w-12 text-zinc-600" />
                <p className="mt-4 text-sm text-zinc-400">Abre esta página desde el panel de modelos 3D del administrador.</p>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-red-400" />
                <h2 className="mt-4 text-xl font-black">No se pudo abrir el visor</h2>
                <p className="mt-3 max-w-lg rounded-2xl border border-red-400/20 bg-red-400/8 p-4 text-sm leading-7 text-red-200">
                  {error}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={retry}
                    className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-black text-black hover:bg-yellow-300 transition-colors"
                  >
                    <RefreshCw className="h-4 w-4" /> Reintentar
                  </button>
                  <button
                    onClick={() => void copyDiagnostic()}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold transition-colors hover:border-yellow-400/40"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copiado' : 'Copiar diagnóstico'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── Controls tip ────────────────────────────────────────────────── */}
        <p className="rounded-[1.5rem] border border-white/10 bg-black/40 p-4 text-sm leading-7 text-zinc-400">
          <RotateCcw className="mr-2 inline h-4 w-4 text-yellow-300" />
          <strong className="text-white">Controles:</strong> arrastra para rotar · pellizca o rueda para zoom · dos dedos para desplazar ·
          toca dos veces para centrar el modelo.
        </p>
      </div>
    </main>
  );
}
