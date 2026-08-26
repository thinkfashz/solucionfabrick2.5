'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  ImageIcon,
  Loader2,
  Mail,
  Palette,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Store,
  TestTube2,
  Upload,
  Users,
  WandSparkles,
  Wrench,
  XCircle,
} from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';

type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';

type Tenant = {
  id: string;
  slug: string;
  name: string;
  plan_id: string;
  status: TenantStatus;
  owner_email: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  phone: string | null;
  contact_email: string | null;
  billing_email: string | null;
  custom_domain: string | null;
  logo_url: string | null;
  primary_color: string | null;
  trial_ends_at: string | null;
  created_at: string;
};

type HealthCheck = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  critical?: boolean;
  category: 'database' | 'runtime' | 'email' | 'route' | 'branding';
  route?: string;
  action?: string;
};

type HealthPayload = {
  readyForPilot?: boolean;
  readyForPublicLaunch?: boolean;
  score?: number;
  passed?: number;
  total?: number;
  summary?: string;
  checks?: HealthCheck[];
};

type Tab = 'clients' | 'create' | 'health' | 'guide';

type TenantForm = {
  name: string;
  owner_email: string;
  owner_name: string;
  owner_phone: string;
  contact_email: string;
  billing_email: string;
  plan_id: string;
  custom_domain: string;
  logo_url: string;
  primary_color: string;
};

const EMPTY_FORM: TenantForm = {
  name: '',
  owner_email: '',
  owner_name: '',
  owner_phone: '',
  contact_email: '',
  billing_email: '',
  plan_id: 'starter',
  custom_domain: '',
  logo_url: '',
  primary_color: '#F5871F',
};

const STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Activo',
  trial: 'Prueba',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
};

const STATUS_CLASS: Record<TenantStatus, string> = {
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

const CATEGORY_LABEL: Record<HealthCheck['category'], string> = {
  database: 'Base de datos',
  runtime: 'Runtime',
  email: 'Correo',
  route: 'Rutas',
  branding: 'Marca',
};

const inputClass = 'w-full min-h-12 rounded-xl border border-black/10 bg-white/80 px-3.5 py-3 text-sm font-semibold text-[#171612] outline-none transition placeholder:text-[#aaa397] focus:border-[#c77a00]/35 focus:bg-white focus:ring-4 focus:ring-[#ffb000]/10';
const labelClass = 'grid gap-2 text-[10px] font-black uppercase tracking-[.15em] text-[#80786d]';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'APP';
}

function hostFor(tenant: Tenant) {
  return tenant.custom_domain || `${tenant.slug}.solucionesfabrick.com`;
}

