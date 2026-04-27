import type { Metadata } from 'next';
import { getActiveMaterials } from '@/lib/budget';
import PresupuestoClient from './PresupuestoClient';

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
  title: 'Cotizador en Tiempo Real | Soluciones Fabrick',
  description:
    'Arma tu presupuesto seleccionando materiales, especialidades y servicios. Precios actualizados en vivo y propuesta técnica al instante.',
};

export default async function PresupuestoPage() {
  const materials = await getActiveMaterials();
  return (
    <main className="bg-black">
      <PresupuestoClient initialMaterials={materials} />
    </main>
  );
}
