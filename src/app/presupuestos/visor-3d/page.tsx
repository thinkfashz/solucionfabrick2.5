'use client';

import { useEffect, useRef, useState } from 'react';
import type { Object3D } from 'three';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Rotate3D,
  ScanSearch,
} from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

type ViewerStatus = 'idle' | 'loading' | 'loaded' | 'error';

function proxyUrl(url: string) {
  return `/api/presupuestos/model-proxy?url=${encodeURIComponent(url)}`;
}

function friendlyError(raw: string): string {
  if (!raw) return 'No se pudo renderizar el modelo 3D.';
  if (raw.includes('404') || raw.toLowerCase().includes('not found'))
    return 'Archivo no encontrado (404). Verifica que el modelo siga disponible.';
  if (raw.includes('403') || raw.toLowerCase().includes('forbidden'))
    return 'Acceso denegado (403). El archivo requiere autenticación.';
  if (raw.includes('413'))
    return 'El archivo supera el límite de tamaño del proxy (150 MB).';
  if (raw.toLowerCase().includes('json') || raw.toLowerCase().includes('unexpected token'))
    return 'Error al parsear el modelo. Verifica que sea un archivo .glb, .gltf o .dae válido y no esté corrupto.';
  if (raw.toLowerCase().includes('networkerror') || raw.toLowerCase().includes('failed to fetch'))
    return 'Error de red al descargar el modelo. Comprueba tu conexión e intenta de nuevo.';
  return raw;
}

