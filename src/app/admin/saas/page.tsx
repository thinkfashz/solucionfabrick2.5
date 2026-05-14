'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Globe, Users, CheckCircle2, XCircle, Clock, Plus, RefreshCw,
  Copy, ChevronDown, ChevronUp, Rocket, Key, Database, Mail,
  Wifi, CreditCard, AlertTriangle, Zap, Search, Phone, AtSign,
  Building2, ArrowUpRight, ShieldCheck, Circle,
} from 'lucide-react';
import { AdminPage, AdminPageHeader } from '@/components/admin/ui';

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

const STATUS_COLORS: Record<string, string> = {
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  trial: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  suspended: 'text-red-400 bg-red-500/10 border-red-500/20',
  cancelled: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  trial: 'Prueba',
  suspended: 'Suspendido',
  cancelled: 'Cancelado',
};

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
  free: 'Gratis',
};

const ENV_VARS = [
  { key: 'PLATFORM_ADMIN_SECRET', desc: 'Contraseña secreta de la plataforma', example: 'una-clave-larga-y-segura-123', required: true },
  { key: 'RESEND_API_KEY', desc: 'API Key de Resend para enviar emails', example: 're_xxxxxxxxxxxxxx', required: true },
  { key: 'EMAIL_FROM', desc: 'El correo desde donde se envían los emails', example: 'hola@fabrick.cl', required: true },
  { key: 'CRON_SECRET', desc: 'Clave para proteger los jobs automáticos', example: 'cron-secret-muy-largo-456', required: true },
  { key: 'PLATFORM_MP_WEBHOOK_SECRET', desc: 'Secreto del webhook de MercadoPago', example: 'mp-webhook-secret', required: false },
  { key: 'ADMIN_EMAIL', desc: 'Tu correo de acceso al admin', example: 'tu@email.com', required: true },
  { key: 'ADMIN_PASSWORD_HASH', desc: 'Contraseña hasheada del admin (se genera automáticamente)', example: '', required: true },
];

const INSTALL_STEPS = [
  {
    num: '1',
    title: 'Configura el DNS (el "domicilio" de tu app)',
    icon: Globe,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    content: `Entra al panel de tu dominio (GoDaddy, Namecheap, Cloudflare, etc.) y agrega este registro:

Tipo: CNAME
Nombre: *
Destino: cname.vercel-dns.com

Esto hace que TODOS los subdominios (como micliente.fabrick.cl) apunten a tu app automáticamente. Si tienes Cloudflare, desactiva el proxy naranja (usa solo DNS).`,
    code: `# Registro DNS a agregar:
Tipo:    CNAME
Nombre:  *
Destino: cname.vercel-dns.com
TTL:     Automático`,
  },
  {
    num: '2',
    title: 'Agrega los subdominios en Vercel',
    icon: Rocket,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    content: `Entra a tu proyecto en vercel.com → Settings → Domains y agrega:

fabrick.cl         (el dominio principal)
*.fabrick.cl       (el wildcard para todos los clientes)

Vercel verificará el DNS automáticamente (puede tardar hasta 24 horas, normalmente 5-10 minutos).`,
    code: `# Dominios a agregar en Vercel:
fabrick.cl
*.fabrick.cl`,
  },
  {
    num: '3',
    title: 'Pon las variables de entorno en Vercel',
    icon: Key,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/20',
    content: `Entra a vercel.com → tu proyecto → Settings → Environment Variables y agrega estas claves. Son como contraseñas que la app necesita para funcionar. NUNCA las compartas con nadie.`,
  },
  {
    num: '4',
    title: 'Ejecuta la migración de base de datos',
    icon: Database,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    content: `Copia el contenido del archivo scripts/add-multitenancy.sql y ejecútalo en tu base de datos InsForge. Ve a admin → Terminal SQL y pega el SQL ahí, o ejecuta desde la consola de InsForge.

Esto crea las columnas y tablas necesarias para que varios clientes (tenants) puedan usar tu app al mismo tiempo.`,
    code: `-- Ejecuta en InsForge SQL o admin/sql:
-- El archivo está en: scripts/add-multitenancy.sql
-- Cópialo y pégalo completo en el editor SQL`,
  },
  {
    num: '5',
    title: 'Registra el webhook de MercadoPago (opcional)',
    icon: CreditCard,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
    content: `Si quieres que los pagos se procesen automáticamente, entra a mercadopago.com → Tus integraciones → Webhooks y agrega esta URL.

Con esto, cuando alguien pague una suscripción, tu app se entera automáticamente y activa la cuenta.`,
    code: `# URL del webhook:
https://fabrick.cl/api/platform/mp-webhook

# Eventos a escuchar:
subscription_preapproval
payment`,
  },
  {
    num: '6',
    title: '¡Listo! Prueba con tu primer cliente',
    icon: ShieldCheck,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    content: `Usa el formulario "Añadir cliente" de esta misma página para crear tu primer tenant. Pon el nombre del negocio, el correo, y listo.

Tu cliente podrá entrar a: nombredelcliente.fabrick.cl/admin

Cada cliente tiene su propio espacio con sus propios productos, blog, pedidos y configuración — completamente separado de los demás.`,
  },
];

