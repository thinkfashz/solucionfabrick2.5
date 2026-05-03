'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Code2, Webhook, KeyRound, Cpu, ExternalLink, Plus, ShieldCheck } from 'lucide-react';

/**
 * Catálogo demo de extensiones. En producción esto se cargará desde
 * `public.app_extensions` con `status='available'`. Cada entrada
 * referencia un manifest remoto (`extension.json`) con hooks,
 * permisos y páginas de UI.
 */
const CATALOG: Array<{
  slug: string;
  name: string;
  description: string;
  type: 'snippet' | 'webhook' | 'oauth' | 'function';
  author: string;
  version: string;
}> = [
  {
    slug: 'klaviyo',
    name: 'Klaviyo',
    description: 'Sincroniza clientes y pedidos para email marketing avanzado.',
    type: 'oauth',
    author: 'Comunidad',
    version: '0.1.0',
  },
  {
    slug: 'discount-bar',
    name: 'Barra de descuentos',
    description: 'Inyecta una barra superior con cuentas regresivas y cupones.',
    type: 'snippet',
    author: 'Fabrick',
    version: '1.0.0',
  },
  {
    slug: 'shipday-webhook',
    name: 'Shipday · Webhook',
    description: 'Envía pedidos confirmados a Shipday para asignación de driver.',
    type: 'webhook',
    author: 'Comunidad',
    version: '0.2.0',
  },
  {
    slug: 'tax-engine',
    name: 'Motor de impuestos',
    description: 'Calcula impuestos en checkout vía función sandboxed.',
    type: 'function',
    author: 'Fabrick Labs',
    version: '0.0.1-alpha',
  },
];

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  snippet: { label: 'Snippet de código', icon: Code2 },
  webhook: { label: 'Webhook', icon: Webhook },
  oauth: { label: 'OAuth', icon: KeyRound },
  function: { label: 'Función serverless', icon: Cpu },
};

export default function MarketplaceClient() {
  const [tab, setTab] = useState<'marketplace' | 'instaladas' | 'como-funciona'>('marketplace');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-yellow-400/15 text-yellow-400">
            <Boxes className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Marketplace de extensiones</h1>
            <p className="text-xs text-zinc-500">Amplía la tienda con apps de terceros: snippets, webhooks, OAuth y funciones.</p>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-black/40 p-1 w-fit">
        {[
          { id: 'marketplace', label: 'Catálogo' },
          { id: 'instaladas', label: 'Mis extensiones' },
          { id: 'como-funciona', label: '¿Cómo funciona?' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded-full transition ${
              tab === t.id ? 'bg-yellow-400 text-black' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'marketplace' && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CATALOG.map((ext, i) => {
            const meta = TYPE_META[ext.type];
            const Icon = meta.icon;
            return (
              <motion.article
                key={ext.slug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 hover:border-yellow-400/30 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-yellow-400">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-zinc-300">
                    {meta.label}
                  </span>
                </div>
                <h3 className="mt-3 text-[15px] font-bold text-white">{ext.name}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">{ext.description}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  {ext.author} · v{ext.version}
                </p>
                <button
                  type="button"
                  onClick={() => alert(`Instalación de "${ext.name}" llegará con el endpoint POST /api/admin/extensions/install.`)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-yellow-300 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Instalar
                </button>
              </motion.article>
            );
          })}
        </section>
      )}

      {tab === 'instaladas' && (
        <section className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-yellow-400" />
          <p className="mt-3 text-sm font-semibold text-zinc-200">Aún no instalaste extensiones.</p>
          <p className="mt-1 text-[12px] text-zinc-500">
            Las extensiones instaladas aparecerán aquí con toggles, configuración y logs.
          </p>
        </section>
      )}

      {tab === 'como-funciona' && (
        <section className="rounded-2xl border border-white/10 bg-black/40 p-5 space-y-3 text-[13px] leading-relaxed text-zinc-300">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.28em] text-yellow-400">Cómo funciona</h3>
          <p>
            Una extensión es un paquete con un manifest <code className="rounded bg-white/5 px-1">extension.json</code>{' '}
            (name, version, hooks, ui pages, permissions). Al instalar, la app inserta una fila en{' '}
            <code className="rounded bg-white/5 px-1">app_extensions</code> y registra sus hooks en{' '}
            <code className="rounded bg-white/5 px-1">extension_hooks</code>.
          </p>
          <p>
            Cuando el sistema dispara un evento (<code className="rounded bg-white/5 px-1">order.created</code>,{' '}
            <code className="rounded bg-white/5 px-1">checkout.before_pay</code>,{' '}
            <code className="rounded bg-white/5 px-1">product.after_create</code>…), un bus interno revisa los hooks
            activos y los ejecuta en orden de prioridad: webhooks salientes firmados HMAC, funciones registradas
            o snippets cargados en runtime.
          </p>
          <p>
            Permisos por scope (<code className="rounded bg-white/5 px-1">read:orders</code>,{' '}
            <code className="rounded bg-white/5 px-1">write:products</code>) se validan en cada llamada del SDK que
            la extensión use. Al desinstalar se borran sus hooks y opcionalmente sus datos.
          </p>
          <a
            href="https://shopify.dev/docs/apps/build/app-extensions"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-yellow-400 hover:text-yellow-300"
          >
            Inspirado en Shopify App Extensions <ExternalLink className="h-3 w-3" />
          </a>
        </section>
      )}
    </div>
  );
}
