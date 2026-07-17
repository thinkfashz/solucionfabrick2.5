import type { Metadata } from 'next';
import { Boxes, ClipboardList, Layers3 } from 'lucide-react';
import { getActiveMaterials } from '@/lib/budget';
import PresupuestoClient from './PresupuestoClient';
import Navbar from '@/components/Navbar';
import UniversalServiceCalculator, { PublicBudgetBottomNav } from '@/components/presupuesto/UniversalServiceCalculator';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Presupuesto guiado de construcción y hogar | Soluciones Fabrick',
  description:
    'Recorre un presupuesto guiado para construcción, remodelación, instalaciones y terminaciones. Obtén un rango orientativo y solicita tu cotización real en Maule.',
  keywords: [
    'presupuesto construcción Linares',
    'cotización remodelación Maule',
    'calculadora de servicios hogar',
    'instalación aire acondicionado Linares',
    'precio construcción por m2 Chile',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/presupuesto' },
};

export default async function PresupuestoPage() {
  const materials = await getActiveMaterials();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#070706] pb-24 text-white sm:pb-0">
      <Navbar />
      <UniversalServiceCalculator />

      <section id="presupuesto-detallado" className="relative isolate overflow-hidden border-y border-white/10 bg-[#0b0a08] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_84%_10%,rgba(250,204,21,.12),transparent_25rem),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)] [background-size:auto,52px_52px,52px_52px]" />
        <div className="relative mx-auto grid max-w-[1380px] gap-8 lg:grid-cols-[.88fr_1.12fr] lg:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.28em] text-yellow-300"><Boxes className="h-4 w-4" /> Presupuesto técnico opcional</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-.055em] sm:text-5xl">Cuando un servicio no basta, arma un proyecto por partidas.</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/58">Esta segunda herramienta sirve para combinar materiales, instalaciones y terminaciones dentro de una misma solicitud. No reemplaza la ruta guiada: la complementa cuando tu proyecto es más complejo.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <article className="rounded-[1.5rem] bg-white/[.055] p-5 ring-1 ring-white/10"><ClipboardList className="h-5 w-5 text-yellow-300" /><h3 className="mt-4 font-black">Agrega solo lo necesario</h3><p className="mt-2 text-sm leading-6 text-white/52">Elige partidas y ajusta cantidades antes de enviar.</p></article>
            <article className="rounded-[1.5rem] bg-white/[.055] p-5 ring-1 ring-white/10"><Layers3 className="h-5 w-5 text-yellow-300" /><h3 className="mt-4 font-black">Revisa el total ordenado</h3><p className="mt-2 text-sm leading-6 text-white/52">Subtotal, IVA y alcance antes de pedir evaluación.</p></article>
          </div>
        </div>
      </section>

      <PresupuestoClient initialMaterials={materials} />
      <PublicBudgetBottomNav />
    </main>
  );
}
