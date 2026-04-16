'use client';

import { navigateWithTransition } from '@/lib/routeTransition';
import {
  Store, Wrench, Phone, Star, Hammer, Shield,
} from 'lucide-react';

const SECTIONS = [
  {
    title:       'Tienda',
    description: 'Descubre materiales y productos premium para tu hogar.',
    href:        '/tienda',
    Icon:        Store,
    color:       'from-yellow-400/20 to-yellow-600/5',
    badge:       'Nuevo',
  },
  {
    title:       'Servicios',
    description: 'Construcción, remodelación y soluciones 360° para tu espacio.',
    href:        '/servicios',
    Icon:        Wrench,
    color:       'from-blue-400/15 to-blue-600/5',
  },
  {
    title:       'Proyectos',
    description: 'Resultados reales. Obras que hablan por sí solas.',
    href:        '/proyectos',
    Icon:        Hammer,
    color:       'from-zinc-400/15 to-zinc-600/5',
  },
  {
    title:       'Garantías',
    description: 'Seguro sísmico, respaldo de 5 años y tranquilidad total.',
    href:        '/garantias',
    Icon:        Shield,
    color:       'from-green-400/15 to-green-600/5',
  },
  {
    title:       'Reviews',
    description: 'Lo que dicen quienes ya viven la experiencia Fabrick.',
    href:        '/proyectos#reviews',
    Icon:        Star,
    color:       'from-orange-400/15 to-orange-600/5',
  },
  {
    title:       'Contacto',
    description: 'Agenda tu evaluación gratuita con nuestros ingenieros.',
    href:        '/contacto',
    Icon:        Phone,
    color:       'from-purple-400/15 to-purple-600/5',
    badge:       'Gratis',
  },
];

export default function SectionNav() {
  return (
    <section className="px-4 md:px-12 py-16 md:py-24 border-t border-[var(--border-main)]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-[var(--accent)] text-[10px] tracking-[0.4em] uppercase font-semibold block mb-2">
            Navega por Fabrick
          </span>
          <h2 className="text-[var(--text-primary)] text-2xl md:text-3xl font-playfair">
            Todo lo que necesitas, en un solo lugar
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {SECTIONS.map(({ title, description, href, Icon, color, badge }) => (
            <button
              key={href}
              onClick={() => navigateWithTransition(href)}
              className={`group relative liquid-glass rounded-3xl p-5 flex flex-col gap-3 text-left hover:border-[var(--border-gold)] transition-all duration-300 hover:-translate-y-1`}
            >
              {/* Gradiente de color de fondo */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${color} opacity-60 pointer-events-none`} />

              {badge && (
                <span className="absolute top-3 right-3 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent)] text-black">
                  {badge}
                </span>
              )}

              <div className="relative z-10 w-10 h-10 rounded-full liquid-glass flex items-center justify-center">
                <Icon className="w-4 h-4 text-[var(--accent)] group-hover:text-yellow-300 transition-colors" />
              </div>

              <div className="relative z-10">
                <h3 className="text-[var(--text-primary)] text-sm font-bold tracking-wide uppercase mb-1">
                  {title}
                </h3>
                <p className="text-[var(--text-muted)] text-[10px] leading-relaxed hidden sm:block">
                  {description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
