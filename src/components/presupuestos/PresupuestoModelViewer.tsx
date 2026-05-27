'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Center, Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { AlertTriangle, Box, CheckCircle2, Copy, Download, Loader2, Maximize2, Play, Rotate3D, Wifi } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import type { PresupuestoArchivo } from '@/lib/presupuestosBuilder';

type ViewerStatus = 'idle' | 'checking-url' | 'intro' | 'rendering' | 'loaded' | 'error';

type ModelProps = { url: string; onLoaded: () => void };

function Model({ url, onLoaded }: ModelProps) {
  const gltf = useGLTF(url);
  useEffect(() => {
    onLoaded();
  }, [gltf, onLoaded]);
  return <primitive object={gltf.scene} />;
}

function modelSupported(file: PresupuestoArchivo) {
  const format = (file.formato || file.url.split('?')[0].split('.').pop() || '').toLowerCase();
  return ['glb', 'gltf'].includes(format);
}

function proxiedModelUrl(url: string, origin: string) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (origin && parsed.origin === origin) return url;
    return `/api/presupuestos/model-proxy?url=${encodeURIComponent(url)}`;
  } catch {
    return url;
  }
}

function buildDiagnostics(selected: PresupuestoArchivo | undefined, status: ViewerStatus, error: string, resolvedUrl: string) {
  return JSON.stringify({
    modulo: 'PresupuestoModelViewer',
    status,
    error: error || null,
    modelo: selected ? {
      nombre: selected.nombre,
      url_original: selected.url,
      url_resuelta: resolvedUrl,
      formato: selected.formato,
      mostrar_cliente: selected.mostrar_cliente,
    } : null,
    ayuda: [
      'La URL externa se carga mediante /api/presupuestos/model-proxy para evitar CORS.',
      'Verifica que la URL original sea pública y abra en una pestaña anónima.',
      'Verifica que el archivo sea GLB o GLTF real, no DB/ZIP renombrado.',
      'Si el proxy responde 502, el storage externo está bloqueando o no entregando el archivo.',
    ],
    fecha: new Date().toISOString(),
  }, null, 2);
}

