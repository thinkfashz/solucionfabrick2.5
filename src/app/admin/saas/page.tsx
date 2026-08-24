'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  Globe2,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan_id: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  owner_email: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  custom_domain: string | null;
  trial_ends_at: string | null;
  created_at: string;
}

type Tab = 'clients' | 'create' | 'guide';

type HealthPayload = {
  readyForPilot?: boolean;
  readyForPublicLaunch?: boolean;
  summary?: string;
};

const STATUS_LABEL: Record<Tenant['status'], string> = {
  active: 'Activo',
  trial: 'Prueba',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
};

const STATUS_CLASS: Record<Tenant['status'], string> = {
  active: 'bg-emerald-500/10 text-emerald-800',
  trial: 'bg-amber-500/10 text-amber-800',
  suspended: 'bg-rose-500/10 text-rose-800',
  cancelled: 'bg-black/5 text-[#716b60]',
};

const PLAN_LABEL: Record<string, string> = {
  free: 'Gratis',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

const inputClass = 'w-full rounded-xl border border-black/10 bg-white/70 px-3.5 py-3 text-sm text-[#171612] outline-none transition placeholder:text-[#aaa397] focus:border-[#c77a00]/35 focus:bg-white focus:ring-2 focus:ring-[#ffb000]/10';

export default function AdminSaasPage() {
  const [tab, setTab] = useState<Tab>('clients');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyTenant, setBusyTenant] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState({
    name: '',
    owner_email: '',
    owner_name: '',
    owner_phone: '',
    plan_id: 'starter',
    custom_domain: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [tenantResponse, healthResponse] = await Promise.all([
        fetch('/api/admin/saas/tenants', { cache: 'no-store' }),
        fetch('/api/admin/superadmin/saas/onboarding-health', { cache: 'no-store' }),
      ]);

      const tenantData = await tenantResponse.json().catch(() => ([])) as Tenant[] | { error?: string };
      const healthData = await healthResponse.json().catch(() => ({})) as HealthPayload;

      if (!tenantResponse.ok) {
        const apiError = !Array.isArray(tenantData) ? tenantData.error : undefined;
        throw new Error(apiError ?? 'No se pudo cargar el directorio de tenants.');
      }

      setTenants(Array.isArray(tenantData) ? tenantData : []);
      setHealth(healthResponse.ok ? healthData : null);
    } catch (err) {
      setTenants([]);
      setError(err instanceof Error ? err.message : 'No se pudo cargar la plataforma SaaS.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('es');
    return tenants.filter((tenant) => {
      if (statusFilter !== 'all' && tenant.status !== statusFilter) return false;
      if (!needle) return true;
      return [tenant.name, tenant.slug, tenant.owner_email ?? '', tenant.owner_name ?? '', tenant.custom_domain ?? '']
        .some((value) => value.toLocaleLowerCase('es').includes(needle));
    });
  }, [search, statusFilter, tenants]);

  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter((tenant) => tenant.status === 'active').length,
    trial: tenants.filter((tenant) => tenant.status === 'trial').length,
    suspended: tenants.filter((tenant) => tenant.status === 'suspended').length,
  }), [tenants]);

  async function createTenant(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/saas/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No se pudo crear el tenant.');

      setForm({ name: '', owner_email: '', owner_name: '', owner_phone: '', plan_id: 'starter', custom_domain: '' });
      setNotice('Tenant creado correctamente. Ya aparece en el directorio Root.');
      setTab('clients');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el tenant.');
    } finally {
      setSaving(false);
    }
  }

  async function updateTenant(id: string, update: Record<string, unknown>) {
    setBusyTenant(id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/saas/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...update }),
      });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? 'No se pudo actualizar el tenant.');
      setNotice('Tenant actualizado.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el tenant.');
    } finally {
      setBusyTenant(null);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Root · Plataforma"
        title="Fabrick SaaS"
        description="Directorio global de tenants, planes y estado de onboarding. Esta superficie está reservada exclusivamente a Root/superadmin."
        icon={Rocket}
        actions={
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 text-xs font-black text-[#514b42] transition hover:bg-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        }
        meta={
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] ${health?.readyForPilot ? 'bg-emerald-500/10 text-emerald-800' : 'bg-amber-500/10 text-amber-800'}`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            {health?.readyForPilot ? 'Piloto listo' : 'Revisar onboarding'}
          </span>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Tenants" value={loading ? '…' : stats.total} icon={Users} />
        <AdminStat label="Activos" value={loading ? '…' : stats.active} icon={CheckCircle2} accent="emerald" />
        <AdminStat label="En prueba" value={loading ? '…' : stats.trial} icon={Clock3} />
        <AdminStat label="Suspendidos" value={loading ? '…' : stats.suspended} icon={XCircle} accent="rose" />
      </section>

      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 pb-4">
        {([
          ['clients', 'Tenants'],
          ['create', 'Añadir tenant'],
          ['guide', 'Preparación de plataforma'],
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

      {health?.summary ? <p className="text-xs font-semibold text-[#8f887c]">{health.summary}</p> : null}
      {error ? <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm font-semibold text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm font-semibold text-emerald-800">{notice}</div> : null}

      {tab === 'clients' ? (
        <>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b9488]" />
              <input className={`${inputClass} pl-10`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar negocio, dominio, correo o contacto…" />
            </label>
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="trial">En prueba</option>
              <option value="suspended">Suspendidos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>

          <AdminCard className="p-0 sm:p-0">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-[#716b60]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando tenants…</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Users className="mx-auto h-7 w-7 text-[#b7aa91]" />
                <p className="mt-3 text-sm font-black text-[#171612]">No hay tenants para mostrar.</p>
                <button type="button" onClick={() => setTab('create')} className="mt-3 text-xs font-black text-[#9b6a12]">Añadir el primero →</button>
              </div>
            ) : (
              <div className="divide-y divide-black/10">
                {filtered.map((tenant) => {
                  const adminHost = tenant.custom_domain || `${tenant.slug}.fabrick.cl`;
                  return (
                    <article key={tenant.id} className="grid gap-4 px-4 py-5 sm:px-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/5 text-[#716b60]"><Building2 className="h-4 w-4" /></span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-sm font-black text-[#171612]">{tenant.name}</h2>
                            <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] ${STATUS_CLASS[tenant.status]}`}>{STATUS_LABEL[tenant.status]}</span>
                            <span className="rounded-full bg-black/5 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#716b60]">{PLAN_LABEL[tenant.plan_id] ?? tenant.plan_id}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8f887c]">
                            <span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" /> {adminHost}</span>
                            {tenant.owner_email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {tenant.owner_email}</span> : null}
                          </div>
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#aaa397]">Creado {new Date(tenant.created_at).toLocaleDateString('es-CL')}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <select
                          value={tenant.plan_id}
                          disabled={busyTenant === tenant.id}
                          onChange={(event) => void updateTenant(tenant.id, { plan_id: event.target.value })}
                          className="min-h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-[#514b42] disabled:opacity-50"
                          aria-label={`Plan de ${tenant.name}`}
                        >
                          <option value="free">Gratis</option>
                          <option value="starter">Starter</option>
                          <option value="pro">Pro</option>
                          <option value="enterprise">Enterprise</option>
                        </select>
                        <select
                          value={tenant.status}
                          disabled={busyTenant === tenant.id}
                          onChange={(event) => void updateTenant(tenant.id, { status: event.target.value })}
                          className="min-h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-[#514b42] disabled:opacity-50"
                          aria-label={`Estado de ${tenant.name}`}
                        >
                          <option value="active">Activo</option>
                          <option value="trial">Prueba</option>
                          <option value="suspended">Suspendido</option>
                          <option value="cancelled">Cancelado</option>
                        </select>
                        <a href={`https://${adminHost}/admin`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#171612] px-3 text-[10px] font-black uppercase tracking-[.12em] text-white">
                          Abrir <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </AdminCard>
        </>
      ) : null}

      {tab === 'create' ? (
        <AdminCard>
          <form onSubmit={createTenant} className="max-w-3xl space-y-5">
            <div>
              <h2 className="text-lg font-black tracking-[-.03em] text-[#171612]">Nuevo tenant</h2>
              <p className="mt-1 text-sm leading-6 text-[#716b60]">Crea la empresa, propietario y plan inicial. El subdominio se genera automáticamente y Root puede cambiar plan o estado después.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Negocio *</span><input required className={inputClass} value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="Constructora Ejemplo" /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Contacto *</span><input required className={inputClass} value={form.owner_name} onChange={(e) => setForm((v) => ({ ...v, owner_name: e.target.value }))} placeholder="Nombre del propietario" /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Email *</span><input required type="email" className={inputClass} value={form.owner_email} onChange={(e) => setForm((v) => ({ ...v, owner_email: e.target.value }))} placeholder="propietario@empresa.cl" /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Teléfono</span><input className={inputClass} value={form.owner_phone} onChange={(e) => setForm((v) => ({ ...v, owner_phone: e.target.value }))} placeholder="+56 9 …" /></label>
              <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Plan inicial</span><select className={inputClass} value={form.plan_id} onChange={(e) => setForm((v) => ({ ...v, plan_id: e.target.value }))}><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option><option value="free">Gratis</option></select></label>
              <label className="space-y-1.5"><span className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Dominio propio</span><input className={inputClass} value={form.custom_domain} onChange={(e) => setForm((v) => ({ ...v, custom_domain: e.target.value }))} placeholder="empresa.cl" /></label>
            </div>
            <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#171612] px-5 text-xs font-black uppercase tracking-[.14em] text-white transition hover:bg-[#2a2823] disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Crear tenant
            </button>
          </form>
        </AdminCard>
      ) : null}

      {tab === 'guide' ? (
        <AdminCard>
          <div className="max-w-4xl space-y-6">
            <div>
              <h2 className="text-lg font-black tracking-[-.03em] text-[#171612]">Preparación antes de abrir la plataforma</h2>
              <p className="mt-1 text-sm leading-6 text-[#716b60]">Esta guía muestra dependencias, no secretos. Los valores sensibles deben permanecer únicamente en Vercel/InsForge.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['1', 'DNS wildcard', 'Configura *.fabrick.cl hacia Vercel para que cada slug pueda resolver su subdominio.'],
                ['2', 'Dominios Vercel', 'Registra el dominio principal y wildcard en el proyecto de producción.'],
                ['3', 'Variables privadas', 'Verifica PLATFORM_ADMIN_SECRET, CRON_SECRET y credenciales de correo/pagos sin exponer sus valores en el navegador.'],
                ['4', 'Esquema multi-tenant', 'Mantén tenants, planes, suscripciones y tenant_id alineados antes del onboarding.'],
                ['5', 'Pagos y webhooks', 'Valida Mercado Pago y firma de webhooks antes de activar cobros recurrentes.'],
                ['6', 'Piloto controlado', 'Crea un tenant de prueba, verifica aislamiento de datos y recién después amplía el acceso.'],
              ].map(([step, title, copy]) => (
                <div key={step} className="border-t border-black/10 pt-4">
                  <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#9b6a12]">Paso {step}</p>
                  <h3 className="mt-1 text-sm font-black text-[#171612]">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#8f887c]">{copy}</p>
                </div>
              ))}
            </div>
            <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${health?.readyForPublicLaunch ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-800' : 'border-amber-500/20 bg-amber-500/8 text-amber-900'}`}>
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-sm font-semibold">{health?.readyForPublicLaunch ? 'Las comprobaciones actuales no muestran pendientes para apertura pública.' : 'El modo piloto puede estar disponible, pero aún conviene resolver todos los avisos antes de una apertura pública.'}</p>
            </div>
          </div>
        </AdminCard>
      ) : null}
    </AdminPage>
  );
}