export default function AdminSaasPage() {
  const [tab, setTab] = useState<Tab>('clients');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyTenant, setBusyTenant] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<TenantForm>(EMPTY_FORM);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const response = await fetch('/api/admin/superadmin/saas/onboarding-health', { cache: 'no-store' });
      const data = await response.json().catch(() => ({})) as HealthPayload;
      setHealth(response.ok ? data : { summary: 'No se pudo ejecutar el verificador.', checks: [] });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadTenants = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/saas/tenants', { cache: 'no-store' });
      const data = await response.json().catch(() => ([])) as Tenant[] | { error?: string; detail?: string; setupRequired?: boolean };
      if (!response.ok) {
        const message = Array.isArray(data) ? 'No se pudo cargar el directorio de tenants.' : data.detail || data.error || 'No se pudo cargar el directorio de tenants.';
        throw new Error(message);
      }
      setTenants(Array.isArray(data) ? data : []);
    } catch (err) {
      setTenants([]);
      setError(err instanceof Error ? err.message : 'No se pudo cargar la plataforma SaaS.');
    } finally {
      setLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setError('');
    await Promise.all([loadTenants(), loadHealth()]);
  }, [loadHealth, loadTenants]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('tab');
    if (requested === 'clients' || requested === 'create' || requested === 'health' || requested === 'guide') setTab(requested);
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('es');
    return tenants.filter((tenant) => {
      if (statusFilter !== 'all' && tenant.status !== statusFilter) return false;
      if (!needle) return true;
      return [tenant.name, tenant.slug, tenant.owner_email ?? '', tenant.owner_name ?? '', tenant.contact_email ?? '', tenant.custom_domain ?? '']
        .some((value) => value.toLocaleLowerCase('es').includes(needle));
    });
  }, [search, statusFilter, tenants]);

  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter((tenant) => tenant.status === 'active').length,
    trial: tenants.filter((tenant) => tenant.status === 'trial').length,
    suspended: tenants.filter((tenant) => tenant.status === 'suspended').length,
  }), [tenants]);

  const healthChecks = health?.checks ?? [];
  const failedCritical = healthChecks.filter((item) => !item.ok && item.critical !== false);

  function setField<K extends keyof TenantForm>(key: K, value: TenantForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setNotice('');
    setTab('create');
  }

  function editTenant(tenant: Tenant) {
    setEditingId(tenant.id);
    setForm({
      name: tenant.name || '',
      owner_email: tenant.owner_email || '',
      owner_name: tenant.owner_name || '',
      owner_phone: tenant.owner_phone || tenant.phone || '',
      contact_email: tenant.contact_email || tenant.owner_email || '',
      billing_email: tenant.billing_email || tenant.owner_email || '',
      plan_id: tenant.plan_id || 'starter',
      custom_domain: tenant.custom_domain || '',
      logo_url: tenant.logo_url || '',
      primary_color: tenant.primary_color || '#F5871F',
    });
    setError('');
    setNotice('');
    setTab('create');
  }

  async function uploadLogo(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen para el logo.');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('folder', 'general');
      payload.append('alt', `${form.name || 'Tenant'} logo`);
      const response = await fetch('/api/admin/media', { method: 'POST', body: payload });
      const data = await response.json().catch(() => ({})) as { url?: string; asset?: { url?: string }; error?: string };
      if (!response.ok || !(data.url || data.asset?.url)) throw new Error(data.error || 'No se pudo subir el logo.');
      setField('logo_url', data.url || data.asset?.url || '');
      setNotice('Logo cargado. Se aplicará a la portada, tienda, checkout, auth y correos del tenant.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el logo.');
    } finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  }

  async function saveTenant(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/saas/tenants', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      const data = await response.json().catch(() => ({})) as Tenant & { error?: string; detail?: string };
      if (!response.ok) throw new Error(data.detail || data.error || 'No se pudo guardar el tenant.');
      setNotice(editingId ? 'Marca y configuración del tenant actualizadas.' : 'Aplicación SaaS creada. Ahora puedes verificar sus rutas y activar el tenant cuando esté listo.');
      setEditingId(null);
      setForm(EMPTY_FORM);
      setTab('clients');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el tenant.');
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
      const data = await response.json().catch(() => ({})) as { error?: string; detail?: string };
      if (!response.ok) throw new Error(data.detail || data.error || 'No se pudo actualizar el tenant.');
      setNotice('Tenant actualizado.');
      await loadTenants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el tenant.');
    } finally {
      setBusyTenant(null);
    }
  }

  async function repairSchema() {
    setRepairing(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/superadmin/saas/repair', { method: 'POST' });
      const data = await response.json().catch(() => ({})) as { ok?: boolean; detail?: string };
      if (!response.ok || !data.ok) throw new Error(data.detail || 'No se pudo reparar el esquema SaaS.');
      setNotice(data.detail || 'Esquema SaaS reparado.');
      await load();
      setTab('health');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reparar el esquema SaaS.');
    } finally {
      setRepairing(false);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Root · Plataforma"
        title="Fabrick SaaS"
        description="Crea, personaliza, verifica y activa cada aplicación cliente desde un único centro Root. El branding se propaga automáticamente por la experiencia del tenant."
        icon={Rocket}
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void load()} disabled={loading || healthLoading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/70 px-4 text-xs font-black text-[#514b42] transition hover:bg-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading || healthLoading ? 'animate-spin' : ''}`} /> Actualizar</button>
            <button type="button" onClick={startCreate} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white"><Plus className="h-4 w-4" /> Nueva app</button>
          </div>
        }
        meta={
          <button type="button" onClick={() => setTab('health')} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[.14em] ${health?.readyForPublicLaunch ? 'bg-emerald-500/10 text-emerald-800' : health?.readyForPilot ? 'bg-amber-500/10 text-amber-800' : 'bg-rose-500/10 text-rose-800'}`}>
            <ShieldCheck className="h-3.5 w-3.5" /> {healthLoading ? 'Comprobando…' : `${health?.score ?? 0}% operativo`}
          </button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Tenants" value={loading ? '…' : stats.total} icon={Users} />
        <AdminStat label="Activos" value={loading ? '…' : stats.active} icon={CheckCircle2} accent="emerald" />
        <AdminStat label="En prueba" value={loading ? '…' : stats.trial} icon={Clock3} />
        <AdminStat label="Suspendidos" value={loading ? '…' : stats.suspended} icon={XCircle} accent="rose" />
      </section>

      <div className="flex snap-x gap-2 overflow-x-auto border-b border-black/10 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {([
          ['clients', 'Tenants', Users],
          ['create', editingId ? 'Editar marca' : 'Añadir tenant', Plus],
          ['health', 'Testador SaaS', TestTube2],
          ['guide', 'Cómo funciona', WandSparkles],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[.14em] transition ${tab === id ? 'bg-[#171612] text-white' : 'border border-black/10 bg-white/55 text-[#716b60] hover:bg-white'}`}><Icon className="h-3.5 w-3.5" />{label}</button>
        ))}
      </div>

      {error ? <div className="flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/8 px-4 py-3 text-sm font-semibold text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
      {notice ? <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm font-semibold text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{notice}</div> : null}

      {tab === 'clients' ? (
        <>
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_200px]">
            <label className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9b9488]" /><input className={`${inputClass} pl-10`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar aplicación, dominio, correo o contacto…" /></label>
            <select className={inputClass} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos los estados</option><option value="active">Activos</option><option value="trial">En prueba</option><option value="suspended">Suspendidos</option><option value="cancelled">Cancelados</option></select>
          </div>

          {failedCritical.length ? (
            <button type="button" onClick={() => setTab('health')} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/8 p-4 text-left text-rose-900">
              <span><b className="block text-sm">Hay {failedCritical.length} comprobación(es) crítica(s) pendiente(s).</b><span className="mt-1 block text-xs opacity-75">Abre el Testador SaaS para repararlas y confirmar el funcionamiento.</span></span><ArrowRight className="h-5 w-5 shrink-0" />
            </button>
          ) : null}

          <AdminCard className="p-0 sm:p-0">
            {loading ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-sm font-semibold text-[#716b60]"><Loader2 className="h-4 w-4 animate-spin" /> Cargando tenants…</div>
            ) : filtered.length === 0 ? (
              <div className="px-5 py-12 text-center"><Users className="mx-auto h-8 w-8 text-[#b7aa91]" /><p className="mt-3 text-sm font-black text-[#171612]">No hay aplicaciones para mostrar.</p><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#8f887c]">Crea la primera app cliente y define su nombre, logo, color, contacto y plan.</p><button type="button" onClick={startCreate} className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#171612] px-4 py-2 text-[10px] font-black uppercase tracking-[.13em] text-white"><Plus className="h-3.5 w-3.5" />Crear primera app</button></div>
            ) : (
              <div className="divide-y divide-black/10">
                {filtered.map((tenant) => {
                  const host = hostFor(tenant);
                  return (
                    <article key={tenant.id} className="grid gap-4 px-4 py-5 sm:px-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-black/8 bg-[#171612] text-xs font-black text-white" style={{ boxShadow: `inset 0 -3px 0 ${tenant.primary_color || '#F5871F'}` }}>{tenant.logo_url ? <img src={tenant.logo_url} alt={tenant.name} className="h-full w-full object-contain p-1.5" /> : initials(tenant.name)}</span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-black text-[#171612]">{tenant.name}</h2><span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] ${STATUS_CLASS[tenant.status]}`}>{STATUS_LABEL[tenant.status]}</span><span className="rounded-full bg-black/5 px-2 py-1 text-[9px] font-black uppercase tracking-[.12em] text-[#716b60]">{PLAN_LABEL[tenant.plan_id] ?? tenant.plan_id}</span></div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#8f887c]"><span className="inline-flex items-center gap-1"><Globe2 className="h-3 w-3" />{host}</span>{tenant.contact_email ? <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{tenant.contact_email}</span> : null}</div>
                          <p className="mt-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#aaa397]">Creado {new Date(tenant.created_at).toLocaleDateString('es-CL')} · slug {tenant.slug}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                        <button type="button" onClick={() => editTenant(tenant)} className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 text-[10px] font-black uppercase tracking-[.1em] text-[#514b42]"><Palette className="h-3.5 w-3.5" /> Marca</button>
                        <select value={tenant.plan_id} disabled={busyTenant === tenant.id} onChange={(event) => void updateTenant(tenant.id, { plan_id: event.target.value })} className="min-h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-[#514b42] disabled:opacity-50" aria-label={`Plan de ${tenant.name}`}><option value="free">Gratis</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select>
                        <select value={tenant.status} disabled={busyTenant === tenant.id} onChange={(event) => void updateTenant(tenant.id, { status: event.target.value })} className="min-h-9 rounded-xl border border-black/10 bg-white px-3 text-xs font-bold text-[#514b42] disabled:opacity-50" aria-label={`Estado de ${tenant.name}`}><option value="active">Activo</option><option value="trial">Prueba</option><option value="suspended">Suspendido</option><option value="cancelled">Cancelado</option></select>
                        <a href={`https://${host}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-[#171612] px-3 text-[10px] font-black uppercase tracking-[.1em] text-white">Abrir <ArrowUpRight className="h-3.5 w-3.5" /></a>
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
        <form onSubmit={saveTenant} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <AdminCard className="space-y-5">
            <div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#a16c13]">{editingId ? 'Configuración de marca' : 'Nueva aplicación SaaS'}</p><h2 className="mt-2 text-2xl font-black tracking-[-.04em]">{editingId ? 'Haz que toda la app hable con la marca del cliente.' : 'Registra el negocio una sola vez.'}</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-[#80786d]">El nombre, logo, color y contactos se usan en portada, tienda, checkout, autenticación, panel del tenant, favicon y correos compatibles. Root/Superadmin conserva la identidad Fabrick.</p></div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>Nombre público de la app<input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ej. Construcciones Valera" required /></label>
              <label className={labelClass}>Plan<select className={inputClass} value={form.plan_id} onChange={(e) => setField('plan_id', e.target.value)}><option value="free">Gratis</option><option value="starter">Starter</option><option value="pro">Pro</option><option value="enterprise">Enterprise</option></select></label>
              <label className={labelClass}>Propietario / contacto<input className={inputClass} value={form.owner_name} onChange={(e) => setField('owner_name', e.target.value)} placeholder="Nombre completo" required /></label>
              <label className={labelClass}>Correo del propietario<input className={inputClass} type="email" value={form.owner_email} onChange={(e) => setField('owner_email', e.target.value)} placeholder="propietario@empresa.cl" required={!editingId} disabled={Boolean(editingId)} /></label>
              <label className={labelClass}>Correo de contacto público<input className={inputClass} type="email" value={form.contact_email} onChange={(e) => setField('contact_email', e.target.value)} placeholder="contacto@empresa.cl" /></label>
              <label className={labelClass}>Correo de facturación<input className={inputClass} type="email" value={form.billing_email} onChange={(e) => setField('billing_email', e.target.value)} placeholder="pagos@empresa.cl" /></label>
              <label className={labelClass}>Teléfono / WhatsApp<input className={inputClass} value={form.owner_phone} onChange={(e) => setField('owner_phone', e.target.value)} placeholder="+56 9 ..." /></label>
              <label className={labelClass}>Dominio propio opcional<input className={inputClass} value={form.custom_domain} onChange={(e) => setField('custom_domain', e.target.value)} placeholder="www.empresa.cl" /></label>
            </div>

            <div className="grid gap-4 md:grid-cols-[1fr_180px]">
              <label className={labelClass}>URL del logo<input className={inputClass} value={form.logo_url} onChange={(e) => setField('logo_url', e.target.value)} placeholder="https://.../logo.svg" /></label>
              <label className={labelClass}>Color principal<span className="flex min-h-12 items-center gap-3 rounded-xl border border-black/10 bg-white/80 px-3"><input type="color" value={form.primary_color} onChange={(e) => setField('primary_color', e.target.value.toUpperCase())} className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent" /><input value={form.primary_color} onChange={(e) => setField('primary_color', e.target.value)} className="min-w-0 flex-1 bg-transparent text-xs font-black uppercase outline-none" /></span></label>
            </div>

            <div className="flex flex-wrap gap-3">
              <input ref={logoInputRef} type="file" accept="image/*,.svg" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); }} />
              <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploading} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#514b42] disabled:opacity-50">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{uploading ? 'Subiendo…' : 'Seleccionar logo'}</button>
              <button type="submit" disabled={saving || uploading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171612] px-5 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}{saving ? 'Guardando…' : editingId ? 'Guardar identidad' : 'Crear aplicación'}</button>
              {editingId ? <button type="button" onClick={startCreate} className="min-h-11 rounded-xl px-4 text-xs font-black text-[#80786d]">Cancelar edición</button> : null}
            </div>
          </AdminCard>

          <AdminCard className="h-fit overflow-hidden p-0 sm:p-0">
            <div className="p-5 text-white" style={{ background: `linear-gradient(145deg, #111214, ${form.primary_color || '#F5871F'}44)` }}>
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-white/55">Vista previa de marca</p>
              <div className="mt-5 grid min-h-32 place-items-center rounded-2xl bg-black/45 p-5 ring-1 ring-white/10">{form.logo_url ? <img src={form.logo_url} alt="Vista previa del logo" className="max-h-24 max-w-full object-contain" /> : <span className="grid h-20 w-20 place-items-center rounded-2xl bg-white/10 text-xl font-black">{initials(form.name)}</span>}</div>
              <h3 className="mt-5 text-2xl font-black tracking-[-.04em]">{form.name || 'Nombre de la aplicación'}</h3>
              <p className="mt-1 text-xs text-white/55">{form.contact_email || form.owner_email || 'contacto@empresa.cl'}</p>
            </div>
            <div className="space-y-3 p-5">
              {[['Portada y navegación', Store], ['Tienda y checkout', Building2], ['Auth y panel del tenant', ShieldCheck], ['Correo y contacto', Mail]].map(([label, Icon]) => { const C = Icon as typeof Store; return <div key={label as string} className="flex items-center gap-3 text-xs font-bold text-[#625b53]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-black/5"><C className="h-4 w-4" /></span>{label as string}<CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" /></div>; })}
            </div>
          </AdminCard>
        </form>
      ) : null}

      {tab === 'health' ? (
        <div className="space-y-5">
          <AdminCard className="overflow-hidden p-0 sm:p-0">
            <div className="grid gap-5 bg-[#171612] p-5 text-white sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">Testador de plataforma</p><h2 className="mt-2 text-3xl font-black tracking-[-.05em]">{healthLoading ? 'Comprobando…' : `${health?.score ?? 0}% operativo`}</h2><p className="mt-2 max-w-2xl text-xs leading-6 text-white/58">{health?.summary || 'Verifica base de datos, runtime, branding, correo y rutas críticas.'}</p></div>
              <div className="flex gap-2"><button type="button" onClick={() => void loadHealth()} disabled={healthLoading} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-xs font-black ring-1 ring-white/10 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${healthLoading ? 'animate-spin' : ''}`} />Volver a comprobar</button>{healthChecks.some((item) => item.key === 'tenant_schema' && !item.ok) ? <button type="button" onClick={() => void repairSchema()} disabled={repairing} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#FFB000] px-4 text-xs font-black text-black disabled:opacity-50">{repairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}Reparar esquema</button> : null}</div>
            </div>
            <div className="grid grid-cols-3 divide-x divide-black/10 bg-white"><div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#9b9488]">Confirmados</p><p className="mt-1 text-2xl font-black">{health?.passed ?? 0}</p></div><div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#9b9488]">Total</p><p className="mt-1 text-2xl font-black">{health?.total ?? 0}</p></div><div className="p-4"><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#9b9488]">Lanzamiento</p><p className={`mt-1 text-sm font-black ${health?.readyForPublicLaunch ? 'text-emerald-700' : health?.readyForPilot ? 'text-amber-700' : 'text-rose-700'}`}>{health?.readyForPublicLaunch ? 'Listo' : health?.readyForPilot ? 'Piloto' : 'Pendiente'}</p></div></div>
          </AdminCard>

          <div className="grid gap-3 lg:grid-cols-2">
            {healthChecks.map((check) => (
              <AdminCard key={check.key} className={`relative overflow-hidden ${check.ok ? 'border-emerald-500/15' : check.critical !== false ? 'border-rose-500/20' : 'border-amber-500/20'}`}>
                <div className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${check.ok ? 'bg-emerald-500/10 text-emerald-700' : check.critical !== false ? 'bg-rose-500/10 text-rose-700' : 'bg-amber-500/10 text-amber-700'}`}>{check.ok ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}</span>
                  <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-[#171612]">{check.label}</h3><span className="rounded-full bg-black/5 px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] text-[#80786d]">{CATEGORY_LABEL[check.category]}</span><span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase tracking-[.12em] ${check.ok ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'}`}>{check.ok ? 'Confirmado' : check.critical !== false ? 'Crítico' : 'Pendiente'}</span></div><p className="mt-2 break-words text-xs leading-5 text-[#80786d]">{check.detail}</p>{check.route ? <a href={check.route} target={check.route.startsWith('/admin') ? undefined : '_blank'} rel={check.route.startsWith('/admin') ? undefined : 'noopener noreferrer'} className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[.1em] text-[#9b6a12]">{check.action || 'Abrir'} <ExternalLink className="h-3.5 w-3.5" /></a> : null}</div>
                </div>
              </AdminCard>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'guide' ? (
        <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
          <AdminCard>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-[#9b6a12]">Flujo recomendado</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.05em]">De negocio nuevo a aplicación confirmada.</h2>
            <p className="mt-3 text-sm leading-7 text-[#80786d]">No necesitas editar el código por cliente. Root registra la identidad; el runtime detecta el tenant por dominio/subdominio y aplica sus datos en toda la experiencia permitida.</p>
            <div className="mt-6 space-y-3">
              {[
                ['01', 'Registrar identidad', 'Nombre público, logo, color, propietario, correo de contacto y facturación.'],
                ['02', 'Asignar dominio y plan', 'Usa un dominio propio o el subdominio generado y deja el tenant en Prueba mientras configuras.'],
                ['03', 'Abrir el Testador SaaS', 'Confirma base, branding, correo, portada, tienda, checkout, auth y admin.'],
                ['04', 'Activar', 'Cuando las comprobaciones críticas estén verdes, cambia el estado de Prueba a Activo.'],
              ].map(([number, title, text]) => <div key={number} className="flex gap-3 rounded-2xl bg-black/[.035] p-4"><span className="text-[10px] font-black text-[#9b6a12]">{number}</span><div><h3 className="text-sm font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-[#80786d]">{text}</p></div></div>)}
            </div>
          </AdminCard>

          <div className="grid gap-4 sm:grid-cols-2">
            <AdminCard><ImageIcon className="h-5 w-5 text-[#9b6a12]" /><h3 className="mt-3 text-lg font-black">Branding global</h3><p className="mt-2 text-xs leading-6 text-[#80786d]">El logo reemplaza los assets Fabrick en la experiencia del tenant y también puede convertirse en favicon. El nombre y los correos se sustituyen en textos, títulos y atributos accesibles.</p></AdminCard>
            <AdminCard><Palette className="h-5 w-5 text-[#9b6a12]" /><h3 className="mt-3 text-lg font-black">Color adaptable</h3><p className="mt-2 text-xs leading-6 text-[#80786d]">El color principal genera la paleta del tenant mediante variables CSS sin duplicar componentes ni mantener una app distinta por cliente.</p></AdminCard>
            <AdminCard><Globe2 className="h-5 w-5 text-[#9b6a12]" /><h3 className="mt-3 text-lg font-black">Resolución por host</h3><p className="mt-2 text-xs leading-6 text-[#80786d]">El middleware identifica dominio o subdominio y entrega el tenant correcto al runtime. Root/Superadmin queda fuera de la sustitución de marca.</p></AdminCard>
            <AdminCard><Activity className="h-5 w-5 text-[#9b6a12]" /><h3 className="mt-3 text-lg font-black">Confirmación operativa</h3><p className="mt-2 text-xs leading-6 text-[#80786d]">El Testador no se limita a un texto: consulta tablas, columnas, proveedor de correo y rutas. Después de corregir algo, pulsa Volver a comprobar para verlo como Confirmado.</p></AdminCard>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
