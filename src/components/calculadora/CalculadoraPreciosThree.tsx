'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Calculator, Plus, Minus, DollarSign } from 'lucide-react';
import styles from './CalculadoraPreciosThree.module.css';
import {
  calcularPrecioServicio,
  MERCADO_2026,
  type ServicioKey,
} from '@/lib/mercadoChileno2026';

interface CalculadoraPreciosProps {
  servicioId?: ServicioKey;
  onPrecioChange?: (precio: number) => void;
}

export function CalculadoraPreciosThree({ servicioId, onPrecioChange }: CalculadoraPreciosProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cubesRef = useRef<THREE.Mesh[]>([]);

  const [metros2, setMetros2] = useState<number>(1);
  const [resultado, setResultado] = useState<{
    subtotal: number;
    iva: number;
    total: number;
    precioM2: number;
  } | null>(null);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<ServicioKey>(
    servicioId || 'metalcon'
  );

  // Inicializar Three.js scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xfbbf24, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Crear cubos representando m²
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const material = new THREE.MeshPhongMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      shininess: 100,
    });

    cubesRef.current = [];
    const cubesPerRow = 4;
    
    for (let i = 0; i < Math.min(metros2, 16); i++) {
      const cube = new THREE.Mesh(geometry, material.clone());
      const row = Math.floor(i / cubesPerRow);
      const col = i % cubesPerRow;
      cube.position.x = col * 1 - 1.5;
      cube.position.y = row * 1 - 1.5;
      cube.position.z = 0;
      scene.add(cube);
      cubesRef.current.push(cube);
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      cubesRef.current.forEach((cube, idx) => {
        cube.rotation.x += 0.003;
        cube.rotation.y += 0.005;
        // Efecto de "pulsación"
        const scale = 1 + Math.sin(Date.now() / 500 + idx) * 0.1;
        cube.scale.set(scale, scale, scale);
      });

      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  // Actualizar cubos cuando cambia metros2
  useEffect(() => {
    if (!sceneRef.current || !cubesRef.current.length) return;

    const scene = sceneRef.current;
    const currentCount = cubesRef.current.length;
    const targetCount = Math.min(metros2, 16);

    // Remover cubos si disminuye
    if (targetCount < currentCount) {
      for (let i = currentCount - 1; i >= targetCount; i--) {
        scene.remove(cubesRef.current[i]);
      }
      cubesRef.current = cubesRef.current.slice(0, targetCount);
    }

    // Agregar cubos si aumenta
    if (targetCount > currentCount) {
      const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const material = new THREE.MeshPhongMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
      });

      const cubesPerRow = 4;
      for (let i = currentCount; i < targetCount; i++) {
        const cube = new THREE.Mesh(geometry, material.clone());
        const row = Math.floor(i / cubesPerRow);
        const col = i % cubesPerRow;
        cube.position.x = col * 1 - 1.5;
        cube.position.y = row * 1 - 1.5;
        cube.position.z = 0;
        scene.add(cube);
        cubesRef.current.push(cube);
      }
    }
  }, [metros2]);

  // Calcular precio cuando cambian los parámetros
  useEffect(() => {
    try {
      const resultado = calcularPrecioServicio(servicioSeleccionado, metros2, true);
      setResultado(resultado);
      onPrecioChange?.(resultado.total);
    } catch (error) {
      console.error('Error calculando precio:', error);
    }
  }, [metros2, servicioSeleccionado, onPrecioChange]);

  const handleMetros2Change = useCallback((newValue: number) => {
    setMetros2(Math.max(1, Math.min(100, newValue)));
  }, []);

  const servicio = MERCADO_2026.servicios[servicioSeleccionado];

  return (
    <div className="w-full bg-zinc-950 rounded-3xl border border-yellow-400/20 p-6 md:p-8">
      {/* Three.js Canvas */}
      <div
        ref={containerRef}
        className={`w-full h-64 md:h-80 rounded-2xl border border-yellow-400/30 bg-black/50 mb-8 overflow-hidden ${styles.gradientBg}`}
      />

      {/* Controles */}
      <div className="space-y-6">
        {/* Selector de Servicio */}
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-400 block mb-3">
            <Calculator className="inline w-3.5 h-3.5 mr-1.5" />
            Servicio a Presupuestar
          </label>
          <select
            value={servicioSeleccionado}
            onChange={(e) => setServicioSeleccionado(e.target.value as ServicioKey)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-900 border border-white/10 text-white text-sm focus:outline-none focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20 transition-all"
            aria-label="Seleccionar servicio a presupuestar"
          >
            {Object.entries(MERCADO_2026.servicios).map(([key, svc]) => (
              <option key={key} value={key}>
                {svc.nombre} — {svc.categoria}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500 mt-2">{servicio?.descripcion}</p>
        </div>

        {/* Input de Metros² */}
        <div>
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-yellow-400 block mb-3">
            Metros Cuadrados
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleMetros2Change(metros2 - 1)}
              className="p-2 rounded-lg border border-yellow-400/20 hover:border-yellow-400/50 hover:bg-yellow-400/10 transition-all"
              title="Reducir metros cuadrados"
              aria-label="Reducir metros cuadrados"
            >
              <Minus className="w-4 h-4 text-yellow-400" />
            </button>

            <input
              type="number"
              value={metros2}
              onChange={(e) => handleMetros2Change(parseInt(e.target.value) || 1)}
              className="flex-1 px-4 py-2.5 rounded-lg bg-zinc-900 border border-white/10 text-white text-center font-bold focus:outline-none focus:border-yellow-400/50 focus:ring-2 focus:ring-yellow-400/20"
              placeholder="0"
              aria-label="Metros cuadrados del proyecto"
            />

            <button
              onClick={() => handleMetros2Change(metros2 + 1)}
              className="p-2 rounded-lg border border-yellow-400/20 hover:border-yellow-400/50 hover:bg-yellow-400/10 transition-all"
              title="Aumentar metros cuadrados"
              aria-label="Aumentar metros cuadrados"
            >
              <Plus className="w-4 h-4 text-yellow-400" />
            </button>

            <span className="text-sm font-bold text-zinc-400">m²</span>
          </div>
        </div>

        {/* Resultados */}
        {resultado && (
          <div className="space-y-3 pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-black/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                  Precio/m²
                </p>
                <p className="text-lg font-black text-yellow-400">
                  ${resultado.precioM2.toLocaleString('es-CL')}
                </p>
              </div>

              <div className="bg-black/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                  Subtotal
                </p>
                <p className="text-lg font-black text-emerald-400">
                  ${resultado.subtotal.toLocaleString('es-CL')}
                </p>
              </div>

              <div className="bg-black/50 rounded-xl p-3 border border-white/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-1">
                  IVA (19%)
                </p>
                <p className="text-lg font-black text-orange-400">
                  ${resultado.iva.toLocaleString('es-CL')}
                </p>
              </div>

              <div className="bg-yellow-400/10 rounded-xl p-3 border border-yellow-400/30">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-yellow-400 mb-1">
                  Total
                </p>
                <p className="text-2xl font-black text-yellow-400">
                  ${resultado.total.toLocaleString('es-CL')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
