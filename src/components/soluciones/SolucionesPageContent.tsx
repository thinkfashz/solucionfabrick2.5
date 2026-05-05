'use client';

/**
 * Página de Soluciones Mejorada con Three.js
 * Incluye visualización 3D de espacios y cálculos de presupuesto
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import {
  Zap,
  Home as HomeIcon,
  Heart,
  BarChart3,
  ArrowRight,
  Lightbulb,
  Shield,
  Users,
} from 'lucide-react';
import styles from './SolucionesPageContent.module.css';

const SOLUCIONES = [
  {
    id: 'hogar-basico',
    nombre: 'Hogar Básico',
    descripcion: 'Solución completa para reforma de espacios básicos',
    imagen: '🏠',
    caracteristicas: [
      'Estructura metalcon',
      'Revestimientos y pintura',
      'Electricidad básica',
      '4-6 semanas de obra',
    ],
    presupuesto: '$2.5M - $3.5M',
    metros2: '20-30m²',
  },
  {
    id: 'hogar-premium',
    nombre: 'Hogar Premium',
    descripcion: 'Reforma completa con acabados de lujo',
    imagen: '✨',
    caracteristicas: [
      'Estructura reforzada',
      'Acabados premium',
      'Instalaciones completas',
      '8-12 semanas de obra',
    ],
    presupuesto: '$6.5M - $9.5M',
    metros2: '40-60m²',
  },
  {
    id: 'ampliacion-vivienda',
    nombre: 'Ampliación Vivienda',
    descripcion: 'Agrega nuevos espacios a tu hogar',
    imagen: '🏗️',
    caracteristicas: [
      'Nuevas estructuras',
      'Integración completa',
      'Servicios completos',
      '10-16 semanas de obra',
    ],
    presupuesto: '$8M - $12M',
    metros2: '30-50m²',
  },
  {
    id: 'inteligente-hogar',
    nombre: 'Hogar Inteligente',
    descripcion: 'Automatización y tecnología integrada',
    imagen: '🤖',
    caracteristicas: [
      'Sistema domotica',
      'Seguridad avanzada',
      'Control remoto',
      '4-6 semanas adicionales',
    ],
    presupuesto: '$1.5M - $2.5M',
    metros2: 'Por sistema',
  },
];

export function SolucionesPageContent() {
  const [selectedSolucion, setSelectedSolucion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Inicializar Three.js para visualización 3D de espacios
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Luces
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xfbbf24, 1);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Crear geometría de habitación simple
    const roomGeometry = new THREE.BoxGeometry(4, 3, 4);
    const roomMaterial = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,
      side: THREE.BackSide,
    });
    const room = new THREE.Mesh(roomGeometry, roomMaterial);
    scene.add(room);

    // Crear muebles decorativos
    const furnitureGeometry = new THREE.BoxGeometry(1, 1, 1);
    const furnitureMaterial = new THREE.MeshPhongMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
    });
    
    const furniture = new THREE.Mesh(furnitureGeometry, furnitureMaterial);
    furniture.position.set(-1, 0, 0);
    scene.add(furniture);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      
      room.rotation.x += 0.002;
      room.rotation.y += 0.004;
      
      furniture.rotation.x += 0.005;
      furniture.rotation.y += 0.008;

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

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-yellow-400 text-xs font-black uppercase tracking-[0.3em] mb-4">
              💡 Soluciones Integrales
            </p>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Soluciones <span className="text-yellow-400">diseñadas</span> para tu vida
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Paquetes completos con precios fijos, cronograma definido y garantía de calidad.
            </p>
          </motion.div>
        </div>
      </section>

        <div className="max-w-5xl mx-auto">
              className={`w-full h-96 rounded-2xl bg-black ${styles.gradientBg}`}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-4">Visualiza tu Espacio</h2>
            <p className="text-zinc-400">
              Nuestras soluciones están diseñadas para espacios reales. Ve cómo se vería tu
              proyecto en 3D.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="rounded-3xl border border-yellow-400/20 bg-gradient-to-b from-yellow-400/10 to-black/50 p-8 overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-style-component-with-dynamic-styles */}
            <div
              ref={containerRef}
              className="w-full h-96 rounded-2xl bg-black"
              // eslint-disable-next-line @next/next/no-style-component-with-dynamic-styles
              style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a0a 100%)' }}
            />
          </motion.div>
        </div>
      </section>

      {/* Soluciones Cards */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black mb-12">Nuestras Soluciones</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {SOLUCIONES.map((solucion, idx) => (
              <motion.button
                key={solucion.id}
                onClick={() => setSelectedSolucion(idx)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, duration: 0.5 }}
                className={`text-left p-8 rounded-2xl border-2 transition-all duration-300 group ${
                  selectedSolucion === idx
                    ? 'bg-yellow-400/20 border-yellow-400 shadow-lg shadow-yellow-400/20'
                    : 'bg-zinc-900/50 border-white/10 hover:border-yellow-400/50'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{solucion.imagen}</span>
                  <Heart
                    className={`w-5 h-5 transition-all ${
                      selectedSolucion === idx ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'
                    }`}
                  />
                </div>

                <h3 className="text-2xl font-black mb-2">{solucion.nombre}</h3>
                <p className="text-sm text-zinc-400 mb-6">{solucion.descripcion}</p>

                {/* Características */}
                <ul className="space-y-2 mb-6">
                  {solucion.caracteristicas.slice(0, 2).map((car, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      {car}
                    </li>
                  ))}
                </ul>

                {/* Presupuesto */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-zinc-500 mb-2">Presupuesto Aproximado</p>
                  <p className="text-xl font-black text-yellow-400">{solucion.presupuesto}</p>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Detalle de Solución Seleccionada */}
          <motion.div
            key={SOLUCIONES[selectedSolucion].id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mt-12 pt-12 border-t border-white/10"
          >
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-3xl font-black mb-6">
                  {SOLUCIONES[selectedSolucion].nombre}
                </h3>
                <p className="text-lg text-zinc-400 mb-8">
                  {SOLUCIONES[selectedSolucion].descripcion}
                </p>

                <div className="space-y-6">
                  <div className="bg-black/40 rounded-xl p-6 border border-white/10">
                    <h4 className="text-xs font-black uppercase tracking-[0.15em] text-yellow-400 mb-4">
                      Incluye
                    </h4>
                    <ul className="space-y-3">
                      {SOLUCIONES[selectedSolucion].caracteristicas.map((car, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="text-white">{car}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/cotizaciones"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black font-black text-sm uppercase tracking-widest hover:bg-white transition-colors"
                  >
                    Cotizar Esta Solución
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: HomeIcon, label: 'Metros²', valor: SOLUCIONES[selectedSolucion].metros2 },
                  { icon: BarChart3, label: 'Presupuesto', valor: SOLUCIONES[selectedSolucion].presupuesto },
                  { icon: Lightbulb, label: 'Innovación', valor: 'Tech incluida' },
                  { icon: Shield, label: 'Garantía', valor: '5 años' },
                ].map((item, i) => (
                  <div key={i} className="bg-black/40 rounded-xl p-6 border border-white/10">
                    <item.icon className="w-8 h-8 text-yellow-400 mb-3" />
                    <p className="text-xs text-zinc-500 mb-2">{item.label}</p>
                    <p className="text-sm font-black text-white">{item.valor}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonios */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-yellow-400/5">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
            Lo Que Nuestros Clientes Dicen
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                nombre: 'María González',
                ciudad: 'Santiago',
                texto: 'La solución Premium fue perfecta. Precios honestos y equipo profesional.',
              },
              {
                nombre: 'Roberto Silva',
                ciudad: 'Valparaíso',
                texto: 'Ampliamos en 6 semanas. El cotizador fue muy preciso con los números.',
              },
              {
                nombre: 'Constanza López',
                ciudad: 'Concepción',
                texto: 'Hogar Inteligente cambió nuestra vida. Recomendado 100%.',
              },
            ].map((test, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-black/40 rounded-xl p-6 border border-white/10"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="text-yellow-400">⭐</span>
                  ))}
                </div>
                <p className="text-white mb-4">"{test.texto}"</p>
                <div>
                  <p className="font-black text-white">{test.nombre}</p>
                  <p className="text-xs text-zinc-500">{test.ciudad}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl p-12">
          <Users className="w-12 h-12 text-black mx-auto mb-6" />
          <h2 className="text-3xl font-black text-black mb-4">
            ¿Cuál es la solución ideal para ti?
          </h2>
          <p className="text-black/70 mb-8">
            Nuestro equipo está listo para ayudarte a elegir la mejor opción.
          </p>
          <button className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-black text-yellow-400 font-black uppercase tracking-widest text-sm hover:bg-zinc-900 transition-colors">
            Contacta con un Especialista
          </button>
        </div>
      </section>
    </main>
  );
}