export default function PresupuestoModelViewer({ archivos }: { archivos?: PresupuestoArchivo[] }) {
  const models = useMemo(() => (archivos || []).filter((file) => file.mostrar_cliente !== false && file.url && modelSupported(file)).sort((a, b) => a.orden - b.orden), [archivos]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [loadingIntro, setLoadingIntro] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [status, setStatus] = useState<ViewerStatus>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState('');
  const selected = models[selectedIndex];
  const resolvedUrl = selected?.url ? proxiedModelUrl(selected.url, origin) : '';

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setStarted(false);
    setLoadingIntro(false);
    setShowCanvas(false);
    setStatus('idle');
    setError('');
  }, [selected?.url]);

  if (!models.length) return null;

  async function checkModelUrl(url: string) {
    setStatus('checking-url');
    setError('');
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`La URL respondió HTTP ${res.status}${body ? ` · ${body.slice(0, 160)}` : ''}`);
      }
      const contentType = res.headers.get('content-type') || 'sin content-type';
      if (contentType.includes('text/html')) throw new Error('La URL devuelve HTML, no un archivo GLB/GLTF. Revisa que sea un link directo al archivo.');
      return true;
    } catch (err) {
      const message = (err as Error).message || 'No se pudo consultar la URL del modelo.';
      setStatus('error');
      setError(`Error revisando URL: ${message}`);
      return false;
    }
  }

  async function startViewer() {
    if (!selected?.url || !resolvedUrl) return;
    setStarted(true);
    setShowCanvas(false);
    const ok = await checkModelUrl(resolvedUrl);
    if (!ok) return;
    setLoadingIntro(true);
    setStatus('intro');
    window.setTimeout(() => {
      setLoadingIntro(false);
      setShowCanvas(true);
      setStatus('rendering');
    }, 2000);
  }

  function handleLoaded() {
    setStatus('loaded');
    setError('');
  }

  async function copyDiagnostics() {
    await navigator.clipboard.writeText(buildDiagnostics(selected, status, error, resolvedUrl));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="overflow-hidden rounded-[1.75rem] border border-yellow-400/20 bg-zinc-950/90 shadow-2xl shadow-black/30">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="relative min-h-[420px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(250,204,21,0.16),transparent_42%),#050505]">
          {!started && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 text-center">
              <div className="mb-6 rounded-3xl border border-yellow-400/20 bg-black/55 p-5 shadow-2xl backdrop-blur-xl"><FabrickFullLogo theme="light" tagline="visor 3D" /></div>
              <h3 className="max-w-xl text-3xl font-black text-white sm:text-5xl">Modelo 3D interactivo del proyecto</h3>
              <p className="mt-4 max-w-lg text-sm leading-7 text-zinc-400">Presiona Start para validar la URL, cargar el modelo y activar rotación, zoom y movimiento.</p>
              <button onClick={() => void startViewer()} className="mt-7 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black shadow-lg shadow-yellow-400/20 hover:bg-yellow-300"><Play className="h-4 w-4" /> Start visor 3D</button>
            </div>
          )}

          {started && status === 'checking-url' && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
              <Wifi className="h-10 w-10 animate-pulse text-yellow-300" />
              <p className="mt-4 text-xs font-black uppercase tracking-[0.28em] text-yellow-300">Probando URL del modelo</p>
              <p className="mt-2 max-w-md text-sm text-zinc-400">Verificando el modelo mediante proxy seguro para evitar bloqueo CORS.</p>
            </div>
          )}

          {started && loadingIntro && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
              <div className="relative rounded-3xl border border-yellow-400/30 bg-zinc-950 p-6 shadow-[0_0_70px_rgba(250,204,21,0.18)]"><div className="absolute -inset-1 rounded-3xl bg-yellow-400/10 blur-2xl" /><div className="relative"><FabrickFullLogo theme="light" tagline="cargando proyecto" /></div></div>
              <Loader2 className="mt-6 h-8 w-8 animate-spin text-yellow-300" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.28em] text-yellow-300">Preparando experiencia 3D</p>
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/95 p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-red-300" />
              <h3 className="mt-4 text-2xl font-black text-white">No se pudo cargar el modelo</h3>
              <p className="mt-3 max-w-xl rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-7 text-red-100">{error}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <button onClick={() => void startViewer()} className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-black text-black">Reintentar</button>
                <button onClick={() => void copyDiagnostics()} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-bold text-white"><Copy className="h-4 w-4" />{copied ? 'Copiado' : 'Copiar diagnóstico'}</button>
              </div>
            </div>
          )}

          {showCanvas && selected && resolvedUrl && status !== 'error' && (
            <div className="h-[420px] w-full sm:h-[560px]">
              <Canvas camera={{ position: [3, 2, 5], fov: 45 }} dpr={[1, 1.5]} onCreated={() => setStatus('rendering')}>
                <ambientLight intensity={0.7} />
                <directionalLight position={[4, 6, 4]} intensity={2.2} />
                <Suspense fallback={null}>
                  <Center><Model url={resolvedUrl} onLoaded={handleLoaded} /></Center>
                  <Environment preset="warehouse" />
                </Suspense>
                <OrbitControls makeDefault enablePan enableZoom enableRotate autoRotate autoRotateSpeed={0.35} />
              </Canvas>
              <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-yellow-200 backdrop-blur">{status === 'loaded' ? 'Cargado' : 'Renderizando'}</div>
            </div>
          )}
        </div>

        <aside className="border-t border-white/10 bg-black/50 p-5 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Archivo técnico</p>
          <h3 className="mt-2 text-xl font-black text-white">{selected?.nombre || 'Modelo 3D'}</h3>
          <p className="mt-3 text-sm leading-7 text-zinc-400">{selected?.descripcion || 'Modelo visual para revisar el proyecto antes de aprobar la fabricación.'}</p>
          <div className="mt-5 grid gap-2 text-xs text-zinc-400">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><Box className="mr-2 inline h-4 w-4 text-yellow-300" />Formato: {(selected?.formato || 'glb').toUpperCase()}</div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3"><Rotate3D className="mr-2 inline h-4 w-4 text-yellow-300" />Estado: {status}</div>
            {status === 'loaded' && <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-100"><CheckCircle2 className="mr-2 inline h-4 w-4" />Modelo cargado correctamente</div>}
          </div>
          <div className="mt-5 grid gap-2">
            <button onClick={() => void startViewer()} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-4 py-3 text-sm font-black text-black hover:bg-yellow-300"><Maximize2 className="h-4 w-4" /> Reiniciar visor</button>
            {selected?.url && <a href={selected.url} target="_blank" rel="noreferrer" download className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white hover:border-yellow-400/40"><Download className="h-4 w-4" /> Descargar modelo</a>}
            <button onClick={() => void copyDiagnostics()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white hover:border-yellow-400/40"><Copy className="h-4 w-4" /> {copied ? 'Diagnóstico copiado' : 'Copiar diagnóstico'}</button>
          </div>
          {models.length > 1 && <div className="mt-5 grid gap-2">{models.map((model, index) => <button key={model.id} onClick={() => setSelectedIndex(index)} className={`rounded-2xl border px-3 py-2 text-left text-xs font-bold ${index === selectedIndex ? 'border-yellow-400/50 bg-yellow-400/10 text-yellow-200' : 'border-white/10 text-zinc-400'}`}>{model.nombre || `Modelo ${index + 1}`}</button>)}</div>}
        </aside>
      </div>
    </section>
  );
}
