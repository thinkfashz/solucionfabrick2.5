'use client';

/**
 * Página de Servicios Mejorada
 * Incluye tarjetas interactivas, animaciones y enlace a cotizador
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hammer,
  Zap,
  Droplets,
  PaintBucket,
  Home as HomeIcon,
  TrendingDown,
  ArrowRight,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  MERCADO_2026,
  obtenerCategorias,
  obtenerServiciosPorCategoria,
} from '@/lib/mercadoChileno2026';

const ICON_MAP: Record<string, typeof Hammer> = {
  Estructura: Hammer,
  Acabados: PaintBucket,
  Instalaciones: Zap,
  Construcción: HomeIcon,
  Tecnología: Zap,
};

export function ServiciosPageContent() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredService, setHoveredService] = useState<string | null>(null);

  const categorias = useMemo(() => obtenerCategorias(), []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-yellow-400/10 to-black">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-yellow-400 text-xs font-black uppercase tracking-[0.3em] mb-4">
              🏗️ Servicios Profesionales
            </p>
            <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
              Construimos tu <span className="text-yellow-400">visión</span> con
              precisión
            </h1>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-8">
              Todos nuestros servicios tienen precios reales del mercado chileno 2026.
              Cotiza ahora sin compromisos.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 md:grid-cols-3 gap-4 mt-12 max-w-2xl mx-auto"
          >
            <motion.div variants={itemVariants} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-2xl font-black text-yellow-400">{categorias.length}</p>
              <p className="text-xs text-zinc-400 mt-2">Categorías</p>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-2xl font-black text-yellow-400">
                {Object.keys(MERCADO_2026.servicios).length}
              </p>
              <p className="text-xs text-zinc-400 mt-2">Servicios</p>
            </motion.div>
            <motion.div variants={itemVariants} className="bg-white/5 rounded-xl p-4 border border-white/10">
              <p className="text-2xl font-black text-yellow-400">+10</p>
              <p className="text-xs text-zinc-400 mt-2">Años exp.</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Categorías */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-black mb-4">Categorías de Servicios</h2>
            <p className="text-zinc-400">
              Explora nuestros servicios organizados por categoría. Cada uno incluye precios
              actualizados y cálculos en tiempo real.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            className="grid md:grid-cols-2 gap-6 mb-12"
          >
            {categorias.map((categoria) => {
              const servicios = obtenerServiciosPorCategoria(categoria);
              const Icon = ICON_MAP[categoria] || Hammer;
              const isSelected = selectedCategory === categoria;

              return (
                <motion.button
                  key={categoria}
                  variants={itemVariants}
                  onClick={() => setSelectedCategory(isSelected ? null : categoria)}
                  className={`text-left p-8 rounded-2xl border-2 transition-all duration-300 ${
                    isSelected
                      ? 'bg-yellow-400/20 border-yellow-400 shadow-lg shadow-yellow-400/20'
                      : 'bg-zinc-900/50 border-white/10 hover:border-yellow-400/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-yellow-400/20 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-yellow-400" />
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-yellow-400 transition-transform ${
                        isSelected ? 'rotate-90' : ''
                      }`}
                    />
                  </div>
                  <h3 className="text-xl font-black mb-2">{categoria}</h3>
                  <p className="text-sm text-zinc-400 mb-4">{servicios.length} servicios disponibles</p>

                  {/* Mini preview de servicios */}
                  <div className="flex flex-wrap gap-2">
                    {servicios.slice(0, 3).map((svc: any) => (
                      <span
                        key={svc.id}
                        className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10"
                      >
                        {svc.nombre.split(' ')[0]}
                      </span>
                    ))}
                    {servicios.length > 3 && (
                      <span className="text-xs px-2.5 py-1 text-zinc-500">
                        +{servicios.length - 3}
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Servicios Detallados */}
          <AnimatePresence>
            {selectedCategory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-12 pt-12 border-t border-white/10"
              >
                <h3 className="text-2xl font-black mb-8">{selectedCategory}</h3>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid md:grid-cols-2 gap-6"
                >
                  {obtenerServiciosPorCategoria(selectedCategory).map((servicio: any) => (
                    <motion.div
                      key={servicio.id}
                      variants={itemVariants}
                      onHoverStart={() => setHoveredService(servicio.id)}
                      onHoverEnd={() => setHoveredService(null)}
                      className={`group p-8 rounded-2xl border-2 transition-all duration-300 cursor-pointer ${
                        hoveredService === servicio.id
                          ? 'bg-yellow-400/10 border-yellow-400 shadow-lg shadow-yellow-400/10'
                          : 'bg-zinc-900/50 border-white/10 hover:border-yellow-400/30'
                      }`}
                    >
                      {/* Encabezado */}
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-black text-white mb-1">{servicio.nombre}</h4>
                          <p className="text-xs text-zinc-500">{servicio.descripcion}</p>
                        </div>
                        <TrendingDown
                          className={`w-5 h-5 transition-transform ${
                            hoveredService === servicio.id ? 'text-emerald-400' : 'text-yellow-400'
                          }`}
                        />
                      </div>

                      {/* Precios */}
                      <div className="space-y-2 mb-6 pb-6 border-b border-white/10">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500">Precio Base</span>
                          <span className="font-black text-yellow-400">
                            ${servicio.precioBase.toLocaleString('es-CL')}/m²
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-zinc-500">Precio Máximo</span>
                          <span className="font-black text-orange-400">
                            ${servicio.precioMax.toLocaleString('es-CL')}/m²
                          </span>
                        </div>
                      </div>

                      {/* Materiales */}
                      <div className="mb-6">
                        <p className="text-xs font-bold uppercase tracking-[0.1em] text-zinc-400 mb-3">
                          Materiales Principales
                        </p>
                        <ul className="space-y-1">
                          {Object.entries(servicio.materiales || {})
                            .slice(0, 3)
                            .map(([mat, cant]: [string, any]) => (
                              <li key={mat} className="flex items-center gap-2 text-xs text-zinc-400">
                                <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                                {mat}: {cant}
                              </li>
                            ))}
                        </ul>
                      </div>

                      {/* CTA */}
                      <Link
                        href="/cotizaciones"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-bold text-xs uppercase tracking-widest hover:bg-yellow-400/20 transition-all group"
                      >
                        Cotizar
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-4 bg-gradient-to-t from-yellow-400/10 to-transparent">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-black mb-6">
              ¿Listo para tu proyecto?
            </h2>
            <p className="text-zinc-400 text-lg mb-8">
              Usa nuestro cotizador para calcular precios exactos basados en el mercado chileno.
            </p>
            <Link
              href="/cotizaciones"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-yellow-400 text-black font-black text-sm uppercase tracking-widest hover:bg-white transition-colors"
            >
              <Hammer className="w-5 h-5" />
              Ir al Cotizador
            </Link>
          </motion.div>
        </div>
      </section>
    </main>
  );
}
