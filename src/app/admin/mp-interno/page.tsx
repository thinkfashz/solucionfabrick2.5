import type { Metadata } from 'next';
import MercadoPagoInternalLabAddon from '../pagos/lab/MercadoPagoInternalLabAddon';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'MP interno | Admin Fabrick',
  description: 'Pantalla interna de laboratorio.',
};

export default function MpInternoPage() {
  return <main className="min-h-screen bg-[#050505] pt-6 text-white">
    <MercadoPagoInternalLabAddon />
  </main>;
}
