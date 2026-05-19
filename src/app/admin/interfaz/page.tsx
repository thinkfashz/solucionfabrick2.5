'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, LayoutDashboard, MonitorCog, Power, RefreshCw } from 'lucide-react';
import { ADMIN_INTERFACE_STORAGE_KEY, type AdminInterfaceMode, setStoredAdminInterfaceMode } from '@/components/admin-interface/AdminInterfaceMount';

const options: Array<{ id: AdminInterfaceMode; title: string; badge: string; description: string }> = [
  {
    id: 'studio',
    title: 'Nueva interfaz Studio',
    badge: 'Principal recomendada',
    description: 'Interfaz moderna, modular y optimizada. Es la principal por defecto y solo ella se monta cuando está activa.',
  },
  {
    id: 'classic',
    title: 'Interfaz clásica',
    badge: 'Respaldo legacy',
    description: 'Interfaz anterior. Solo se monta si la activas manualmente para comparar o usar una función antigua.',
  },
];

function readMode(): AdminInterfaceMode {
  if (typeof window === 'undefined') return 'studio';
  return localStorage.getItem(ADMIN_INTERFACE_STORAGE_KEY) === 'classic' ? 'classic' : 'studio';
}

export default function AdminInterfacePage() {
  const [mode, setMode] = useState<AdminInterfaceMode>('studio');

  useEffect(() => setMode(readMode()), []);

  function activate(next: AdminInterfaceMode) {
    setStoredAdminInterfaceMode(next);
    setMode(next);
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/40 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(250,204,21,0.18),transparent_32%),radial-gradient(circle_at_90%_0%,rgba(16,185,129,0.15),transparent_32%)]" />
        <div className="relative">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.28em] text-yellow-300"><MonitorCog className="h-4 w-4" /> Centro de interfaz</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-[-0.07em] text-white sm:text-6xl">Activar nueva o antigua interfaz</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">Selecciona qué shell del admin se monta. La interfaz apagada no se renderiza, evitando llamadas duplicadas y consumo innecesario de datos.</p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300"><Power className="h-4 w-4" /> Activa ahora: {mode === 'studio' ? 'Nueva Studio' : 'Clásica'}</div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {options.map((item) => {
          const active = mode === item.id;
          return (
            <article key={item.id} className={`relative overflow-hidden rounded-[2rem] border p-6 transition ${active ? 'border-yellow-300/50 bg-yellow-300/[0.08]' : 'border-white/10 bg-zinc-950/80 hover:border-white/20'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.22em] text-zinc-500">{item.badge}</p>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-white">{item.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">{item.description}</p>
                </div>
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${active ? 'bg-yellow-300 text-black' : 'bg-white/5 text-zinc-400'}`}>{active ? <CheckCircle2 className="h-6 w-6" /> : <LayoutDashboard className="h-6 w-6" />}</span>
              </div>
              <button type="button" onClick={() => activate(item.id)} className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-[0.18em] transition ${active ? 'bg-white/10 text-yellow-200' : 'bg-yellow-300 text-black hover:bg-yellow-200'}`}>{active ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}{active ? 'Interfaz activa' : 'Activar esta interfaz'}</button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
