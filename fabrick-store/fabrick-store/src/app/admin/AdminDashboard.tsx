'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminDashboard({ email }: { email: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch('/api/admin/logout', { method: 'POST' });
    router.replace('/admin/login');
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-playfair text-yellow-400 font-black tracking-[0.3em] text-lg">FABRICK</span>
          <span className="text-white/20 text-xs tracking-widest uppercase">· Admin</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-zinc-400 text-xs hidden sm:block">{email}</span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-4 py-2 rounded-full border border-white/15 text-white/60 hover:text-white hover:border-white/40 text-xs uppercase tracking-widest transition-all disabled:opacity-40"
          >
            {loggingOut ? 'Saliendo...' : 'Cerrar sesión'}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-6 py-12 max-w-5xl mx-auto w-full">
        <div className="mb-10">
          <p className="text-yellow-400/70 text-[10px] tracking-[0.35em] uppercase mb-2">Panel de Control</p>
          <h1 className="text-3xl font-bold text-white">Bienvenido, Administrador</h1>
          <p className="text-zinc-500 text-sm mt-1">{email}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: 'Usuarios', desc: 'Gestión de cuentas de cliente.', href: '#' },
            { label: 'Pedidos', desc: 'Revisión de órdenes y estados.', href: '#' },
            { label: 'Productos', desc: 'Catálogo e inventario.', href: '#' },
            { label: 'Presupuestos', desc: 'Solicitudes y cotizaciones.', href: '#' },
            { label: 'Configuración', desc: 'Ajustes generales del sistema.', href: '#' },
          ].map(({ label, desc }) => (
            <div
              key={label}
              className="rounded-3xl border border-white/10 bg-zinc-950/70 p-6 hover:border-yellow-400/30 transition-all duration-300"
            >
              <h3 className="text-white font-semibold tracking-wide uppercase text-sm mb-1">{label}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
