'use client';

/**
 * Página de Soluciones — interactiva, social y transparente.
 *
 * Incluye:
 *  - Tarjetas 3D con tilt mouse + touch (efecto "tela").
 *  - Modal de detalle con desglose de costos animado y proceso paso a paso.
 *  - Calculadora avanzada (ancho × largo, terminación, extras) sin tope superior.
 *  - Visualización 3D Three.js que reacciona a las dimensiones de la calculadora.
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import * as THREE from 'three';
import {
  ArrowRight,
  BadgeCheck,
  Calculator,
  Hammer,
  HardHat,
  Home as HomeIcon,
  Layers,
  Plug,
  Ruler,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Users,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import styles from './SolucionesPageContent.module.css';

/* ============================================================
 * DATA
 * ============================================================ */

type Solucion = {
  id: string;
  nombre: string;
  tagline: string;
  descripcion: string;
  emoji: string;
  /** Precio base CLP por m² construido (terminación estándar). */
  precioM2: number;
  /** Plazo típico, sólo lectura informativa. */
  plazoSemanas: [number, number];
  /** Tamaños sugeridos en m² — sólo para mostrar, NO limitan la calculadora. */
  m2Sugeridos: [number, number];
  caracteristicas: string[];
  proceso: { titulo: string; detalle: string }[];
  materiales: string[];
  garantia: string;
  /**
   * Desglose porcentual de en qué se gasta el presupuesto. Suma 100.
   * Sirve como "justificación" del precio.
   */
  breakdown: { etiqueta: string; porcentaje: number; color: string }[];
};

