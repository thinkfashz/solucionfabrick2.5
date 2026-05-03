'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Boxes, Code2, Webhook, KeyRound, Cpu, ExternalLink, Plus, ShieldCheck, Loader2, Trash2, CheckCircle2 } from 'lucide-react';

interface ExtensionDef {
  slug: string;
  name: string;
  description: string;
  type: string;
  author: string;
  version: string;
  status: 'available' | 'installed';
  installed_at?: string | null;
}

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  snippet: { label: 'Snippet de código', icon: Code2 },
  webhook: { label: 'Webhook', icon: Webhook },
  oauth: { label: 'OAuth', icon: KeyRound },
  function: { label: 'Función serverless', icon: Cpu },
};

export default function MarketplaceClient() {
  const [tab, setTab] = useState<'marketplace' | 'instaladas' | 'como-funciona'>('marketplace');
  const [extensions, setExtensions] = useState<ExtensionDef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // slug currently installing/uninstalling

  async function loadExtensions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/extensions', { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `Error ${res.status}`);
        return;
      }
      setExtensions(Array.isArray(json.extensions) ? json.extensions : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExtensions();
  }, []);

  async function install(slug: string) {
    setBusy(slug);
    setError(null);
    try {
      const res = await fetch('/api/admin/extensions/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `Error ${res.status}`);
        return;
      }
      await loadExtensions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
    }
  }

  async function uninstall(slug: string) {
    if (!confirm(`¿Desinstalar la extensión "${slug}"? Sus hooks dejarán de ejecutarse.`)) return;
    setBusy(slug);
    setError(null);
    try {
      const res = await fetch('/api/admin/extensions/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || `Error ${res.status}`);
        return;
      }
      await loadExtensions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setBusy(null);
    }
  }

  const installed = extensions.filter((e) => e.status === 'installed');
  const available = extensions; // catalog includes installed entries; UI tags them visually

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
          { id: 'instaladas', label: `Mis extensiones${installed.length > 0 ? ` (${installed.length})` : ''}` },
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

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-[12px] text-red-300">{error}</div>
      )}
      {loading && (
        <div className="flex items-center gap-2 text-[11px] text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando…
        </div>
      )}

      {tab === 'marketplace' && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {available.map((ext, i) => {
            const meta = TYPE_META[ext.type] || TYPE_META.webhook;
            const Icon = meta.icon;
            const isInstalled = ext.status === 'installed';
            const isBusy = busy === ext.slug;
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
                {isInstalled ? (
                  <button
                    type="button"
                    onClick={() => uninstall(ext.slug)}
                    disabled={isBusy}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300 hover:bg-emerald-500/20 transition disabled:opacity-60"
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    {isBusy ? 'Procesando…' : 'Instalada — Desinstalar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => install(ext.slug)}
                    disabled={isBusy}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full bg-yellow-400 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-black hover:bg-yellow-300 transition disabled:opacity-60"
                  >
                    {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    {isBusy ? 'Instalando…' : 'Instalar'}
                  </button>
                )}
              </motion.article>
            );
          })}
        </section>
      )}

      {tab === 'instaladas' && (
        <section>
          {installed.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-center">
              <ShieldCheck className="mx-auto h-8 w-8 text-yellow-400" />
              <p className="mt-3 text-sm font-semibold text-zinc-200">Aún no instalaste extensiones.</p>
              <p className="mt-1 text-[12px] text-zinc-500">
                Cuando instales una, aparecerá aquí con detalle, hooks activos y opción de desinstalar.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {installed.map((ext) => {
                const meta = TYPE_META[ext.type] || TYPE_META.webhook;
                const Icon = meta.icon;
                const isBusy = busy === ext.slug;
                return (
                  <li
                    key={ext.slug}
                    className="rounded-2xl border border-white/10 bg-zinc-950/70 p-4 flex flex-wrap items-center gap-4"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-yellow-400">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-[200px]">
                      <p className="text-[13px] font-bold text-white">{ext.name}</p>
                      <p className="text-[11px] text-zinc-500">
                        {ext.author} · v{ext.version}
                        {ext.installed_at
                          ? ` · instalada ${new Date(ext.installed_at).toLocaleDateString('es-CL')}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => uninstall(ext.slug)}
                      disabled={isBusy}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-red-300 hover:bg-red-500/10 transition disabled:opacity-60"
                    >
                      {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      Desinstalar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
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
            <code className="rounded bg-white/5 px-1">order.paid</code>,{' '}
            <code className="rounded bg-white/5 px-1">product.after_create</code>,{' '}
            <code className="rounded bg-white/5 px-1">checkout.before_pay</code>…), el bus en{' '}
            <code className="rounded bg-white/5 px-1">src/lib/extensionsBus.ts</code> lee los hooks activos y los
            ejecuta en orden de prioridad: webhooks salientes firmados HMAC con{' '}
            <code className="rounded bg-white/5 px-1">x-fabrick-signature</code>, o handlers internos registrados
            con <code className="rounded bg-white/5 px-1">internal:&lt;name&gt;</code>.
          </p>
          <p>
            Al desinstalar se borran sus hooks de inmediato y la fila pasa a{' '}
            <code className="rounded bg-white/5 px-1">status=available</code> (con{' '}
            <code className="rounded bg-white/5 px-1">purge:true</code> también se elimina la fila).
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
