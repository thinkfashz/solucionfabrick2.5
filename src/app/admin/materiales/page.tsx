import type { Metadata } from 'next';
import MaterialManager from '@/components/admin/MaterialManager';

export const metadata: Metadata = {
  title: 'Materiales del Cotizador | Admin Fabrick',
  description: 'Catálogo del Cotizador en tiempo real.',
};

export const dynamic = 'force-dynamic';

/**
 * /admin/materiales — Centro de comando del Cotizador.
 *
 * El componente cliente `MaterialManager` carga el catálogo desde
 * `/api/admin/materials` y se sincroniza con la pantalla pública
 * `/presupuesto` por SSE (`materials` topic en `cmsBus`).
 */
export default function AdminMaterialesPage() {
  return <MaterialManager />;
}
