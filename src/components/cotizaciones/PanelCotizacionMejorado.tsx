'use client';

/**
 * Panel de Cotización Mejorado con Calculadora Interactiva
 * Incluye visualización de precios en tiempo real, comparativas y animaciones
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  TrendingDown,
  Zap,
  Droplets,
  Hammer,
  BarChart3,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { CalculadoraPreciosThree } from '@/components/calculadora/CalculadoraPreciosThree';
import {
  MERCADO_2026,
  calcularPrecioServicio,
  obtenerCategorias,
  obtenerServiciosPorCategoria,
  type ServicioKey,
} from '@/lib/mercadoChileno2026';

export function PanelCotizacionMejorado() {
  const [servicioSeleccionado, setServicioSeleccionado] = useState<ServicioKey>('metalcon');
  const [metros2Inicial, setMetros2Inicial] = useState<number>(10);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [precioActual, setPrecioActual] = useState<number>(0);

  const categorias = useMemo(() => obtenerCategorias(), []);

  const ahorroEstimado = useMemo(() => {
    const precioSinDescuento = MERCADO_2026.servicios[servicioSeleccionado].precioBase * metros2Inicial;
    return {
      sin: precioSinDescuento,
      con: precioActual,
      ahorrado: precioSinDescuento - precioActual,
      porcentaje: Math.round(((precioSinDescuento - precioActual) / precioSinDescuento) * 100),
    };
  }, [servicioSeleccionado, metros2Inicial, precioActual]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-400/10 via-orange-400/5 to-transparent rounded-3xl border border-yellow-400/20 p-8 md:p-12">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center">
            <Calculator className="w-6 h-6 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
              Cotizador de Precios
            </h2>
            <p className="text-zinc-400 text-sm">
              Calcula precios reales del mercado chileno 2026. Utiliza medidas exactas de tu proyecto.
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Panel Izquierdo: Calculadora 3D */}
        <div className="md:col-span-2">
          <CalculadoraPreciosThree
            servicioId={servicioSeleccionado}
            onPrecioChange={setPrecioActual}
          />
        </div>

        {/* Panel Derecho: Resumen y Comparativas */}
        <div className="space-y-6">
          {/* Ahorro Estimado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 rounded-2xl border border-emerald-500/30 p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <TrendingDown className="w-5 h-5 text-emerald-400 mt-1" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-400 mb-1">
                  Ahorro Estimado
                </p>
                <p className="text-2xl font-black text-white">
                  {ahorroEstimado.porcentaje}%
                </p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Sin descuento:</span>
                <span>${ahorroEstimado.sin.toLocaleString('es-CL')}</span>
              </div>
              <div className="flex justify-between text-emerald-400 font-bold">
                <span>Con volumen:</span>
                <span>${ahorroEstimado.con.toLocaleString('es-CL')}</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex justify-between text-white font-black">
                <span>Te ahorras:</span>
                <span className="text-emerald-400">
                  ${ahorroEstimado.ahorrado.toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Info del Servicio */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-black/40 rounded-2xl border border-white/10 p-6"
          >
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-yellow-400 mb-3">
              Detalles del Servicio
            </p>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500 mb-1">Categoría</p>
                <p className="text-sm font-bold text-white">
                  {MERCADO_2026.servicios[servicioSeleccionado]?.categoria}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1">Tiempo Estimado</p>
                <p className="text-sm font-bold text-white">
                  {MERCADO_2026.servicios[servicioSeleccionado]?.tiempo} días
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-2">Materiales Principales</p>
                <div className="space-y-1">
                  {Object.entries(MERCADO_2026.servicios[servicioSeleccionado]?.materiales || {}).map(
                    ([mat, cant]) => (
                      <p key={mat} className="text-xs text-zinc-400">
                        • {mat}: {cant}
                      </p>
                    ),
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Info Legal */}
          <div className="bg-yellow-400/5 rounded-2xl border border-yellow-400/20 p-4">
            <div className="flex gap-2">
              <Lock className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-zinc-400 leading-relaxed">
                Los precios incluyen IVA (19%) y están actualizados al mercado chileno 2026.
                Solicita cotización formal para obra mayor.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparativa de Servicios */}
      <div className="bg-black/40 rounded-3xl border border-white/10 p-8 md:p-12">
        <h3 className="text-2xl font-black text-white mb-8">Todas las Categorías</h3>

        <div className="space-y-4">
          {categorias.map((categoria) => {
            const servicios = obtenerServiciosPorCategoria(categoria);
            const isExpanded = expandedCategory === categoria;

            return (
              <motion.div key={categoria} className="border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : categoria)}
                  className="w-full px-6 py-4 bg-zinc-900/50 hover:bg-zinc-900 transition-colors flex items-center justify-between"
                >
                  <span className="font-bold text-white">{categoria}</span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-5 h-5 text-yellow-400" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="bg-black/20 border-t border-white/10 divide-y divide-white/10"
                    >
                      {servicios.map((svc: any) => (
                        <div key={svc.id} className="p-6">
                          <button
                            onClick={() => setServicioSeleccionado(svc.id)}
                            className={`w-full text-left transition-all ${
                              servicioSeleccionado === svc.id
                                ? 'opacity-100'
                                : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            <h4 className="font-bold text-white mb-2">{svc.nombre}</h4>
                            <p className="text-sm text-zinc-400 mb-3">{svc.descripcion}</p>
                            <div className="flex items-center gap-4 text-xs">
                              <div>
                                <span className="text-zinc-500">Base:</span>
                                <span className="ml-2 font-bold text-yellow-400">
                                  ${svc.precioBase.toLocaleString('es-CL')}/m²
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-500">Máximo:</span>
                                <span className="ml-2 font-bold text-orange-400">
                                  ${svc.precioMax.toLocaleString('es-CL')}/m²
                                </span>
                              </div>
                            </div>
                          </button>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-3xl p-8 md:p-12 text-center"
      >
        <h3 className="text-2xl md:text-3xl font-black text-black mb-3">
          ¿Necesitas una cotización formal?
        </h3>
        <p className="text-black/70 mb-6 max-w-xl mx-auto">
          Accede a tu carrito de cotizaciones y envía tus requisitos específicos a nuestro equipo.
        </p>
        <button className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-black text-yellow-400 font-black uppercase tracking-widest text-sm hover:bg-zinc-900 transition-colors">
          Ir a Mi Cotización
        </button>
      </motion.div>
    </div>
  );
}
