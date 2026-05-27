'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Rotate3D,
  ScanSearch,
} from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

type ViewerStatus = 'idle' | 'checking' | 'loading' | 'loaded' | 'error';

function proxyUrl(url: string) {
  return `/api/presupuestos/model-proxy?url=${encodeURIComponent(url)}`;
}

export default function PresupuestoVisor3DPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitRef = useRef<(() => void) | null>(null);

  const [modelUrl, setModelUrl] = useState('');
  const [modelName, setModelName] = useState('Modelo 3D del proyecto');
  const [status, setStatus] = useState<ViewerStatus>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [debug, setDebug] = useState('');

  // ── Read URL params and auto-start ───────────────────────────────────────
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const model = params.get('model') || '';
    const name = params.get('name') || params.get('modelName') || 'Modelo 3D del proyecto';
    setModelUrl(model);
    setModelName(name);
    setReady(true);

    if (model) {
      // Auto-validate and load without requiring a click
      beginLoad(model);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Validation + status transition ──────────────────────────────────────
  async function beginLoad(url: string) {
    setStatus('checking');
    setError('');
    setDebug('');
    try {
      const res = await fetch(proxyUrl(url), { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`El archivo respondió HTTP ${res.status}${body ? ` · ${body.slice(0, 200)}` : ''}`);
      }
      const type = res.headers.get('content-type') || '';
      const size = res.headers.get('content-length');
      if (type.includes('text/html')) throw new Error('La URL devuelve HTML en lugar de un archivo GLB/GLTF. Verifica que la URL sea directa al modelo.');
      setDebug(size ? `${type} · ${(Number(size) / 1024 / 1024).toFixed(1)} MB` : type);
      setStatus('loading');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message || 'No se pudo validar el archivo.');
    }
  }

  function retry() {
    if (!modelUrl) return;
    beginLoad(modelUrl);
  }

  // ── Three.js scene ───────────────────────────────────────────────────────
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

        // ── Scene setup ──────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);

        const width = Math.max(container.clientWidth || window.innerWidth || 800, 320);
        const height = Math.max(container.clientHeight || 520, 320);
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 20000);
        camera.position.set(6, 4, 8);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(width, height, false);
        renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;';
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.35;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // ── Lighting ─────────────────────────────────────────────────────
        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.8));
        scene.add(new THREE.AmbientLight(0xffffff, 1.2));
        const key = new THREE.DirectionalLight(0xffffff, 4.5);
        key.position.set(8, 12, 8);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.near = 0.1;
        key.shadow.camera.far = 200;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 1.8);
        fill.position.set(-8, 5, -6);
        scene.add(fill);
        const back = new THREE.DirectionalLight(0xffffff, 1.2);
        back.position.set(0, -4, -10);
        scene.add(back);

        // ── Grid ─────────────────────────────────────────────────────────
        const grid = new THREE.GridHelper(20, 20, 0xfacc15, 0x333333);
        scene.add(grid);

        // ── Controls ─────────────────────────────────────────────────────
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.zoomSpeed = 1.2;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;
        controls.minDistance = 0.1;
        controls.maxDistance = 2000;

        // ── Load GLB ─────────────────────────────────────────────────────
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(proxyUrl(modelUrl));
        if (disposed) return;

        const model = gltf.scene;
        let meshCount = 0;
        const fallbackMaterial = new THREE.MeshStandardMaterial({
          color: 0xe8e4dc,
          roughness: 0.55,
          metalness: 0.06,
          side: THREE.DoubleSide,
        });

        model.traverse((obj: any) => {
          if (!obj?.isMesh) return;
          meshCount += 1;
          obj.visible = true;
          obj.frustumCulled = false;
          obj.receiveShadow = true;
          obj.castShadow = true;
          const original = obj.material;
          const mats: any[] = original ? (Array.isArray(original) ? original : [original]) : [];
          const unusable =
            !mats.length ||
            mats.every((m: any) => {
              const transparent = m.transparent === true && (m.opacity ?? 1) <= 0.05;
              const black = m.color && m.color.r < 0.02 && m.color.g < 0.02 && m.color.b < 0.02;
              return transparent || black;
            });
          if (unusable) {
            obj.material = fallbackMaterial.clone();
          } else {
            mats.forEach((m: any) => {
              m.side = THREE.DoubleSide;
              if (m.color && m.color.r < 0.02 && m.color.g < 0.02 && m.color.b < 0.02) m.color.set(0xe8e4dc);
              m.needsUpdate = true;
            });
          }
        });

        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(maxAxis) || maxAxis <= 0) {
          throw new Error('El modelo cargó pero no tiene geometría visible. Verifica que el archivo GLB no esté vacío o dañado.');
        }

        // Center and scale model
        model.position.sub(center);
        const targetSize = 4;
        model.scale.setScalar(targetSize / maxAxis);
        scene.add(model);

        // Reposition grid under model
        const scaledBox = new THREE.Box3().setFromObject(model);
        const minY = scaledBox.min.y;
        grid.position.y = minY - 0.001;

        // ── Camera fit ───────────────────────────────────────────────────
        const fitCamera = () => {
          const b = new THREE.Box3().setFromObject(model);
          const s = b.getSize(new THREE.Vector3());
          const c = b.getCenter(new THREE.Vector3());
          const radius = Math.max(s.x, s.y, s.z, 0.5);
          const dist = (radius / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 2.0;
          camera.position.set(c.x + dist * 0.8, c.y + dist * 0.6, c.z + dist);
          camera.near = Math.max(dist / 100, 0.001);
          camera.far = dist * 200;
          camera.lookAt(c);
          camera.updateProjectionMatrix();
          controls.target.copy(c);
          controls.update();
        };
        fitRef.current = fitCamera;
        fitCamera();

        setDebug((prev) => `${prev ? prev + ' · ' : ''}Mallas: ${meshCount} · ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)} m`);

        // ── Resize handler ───────────────────────────────────────────────
        const onResize = () => {
          if (!container || !renderer) return;
          const w = Math.max(container.clientWidth || window.innerWidth || 800, 320);
          const h = Math.max(container.clientHeight || 520, 320);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
        };
        resizeObserver = new ResizeObserver(onResize);
        resizeObserver.observe(container);
        onResize();

        // ── Render loop ──────────────────────────────────────────────────
        const animate = () => {
          if (disposed) return;
          controls?.update();
          renderer?.render(scene, camera);
          frameId = window.requestAnimationFrame(animate);
        };
        animate();
        setStatus('loaded');
      } catch (err) {
        if (!disposed) {
          setStatus('error');
          setError((err as Error).message || 'No se pudo renderizar el modelo 3D.');
        }
      }
    }

    void mount();

    return () => {
      disposed = true;
      fitRef.current = null;
      if (frameId) window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      controls?.dispose?.();
      renderer?.dispose?.();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [status, modelUrl]);

  async function copyDiagnostic() {
    await navigator.clipboard.writeText(
      JSON.stringify({ modelUrl, modelName, status, error, debug, proxy: modelUrl ? proxyUrl(modelUrl) : null, fecha: new Date().toISOString() }, null, 2),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!ready) return null;

  const isWorking = status === 'checking' || status === 'loading';

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.12),transparent_34%),#050505] px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-7xl gap-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/90 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <FabrickFullLogo theme="light" tagline="visor 3D" />
            <h1 className="mt-4 break-words text-2xl font-black sm:text-4xl">{modelName}</h1>
            <p className="mt-1 text-sm text-zinc-500">Visor aislado del presupuesto · rota, mueve y haz zoom sin afectar la página del cliente</p>
            {debug && (
              <p className="mt-2 inline-block rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-100">
                {debug}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
            <button
              onClick={() => fitRef.current?.()}
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

        {/* ── Viewer canvas ───────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/90 shadow-2xl shadow-black/40">
          <div className="relative h-[65vh] min-h-[440px] w-full bg-zinc-900 sm:h-[75vh]">

            {/* Canvas container */}
            <div ref={containerRef} className="absolute inset-0" />

            {/* Loading overlay */}
            {isWorking && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/75 p-6 text-center backdrop-blur-sm">
                <Loader2 className="h-12 w-12 animate-spin text-yellow-300" />
                <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-yellow-300">
                  {status === 'checking' ? 'Verificando archivo' : 'Cargando modelo 3D'}
                </p>
                <p className="mt-2 text-xs text-zinc-400">
                  {status === 'checking' ? 'Comprobando acceso al archivo...' : 'Preparando cámara, materiales y geometría...'}
                </p>
              </div>
            )}

            {/* No URL state */}
            {status === 'idle' && !modelUrl && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-6 text-center backdrop-blur-sm">
                <Box className="h-16 w-16 text-yellow-300" />
                <h2 className="mt-5 text-2xl font-black">Sin modelo</h2>
                <p className="mt-3 max-w-sm text-sm leading-7 text-zinc-400">
                  Navega a esta página desde la lista de presupuestos o el panel de modelos 3D del administrador.
                </p>
              </div>
            )}

            {/* Error overlay */}
            {status === 'error' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/85 p-6 text-center backdrop-blur-sm">
                <AlertTriangle className="h-14 w-14 text-red-300" />
                <h2 className="mt-4 text-2xl font-black">No se pudo abrir el visor</h2>
                <p className="mt-3 max-w-xl rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-7 text-red-100">
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
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold hover:border-yellow-400/40 transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copiado' : 'Copiar diagnóstico'}
                  </button>
                </div>
              </div>
            )}

            {/* Loaded badge */}
            {status === 'loaded' && (
              <div className="absolute left-4 top-4 z-10 rounded-full border border-emerald-400/30 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200 backdrop-blur-sm">
                <CheckCircle2 className="mr-1 inline h-3 w-3" /> Cargado
              </div>
            )}

            {/* Auto-rotate badge */}
            {status === 'loaded' && (
              <div className="absolute right-4 bottom-4 z-10 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-bold text-zinc-400 backdrop-blur-sm">
                rotación automática activa
              </div>
            )}
          </div>
        </section>

        {/* ── Controls tip ────────────────────────────────────────────────── */}
        <div className="rounded-[1.5rem] border border-white/10 bg-black/40 p-4 text-sm leading-7 text-zinc-400">
          <Rotate3D className="mr-2 inline h-4 w-4 text-yellow-300" />
          <strong className="text-white">Controles:</strong> arrastra para rotar · pellizca o usa la rueda para zoom · arrastra con dos dedos para desplazar · pulsa{' '}
          <span className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">Centrar</span> si el modelo queda fuera de pantalla.
        </div>
      </div>
    </main>
  );
}
