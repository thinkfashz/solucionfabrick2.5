'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Copy, Download, ExternalLink, Loader2, RefreshCw, RotateCcw, ScanSearch } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';

function proxyUrl(url: string) {
  return `/api/presupuestos/model-proxy?url=${encodeURIComponent(url)}`;
}

function fileExt(url: string) {
  return url.split('?')[0].toLowerCase().split('.').pop() || '';
}

type Status = 'idle' | 'checking' | 'loading' | 'loaded' | 'error';
type ErrorKind = 'unsupported_zip' | 'unsupported' | 'load' | 'missing_url';

export default function PresupuestoVisor3DPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const centerRef = useRef<(() => void) | null>(null);
  const [modelUrl, setModelUrl] = useState('');
  const [modelName, setModelName] = useState('Modelo 3D');
  const [fileFormat, setFileFormat] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorKind, setErrorKind] = useState<ErrorKind | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [debug, setDebug] = useState('');
  const [copied, setCopied] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const model = params.get('model') || '';
    const name = params.get('name') || params.get('modelName') || 'Modelo 3D';
    const ext = fileExt(model);
    setModelUrl(model);
    setModelName(name);
    setFileFormat(ext);
    setReady(true);

    if (!model) {
      setStatus('error');
      setErrorKind('missing_url');
      setErrorMsg('No se recibió la URL del archivo 3D. Abre el visor desde la card del presupuesto o desde el admin.');
      return;
    }

    if (ext === 'zip') {
      setStatus('error');
      setErrorKind('unsupported_zip');
      setErrorMsg('El ZIP no se puede visualizar directamente todavía. Extrae el archivo .dae/.gltf/.glb y súbelo por separado, o convierte el paquete a .glb bien empaquetado.');
      return;
    }

    if (!['glb', 'gltf', 'dae'].includes(ext)) {
      setStatus('error');
      setErrorKind('unsupported');
      setErrorMsg(`Formato .${ext || 'desconocido'} no compatible. Usa .glb, .gltf o .dae.`);
      return;
    }

    setStatus('checking');
  }, []);

  useEffect(() => {
    if (status !== 'checking' || !modelUrl) return;
    let cancelled = false;
    async function validate() {
      try {
        const res = await fetch(proxyUrl(modelUrl), { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`El archivo respondió HTTP ${res.status}${body ? ` · ${body.slice(0, 140)}` : ''}`);
        }
        if (cancelled) return;
        const type = res.headers.get('content-type') || 'sin content-type';
        const size = res.headers.get('content-length') || 'sin tamaño';
        if (type.includes('text/html')) throw new Error('La URL devuelve HTML, no un archivo 3D directo.');
        setDebug(`Validado: ${fileFormat.toUpperCase()} · ${type} · ${size} bytes`);
        setStatus('loading');
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setErrorKind('load');
        setErrorMsg((err as Error).message || 'No se pudo validar el archivo 3D.');
      }
    }
    void validate();
    return () => {
      cancelled = true;
    };
  }, [status, modelUrl, fileFormat]);

  useEffect(() => {
    if (status !== 'loading' || !modelUrl || !containerRef.current) return;

    let disposed = false;
    let renderer: any;
    let controls: any;
    let frameId = 0;
    let resizeObserver: ResizeObserver | undefined;

    async function mountViewer() {
      const container = containerRef.current;
      if (!container) return;

      try {
        container.innerHTML = '';
        const THREE = await import('three');
        const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
        const { ColladaLoader } = await import('three/examples/jsm/loaders/ColladaLoader.js');
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
        if (disposed) return;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x151515);

        const width = Math.max(container.clientWidth || window.innerWidth || 800, 320);
        const height = Math.max(container.clientHeight || 520, 320);
        const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 10000);
        camera.position.set(5, 4, 7);

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.setSize(width, height, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.45;
        container.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x777777, 3));
        scene.add(new THREE.AmbientLight(0xffffff, 1.8));
        const key = new THREE.DirectionalLight(0xffffff, 4);
        key.position.set(6, 10, 8);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xffffff, 2.2);
        fill.position.set(-7, 4, -6);
        scene.add(fill);
        const grid = new THREE.GridHelper(8, 16, 0xf4c400, 0x555555);
        grid.position.y = -1.7;
        scene.add(grid);
        scene.add(new THREE.AxesHelper(2.2));

        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.enablePan = true;
        controls.enableZoom = true;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.28;

        let model: any;
        if (fileFormat === 'dae') {
          const collada = await new ColladaLoader().loadAsync(proxyUrl(modelUrl));
          model = collada.scene;
        } else {
          const gltf = await new GLTFLoader().loadAsync(proxyUrl(modelUrl));
          model = gltf.scene;
        }
        if (disposed) return;

        let meshCount = 0;
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, roughness: 0.62, metalness: 0.05, side: THREE.DoubleSide });
        model.traverse((obj: any) => {
          if (!obj?.isMesh) return;
          meshCount += 1;
          obj.visible = true;
          obj.frustumCulled = false;
          const materials = obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : [];
          const unusable = !materials.length || materials.every((mat: any) => {
            const alpha = mat.opacity ?? 1;
            const transparent = mat.transparent && alpha <= 0.08;
            const black = mat.color && mat.color.r < 0.025 && mat.color.g < 0.025 && mat.color.b < 0.025;
            return transparent || black;
          });
          if (unusable) {
            obj.material = fallbackMaterial.clone();
            return;
          }
          materials.forEach((mat: any) => {
            mat.side = THREE.DoubleSide;
            mat.transparent = false;
            mat.opacity = 1;
            if (mat.color && mat.color.r < 0.025 && mat.color.g < 0.025 && mat.color.b < 0.025) mat.color.set(0xf4f4f5);
            mat.needsUpdate = true;
          });
        });

        const originalBox = new THREE.Box3().setFromObject(model);
        const originalSize = originalBox.getSize(new THREE.Vector3());
        const originalCenter = originalBox.getCenter(new THREE.Vector3());
        const maxAxis = Math.max(originalSize.x, originalSize.y, originalSize.z);
        if (!Number.isFinite(maxAxis) || maxAxis <= 0) throw new Error('El archivo cargó, pero no tiene geometría visible.');

        model.position.sub(originalCenter);
        model.scale.setScalar(3.4 / maxAxis);
        scene.add(model);
        scene.add(new THREE.BoxHelper(model, 0xf4c400));

        const centerCamera = () => {
          const fittedBox = new THREE.Box3().setFromObject(model);
          const fittedSize = fittedBox.getSize(new THREE.Vector3());
          const fittedCenter = fittedBox.getCenter(new THREE.Vector3());
          const radius = Math.max(fittedSize.x, fittedSize.y, fittedSize.z, 1);
          const distance = radius / (2 * Math.tan((camera.fov * Math.PI) / 360)) * 1.9;
          camera.position.set(fittedCenter.x + distance, fittedCenter.y + distance * 0.7, fittedCenter.z + distance);
          camera.near = Math.max(distance / 120, 0.01);
          camera.far = distance * 120;
          camera.lookAt(fittedCenter);
          camera.updateProjectionMatrix();
          controls.target.copy(fittedCenter);
          controls.update();
          renderer.render(scene, camera);
        };
        centerRef.current = centerCamera;
        centerCamera();

        const resize = () => {
          const nextWidth = Math.max(container.clientWidth || window.innerWidth || 800, 320);
          const nextHeight = Math.max(container.clientHeight || 520, 320);
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(nextWidth, nextHeight, false);
          renderer.render(scene, camera);
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        setDebug(`Cargado: ${fileFormat.toUpperCase()} · Mallas: ${meshCount} · Tamaño: ${originalSize.x.toFixed(2)} × ${originalSize.y.toFixed(2)} × ${originalSize.z.toFixed(2)}`);
        setStatus('loaded');

        const animate = () => {
          if (disposed) return;
          controls.update();
          renderer.render(scene, camera);
          frameId = window.requestAnimationFrame(animate);
        };
        animate();
      } catch (err) {
        setStatus('error');
        setErrorKind('load');
        setErrorMsg((err as Error).message || 'No se pudo renderizar el archivo 3D.');
      }
    }

    void mountViewer();

    return () => {
      disposed = true;
      centerRef.current = null;
      if (frameId) window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      controls?.dispose?.();
      renderer?.dispose?.();
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [status, modelUrl, fileFormat]);

  function retry() {
    setErrorKind(null);
    setErrorMsg('');
    setDebug('');
    setStatus('checking');
  }

  async function copyDiagnostic() {
    await navigator.clipboard.writeText(JSON.stringify({ modelUrl, modelName, fileFormat, status, errorKind, errorMsg, proxy: proxyUrl(modelUrl), debug, fecha: new Date().toISOString() }, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(244,196,0,0.10),transparent_34%),#050505] px-3 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto grid max-w-7xl gap-5">
        <header className="flex flex-col gap-4 rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950/90 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <FabrickFullLogo theme="light" tagline="visor 3D" />
            <h1 className="mt-4 break-words text-2xl font-black sm:text-4xl">{modelName}</h1>
            <p className="mt-1 text-sm text-zinc-500">Soporta GLB, GLTF y DAE directo. ZIP requiere extracción previa.</p>
            {debug && <p className="mt-3 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-100">{debug}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:border-yellow-400/50"><ArrowLeft className="h-4 w-4" /> Volver</button>
            <button onClick={() => centerRef.current?.()} disabled={status !== 'loaded'} className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-sm font-bold text-yellow-100 transition-colors hover:bg-yellow-400/20 disabled:cursor-not-allowed disabled:opacity-40"><ScanSearch className="h-4 w-4" /> Centrar</button>
            {modelUrl && <a href={modelUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-bold text-white transition-colors hover:border-yellow-400/50"><Download className="h-4 w-4" /> Descargar</a>}
          </div>
        </header>

        <section className="overflow-hidden rounded-[1.5rem] border border-yellow-400/20 bg-zinc-950 shadow-2xl shadow-black/40">
          <div className="relative h-[65vh] min-h-[440px] w-full bg-zinc-900 sm:h-[75vh]">
            <div ref={containerRef} className="h-full w-full" />

            {(status === 'idle' || status === 'checking' || status === 'loading') && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950/88 p-6 text-center backdrop-blur-sm">
                <Loader2 className="h-12 w-12 animate-spin text-yellow-400" />
                <p className="mt-4 text-sm font-black uppercase tracking-[0.25em] text-yellow-400">{status === 'checking' ? 'Validando archivo' : status === 'loading' ? 'Cargando modelo' : 'Iniciando visor'}</p>
                <p className="mt-2 max-w-xs text-center text-xs leading-6 text-zinc-500">Los archivos DAE pueden tardar más si tienen muchas piezas o texturas externas.</p>
              </div>
            )}

            {status === 'loaded' && <div className="pointer-events-none absolute left-4 top-4 z-10 rounded-full border border-emerald-400/30 bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300 backdrop-blur-sm"><CheckCircle2 className="mr-1 inline h-3 w-3" /> Cargado</div>}

            {status === 'error' && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center overflow-auto bg-zinc-950 p-6 text-center">
                <AlertTriangle className="h-12 w-12 text-orange-400" />
                <h2 className="mt-4 text-xl font-black">No se pudo abrir el archivo 3D</h2>
                <p className="mt-3 max-w-lg rounded-2xl border border-orange-400/20 bg-orange-400/5 p-4 text-sm leading-7 text-orange-100">{errorMsg || 'Error desconocido.'}</p>
                {errorKind === 'unsupported_zip' && <p className="mt-3 max-w-lg text-sm leading-7 text-zinc-400">Para conservar texturas de un DAE dentro de ZIP, extrae el ZIP y sube el .dae junto con sus rutas públicas, o conviértelo a GLB empaquetado desde Blender.</p>}
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {errorKind !== 'unsupported_zip' && <button onClick={retry} className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-yellow-300"><RefreshCw className="h-4 w-4" /> Reintentar</button>}
                  {modelUrl && <a href={modelUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold transition-colors hover:border-yellow-400/40"><ExternalLink className="h-4 w-4" /> Abrir URL directa</a>}
                  {modelUrl && <a href={modelUrl} target="_blank" rel="noreferrer" download className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold transition-colors hover:border-yellow-400/40"><Download className="h-4 w-4" /> Descargar</a>}
                  <button onClick={() => void copyDiagnostic()} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-2.5 text-sm font-bold transition-colors hover:border-yellow-400/40"><Copy className="h-4 w-4" />{copied ? 'Copiado' : 'Copiar diagnóstico'}</button>
                </div>
              </div>
            )}
          </div>
        </section>

        <p className="rounded-[1.5rem] border border-white/10 bg-black/40 p-4 text-sm leading-7 text-zinc-400">
          <RotateCcw className="mr-2 inline h-4 w-4 text-yellow-300" />
          <strong className="text-white">Controles:</strong> arrastra para rotar · pellizca o rueda para zoom · dos dedos para desplazar. Compatible con <strong className="text-white">.glb</strong>, <strong className="text-white">.gltf</strong> y <strong className="text-white">.dae</strong>. Los <strong className="text-white">.zip</strong> deben extraerse antes.
        </p>
      </div>
    </main>
  );
}