const SOLUCIONES: Solucion[] = [
  {
    id: 'estructura-metalcon',
    nombre: 'Estructura Metalcon',
    tagline: 'La base sismorresistente de tu proyecto',
    descripcion:
      'Sistema de perfiles galvanizados Metalcon 60/90 anclados a fundación, listos para revestir. Ideal cuando quieres avanzar por etapas o ya tienes contratistas para terminaciones.',
    emoji: '🏗️',
    precioM2: 65000,
    plazoSemanas: [2, 4],
    m2Sugeridos: [20, 80],
    caracteristicas: [
      'Perfiles Metalcon 60/90 galvanizados',
      'Anclajes químicos a radier',
      'Cálculo estructural firmado',
      'Cubierta zincalum onda estándar',
    ],
    proceso: [
      {
        titulo: 'Visita técnica y medición',
        detalle: 'Vamos a terreno, levantamos medidas reales y revisamos el estado del radier o suelo.',
      },
      {
        titulo: 'Cálculo estructural',
        detalle: 'Ingeniero civil firma el cálculo según norma chilena (NCh 427 / NCh 433).',
      },
      {
        titulo: 'Compra de materiales',
        detalle: 'Adquirimos perfiles certificados directo de fábrica, sin intermediarios.',
      },
      {
        titulo: 'Montaje en obra',
        detalle: 'Equipo de 3-4 maestros monta estructura, arriostramientos y cubierta.',
      },
      {
        titulo: 'Entrega y certificado',
        detalle: 'Te dejamos la estructura lista para revestir, con certificado y plano as-built.',
      },
    ],
    materiales: [
      'Perfiles Metalcon Cintac galvanizados',
      'Tornillería autoperforante #10',
      'Anclajes Hilti HSL3 o Fischer FBN',
      'Cubierta zincalum 0,35mm',
    ],
    garantia: '5 años en estructura · 1 año en cubierta',
    breakdown: [
      { etiqueta: 'Materiales Metalcon', porcentaje: 42, color: '#fbbf24' },
      { etiqueta: 'Mano de obra calificada', porcentaje: 28, color: '#f59e0b' },
      { etiqueta: 'Cubierta y accesorios', porcentaje: 14, color: '#fde68a' },
      { etiqueta: 'Cálculo y permisos', porcentaje: 10, color: '#fef3c7' },
      { etiqueta: 'Logística y transporte', porcentaje: 6, color: '#fffbeb' },
    ],
  },
  {
    id: 'llave-en-mano-basico',
    nombre: 'Llave en Mano · Básico',
    tagline: 'Tu espacio listo para habitar, sin sorpresas',
    descripcion:
      'Solución completa: estructura Metalcon, revestimientos interiores y exteriores, instalaciones eléctricas básicas, ventanas y puertas. Te entregamos el espacio terminado y limpio.',
    emoji: '🏠',
    precioM2: 110000,
    plazoSemanas: [4, 7],
    m2Sugeridos: [25, 60],
    caracteristicas: [
      'Estructura Metalcon completa',
      'Revestimiento OSB + fieltro + siding',
      'Aislación lana de vidrio R-19',
      'Instalación eléctrica básica certificada',
      'Ventanas termopanel PVC',
      'Pintura interior 2 manos',
    ],
    proceso: [
      {
        titulo: 'Reunión de diseño',
        detalle: 'Definimos distribución, accesos, ventanas y puntos eléctricos contigo en plano.',
      },
      { titulo: 'Cálculo y permisos', detalle: 'Cálculo estructural, planos eléctricos y trámite municipal si aplica.' },
      { titulo: 'Estructura y cubierta', detalle: 'Montaje de Metalcon, cubierta y hojalatería.' },
      { titulo: 'Instalaciones', detalle: 'Eléctrica embutida con certificado SEC TE-1.' },
      { titulo: 'Revestimientos y aislación', detalle: 'OSB, fieltro asfáltico, lana mineral y siding/volcanita.' },
      { titulo: 'Terminaciones', detalle: 'Pintura, ventanas, puertas, guardapolvos y aseo final.' },
      { titulo: 'Entrega con checklist', detalle: 'Recorrido contigo, lista de observaciones cero pendientes.' },
    ],
    materiales: [
      'OSB 11,1mm certificado',
      'Lana de vidrio Volcán R-19',
      'Siding fibrocemento o PVC',
      'Ventanas termopanel PVC homologadas',
      'Cables Eva 2,5mm libre halógenos',
    ],
    garantia: '5 años estructura · 2 años terminaciones · 1 año instalaciones',
    breakdown: [
      { etiqueta: 'Estructura Metalcon', porcentaje: 26, color: '#fbbf24' },
      { etiqueta: 'Revestimientos y aislación', porcentaje: 22, color: '#f59e0b' },
      { etiqueta: 'Mano de obra', porcentaje: 22, color: '#fcd34d' },
      { etiqueta: 'Instalaciones eléctricas', porcentaje: 12, color: '#fde68a' },
      { etiqueta: 'Ventanas y puertas', porcentaje: 10, color: '#fef3c7' },
      { etiqueta: 'Permisos y gastos generales', porcentaje: 8, color: '#fffbeb' },
    ],
  },
  {
    id: 'llave-en-mano-premium',
    nombre: 'Llave en Mano · Premium',
    tagline: 'Acabados de alto estándar, listo para vivir',
    descripcion:
      'Versión premium con doble aislación, ventanas DVH, pisos flotantes/porcelanato, baño completo, cocina con muebles a medida y eléctrica completa. Calidad de proyecto inmobiliario.',
    emoji: '✨',
    precioM2: 180000,
    plazoSemanas: [7, 12],
    m2Sugeridos: [35, 90],
    caracteristicas: [
      'Doble aislación térmica + acústica',
      'Ventanas DVH con perfil reforzado',
      'Piso flotante AC4 o porcelanato',
      'Baño completo con grifería FV/Stretto',
      'Cocina con muebles melamina enchapada',
      'Eléctrica completa + iluminación LED',
    ],
    proceso: [
      { titulo: 'Diseño 3D del proyecto', detalle: 'Render fotorrealista para que apruebes antes de construir.' },
      { titulo: 'Permisos formales', detalle: 'Tramitamos permiso de edificación o regularización si corresponde.' },
      { titulo: 'Estructura reforzada', detalle: 'Metalcon de mayor espesor + arriostramientos extra.' },
      { titulo: 'Aislación térmica premium', detalle: 'Doble capa lana mineral + barrera de vapor.' },
      { titulo: 'Instalaciones completas', detalle: 'Eléctrica, sanitaria, gas y data — todo certificado.' },
      { titulo: 'Terminaciones de alto estándar', detalle: 'Pisos, cerámicos, grifería, muebles a medida.' },
      { titulo: 'Limpieza y entrega con manual', detalle: 'Manual de mantención + planos as-built digitales.' },
    ],
    materiales: [
      'Metalcon 90 reforzado',
      'Lana mineral doble capa R-30',
      'Ventanas DVH 4-12-4',
      'Piso flotante AC4 importado',
      'Grifería FV / Stretto / Hansgrohe',
      'Iluminación LED Philips',
    ],
    garantia: '7 años estructura · 3 años terminaciones · 2 años instalaciones',
    breakdown: [
      { etiqueta: 'Terminaciones premium', porcentaje: 28, color: '#fbbf24' },
      { etiqueta: 'Estructura reforzada', porcentaje: 20, color: '#f59e0b' },
      { etiqueta: 'Mano de obra especializada', porcentaje: 20, color: '#fcd34d' },
      { etiqueta: 'Instalaciones completas', porcentaje: 14, color: '#fde68a' },
      { etiqueta: 'Ventanas DVH y puertas', porcentaje: 10, color: '#fef3c7' },
      { etiqueta: 'Permisos y diseño 3D', porcentaje: 8, color: '#fffbeb' },
    ],
  },
  {
    id: 'ampliacion',
    nombre: 'Ampliación de Vivienda',
    tagline: 'Más espacio sin mudarte',
    descripcion:
      'Anexamos un nuevo módulo a tu casa actual: dormitorio, oficina, segundo baño o sala. Conectamos instalaciones existentes y matchamos terminaciones para que todo se vea integrado.',
    emoji: '🏡',
    precioM2: 150000,
    plazoSemanas: [5, 9],
    m2Sugeridos: [12, 40],
    caracteristicas: [
      'Estudio de unión a vivienda existente',
      'Empalme eléctrico al tablero actual',
      'Match de revestimientos y pinturas',
      'Apertura de muro divisorio si aplica',
      'Limpieza diaria durante la obra',
    ],
    proceso: [
      { titulo: 'Diagnóstico de la casa', detalle: 'Revisamos tablero, sanitario y estructura existente.' },
      { titulo: 'Plano de integración', detalle: 'Dibujamos cómo se conecta la ampliación al inmueble.' },
      { titulo: 'Apertura controlada', detalle: 'Demolición quirúrgica del muro de unión, con apoyo provisorio.' },
      { titulo: 'Estructura del módulo', detalle: 'Metalcon anclado a la fundación nueva o existente reforzada.' },
      { titulo: 'Empalme de instalaciones', detalle: 'Conectamos eléctrica, agua y desagües sin cortar tu servicio.' },
      { titulo: 'Terminaciones que matchean', detalle: 'Buscamos pintura/piso similar para que parezca parte original.' },
      { titulo: 'Entrega integrada', detalle: 'Tu casa ahora es más grande, sin notar dónde empezó la ampliación.' },
    ],
    materiales: [
      'Refuerzos de fundación H25',
      'Metalcon 60 + cintas dilatadoras',
      'Sellos elastoméricos en uniones',
      'Materiales que matcheen lo existente',
    ],
    garantia: '5 años estructura · 2 años uniones e instalaciones',
    breakdown: [
      { etiqueta: 'Estructura y unión', porcentaje: 26, color: '#fbbf24' },
      { etiqueta: 'Mano de obra (más compleja)', porcentaje: 24, color: '#f59e0b' },
      { etiqueta: 'Terminaciones match', porcentaje: 18, color: '#fcd34d' },
      { etiqueta: 'Empalmes eléctrica/sanitaria', porcentaje: 14, color: '#fde68a' },
      { etiqueta: 'Demolición y apoyos', porcentaje: 10, color: '#fef3c7' },
      { etiqueta: 'Permisos y proyecto', porcentaje: 8, color: '#fffbeb' },
    ],
  },
];

