import type { Metadata } from 'next';
import { ArrowDown, CheckCircle2, Sparkles } from 'lucide-react';
import { getActiveMaterials } from '@/lib/budget';
import PresupuestoClient from './PresupuestoClient';
import Navbar from '@/components/Navbar';
import UniversalServiceCalculator, { PublicBudgetBottomNav } from '@/components/presupuesto/UniversalServiceCalculator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Presupuesto gratuito de servicios para el hogar | Soluciones Fabrick',
  description:
    'Calcula gratis construcción, reparaciones, pintura, Metalcon, techos, gasfitería, electricidad, aire acondicionado, pisos y remodelaciones en Linares y Maule.',
  keywords: [
    'presupuesto gratuito Linares',
    'calculadora reparación hogar',
    'precio instalación cerámica Linares',
    'precio pintura por metro cuadrado Chile',
    'instalación aire acondicionado Maule',
    'electricidad domiciliaria Linares',
    'gasfitería Linares',
    'remodelación Linares',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/presupuesto' },
};

const STEPS = [
  ['01', 'Elige el servicio', 'Abre la categoría y selecciona el trabajo que necesitas.'],
  ['02', 'Indica la cantidad', 'Escribe metros cuadrados, metros lineales, unidades o puntos.'],
  ['03', 'Recibe un rango', 'La calculadora muestra un aproximado gratuito de mano de obra.'],
  ['04', 'Decide cómo seguir', 'Puedes contratar, enviarte el cálculo por WhatsApp o recibirlo por correo.'],
] as const;

export default async function PresupuestoPage() {
  const materials = await getActiveMaterials();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#080705] pb-24 text-white sm:pb-0">
      <Navbar />

      <section className="relative overflow-hidden border-b border-white/10 px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-20 lg:pt-36">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(250,204,21,.18),transparent_30rem),radial-gradient(circle_at_88%_18%,rgba(249,115,22,.13),transparent_28rem),linear-gradient(180deg,#0b0906,#080705)]" />
        <div className="relative mx-auto grid max-w-[1380px] gap-9 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-yellow-300/25 bg-yellow-300/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.28em] text-yellow-300">
              <Sparkles className="h-3.5 w-3.5" /> Cálculo o presupuesto aproximado gratuito
            </div>
            <h1 className="mt-5 max-w-5xl text-4xl font-black leading-[.95] tracking-[-.06em] sm:text-6xl lg:text-7xl">
              Los <span className="text-yellow-300">360° de soluciones</span> que necesita tu hogar.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">
              Selecciona el servicio, agrega las medidas y obtén un rango aproximado antes de solicitar una visita. Fácil, rápido y sin compromiso.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#calculadora-universal" className="inline-flex items-center gap-2 rounded-full bg-yellow-300 px-6 py-3.5 text-sm font-black text-black transition hover:-translate-y-0.5 hover:bg-yellow-200">
                Calcular ahora <ArrowDown className="h-4 w-4" />
              </a>
              <a href="#presupuesto-detallado" className="inline-flex items-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-sm font-black text-white transition hover:border-yellow-300/50 hover:text-yellow-300">
                Presupuesto técnico
              </a>
            </div>
          </div>

          <aside className="border-y border-white/10 py-6 lg:border-y-0 lg:border-l lg:pl-8">
            <p className="text-[10px] font-black uppercase tracking-[.28em] text-zinc-500">Así funciona</p>
            <div className="mt-4 space-y-4">
              {['Seleccionas un servicio', 'Ingresas la cantidad', 'Obtienes un rango gratuito'].map((item) => (
                <p key={item} className="flex items-center gap-3 text-sm font-semibold text-zinc-300">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-yellow-300" /> {item}
                </p>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <UniversalServiceCalculator />

      <section className="border-b border-white/10 bg-[#0b0907] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1380px]">
          <div className="grid divide-y divide-white/10 border-y border-white/10 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
            {STEPS.map(([step, title, text]) => (
              <div key={step} className="p-6 lg:p-7">
                <span className="text-4xl font-black text-yellow-300/30">{step}</span>
                <h2 className="mt-4 text-lg font-black text-white">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="presupuesto-detallado" className="border-t border-white/10 px-4 pb-4 pt-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1380px]">
          <p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Opcional · Presupuesto detallado</p>
          <h2 className="mt-3 max-w-4xl text-3xl font-black tracking-[-.045em] sm:text-5xl">¿Necesitas combinar materiales y partidas?</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">
            Usa esta herramienta solo cuando quieras agregar varios materiales, instalaciones o servicios dentro de una misma solicitud.
          </p>
        </div>
      </section>

      <PresupuestoClient initialMaterials={materials} />
      <PublicBudgetBottomNav />
    </main>
  );
}
