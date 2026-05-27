'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCcw,
  ScanSearch,
} from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

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

// Formats not supported by model-viewer (GLB / GLTF only)
const UNSUPPORTED: Record<string, string> = {
  dae: 'Collada (.dae)',
  fbx: 'FBX (.fbx)',
  obj: 'OBJ (.obj)',
  stl: 'STL (.stl)',
  '3ds': '3DS (.3ds)',
  blend: 'Blender (.blend)',
  ma: 'Maya (.ma)',
  mb: 'Maya Binary (.mb)',
  max: '3ds Max (.max)',
  c4d: 'Cinema 4D (.c4d)',
  ply: 'PLY (.ply)',
  usd: 'USD (.usd)',
};

function proxyUrl(url: string) {
  return `/api/presupuestos/model-proxy?url=${encodeURIComponent(url)}`;
}

function fileExt(url: string) {
  return url.split('?')[0].toLowerCase().split('.').pop() || '';
}

type Status = 'idle' | 'loading' | 'loaded' | 'error';
type ErrorKind = 'unsupported' | 'init' | 'load' | 'timeout';

export default function PresupuestoVisor3DPage() {
  const [modelUrl, setModelUrl] = useState('');
  const [modelName, setModelName] = useState('Modelo 3D');
  const [fileFormat, setFileFormat] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  // True only after @google/model-viewer has been imported and registered
  const [viewerReady, setViewerReady] = useState(false);
  const viewerRef = useRef<HTMLElement | null>(null);

  // Bootstrap: read URL params → import model-viewer → start loading
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const model = params.get('model') || '';
    const name = params.get('name') || params.get('modelName') || 'Modelo 3D';
    setModelUrl(model);
    setModelName(name);
    setReady(true);

    if (!model) return;

    const ext = fileExt(model);
    setFileFormat(ext);

    if (UNSUPPORTED[ext]) {
      setStatus('error');
      setErrorKind('unsupported');
      return;
    }

    // Dynamically import model-viewer to register the <model-viewer> custom element.
    // CRITICAL: must catch failure — if the import fails we must NOT set 'loading'
    // because <model-viewer> won't be registered and the browser renders it as a blank
    // div with dark background (the "black screen" the user sees).
    import('@google/model-viewer')
      .then(() => {
        setViewerReady(true);
        setStatus('loading');
      })
      .catch(() => {
        setStatus('error');
        setErrorKind('init');
        setErrorMsg(
          'No se pudo inicializar el visor 3D. Verifica tu conexión a internet y recarga la página.',
        );
      });
  }, []);

  // 75-second timeout: if model-viewer never fires onLoad, show a useful error
  // instead of leaving the user looking at a black screen forever.
  useEffect(() => {
    if (status !== 'loading') return;
    const t = setTimeout(() => {
      setStatus('error');
      setErrorKind('timeout');
      setErrorMsg(
        'El modelo tardó demasiado en cargar. El archivo puede ser muy pesado (>150 MB), estar dañado, o la URL haya expirado. Descárgalo y vuelve a subirlo en formato .glb optimizado.',
      );
    }, 75_000);
    return () => clearTimeout(t);
  }, [status]);

  function retry() {
    const ext = fileExt(modelUrl);
    if (UNSUPPORTED[ext]) return; // unsupported format — retrying won't help
    setErrorKind(null);
    setErrorMsg('');
    if (viewerReady) {
      // model-viewer already registered: unmount it briefly then remount
      setStatus('idle');
      setTimeout(() => setStatus('loading'), 50);
    } else {
      // Import failed last time — try again
      import('@google/model-viewer')
        .then(() => {
          setViewerReady(true);
          setStatus('loading');
        })
        .catch(() => {
          setStatus('error');
          setErrorKind('init');
          setErrorMsg('No se pudo cargar el motor del visor. Verifica tu conexión.');
        });
    }
  }

  async function copyDiagnostic() {
    await navigator.clipboard.writeText(
      JSON.stringify(
        { modelUrl, modelName, fileFormat, status, errorKind, errorMsg, proxy: proxyUrl(modelUrl), fecha: new Date().toISOString() },
        null,
        2,
      ),
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

  const unsupportedLabel = UNSUPPORTED[fileFormat] || fileFormat.toUpperCase();
  const showViewer = (status === 'loading' || status === 'loaded') && viewerReady;

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

            {/* model-viewer — kept mounted across loading→loaded so the model
                doesn't get re-downloaded when the status badge changes. */}
            {showViewer && (
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
                    setErrorKind('load');
                    setErrorMsg(
                      'No se pudo cargar el modelo. Verifica que sea un archivo .glb o .gltf válido, esté accesible públicamente y pese menos de 150 MB.',
                    );
                  }}
                />

                {/* Loading overlay — visible OVER model-viewer until onLoad fires.
                    Without this, the dark background looks like a "black screen". */}
                {status === 'loading' && (
                  <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 backdrop-blur-sm">
                    <Loader2 className="h-12 w-12 animate-spin text-yellow-400" />
                    <p className="mt-4 text-sm font-black uppercase tracking-[0.25em] text-yellow-400">
                      Cargando modelo
                    </p>
                    <p className="mt-2 max-w-xs text-center text-xs leading-6 text-zinc-500">
                      Archivos grandes pueden tardar varios minutos.<br />No cierres esta pestaña.
                    </p>
                  </div>
                )}

                {/* Loaded badge */}
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

            {/* Initiating spinner — while the import() call is in flight */}
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
              <div className="absolute inset-0 flex flex-col items-center justify-center overflow-auto bg-zinc-950 p-6 text-center">

                {/* ── Unsupported format ── */}
                {errorKind === 'unsupported' ? (
                  <>
                    <AlertTriangle className="h-12 w-12 text-orange-400" />
                    <h2 className="mt-4 text-xl font-black">Formato no compatible</h2>
                    <p className="mt-3 max-w-lg rounded-2xl border border-orange-400/20 bg-orange-400/5 p-4 text-sm leading-7 text-orange-200">
                      Tu archivo está en formato <strong>{unsupportedLabel}</strong>.<br />
                      El visor solo acepta <strong>.glb</strong> y <strong>.gltf</strong>.
                    </p>
                    <p className="mt-4 text-sm font-bold text-zinc-300">Conviértelo a .glb con alguna de estas herramientas gratuitas:</p>
                    <ul className="mt-2 space-y-1.5 text-sm text-zinc-400">
                      <li>
                        <strong className="text-white">Blender</strong> — Archivo → Exportar → glTF 2.0 (GLB)
                      </li>
                      <li>
                        <strong className="text-white">Convertio</strong> — Conversión online, hasta ~100 MB
                      </li>
                      <li>
                        <strong className="text-white">CloudConvert</strong> — Conversión online para archivos grandes
                      </li>
                    </ul>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      {modelUrl && (
                        <a
                          href={modelUrl}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-5 py-2.5 text-sm font-bold text-orange-100 hover:bg-orange-400/20 transition-colors"
                        >
                          <Download className="h-4 w-4" /> Descargar {fileFormat.toUpperCase()}
                        </a>
                      )}
                      <button
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold transition-colors hover:border-yellow-400/40"
                      >
                        <ArrowLeft className="h-4 w-4" /> Volver
                      </button>
                    </div>
                  </>
                ) : (
                  /* ── Other errors (init failed, load failed, timeout) ── */
                  <>
                    <AlertTriangle className="h-12 w-12 text-red-400" />
                    <h2 className="mt-4 text-xl font-black">No se pudo abrir el visor</h2>
                    <p className="mt-3 max-w-lg rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm leading-7 text-red-200">
                      {errorMsg || 'Error desconocido. Intenta de nuevo.'}
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-3">
                      <button
                        onClick={retry}
                        className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-black text-black hover:bg-yellow-300 transition-colors"
                      >
                        <RefreshCw className="h-4 w-4" /> Reintentar
                      </button>
                      {modelUrl && (
                        <a
                          href={modelUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold transition-colors hover:border-yellow-400/40"
                        >
                          <ExternalLink className="h-4 w-4" /> Abrir URL directa
                        </a>
                      )}
                      <button
                        onClick={() => void copyDiagnostic()}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold transition-colors hover:border-yellow-400/40"
                      >
                        <Copy className="h-4 w-4" />
                        {copied ? 'Copiado' : 'Copiar diagnóstico'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── Controls tip ────────────────────────────────────────────────── */}
        <p className="rounded-[1.5rem] border border-white/10 bg-black/40 p-4 text-sm leading-7 text-zinc-400">
          <RotateCcw className="mr-2 inline h-4 w-4 text-yellow-300" />
          <strong className="text-white">Controles:</strong> arrastra para rotar · pellizca o rueda para zoom · dos dedos para desplazar ·
          toca dos veces para centrar el modelo. Solo compatible con <strong className="text-white">.glb</strong> y <strong className="text-white">.gltf</strong>.
        </p>
      </div>
    </main>
  );
}