/* Multiplicadores y extras de la calculadora */

const TERMINACIONES = [
  { id: 'basico', label: 'Básico', mult: 1.0, hint: 'Funcional, sin lujos' },
  { id: 'estandar', label: 'Estándar', mult: 1.25, hint: 'Equilibrio precio/calidad' },
  { id: 'premium', label: 'Premium', mult: 1.55, hint: 'Acabados de alto estándar' },
] as const;

type TerminacionId = (typeof TERMINACIONES)[number]['id'];

const EXTRAS = [
  { id: 'electricidad', label: 'Eléctrica completa SEC', porM2: 18000, fijo: 0, icon: Plug },
  { id: 'gasfiteria', label: 'Gasfitería completa', porM2: 22000, fijo: 0, icon: Wrench },
  { id: 'domotica', label: 'Domótica básica', porM2: 0, fijo: 1_200_000, icon: Zap },
  { id: 'segundoPiso', label: 'Segundo piso (mismos m²)', porM2: 0, fijo: 0, icon: Layers },
] as const;

type ExtraId = (typeof EXTRAS)[number]['id'];

/* ============================================================
 * UTILS
 * ============================================================ */

const clpFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

function formatCLP(n: number): string {
  if (!Number.isFinite(n) || n < 0) return clpFormatter.format(0);
  return clpFormatter.format(Math.round(n));
}

/** Hook: anima un número desde su valor anterior al nuevo objetivo. */
function useAnimatedNumber(target: number, durationMs = 600): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = fromRef.current;
    const to = target;
    if (from === to) {
      setValue(to);
      return;
    }
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = from + (to - from) * eased;
      setValue(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      fromRef.current = value; // eslint-disable-line react-hooks/exhaustive-deps
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}

/* ============================================================
 * 3D TILT CARD
 * ============================================================ */

type TiltCardProps = {
  solucion: Solucion;
  active: boolean;
  onSelect: () => void;
  onOpen: () => void;
  index: number;
};

function TiltCard({ solucion, active, onSelect, onOpen, index }: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const px = useMotionValue(0); // -1..1
  const py = useMotionValue(0);

  const rotateX = useTransform(py, [-1, 1], [12, -12]);
  const rotateY = useTransform(px, [-1, 1], [-14, 14]);

  // Spring smoothing for the "fabric" feel
  const sx = useSpring(rotateX, { stiffness: 120, damping: 14, mass: 0.6 });
  const sy = useSpring(rotateY, { stiffness: 120, damping: 14, mass: 0.6 });

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0..1
    const y = (e.clientY - rect.top) / rect.height;
    px.set(x * 2 - 1);
    py.set(y * 2 - 1);
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
  };

  const handlePointerLeave = () => {
    px.set(0);
    py.set(0);
    if (ref.current) {
      ref.current.style.setProperty('--mx', '50%');
      ref.current.style.setProperty('--my', '50%');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay: index * 0.08, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={styles.perspective}
    >
      <motion.div
        ref={ref}
        data-active={active}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onClick={onSelect}
        onDoubleClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect();
          }
        }}
        style={{ rotateX: sx, rotateY: sy }}
        whileTap={{ scale: 0.985 }}
        className={`${styles.cardSurface} relative cursor-pointer text-left p-7 md:p-8 rounded-3xl border-2 overflow-hidden ${
          active
            ? 'bg-yellow-400/10 border-yellow-400 shadow-2xl shadow-yellow-400/20'
            : 'bg-zinc-900/60 border-white/10 hover:border-yellow-400/40'
        }`}
      >
        {/* Sheen + grain layers (purely visual, behind content) */}
        <div className={styles.fabricSheen} aria-hidden />
        <div className={styles.fabricGrain} aria-hidden />

        {/* Content lifted to give 3D depth */}
        <div className={`${styles.cardLift} relative`}>
          <div className="flex items-start justify-between mb-5">
            <span className="text-5xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]">{solucion.emoji}</span>
            <span
              className={`text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full ${
                active
                  ? 'bg-yellow-400 text-black'
                  : 'bg-white/5 text-yellow-400 border border-yellow-400/30'
              }`}
            >
              {solucion.plazoSemanas[0]}–{solucion.plazoSemanas[1]} sem
            </span>
          </div>

          <h3 className="text-2xl md:text-[26px] font-black mb-2 leading-tight">{solucion.nombre}</h3>
          <p className="text-sm text-yellow-400/90 mb-3">{solucion.tagline}</p>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{solucion.descripcion}</p>

          <ul className="space-y-2 mb-6">
            {solucion.caracteristicas.slice(0, 3).map((car) => (
              <li key={car} className="flex items-center gap-2 text-xs text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />
                {car}
              </li>
            ))}
          </ul>

          <div className="pt-5 border-t border-white/10 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] text-zinc-500 mb-1 uppercase tracking-[0.2em]">
                Precio referencia
              </p>
              <p className="text-2xl font-black text-yellow-400 leading-none">
                {formatCLP(solucion.precioM2)}
                <span className="text-xs text-zinc-400 font-bold">/m²</span>
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">terminación estándar · sin tope superior</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen();
              }}
              className="text-[11px] font-black uppercase tracking-[0.18em] text-black bg-yellow-400 hover:bg-white transition-colors px-4 py-2 rounded-full inline-flex items-center gap-1"
            >
              Ver detalle
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ============================================================
 * MODAL DETALLE
 * ============================================================ */