export default function PresupuestoVisor3DPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fitRef = useRef<(() => void) | null>(null);
  const modelUrlRef = useRef('');

  const [modelUrl, setModelUrl] = useState('');
  const [modelName, setModelName] = useState('Modelo 3D del proyecto');
  const [status, setStatus] = useState<ViewerStatus>('idle');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);
  const [debug, setDebug] = useState('');

  // ── Read URL params → go straight to loading (no pre-fetch validation)
  // Validation via a GET to the proxy was causing the model to download
  // TWICE (once to validate, once via Three.js), which could freeze the
  // second request on low-bandwidth mobile connections.
  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const model = params.get('model') || '';
    const name = params.get('name') || params.get('modelName') || 'Modelo 3D del proyecto';
    modelUrlRef.current = model;
    setModelUrl(model);
    setModelName(name);
    setReady(true);
    if (model) setStatus('loading');
  }, []);

  function retry() {
    if (!modelUrlRef.current) return;
    setError('');
    setDebug('');
    setStatus('loading');
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
      // Small delay so the container has been laid out and has real dimensions
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      const container = containerRef.current;
      if (!container || disposed) return;

      try {
        container.innerHTML = '';

        // ── Lazy-import Three.js (keeps initial page bundle small) ────────
        const THREE = await import('three');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (disposed) return;

        // ── Scene ────────────────────────────────────────────────────────
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        const w0 = Math.max(container.clientWidth || window.innerWidth || 800, 320);
        const h0 = Math.max(container.clientHeight || 520, 320);
        const camera = new THREE.PerspectiveCamera(45, w0 / h0, 0.001, 50000);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w0, h0, false);
        renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.4;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(renderer.domElement);

        // ── Lighting ─────────────────────────────────────────────────────
        scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.2));
        scene.add(new THREE.AmbientLight(0xffffff, 1.0));
        const key = new THREE.DirectionalLight(0xffffff, 4.0);
        key.position.set(8, 14, 8);
        key.castShadow = true;
        key.shadow.mapSize.set(2048, 2048);
        key.shadow.camera.near = 0.1;
        key.shadow.camera.far = 500;
        key.shadow.bias = -0.0005;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xcce8ff, 2.0);
        fill.position.set(-8, 6, -6);
        scene.add(fill);
        const rim = new THREE.DirectionalLight(0xfff4cc, 1.2);
        rim.position.set(0, -5, -12);
        scene.add(rim);

        // ── Grid ─────────────────────────────────────────────────────────
        const grid = new THREE.GridHelper(30, 30, 0xfacc15, 0x222244);
        scene.add(grid);

        // ── Controls ─────────────────────────────────────────────────────
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.zoomSpeed = 1.2;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.4;
        controls.minDistance = 0.05;
        controls.maxDistance = 10000;

        // ── Format-aware loader ───────────────────────────────────────────
        const urlExt = modelUrl.split('?')[0].toLowerCase().split('.').pop() || '';
        let model: Object3D;

        if (urlExt === 'dae') {
          const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js');
          if (disposed) return;
          const colladaData = await new ColladaLoader().loadAsync(proxyUrl(modelUrl));
          if (!colladaData?.scene) throw new Error('El archivo DAE cargó pero no contiene geometría.');
          model = colladaData.scene;
        } else if (urlExt === 'glb' || urlExt === 'gltf' || urlExt === '') {
          const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
          if (disposed) return;
          const gltfData = await new GLTFLoader().loadAsync(proxyUrl(modelUrl));
          model = gltfData.scene;
        } else {
          throw new Error(`Formato .${urlExt} no soportado. Usa .glb, .gltf o .dae.`);
        }

        if (disposed) return;

        // ── Material cleanup ──────────────────────────────────────────────
        // DAE/GLB models loaded through the proxy can have external texture
        // references that resolve to broken URLs. Strip all texture maps so
        // the base diffuse color is always used — the geometry is always
        // visible even when textures can't be loaded from the proxy.
        let meshCount = 0;
        const fallback = new THREE.MeshStandardMaterial({ color: 0xd4c5a9, roughness: 0.6, metalness: 0.05, side: THREE.DoubleSide });

        model.traverse((obj: any) => {
          if (!obj?.isMesh) return;
          meshCount += 1;
          obj.visible = true;
          obj.frustumCulled = false;
          obj.receiveShadow = true;
          obj.castShadow = true;

          const mats: any[] = obj.material
            ? Array.isArray(obj.material) ? obj.material : [obj.material]
            : [];

          if (!mats.length) { obj.material = fallback.clone(); return; }

          mats.forEach((m: any) => {
            // Strip all texture maps — they use relative paths that fail through proxy
            m.map = null;
            m.normalMap = null;
            m.roughnessMap = null;
            m.metalnessMap = null;
            m.aoMap = null;
            m.emissiveMap = null;
            m.lightMap = null;
            m.bumpMap = null;
            m.displacementMap = null;
            m.envMap = null;
            m.alphaMap = null;
            m.side = THREE.DoubleSide;
            m.transparent = false;
            m.opacity = 1;
            // Ensure the base color is visible (not black)
            if (!m.color || (m.color.r < 0.05 && m.color.g < 0.05 && m.color.b < 0.05)) {
              m.color = new THREE.Color(0xd4c5a9);
            }
            m.needsUpdate = true;
          });
        });

        if (meshCount === 0) throw new Error('El modelo no contiene mallas visibles. El archivo puede estar vacío o dañado.');

        // ── Center + scale model to fit ───────────────────────────────────
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxAxis = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(maxAxis) || maxAxis <= 0) throw new Error('No se pudo calcular el tamaño del modelo.');

        model.position.sub(center);
        model.scale.setScalar(4 / maxAxis);
        scene.add(model);

        // Reposition grid under model
        const scaled = new THREE.Box3().setFromObject(model);
        grid.position.y = scaled.min.y - 0.001;

        setDebug(`${urlExt.toUpperCase()} · ${meshCount} mallas · ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}`);

        // ── Camera fit ───────────────────────────────────────────────────
        const fitCamera = () => {
          const b = new THREE.Box3().setFromObject(model);
          const s = b.getSize(new THREE.Vector3());
          const c = b.getCenter(new THREE.Vector3());
          const radius = Math.max(s.x, s.y, s.z, 0.5);
          const dist = (radius / (2 * Math.tan((camera.fov * Math.PI) / 360))) * 2.2;
          camera.position.set(c.x + dist * 0.9, c.y + dist * 0.65, c.z + dist);
          camera.near = Math.max(dist / 200, 0.001);
          camera.far = dist * 500;
          camera.lookAt(c);
          camera.updateProjectionMatrix();
          controls.target.copy(c);
          controls.update();
        };
        fitRef.current = fitCamera;
        fitCamera();

        // ── Resize handler ───────────────────────────────────────────────
        const onResize = () => {
          if (!container || disposed) return;
          const w = Math.max(container.clientWidth || window.innerWidth || 800, 320);
          const h = Math.max(container.clientHeight || 520, 320);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h, false);
          renderer.render(scene, camera);
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
          setError(friendlyError((err as Error).message || ''));
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(250,204,21,0.10),transparent_34%),#050505] px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-7xl gap-5">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex flex-col gap-4 rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/90 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <FabrickFullLogo theme="light" tagline="visor 3D" />
            <h1 className="mt-4 break-words text-2xl font-black sm:text-4xl">{modelName}</h1>
            <p className="mt-1 text-sm text-zinc-500">Visor aislado · rota, mueve y haz zoom libremente</p>
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

        {/* ── Viewer ─────────────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950 shadow-2xl shadow-black/40">
          <div className="relative h-[65vh] min-h-[440px] w-full sm:h-[75vh]">

            {/* Canvas container — Three.js appends its canvas here */}
            <div ref={containerRef} className="absolute inset-0" />

            {/* Loading */}
            {status === 'loading' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center">
                <Loader2 className="h-12 w-12 animate-spin text-yellow-400" />
                <p className="mt-5 text-xs font-black uppercase tracking-[0.3em] text-yellow-400">
                  Cargando modelo 3D
                </p>
                <p className="mt-2 text-xs text-zinc-500">Descargando geometría y materiales…</p>
              </div>
            )}

            {/* No URL */}
            {status === 'idle' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center">
                <p className="text-sm text-zinc-400">Sin modelo · navega desde el administrador para cargar uno.</p>
              </div>
            )}

            {/* Error */}
            {status === 'error' && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/90 p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-red-400" />
                <h2 className="mt-4 text-xl font-black">No se pudo abrir el visor</h2>
                <p className="mt-3 max-w-lg rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-7 text-red-200">
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
              <div className="absolute left-4 top-4 z-10 rounded-full border border-emerald-400/30 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300 backdrop-blur-sm pointer-events-none">
                <CheckCircle2 className="mr-1 inline h-3 w-3" /> Cargado
              </div>
            )}
          </div>
        </section>

        {/* ── Controls tip ────────────────────────────────────────────────── */}
        <p className="rounded-[1.5rem] border border-white/10 bg-black/40 p-4 text-sm leading-7 text-zinc-400">
          <Rotate3D className="mr-2 inline h-4 w-4 text-yellow-300" />
          <strong className="text-white">Controles:</strong> arrastra para rotar · rueda / pellizca para zoom · dos dedos para desplazar ·{' '}
          <span className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5 font-mono text-xs text-white">Centrar</span> si el modelo queda fuera de pantalla.
        </p>
      </div>
    </main>
  );
}