type Tab = 'clientes' | 'agregar' | 'guia';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}
      className="text-[10px] font-medium text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
    >
      <Copy size={10} />
      {copied ? '¡Copiado!' : 'Copiar'}
    </button>
  );
}

function StepCard({ step, index }: { step: typeof INSTALL_STEPS[0]; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const Icon = step.icon;
  return (
    <div className={`rounded-xl border ${step.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-black/30 flex items-center justify-center shrink-0">
          <Icon size={16} className={step.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${step.color} opacity-60`}>Paso {step.num}</span>
          </div>
          <div className="font-semibold text-sm text-white">{step.title}</div>
        </div>
        {open ? <ChevronUp size={14} className="text-zinc-500 shrink-0" /> : <ChevronDown size={14} className="text-zinc-500 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line mb-3">{step.content}</p>
          {step.code && (
            <div className="bg-black/40 rounded-lg p-3 font-mono text-xs text-emerald-300 whitespace-pre relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CopyButton text={step.code} />
              </div>
              {step.code}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EnvVarRow({ v }: { v: typeof ENV_VARS[0] }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b border-white/5">
      <div className="sm:w-64 shrink-0">
        <code className="text-xs font-mono text-yellow-300">{v.key}</code>
        {v.required && <span className="ml-1 text-[10px] text-red-400">*obligatorio</span>}
      </div>
      <div className="flex-1 text-xs text-zinc-400">{v.desc}</div>
      {v.example && (
        <div className="sm:w-48 shrink-0 flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 truncate">{v.example}</span>
          <CopyButton text={v.example} />
        </div>
      )}
    </div>
  );
}

export default function AdminSaasPage() {
  const [tab, setTab] = useState<Tab>('clientes');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Add tenant form state
  const [form, setForm] = useState({ name: '', owner_email: '', owner_name: '', owner_phone: '', plan_id: 'starter', custom_domain: '' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);

  const loadTenants = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/saas/tenants')
      .then((r) => r.json())
      .then((d) => setTenants(Array.isArray(d) ? d : []))
      .catch(() => setTenants([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadTenants(); }, [loadTenants]);

  const filtered = tenants.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.owner_email ?? '').toLowerCase().includes(q) ||
        (t.owner_name ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: tenants.length,
    active: tenants.filter((t) => t.status === 'active').length,
    trial: tenants.filter((t) => t.status === 'trial').length,
    suspended: tenants.filter((t) => t.status === 'suspended').length,
  };

  async function handleAddTenant(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaveOk(false);
    try {
      const res = await fetch('/api/admin/saas/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || 'Error al crear el cliente.');
      } else {
        setSaveOk(true);
        setForm({ name: '', owner_email: '', owner_name: '', owner_phone: '', plan_id: 'starter', custom_domain: '' });
        loadTenants();
        setTimeout(() => { setSaveOk(false); setTab('clientes'); }, 2000);
      }
    } catch {
      setSaveError('Error de red.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(tenant: Tenant) {
    const newStatus = tenant.status === 'active' ? 'suspended' : 'active';
    await fetch('/api/admin/saas/tenants', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tenant.id, status: newStatus }),
    });
    loadTenants();
  }

  return (
    <AdminPage>
      <AdminPageHeader
        title="Mi SaaS"
        description="Panel para gestionar todos tus clientes y configurar la plataforma."
        icon={Rocket}
        actions={
          <button
            onClick={loadTenants}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
          >
            <RefreshCw size={12} />
            Actualizar
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Clientes totales', value: stats.total, color: 'text-white', icon: Users },
          { label: 'Activos', value: stats.active, color: 'text-emerald-400', icon: CheckCircle2 },
          { label: 'En prueba', value: stats.trial, color: 'text-yellow-400', icon: Clock },
          { label: 'Suspendidos', value: stats.suspended, color: 'text-red-400', icon: XCircle },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/8 bg-white/3 p-4 text-center">
            <s.icon size={16} className={`${s.color} mx-auto mb-1.5`} />
            <div className={`text-2xl font-black ${s.color} mb-0.5`}>{loading ? '…' : s.value}</div>
            <div className="text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white/3 p-1 rounded-xl border border-white/8 w-fit">
        {([
          { id: 'clientes', label: 'Mis clientes', icon: Users },
          { id: 'agregar', label: 'Añadir cliente', icon: Plus },
          { id: 'guia', label: 'Guía de instalación', icon: Zap },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-all ${
              tab === t.id
                ? 'bg-white/10 text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* === TAB: CLIENTES === */}
      {tab === 'clientes' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por nombre, subdominio o correo…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-white/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="trial">En prueba</option>
              <option value="suspended">Suspendidos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center text-zinc-500 py-12 text-sm">Cargando clientes…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Users size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-500 text-sm mb-4">
                {tenants.length === 0 ? 'Aún no tienes clientes. ¡Añade el primero!' : 'No hay clientes que coincidan con la búsqueda.'}
              </p>
              {tenants.length === 0 && (
                <button
                  onClick={() => setTab('agregar')}
                  className="text-sm font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1 mx-auto"
                >
                  <Plus size={14} /> Añadir primer cliente
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((tenant) => (
                <div
                  key={tenant.id}
                  className="rounded-xl border border-white/8 bg-white/3 p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Icon + name */}
                    <div className="w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0">
                      <Building2 size={18} className="text-zinc-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{tenant.name}</span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${STATUS_COLORS[tenant.status] || STATUS_COLORS.cancelled}`}
                        >
                          {STATUS_LABELS[tenant.status] || tenant.status}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium">{PLAN_LABELS[tenant.plan_id] || tenant.plan_id}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-xs text-zinc-500 flex items-center gap-1">
                          <Globe size={10} />
                          {tenant.custom_domain ?? `${tenant.slug}.fabrick.cl`}
                          {tenant.custom_domain && (
                            <span className="text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/20 px-1 py-0.5 rounded">
                              dominio propio
                            </span>
                          )}
                        </span>
                        {tenant.owner_email && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <AtSign size={10} />
                            {tenant.owner_email}
                          </span>
                        )}
                        {tenant.owner_phone && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Phone size={10} />
                            {tenant.owner_phone}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`https://${tenant.slug}.fabrick.cl/admin`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-400 hover:text-white border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition-colors"
                      >
                        <ArrowUpRight size={11} />
                        Ver admin
                      </a>
                      <button
                        onClick={() => toggleStatus(tenant)}
                        className={`text-xs border rounded-lg px-2.5 py-1.5 flex items-center gap-1 transition-colors ${
                          tenant.status === 'active'
                            ? 'text-red-400 border-red-500/20 hover:bg-red-500/10'
                            : 'text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10'
                        }`}
                      >
                        <Circle size={8} className="fill-current" />
                        {tenant.status === 'active' ? 'Suspender' : 'Activar'}
                      </button>
                    </div>
                  </div>
                  {tenant.trial_ends_at && tenant.status === 'trial' && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-yellow-400">
                      <Clock size={10} />
                      Prueba termina: {new Date(tenant.trial_ends_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] text-zinc-600">
                    Creado el {new Date(tenant.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* === TAB: AGREGAR CLIENTE === */}
      {tab === 'agregar' && (
        <div className="max-w-lg">
          <div className="rounded-xl border border-white/8 bg-white/3 p-6">
            <h2 className="text-base font-bold text-white mb-1">Añadir nuevo cliente</h2>
            <p className="text-xs text-zinc-500 mb-6">
              Con el nombre del negocio, correo y nombre del contacto ya tienen acceso. Se crea su subdominio automáticamente.
            </p>

            {saveOk && (
              <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2 text-sm text-emerald-400">
                <CheckCircle2 size={14} />
                ¡Cliente creado con éxito! Redirigiendo a la lista…
              </div>
            )}
            {saveError && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle size={14} />
                {saveError}
              </div>
            )}

            <form onSubmit={handleAddTenant} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Nombre del negocio <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Ej: Tienda Marta"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20"
                  />
                </div>
                {form.name && (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Su subdominio será: <span className="text-emerald-400 font-mono">
                      {form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)}
                    </span>.fabrick.cl
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Nombre del dueño o contacto <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Users size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Ej: María García"
                    value={form.owner_name}
                    onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Correo electrónico <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    placeholder="Ej: maria@tiendamarta.cl"
                    value={form.owner_email}
                    onChange={(e) => setForm((f) => ({ ...f, owner_email: e.target.value }))}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Teléfono <span className="text-zinc-600">(opcional)</span>
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="tel"
                    placeholder="Ej: +56 9 1234 5678"
                    value={form.owner_phone}
                    onChange={(e) => setForm((f) => ({ ...f, owner_phone: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">
                  Dominio propio <span className="text-zinc-600">(opcional)</span>
                </label>
                <div className="relative">
                  <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Ej: tiendamarta.cl (sin www)"
                    value={form.custom_domain}
                    onChange={(e) => setForm((f) => ({ ...f, custom_domain: e.target.value.trim().toLowerCase() }))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20"
                  />
                </div>
                {form.custom_domain && (
                  <p className="text-[11px] text-zinc-500 mt-1">
                    El cliente debe apuntar su dominio con un CNAME a{' '}
                    <span className="text-blue-400 font-mono">cname.vercel-dns.com</span> y tú debes agregarlo en Vercel.
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1.5 block">Plan</label>
                <select
                  value={form.plan_id}
                  onChange={(e) => setForm((f) => ({ ...f, plan_id: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none"
                >
                  <option value="starter">Starter</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                  <option value="free">Gratis</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={14} />
                {saving ? 'Creando…' : 'Crear cliente'}
              </button>
            </form>
          </div>

          <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/8 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
              <div className="text-xs text-yellow-300/80">
                <strong>Importante:</strong> Al crear un cliente, asegúrate de enviarle manualmente sus datos de acceso (su URL es {' '}
                <span className="font-mono">su-slug.fabrick.cl/admin</span>). El sistema aún no envía email de bienvenida automáticamente.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TAB: GUÍA DE INSTALACIÓN === */}
      {tab === 'guia' && (
        <div className="max-w-2xl space-y-6">
          {/* Quick status */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Wifi size={14} className="text-emerald-400" />
              Lista de verificación rápida
            </h2>
            <div className="space-y-2">
              {[
                { label: 'DNS wildcard configurado (*.fabrick.cl → Vercel)', done: false },
                { label: 'Dominios agregados en Vercel', done: false },
                { label: 'Variables de entorno configuradas', done: false },
                { label: 'Migración SQL ejecutada (add-multitenancy.sql)', done: false },
                { label: 'Webhook de MercadoPago registrado', done: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done
                    ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                    : <XCircle size={14} className="text-zinc-600 shrink-0" />
                  }
                  <span className={item.done ? 'text-zinc-300' : 'text-zinc-500'}>{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-zinc-600 mt-3">Esta lista es informativa — márcala tú manualmente a medida que completas cada paso.</p>
          </div>

          {/* Steps */}
          <div className="space-y-2">
            {INSTALL_STEPS.map((step, i) => (
              <StepCard key={step.num} step={step} index={i} />
            ))}
          </div>

          {/* Env vars reference */}
          <div className="rounded-xl border border-white/8 bg-white/3 p-4">
            <h2 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
              <Key size={14} className="text-yellow-400" />
              Variables de entorno — referencia completa
            </h2>
            <p className="text-xs text-zinc-500 mb-4">Estas van en Vercel → Settings → Environment Variables</p>
            <div>
              {ENV_VARS.map((v) => <EnvVarRow key={v.key} v={v} />)}
            </div>
          </div>

          {/* Help box */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/8 p-4">
            <div className="flex items-start gap-2">
              <Zap size={14} className="text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-300/80 space-y-1">
                <p><strong>¿Algo no funciona?</strong> Ve a <span className="font-mono text-blue-400">/admin/estado</span> para ver el diagnóstico completo del sistema.</p>
                <p>¿El DNS no propaga? Prueba en <a href="https://dnschecker.org" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">dnschecker.org</a> poniendo <span className="font-mono">*.fabrick.cl</span>.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
}
