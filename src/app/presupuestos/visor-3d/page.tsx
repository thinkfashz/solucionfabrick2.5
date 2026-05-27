'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Box, CheckCircle2, Copy, Download, Loader2, Play, Rotate3D } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

type ViewerStatus = 'idle' | 'checking' | 'loading' | 'loaded' | 'error';

function proxyUrl(url: string) {
  return `/api/presupuestos/model-proxy?url=${encodeURIComponent(url)}`;
}

export default function PresupuestoVisor3DPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [modelUrl, setModelUrl] = useState('');
  const [modelName, setModelName] = useState('Modelo 3D del proyecto');
  const [status, setStatus] = useState<ViewerStatus>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    setModelUrl(url.searchParams.get('model') || '');
    setModelName(url.searchParams.get('name') || url.searchParams.get('modelName') || 'Modelo 3D del proyecto');
    setReady(true);
  }, []);

  useEffect(() => {
    if (status !== 'loading' || !modelUrl || !containerRef.current) return;
    let disposed = false;
    let renderer: any;
    let controls: any;
    let resizeObserver: ResizeObserver | undefined;
    let frameId = 0;

    async function mount() {
      const container = containerRef.current;
      if (!container) return;
      try {
        container.innerHTML = '';
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (disposed) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x050505);
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        camera.position.set(3, 2.2, 5);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(container.clientWidth || 800, container.clientHeight || 520);
        container.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.85));
        const light = new THREE.DirectionalLight(0xffffff, 2.2);
        light.position.set(4, 6, 4);
        scene.add(light);

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.35;

        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(proxyUrl(modelUrl));
        if (disposed) return;

        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z) || 1;
        model.position.sub(center);
        model.scale.setScalar(3 / maxAxis);
        scene.add(model);
        controls.target.set(0, 0, 0);
        controls.update();

        const resize = () => {
          if (!container || !renderer) return;
          const width = container.clientWidth || 800;
          const height = container.clientHeight || 520;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        const animate = () => {
          if (disposed) return;
          controls?.update();
          renderer?.render(scene, camera);
          frameId = window.requestAnimationFrame(animate);
        };
        setStatus('loaded');
        animate();
      } catch (err) {
        setStatus('error');
        setError((err as Error).message || 'No se pudo renderizar el modelo 3D.');
      }
    }

    void mount();

    return () => {
      disposed = true;
      if (frameId) window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      controls?.dispose?.();
      renderer?.dispose?.();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [status, modelUrl]);

  async function start() {
    if (!modelUrl) {
      setStatus('error');
      setError('No se recibió URL del modelo.');
      return;
    }
    setStatus('checking');
    setError('');
    try {
      const res = await fetch(proxyUrl(modelUrl), { cache: 'no-store' });
      if (!res.ok) throw new Error(`El archivo respondió HTTP ${res.status}`);
      setStatus('loading');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message || 'No se pudo validar el archivo.');
    }
  }

  async function copyDiagnostic() {
    await navigator.clipboard.writeText(JSON.stringify({ modelUrl, modelName, status, error, proxy: modelUrl ? proxyUrl(modelUrl) : null, fecha: new Date().toISOString() }, null, 2));
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
            <p className="mt-2 text-sm text-zinc-400">Visor aislado del presupuesto. Puedes rotar, mover y hacer zoom sin afectar la página del cliente.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/50"><ArrowLeft className="h-4 w-4" /> Volver</button>
            {modelUrl && <a href={modelUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/50"><Download className="h-4 w-4" /> Descargar</a>}
          </div>
        </header>

        <section className="overflow-hidden rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/90 shadow-2xl shadow-black/40">
          <div className="relative h-[62vh] min-h-[420px] w-full bg-black sm:h-[72vh]">
            {status === 'idle' && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center"><Box className="h-16 w-16 text-yellow-300" /><h2 className="mt-5 text-3xl font-black">Iniciar visor 3D</h2><p className="mt-3 max-w-lg text-sm leading-7 text-zinc-400">El modelo solo se carga cuando presionas Start para evitar peso innecesario en móviles.</p><button onClick={() => void start()} className="mt-6 inline-flex items-center gap-2 rounded-full bg-yellow-400 px-6 py-3 text-sm font-black text-black hover:bg-yellow-300"><Play className="h-4 w-4" /> Start</button></div>}
            {(status === 'checking' || status === 'loading') && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center"><Loader2 className="h-10 w-10 animate-spin text-yellow-300" /><p className="mt-4 text-xs font-black uppercase tracking-[0.3em] text-yellow-300">{status === 'checking' ? 'Validando archivo' : 'Cargando modelo'}</p></div>}
            {status === 'error' && <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center"><AlertTriangle className="h-14 w-14 text-red-300" /><h2 className="mt-4 text-2xl font-black">No se pudo abrir el visor</h2><p className="mt-3 max-w-xl rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-7 text-red-100">{error}</p><button onClick={() => void copyDiagnostic()} className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2 text-sm font-bold"><Copy className="h-4 w-4" />{copied ? 'Copiado' : 'Copiar diagnóstico'}</button></div>}
            <div ref={containerRef} className={`h-full w-full ${status === 'loaded' ? 'block' : 'hidden'}`} />
            {status === 'loaded' && <div className="absolute left-4 top-4 rounded-full border border-emerald-400/30 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200"><CheckCircle2 className="mr-1 inline h-3 w-3" /> Cargado</div>}
          </div>
        </section>

        <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-4 text-sm leading-7 text-zinc-400"><Rotate3D className="mr-2 inline h-4 w-4 text-yellow-300" />Controles: arrastra para rotar, pellizca o usa rueda para zoom, y arrastra con dos dedos para mover.</div>
      </div>
    </main>
  );
}
