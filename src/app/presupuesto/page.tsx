import type { Metadata } from 'next';
import { getActiveMaterials } from '@/lib/budget';
import PresupuestoClient from './PresupuestoClient';
import Navbar from '@/components/Navbar';
import ConstructionM2Calculator from '@/components/landing/ConstructionM2Calculator';

/**
 * /presupuesto — Cotizador público (servidor + cliente).
 *
 * El servidor entrega los materiales activos del catálogo y el cliente
 * (`PresupuestoClient`) los inyecta en `ProjectBuilder`. Una conexión SSE a
 * `/api/cms/events` mantiene el catálogo en vivo: si el admin cambia un
 * precio en /admin/materiales, se refleja al instante en esta pantalla.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const metadata: Metadata = {
  title: 'Calculadora y presupuesto de construcción | Soluciones Fabrick',
  description:
    'Compara kit básico, kit avanzado y llave en mano; luego detalla materiales, instalaciones y servicios para solicitar una evaluación.',
};

export default async function PresupuestoPage() {
  const materials = await getActiveMaterials();
  return (
    <main className="min-h-screen bg-[#080705] text-white">
      <Navbar />
      <div className="border-b border-white/10 px-4 pb-9 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1380px]"><p className="text-[10px] font-black uppercase tracking-[.3em] text-yellow-300">Presupuesto Fabrick</p><h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-.05em] sm:text-6xl">Primero calcula el alcance. Después agrega los detalles.</h1><p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400">Comienza con una referencia por metro cuadrado y, si necesitas partidas separadas, arma un presupuesto técnico debajo.</p></div>
      </div>
      <ConstructionM2Calculator />
      <PresupuestoClient initialMaterials={materials} />
    </main>
  );
}
