import PaymentsOperationsPanel from './PaymentsOperationsPanel';
import DteRecoveryPanel from './DteRecoveryPanel';
import MercadoPagoPanelClient from './MercadoPagoPanelClient';

export const metadata = {
  title: 'Pagos, Mercado Pago y DTE',
  description: 'Centro operativo de cobros, webhooks, ventas confirmadas y facturación electrónica.',
};

export default function AdminPagosPage() {
  return <main className="min-h-screen bg-[#08090A] pb-14">
    <PaymentsOperationsPanel />
    <DteRecoveryPanel />
    <MercadoPagoPanelClient />
  </main>;
}
