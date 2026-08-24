'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  CheckCircle2,
  Code2,
  Cpu,
  ExternalLink,
  KeyRound,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Webhook,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

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

type Tab = 'catalog' | 'installed' | 'about';

const TYPE_META: Record<string, { label: string; icon: typeof Code2 }> = {
  snippet: { label: 'Snippet', icon: Code2 },
  webhook: { label: 'Webhook', icon: Webhook },
  oauth: { label: 'OAuth', icon: KeyRound },
  function: { label: 'Función', icon: Cpu },
};

function formatInstalledAt(value?: string | null) {
  if (!value) return 'Instalada';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Instalada' : `Instalada ${date.toLocaleDateString('es-CL')}`;
}

export default function MarketplaceClient() {
  const [tab, setTab] = useState<Tab>('catalog');
  const [extensions, setExtensions] = useState<ExtensionDef[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const installed = useMemo(() => extensions.filter((item) => item.status === 'installed'), [extensions]);

  async function loadExtensions() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/extensions', { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as {
        extensions?: ExtensionDef[];
        canManage?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setExtensions([]);
        setCanManage(false);
        setError(data.error ?? 'No se pudo cargar el catálogo de extensiones.');
        return;
      }
      setExtensions(Array.isArray(data.extensions) ? data.extensions : []);
      setCanManage(data.canManage === true);
    } catch {
      setError('No se pudo conectar con el catálogo de extensiones.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadExtensions();
  }, []);

  async function install(slug: string) {
    if (!canManage) return;
    setBusy(slug);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/extensions/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'No se pudo instalar la extensión.');
        return;
      }
      setNotice('Extensión instalada y hooks sincronizados.');
      await loadExtensions();
    } catch {
      setError('Error de red al instalar la extensión.');
    } finally {
      setBusy(null);
    }
  }

  async function uninstall(slug: string) {
    if (!canManage || !window.confirm(`¿Desinstalar la extensión “${slug}”? Sus hooks dejarán de ejecutarse.`)) return;
    setBusy(slug);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/extensions/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? 'No se pudo desinstalar la extensión.');
        return;
      }
      setNotice('Extensión desinstalada. Sus hooks quedaron desactivados.');
      await loadExtensions();
    } catch {
      setError('Error de red al desinstalar la extensión.');
    } finally {
      setBusy(null);
    }
  }

  const visible = tab === 'installed' ? installed : extensions;

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Sistema · Integraciones"
        title="Marketplace de extensiones"
        description="Revisa extensiones compatibles con Fabrick y controla qué hooks están activos. La instalación y desinstalación están reservadas a Root."
        icon={Boxes}
        actions={
          <button
            type="button"
            onClick={() => void loadExtensions()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 text-xs font-black text-[#514b42] transition hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        }
        meta={
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] ${canManage ? 'bg-emerald-500/10 text-emerald-800' : 'bg-black/5 text-[#716b60]'}`}>
            {canManage ? <ShieldCheck className="h-3.5 w-3.5" /> : <LockKeyhole className="h-3.5 w-3.5" />}
            {canManage ? 'Control Root' : 'Catálogo de solo lectura'}
          </span>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <AdminStat label="Catálogo" value={loading ? '…' : extensions.length} icon={Boxes} />
        <AdminStat label="Instaladas" value={loading ? '…' : installed.length} icon={CheckCircle2} accent="emerald" />
        <AdminStat label="Administración" value={canManage ? 'Root' : 'Lectura'} icon={ShieldCheck} accent={canManage ? 'emerald' : 'yellow'} />
      </section>

      <div className="flex flex-wrap gap-2 border-b border-black/10 pb-4">
        {([
          ['catalog', 'Catálogo'],
          ['installed', `Instaladas${installed.length ? ` · ${installed.length}` : ''}`],
          ['about', 'Cómo funciona'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.15em] transition ${tab === id ? 'bg-[#171612] text-white' : 'border border-black/10 bg-white/55 text-[#716b60] hover:bg-white'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>
      ) : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div>
      ) : null}

      {!canManage && !loading ? (
        <div className="flex items-start gap-3 border-y border-black/10 py-4 text-sm text-[#716b60]">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#9b6a12]" />
          <p>Tu rol puede consultar el catálogo, pero solo Root/superadmin puede registrar o retirar hooks del sistema.</p>
        </div>
      ) : null}

      {tab !== 'about' ? (
        <AdminCard className="p-0 sm:p-0">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-[#716b60]">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando extensiones…
            </div>
          ) : visible.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Boxes className="mx-auto h-7 w-7 text-[#b7aa91]" />
              <p className="mt-3 text-sm font-black text-[#171612]">{tab === 'installed' ? 'No hay extensiones instaladas.' : 'No hay extensiones disponibles.'}</p>
              <p className="mt-1 text-xs text-[#8f887c]">El catálogo aparecerá aquí cuando existan extensiones compatibles.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              {visible.map((extension) => {
                const meta = TYPE_META[extension.type] ?? TYPE_META.webhook;
                const Icon = meta.icon;
                const isInstalled = extension.status === 'installed';
                const isBusy = busy === extension.slug;
                return (
                  <article key={extension.slug} className="grid gap-4 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffb000]/10 text-[#a56600]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-black text-[#171612]">{extension.name}</h2>
                          <span className="rounded-full bg-black/5 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#716b60]">{meta.label}</span>
                          {isInstalled ? <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-emerald-800">Activa</span> : null}
                        </div>
                        <p className="mt-1 max-w-3xl text-xs leading-5 text-[#716b60]">{extension.description}</p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#9b9488]">
                          {extension.author} · v{extension.version}{isInstalled ? ` · ${formatInstalledAt(extension.installed_at)}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 lg:justify-end">
                      {canManage ? (
                        isInstalled ? (
                          <button
                            type="button"
                            onClick={() => void uninstall(extension.slug)}
                            disabled={isBusy}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/8 px-3 text-[10px] font-black uppercase tracking-[.12em] text-rose-800 transition hover:bg-rose-500/12 disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Desinstalar
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void install(extension.slug)}
                            disabled={isBusy}
                            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-[#171612] px-3 text-[10px] font-black uppercase tracking-[.12em] text-white transition hover:bg-[#2a2823] disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                            Instalar
                          </button>
                        )
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#9b9488]">
                          <LockKeyhole className="h-3.5 w-3.5" /> Solo Root
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </AdminCard>
      ) : (
        <AdminCard>
          <div className="max-w-3xl space-y-4 text-sm leading-6 text-[#625c52]">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#a56600]" />
              <div>
                <h2 className="font-black text-[#171612]">Hooks controlados por Root</h2>
                <p className="mt-1">Al instalar una extensión, Fabrick registra su manifiesto y materializa únicamente sus hooks configurados. Al desinstalarla, esos hooks dejan de ejecutarse de inmediato.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['1', 'Catálogo', 'Revisa compatibilidad, autor y versión.'],
                ['2', 'Instalación Root', 'Root confirma qué integración entra al sistema.'],
                ['3', 'Hooks activos', 'Los eventos registrados se ejecutan por prioridad.'],
              ].map(([step, title, copy]) => (
                <div key={step} className="border-t border-black/10 pt-3">
                  <span className="text-[10px] font-black text-[#9b6a12]">{step}</span>
                  <p className="mt-1 text-xs font-black text-[#171612]">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-[#8f887c]">{copy}</p>
                </div>
              ))}
            </div>
            <a
              href="https://shopify.dev/docs/apps/build/app-extensions"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#9b6a12] hover:text-[#6f4a0a]"
            >
              Referencia de arquitectura de extensiones <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </AdminCard>
      )}
    </AdminPage>
  );
}
