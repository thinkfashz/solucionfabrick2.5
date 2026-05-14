'use client';

import { AlertTriangle, CreditCard, LogOut, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function PlanSuspendidoPage() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    router.push('/admin/login');
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center mx-auto">
          <AlertTriangle size={28} className="text-orange-400" />
        </div>

        <div>
          <h1 className="text-2xl font-black text-white">Plan suspendido</h1>
          <p className="mt-3 text-zinc-400 leading-relaxed">
            Tu suscripción ha sido suspendida o cancelada. Para recuperar el acceso a tu panel,
            renueva tu plan desde el portal de facturación.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/3 p-5 text-left space-y-3">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">¿Qué hacer?</p>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">1.</span>
              Revisa tu correo: te enviamos el link de pago.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">2.</span>
              Completa el pago en MercadoPago.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400 mt-0.5">3.</span>
              Tu acceso se reactiva automáticamente en minutos.
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="https://fabrick.cl/registro"
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-3 transition-colors"
          >
            <CreditCard size={16} />
            Renovar suscripción
          </a>
          <button
            onClick={() => router.refresh()}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:border-white/20 py-3 text-sm transition-colors"
          >
            <RefreshCw size={14} />
            Ya pagué — verificar acceso
          </button>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex items-center justify-center gap-2 text-zinc-600 hover:text-zinc-400 py-2 text-sm transition-colors"
          >
            <LogOut size={13} />
            Cerrar sesión
          </button>
        </div>

        <p className="text-xs text-zinc-600">
          ¿Problemas? Escríbenos a{' '}
          <a href="mailto:soporte@fabrick.cl" className="text-zinc-400 hover:underline">
            soporte@fabrick.cl
          </a>
        </p>
      </div>
    </div>
  );
}