function DetalleModal({
  solucion,
  onClose,
  onCotizar,
}: {
  solucion: Solucion | null;
  onClose: () => void;
  onCotizar: (s: Solucion) => void;
}) {
  // Lock body scroll while open
  useEffect(() => {
    if (!solucion) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [solucion, onClose]);

  return (
    <AnimatePresence>
      {solucion && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 30, scale: 0.97, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className={`${styles.modalScroll} relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border border-yellow-400/30 bg-gradient-to-b from-zinc-950 to-black p-6 md:p-10 shadow-[0_30px_120px_-20px_rgba(251,191,36,0.4)]`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/5 hover:bg-yellow-400 hover:text-black border border-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-4 mb-6">
              <span className="text-5xl">{solucion.emoji}</span>
              <div>
                <p className="text-yellow-400 text-[10px] font-black uppercase tracking-[0.25em] mb-1">
                  {solucion.tagline}
                </p>
                <h3 className="text-2xl md:text-3xl font-black leading-tight">{solucion.nombre}</h3>
              </div>
            </div>

            <p className="text-zinc-300 leading-relaxed mb-8">{solucion.descripcion}</p>

            {/* Resumen rápido */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <SummaryTile
                icon={<Ruler className="w-4 h-4" />}
                label="Sugerido"
                value={`${solucion.m2Sugeridos[0]}–${solucion.m2Sugeridos[1]} m²`}
              />
              <SummaryTile
                icon={<HardHat className="w-4 h-4" />}
                label="Plazo"
                value={`${solucion.plazoSemanas[0]}–${solucion.plazoSemanas[1]} sem`}
              />
              <SummaryTile
                icon={<ShieldCheck className="w-4 h-4" />}
                label="Garantía"
                value={solucion.garantia.split('·')[0].trim()}
              />
              <SummaryTile
                icon={<BadgeCheck className="w-4 h-4" />}
                label="Precio base"
                value={`${formatCLP(solucion.precioM2)}/m²`}
              />
            </div>

            {/* Por qué este precio */}
            <section className="mb-8">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-4 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                ¿Por qué cuesta lo que cuesta?
              </h4>
              <p className="text-sm text-zinc-400 mb-5">
                Cada peso está justificado. Así se reparte el presupuesto:
              </p>
              <div className="space-y-3">
                {solucion.breakdown.map((b) => (
                  <div key={b.etiqueta}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-zinc-200">{b.etiqueta}</span>
                      <span className="font-black text-yellow-400">{b.porcentaje}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={styles.barFill}
                        style={{
                          width: `${b.porcentaje}%`,
                          height: '100%',
                          background: `linear-gradient(90deg, ${b.color}, ${b.color}cc)`,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Proceso paso a paso */}
            <section className="mb-8">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-4 flex items-center gap-2">
                <Hammer className="w-3.5 h-3.5" />
                Cómo lo construimos
              </h4>
              <ol className="space-y-3">
                {solucion.proceso.map((p, i) => (
                  <motion.li
                    key={p.titulo}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-4 p-4 rounded-xl bg-white/5 border border-white/10"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-400 text-black font-black flex items-center justify-center text-sm">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-black text-white text-sm mb-1">{p.titulo}</p>
                      <p className="text-xs text-zinc-400 leading-relaxed">{p.detalle}</p>
                    </div>
                  </motion.li>
                ))}
              </ol>
            </section>

            {/* Materiales + Garantía */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <section className="p-5 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-3 flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" />
                  Materiales clave
                </h4>
                <ul className="space-y-1.5">
                  {solucion.materiales.map((m) => (
                    <li key={m} className="text-sm text-zinc-300 flex gap-2">
                      <span className="text-yellow-400">·</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="p-5 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Garantía
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed">{solucion.garantia}</p>
                <p className="text-xs text-zinc-500 mt-3">
                  Respaldo escrito en el contrato. Postventa con respuesta en menos de 72 horas.
                </p>
              </section>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => onCotizar(solucion)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black font-black text-sm uppercase tracking-widest hover:bg-white transition-colors"
              >
                <Calculator className="w-4 h-4" />
                Calcular para mi proyecto
              </button>
              <Link
                href={`/cotizaciones?tipo=${solucion.id}`}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full border-2 border-yellow-400 text-yellow-400 font-black text-sm uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-colors"
              >
                Pedir cotización formal
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="flex items-center gap-2 text-yellow-400 mb-1">{icon}</div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="text-sm font-black text-white">{value}</p>
    </div>
  );
}

/* ============================================================
 * 3D PLAN PREVIEW (Three.js, reactivo a la calculadora)
 * ============================================================ */

type PlanPreviewProps = {
  ancho: number; // metros
  largo: number; // metros
  segundoPiso: boolean;
};

function PlanPreview({ ancho, largo, segundoPiso }: PlanPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    floor?: THREE.Mesh;
    walls?: THREE.Mesh;
    walls2?: THREE.Mesh;
    renderer?: THREE.WebGLRenderer;
    cleanup?: () => void;
  }>({});

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(8, 9, 12);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xfbbf24, 1.1);
    dir.position.set(8, 12, 6);
    scene.add(dir);
    const rim = new THREE.PointLight(0xffffff, 0.6, 30);
    rim.position.set(-6, 4, -6);
    scene.add(rim);

    // Floor (piso del proyecto) - placeholder size, se reescala via useEffect
    const floorGeom = new THREE.BoxGeometry(1, 0.1, 1);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.85,
      metalness: 0.1,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = 0.05;
    scene.add(floor);

    // Walls (caja translúcida representando muros)
    const wallGeom = new THREE.BoxGeometry(1, 1, 1);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.18,
      roughness: 0.4,
      metalness: 0.2,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide,
    });
    const walls = new THREE.Mesh(wallGeom, wallMat);
    walls.position.y = 1.4;
    scene.add(walls);

    // Edges (líneas amarillas que dan la sensación de plano arquitectónico)
    const edgesGeom = new THREE.EdgesGeometry(wallGeom);
    const edgesMat = new THREE.LineBasicMaterial({ color: 0xfbbf24 });
    const edges = new THREE.LineSegments(edgesGeom, edgesMat);
    walls.add(edges);

    // Segundo piso (oculto por defecto)
    const walls2 = walls.clone();
    walls2.material = wallMat.clone();
    walls2.position.y = 3.4;
    walls2.visible = false;
    const edges2 = new THREE.LineSegments(edgesGeom, edgesMat);
    walls2.add(edges2);
    scene.add(walls2);

    // Grid (suelo arquitectónico)
    const grid = new THREE.GridHelper(40, 40, 0x333333, 0x1a1a1a);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    stateRef.current.floor = floor;
    stateRef.current.walls = walls;
    stateRef.current.walls2 = walls2;
    stateRef.current.renderer = renderer;

    // Animation loop: rotación lenta autocentrada
    let raf: number;
    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.003;
      camera.position.x = Math.cos(t) * 12;
      camera.position.z = Math.sin(t) * 12;
      camera.lookAt(0, 1.2, 0);
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    stateRef.current.cleanup = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      floorGeom.dispose();
      wallGeom.dispose();
      edgesGeom.dispose();
      floorMat.dispose();
      wallMat.dispose();
      edgesMat.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      stateRef.current.cleanup?.();
      stateRef.current = {};
    };
  }, []);

  // Reescalar al cambiar dimensiones
  useEffect(() => {
    const { floor, walls, walls2 } = stateRef.current;
    // Escala con cap visual para que no se salga del viewport, pero el cálculo real no tiene tope.
    const visualAncho = Math.max(1, Math.min(ancho, 18));
    const visualLargo = Math.max(1, Math.min(largo, 18));
    if (floor) {
      floor.scale.set(visualAncho, 1, visualLargo);
    }
    if (walls) {
      walls.scale.set(visualAncho, 2.6, visualLargo);
    }
    if (walls2) {
      walls2.scale.set(visualAncho, 2.6, visualLargo);
      walls2.visible = segundoPiso;
    }
  }, [ancho, largo, segundoPiso]);

  return <div ref={containerRef} className="w-full h-full" aria-hidden />;
}

/* ============================================================
 * CALCULADORA AVANZADA
 * ============================================================ */

type CalculadoraResultado = {
  m2: number;
  base: number;
  conTerminacion: number;
  extras: { id: ExtraId; label: string; monto: number }[];
  total: number;
};

function calcularPresupuesto(input: {
  ancho: number;
  largo: number;
  solucion: Solucion;
  terminacionMult: number;
  segundoPiso: boolean;
  extras: Set<ExtraId>;
}): CalculadoraResultado {
  const ancho = Math.max(0, input.ancho);
  const largo = Math.max(0, input.largo);
  let m2 = ancho * largo;
  if (input.extras.has('segundoPiso') || input.segundoPiso) {
    // Duplicamos los m² estructurales pero con un coeficiente 0.85 (apoya en piso 1)
    m2 = m2 * 1.85;
  }
  const base = m2 * input.solucion.precioM2;
  const conTerminacion = base * input.terminacionMult;

  const extras: { id: ExtraId; label: string; monto: number }[] = [];
  for (const ex of EXTRAS) {
    if (ex.id === 'segundoPiso') continue; // ya aplicado en m²
    if (!input.extras.has(ex.id)) continue;
    // Para extras "por m²" usamos m² base (sin duplicar por 2° piso)
    const m2Base = ancho * largo;
    const monto = ex.fijo + ex.porM2 * m2Base;
    extras.push({ id: ex.id, label: ex.label, monto });
  }

  const totalExtras = extras.reduce((s, e) => s + e.monto, 0);
  const total = conTerminacion + totalExtras;
  return { m2, base, conTerminacion, extras, total };
}

function Calculadora({
  initialSolucionId,
  onRequestQuote,
}: {
  initialSolucionId?: string;
  onRequestQuote: (data: {
    solucion: Solucion;
    ancho: number;
    largo: number;
    terminacion: TerminacionId;
    extras: ExtraId[];
    total: number;
  }) => void;
}) {
  const [solucionId, setSolucionId] = useState<string>(
    initialSolucionId ?? SOLUCIONES[1].id
  );
  const [ancho, setAncho] = useState<number>(6);
  const [largo, setLargo] = useState<number>(8);
  const [terminacion, setTerminacion] = useState<TerminacionId>('estandar');
  const [extras, setExtras] = useState<Set<ExtraId>>(new Set(['electricidad']));

  // Si abren la calculadora desde una tarjeta → ajustar solución
  useEffect(() => {
    if (initialSolucionId) setSolucionId(initialSolucionId);
  }, [initialSolucionId]);

  const solucion = useMemo(
    () => SOLUCIONES.find((s) => s.id === solucionId) ?? SOLUCIONES[0],
    [solucionId]
  );

  const terminacionMult = useMemo(
    () => TERMINACIONES.find((t) => t.id === terminacion)?.mult ?? 1,
    [terminacion]
  );

  const segundoPiso = extras.has('segundoPiso');

  const resultado = useMemo(
    () =>
      calcularPresupuesto({
        ancho,
        largo,
        solucion,
        terminacionMult,
        segundoPiso,
        extras,
      }),
    [ancho, largo, solucion, terminacionMult, segundoPiso, extras]
  );

  const totalAnimado = useAnimatedNumber(resultado.total);
  const m2Animado = useAnimatedNumber(resultado.m2);

  const toggleExtra = (id: ExtraId) => {
    setExtras((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-stretch">
      {/* Inputs */}
      <div className="space-y-6 p-6 md:p-8 rounded-3xl border border-yellow-400/20 bg-gradient-to-b from-yellow-400/5 to-transparent">
        <div>
          <label className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-3 flex items-center gap-2">
            <HomeIcon className="w-3.5 h-3.5" />
            Tipo de solución
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SOLUCIONES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSolucionId(s.id)}
                className={`text-left p-3 rounded-xl border-2 transition-all ${
                  solucionId === s.id
                    ? 'bg-yellow-400/15 border-yellow-400'
                    : 'bg-white/5 border-white/10 hover:border-yellow-400/40'
                }`}
              >
                <p className="text-sm font-black text-white leading-tight">{s.nombre}</p>
                <p className="text-[10px] text-zinc-400 mt-1">{formatCLP(s.precioM2)}/m²</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-3 flex items-center gap-2">
            <Ruler className="w-3.5 h-3.5" />
            Dimensiones del espacio
          </label>
          <div className="grid grid-cols-2 gap-3">
            <DimensionInput label="Ancho (m)" value={ancho} onChange={setAncho} />
            <DimensionInput label="Largo (m)" value={largo} onChange={setLargo} />
          </div>
          <div className="mt-3 flex items-center justify-between bg-black/40 rounded-xl px-4 py-3 border border-white/10">
            <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">Superficie</span>
            <span className="text-xl font-black text-yellow-400">
              {m2Animado.toFixed(1)} m²
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-2">
            Sin tope superior — la calculadora escala a cualquier tamaño que necesites.
          </p>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Nivel de terminación
          </label>
          <div className="grid grid-cols-3 gap-2">
            {TERMINACIONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTerminacion(t.id)}
                className={`p-3 rounded-xl border-2 transition-all ${
                  terminacion === t.id
                    ? 'bg-yellow-400/15 border-yellow-400'
                    : 'bg-white/5 border-white/10 hover:border-yellow-400/40'
                }`}
              >
                <p className="text-sm font-black text-white">{t.label}</p>
                <p className="text-[10px] text-zinc-400 mt-1">×{t.mult.toFixed(2)}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{t.hint}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-[0.2em] text-yellow-400 mb-3 flex items-center gap-2">
            <Plug className="w-3.5 h-3.5" />
            Extras
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EXTRAS.map((ex) => {
              const Icon = ex.icon;
              const active = extras.has(ex.id);
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => toggleExtra(ex.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    active
                      ? 'bg-yellow-400/15 border-yellow-400'
                      : 'bg-white/5 border-white/10 hover:border-yellow-400/40'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      active ? 'text-yellow-400' : 'text-zinc-400'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-black text-white truncate">{ex.label}</p>
                    <p className="text-[10px] text-zinc-400">
                      {ex.fijo > 0 ? formatCLP(ex.fijo) : ex.porM2 > 0 ? `${formatCLP(ex.porM2)}/m²` : 'Estructural'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Output + 3D plan */}
      <div className="flex flex-col gap-4">
        <div className="rounded-3xl border border-yellow-400/30 bg-gradient-to-br from-yellow-400/15 via-zinc-900 to-black p-6 md:p-8 shadow-[0_20px_60px_-20px_rgba(251,191,36,0.4)]">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400/80 mb-2">
            Estimación total para tu proyecto
          </p>
          <p className="text-4xl md:text-5xl font-black text-yellow-400 leading-none mb-3">
            {formatCLP(totalAnimado)}
          </p>
          <p className="text-xs text-zinc-400">
            {solucion.nombre} · {m2Animado.toFixed(1)} m² · {TERMINACIONES.find((t) => t.id === terminacion)?.label}
          </p>

          <div className="mt-5 space-y-2 text-sm">
            <BreakdownRow label="Construcción base" monto={resultado.conTerminacion} />
            {resultado.extras.map((ex) => (
              <BreakdownRow key={ex.id} label={ex.label} monto={ex.monto} />
            ))}
            <div className="pt-2 mt-2 border-t border-yellow-400/20 flex items-center justify-between font-black text-yellow-400">
              <span className="uppercase text-xs tracking-[0.18em]">Total</span>
              <span className="text-base">{formatCLP(resultado.total)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              onRequestQuote({
                solucion,
                ancho,
                largo,
                terminacion,
                extras: Array.from(extras),
                total: resultado.total,
              })
            }
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-yellow-400 text-black font-black text-sm uppercase tracking-widest hover:bg-white transition-colors"
          >
            Pedir cotización formal
            <ArrowRight className="w-4 h-4" />
          </button>
          <p className="text-[10px] text-zinc-500 mt-3 leading-relaxed">
            Estimación referencial. La cotización formal incluye visita técnica gratuita y precio cerrado por contrato.
          </p>
        </div>

        <div className="relative rounded-3xl border border-white/10 bg-black overflow-hidden h-64 md:h-72">
          <PlanPreview ancho={ancho} largo={largo} segundoPiso={segundoPiso} />
          <div className="absolute top-3 left-3 text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400/80 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-yellow-400/30">
            Plano 3D en vivo
          </div>
          <div className="absolute bottom-3 right-3 text-[10px] text-zinc-400 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full border border-white/10">
            {ancho.toFixed(1)} × {largo.toFixed(1)} m{segundoPiso ? ' · 2 pisos' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

function DimensionInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.18em] text-zinc-500 mb-1.5">
        {label}
      </label>
      <input
        type="number"
        min={0}
        step={0.1}
        value={value}
        onChange={(e) => {
          const n = Number.parseFloat(e.target.value);
          onChange(Number.isFinite(n) ? Math.max(0, n) : 0);
        }}
        className={`${styles.calcInput} w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 focus:border-yellow-400 focus:outline-none text-lg font-black text-white text-center`}
      />
    </div>
  );
}

function BreakdownRow({ label, monto }: { label: string; monto: number }) {
  return (
    <div className="flex items-center justify-between text-zinc-300">
      <span>{label}</span>
      <span className="font-black text-white">{formatCLP(monto)}</span>
    </div>
  );
}

/* ============================================================
 * COUNTER (hero social proof)
 * ============================================================ */

function StatCounter({
  value,
  suffix,
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  const animated = useAnimatedNumber(value, 1400);
  const display = Math.round(animated).toLocaleString('es-CL');
  return (
    <div className="text-center">
      <p className="text-3xl md:text-4xl font-black text-yellow-400 leading-none">
        {display}
        {suffix && <span className="text-yellow-400/80">{suffix}</span>}
      </p>
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-1">{label}</p>
    </div>
  );
}

/* ============================================================
 * MAIN PAGE
 * ============================================================ */

export function SolucionesPageContent() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [openModalIdx, setOpenModalIdx] = useState<number | null>(null);
  const [calcSeed, setCalcSeed] = useState<string | undefined>(undefined);

  const calcRef = useRef<HTMLDivElement>(null);

  const handleCotizarFromModal = (s: Solucion) => {
    setCalcSeed(s.id);
    setOpenModalIdx(null);
    requestAnimationFrame(() => {
      calcRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleRequestQuote = (data: {
    solucion: Solucion;
    ancho: number;
    largo: number;
    terminacion: TerminacionId;
    extras: ExtraId[];
    total: number;
  }) => {
    const params = new URLSearchParams({
      tipo: data.solucion.id,
      ancho: data.ancho.toString(),
      largo: data.largo.toString(),
      terminacion: data.terminacion,
      extras: data.extras.join(','),
      total: Math.round(data.total).toString(),
    });
    window.location.href = `/cotizaciones?${params.toString()}`;
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero */}
      <section className="pt-32 pb-16 px-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none"
          style={
            {
              background:
                'radial-gradient(800px circle at 50% 0%, rgba(251,191,36,0.18), transparent 60%)',
            } as CSSProperties
          }
        />
        <div className="max-w-5xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="inline-flex items-center gap-2 text-yellow-400 text-[10px] font-black uppercase tracking-[0.3em] mb-5 px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30">
              <Sparkles className="w-3 h-3" />
              Soluciones Fabrick · Región del Maule
            </p>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Construye con <span className="text-yellow-400">precio claro</span>,{' '}
              <br className="hidden md:block" />
              proceso transparente y plazo cumplido.
            </h1>
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
              Toca cada solución para ver exactamente qué se hace, qué materiales se usan
              y por qué cuesta lo que cuesta. Sin letra chica.
            </p>
          </motion.div>

          {/* Social proof counters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto p-6 rounded-2xl bg-white/[0.03] border border-white/10"
          >
            <StatCounter value={142} label="Proyectos entregados" />
            <StatCounter value={6800} suffix=" m²" label="Construidos en Metalcon" />
            <StatCounter value={98} suffix="%" label="Satisfacción cliente" />
            <StatCounter value={5} suffix=" años" label="Garantía estructura" />
          </motion.div>
        </div>
      </section>

      {/* Soluciones — tarjetas 3D */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-3">Nuestras soluciones</h2>
              <p className="text-zinc-400 max-w-xl">
                Mueve el cursor (o el dedo) sobre las tarjetas. Toca <em>“Ver detalle”</em> para entender en qué consiste cada paquete.
              </p>
            </div>
            <p className="text-[11px] text-zinc-500 max-w-xs">
              💡 Los precios son por m² <strong>sin tope máximo</strong>. La calculadora más abajo escala a cualquier tamaño.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {SOLUCIONES.map((s, idx) => (
              <TiltCard
                key={s.id}
                solucion={s}
                active={selectedIdx === idx}
                onSelect={() => setSelectedIdx(idx)}
                onOpen={() => setOpenModalIdx(idx)}
                index={idx}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Calculadora */}
      <section
        ref={calcRef}
        id="calculadora"
        className="py-16 md:py-24 px-4 border-t border-yellow-400/10 bg-gradient-to-b from-transparent via-yellow-400/[0.02] to-transparent"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="inline-flex items-center gap-2 text-yellow-400 text-[10px] font-black uppercase tracking-[0.3em] mb-4 px-3 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30">
              <Calculator className="w-3 h-3" />
              Calculadora de presupuesto
            </p>
            <h2 className="text-3xl md:text-4xl font-black mb-3">Calcula tu proyecto en vivo</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              Ingresa el ancho y el largo en metros, elige terminación y extras. El total se actualiza al instante y el plano 3D refleja tus dimensiones reales.
            </p>
          </div>

          <Calculadora initialSolucionId={calcSeed} onRequestQuote={handleRequestQuote} />
        </div>
      </section>

      {/* Por qué confiar — social */}
      <section className="py-16 md:py-24 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
            Familias del Maule que ya construyeron con nosotros
          </h2>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                nombre: 'María González',
                ciudad: 'Talca',
                m2: 42,
                solucion: 'Llave en Mano · Premium',
                texto:
                  'El cotizador online fue clavadito al precio final. Cero sorpresas. La cuadrilla muy ordenada.',
              },
              {
                nombre: 'Roberto Silva',
                ciudad: 'Curicó',
                m2: 28,
                solucion: 'Ampliación de Vivienda',
                texto:
                  'Ampliamos pieza para nuestro hijo en 6 semanas. Match perfecto con la pintura existente.',
              },
              {
                nombre: 'Constanza López',
                ciudad: 'Linares',
                m2: 60,
                solucion: 'Llave en Mano · Básico',
                texto:
                  'Me explicaron en qué se gastaba cada peso. Por eso confié. Calidad de los terminados muy buena.',
              },
            ].map((t, i) => (
              <motion.article
                key={t.nombre}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-yellow-400/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-full bg-yellow-400 text-black font-black flex items-center justify-center text-lg">
                    {t.nombre[0]}
                  </div>
                  <div>
                    <p className="font-black text-white text-sm">{t.nombre}</p>
                    <p className="text-[11px] text-zinc-500">{t.ciudad} · {t.m2} m²</p>
                  </div>
                </div>
                <div className="flex gap-0.5 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed mb-3">"{t.texto}"</p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-yellow-400/80">
                  {t.solucion}
                </p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-yellow-400 via-yellow-300 to-orange-400 rounded-3xl p-10 md:p-14 relative overflow-hidden">
          <div className={`${styles.shimmer} absolute inset-0 pointer-events-none`} aria-hidden />
          <Users className="w-12 h-12 text-black mx-auto mb-5 relative" />
          <h2 className="text-3xl md:text-4xl font-black text-black mb-4 relative">
            ¿Conversamos sobre tu proyecto?
          </h2>
          <p className="text-black/75 mb-8 relative">
            Te ayudamos a aterrizar tu idea, ajustar el presupuesto y definir el mejor camino. Visita técnica gratuita en toda la Región del Maule.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center relative">
            <Link
              href="/cotizaciones"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-black text-yellow-400 font-black uppercase tracking-widest text-sm hover:bg-zinc-900 transition-colors"
            >
              Pedir cotización
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#calculadora"
              className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white/30 backdrop-blur text-black font-black uppercase tracking-widest text-sm hover:bg-white/50 transition-colors"
            >
              <Calculator className="w-4 h-4" />
              Volver a la calculadora
            </Link>
          </div>
        </div>
      </section>

      {/* Modal de detalle */}
      <DetalleModal
        solucion={openModalIdx !== null ? SOLUCIONES[openModalIdx] : null}
        onClose={() => setOpenModalIdx(null)}
        onCotizar={handleCotizarFromModal}
      />
    </main>
  );
}
