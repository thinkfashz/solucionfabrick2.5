'use client';

import { motion } from 'framer-motion';
import { Inbox, Instagram, Facebook, MessageCircle, ShoppingBag, Plus, RefreshCw, Sparkles } from 'lucide-react';

/**
 * Andamiaje visual del Inbox social. La data real (mensajes,
 * respuestas, OAuth) llegará en PRs sucesivas. Esta versión deja
 * en pie el layout, la nomenclatura y los slots para que cualquier
 * desarrollador pueda continuar el módulo sin tener que decidir el
 * shape de la UI.
 */

const PROVIDERS: Array<{ id: string; label: string; icon: React.ComponentType<{ className?: string }>; status: 'connected' | 'unconfigured' }> = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, status: 'unconfigured' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, status: 'unconfigured' },
  { id: 'whatsapp', label: 'WhatsApp Business', icon: MessageCircle, status: 'unconfigured' },
  { id: 'mercadolibre', label: 'Mercado Libre Q&A', icon: ShoppingBag, status: 'unconfigured' },
];

function StatusPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em] ${
        connected
          ? 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
          : 'border border-white/10 bg-white/5 text-zinc-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
      {connected ? 'Conectado' : 'Sin conectar'}
    </span>
  );
}

export default function SocialInboxClient() {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400/15 text-yellow-400">
            <Inbox className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Inbox social</h1>
            <p className="text-xs text-zinc-500">Mensajes unificados de Instagram, Facebook, WhatsApp y Mercado Libre.</p>
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400 transition"
          onClick={() => alert('Próximamente: sincronización manual de mensajes.')}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sincronizar
        </button>
      </header>

      {/* Connected providers strip */}
      <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Redes conectadas</p>
          <p className="text-[10px] text-zinc-600">OAuth flows en /api/admin/social/oauth/&#91;provider&#93;</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDERS.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-white/10 bg-zinc-950/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-zinc-300">
                    <Icon className="h-4 w-4" />
                  </span>
                  <StatusPill connected={p.status === 'connected'} />
                </div>
                <p className="mt-2 text-xs font-semibold text-zinc-200">{p.label}</p>
                <button
                  type="button"
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300 hover:border-yellow-400/40 hover:text-yellow-400 transition"
                  onClick={() => alert(`OAuth para ${p.label} se habilitará al guardar credenciales en /admin/configuracion.`)}
                >
                  <Plus className="h-3 w-3" />
                  Conectar
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Layout placeholder: conversation list / thread / customer panel */}
      <section className="grid gap-3 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3 min-h-[320px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Conversaciones</p>
          <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
            <p className="px-4 text-[11px] text-zinc-500">
              Aún no hay mensajes. Conecta una red para empezar a recibir.
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3 min-h-[320px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Conversación</p>
          <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
            <Sparkles className="mr-2 h-4 w-4 text-yellow-400" />
            <p className="text-[11px] text-zinc-500">Selecciona un hilo para responder.</p>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/40 p-3 min-h-[320px]">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">Cliente</p>
          <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-white/10 text-center">
            <p className="px-4 text-[11px] text-zinc-500">Cruzaremos remitente con la tabla `clientes` por email/teléfono/handle.</p>
          </div>
        </div>
      </section>

      <p className="text-[10px] text-zinc-600">
        Tabla de respaldo: <code className="text-zinc-400">public.social_messages</code> (ver{' '}
        <code className="text-zinc-400">scripts/create-tables.sql</code>). Webhooks &amp; cron en una PR siguiente.
      </p>
    </div>
  );
}
