'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Globe2, Loader2, Mail, Palette, Phone, Save, ShieldCheck } from 'lucide-react';
import { TENANT_PALETTES, paletteFromPrimary } from '@/lib/tenantTheme';

type TenantProfile = {
  id: string;
  slug: string;
  name: string;
  owner_email?: string | null;
  owner_name?: string | null;
  phone?: string | null;
  custom_domain?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  billing_email?: string | null;
  status?: string | null;
  plan_id?: string | null;
  trial_ends_at?: string | null;
};

type ApiPayload = {
  ok: boolean;
  tenantId?: string;
  profile?: TenantProfile;
  setupRequired?: boolean;
  error?: string;
};

const DEFAULT_COLOR = '#f59e0b';

function Field({ label, icon: Icon, children }: { label: string; icon: typeof Building2; children: React.ReactNode }) {
  return <label className="block rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,.25)]">
    <span className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[.18em] text-amber-200"><Icon className="h-4 w-4" /> {label}</span>
    {children}
  </label>;
}

function inputClass() {
  return 'h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-300/50';
}

export default function MiEmpresaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [setupRequired, setSetupRequired] = useState(false);
  const [profile, setProfile] = useState<TenantProfile | null>(null);

  const color = profile?.primary_color || DEFAULT_COLOR;
  const selectedPalette = paletteFromPrimary(color);
  const tenantUrl = useMemo(() => profile?.slug ? `https://${profile.slug}.solucionesfabrick.com` : 'https://cliente.solucionesfabrick.com', [profile?.slug]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/tenant-profile', { cache: 'no-store' });
      const json = await res.json() as ApiPayload;
      if (!res.ok) throw new Error(json.error || 'No se pudo cargar perfil de empresa.');
      setSetupRequired(Boolean(json.setupRequired));
      setProfile(json.profile || null);
      if (json.error) setError(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando perfil.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function update<K extends keyof TenantProfile>(key: K, value: TenantProfile[K]) {
    setProfile((prev) => ({ ...(prev || { id: '', slug: '', name: '' }), [key]: value } as TenantProfile));
  }

  function applyPalette(primary: string) {
    update('primary_color', primary);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/tenant-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.name,
          owner_name: profile.owner_name,
          phone: profile.phone,
          custom_domain: profile.custom_domain,
          logo_url: profile.logo_url,
          primary_color: profile.primary_color,
          billing_email: profile.billing_email,
        }),
      });
      const json = await res.json() as ApiPayload;
      if (!res.ok || json.error) throw new Error(json.error || 'No se pudo guardar.');
      setProfile(json.profile || profile);
      setMessage('Configuración de empresa guardada. La interfaz pública tomará esta paleta como base visual.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando empresa.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#050505] text-white"><Loader2 className="h-8 w-8 animate-spin text-amber-300" /></main>;

  return <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6">
    <section className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="space-y-5">
        <header className="relative overflow-hidden rounded-[2.4rem] border border-amber-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(245,158,11,.24),transparent_30rem),linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.025))] p-6 shadow-2xl shadow-black/40 md:p-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.28em] text-amber-200"><Building2 className="h-3.5 w-3.5" /> SaaS · Marca</p>
          <h1 className="mt-5 text-4xl font-black tracking-[-.06em] md:text-6xl">Mi empresa</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Configura identidad, color de marca y paleta visual. La tienda, presupuestos, checkout y panel público tomarán estas tonalidades como base del sistema.</p>
        </header>

        {setupRequired && <div className="rounded-3xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" /> La tabla SaaS todavía no está activa. Puedes dejar este módulo listo y ejecutar la migración al final desde <Link className="font-black underline" href="/admin/saas-migracion">Migración SaaS</Link>.</div>}
        {error && <div className="rounded-3xl border border-red-300/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" /> {error}</div>}
        {message && <div className="rounded-3xl border border-emerald-300/25 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-100"><CheckCircle2 className="mr-2 inline h-4 w-4" /> {message}</div>}

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Nombre comercial" icon={Building2}><input className={inputClass()} value={profile?.name || ''} onChange={(event) => update('name', event.target.value)} placeholder="Soluciones Fabrick" /></Field>
          <Field label="Representante" icon={ShieldCheck}><input className={inputClass()} value={profile?.owner_name || ''} onChange={(event) => update('owner_name', event.target.value)} placeholder="Nombre del dueño o encargado" /></Field>
          <Field label="WhatsApp / Teléfono" icon={Phone}><input className={inputClass()} value={profile?.phone || ''} onChange={(event) => update('phone', event.target.value)} placeholder="+56 9 0000 0000" /></Field>
          <Field label="Correo de facturación" icon={Mail}><input className={inputClass()} value={profile?.billing_email || ''} onChange={(event) => update('billing_email', event.target.value)} placeholder="pagos@empresa.cl" /></Field>
          <Field label="Logo URL HTTPS" icon={Globe2}><input className={inputClass()} value={profile?.logo_url || ''} onChange={(event) => update('logo_url', event.target.value)} placeholder="https://.../logo.png" /></Field>
          <Field label="Dominio personalizado" icon={Globe2}><input className={inputClass()} value={profile?.custom_domain || ''} onChange={(event) => update('custom_domain', event.target.value)} placeholder="www.empresa.cl" /></Field>
          <Field label="Color principal" icon={Palette}><input className={`${inputClass()} font-mono`} value={profile?.primary_color || DEFAULT_COLOR} onChange={(event) => update('primary_color', event.target.value)} placeholder="#f59e0b" /></Field>
          <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4"><span className="mb-2 block text-[11px] font-black uppercase tracking-[.18em] text-amber-200">Estado</span><div className="flex flex-wrap gap-2 text-xs font-black uppercase tracking-[.16em]"><span className="rounded-full border border-white/10 bg-black/35 px-3 py-2 text-zinc-300">{profile?.status || 'sin estado'}</span><span className="rounded-full border border-white/10 bg-black/35 px-3 py-2 text-zinc-300">plan {profile?.plan_id || 'n/a'}</span></div></div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,.25)]">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.2em] text-amber-200"><Palette className="h-4 w-4" /> Paleta de marca</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-.04em]">Elige el estilo visual del sistema</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-400">El color elegido alimenta variables globales del tenant: botones, brillos, tarjetas, acentos, preview público y futuros módulos del admin.</p>
            </div>
            <span className="rounded-full border border-white/10 bg-black/35 px-3 py-2 text-xs font-black uppercase tracking-[.16em] text-zinc-300">Actual: {selectedPalette.name}</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {TENANT_PALETTES.map((palette) => {
              const active = (profile?.primary_color || DEFAULT_COLOR).toLowerCase() === palette.primary.toLowerCase();
              return <button key={palette.id} type="button" onClick={() => applyPalette(palette.primary)} className={`rounded-3xl border p-4 text-left transition ${active ? 'border-white/40 bg-white/15' : 'border-white/10 bg-black/25 hover:border-white/25 hover:bg-white/10'}`}>
                <div className="flex gap-2">
                  {[palette.primary, palette.secondary, palette.accent, palette.surface].map((swatch) => <span key={swatch} className="h-8 flex-1 rounded-2xl border border-white/10" style={{ background: swatch }} />)}
                </div>
                <p className="mt-3 text-sm font-black text-white">{palette.name}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{palette.description}</p>
              </button>;
            })}
          </div>
        </section>

        <button type="button" onClick={save} disabled={saving || !profile || setupRequired} className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-amber-400 px-5 py-4 text-sm font-black text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45 md:w-auto">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar configuración
        </button>
      </div>

      <aside className="space-y-5">
        <article className="sticky top-5 overflow-hidden rounded-[2.4rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/40">
          <div className="rounded-[2rem] border border-white/10 p-5" style={{ background: `linear-gradient(145deg, ${selectedPalette.background}, ${selectedPalette.surface})`, boxShadow: `0 0 80px ${color}22` }}>
            <div className="flex items-center gap-3">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border border-white/10 text-lg font-black text-black" style={{ background: color }}>
                {profile?.logo_url ? <img src={profile.logo_url} alt={profile.name} className="h-full w-full object-cover" /> : (profile?.name || 'SF').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xl font-black" style={{ color: selectedPalette.text }}>{profile?.name || 'Tu empresa'}</p>
                <p className="truncate text-xs" style={{ color: selectedPalette.accent }}>{tenantUrl}</p>
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-bold" style={{ color: selectedPalette.text }}>Vista previa comercial</p>
              <p className="mt-2 text-xs leading-5 text-zinc-400">Este branding será la base para tienda, presupuestos públicos, checkout y correos del tenant.</p>
              <button className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black text-black" style={{ background: color }}>Solicitar presupuesto</button>
            </div>
            <div className="mt-4 grid gap-2 text-xs text-zinc-400">
              <span>WhatsApp: {profile?.phone || 'pendiente'}</span>
              <span>Correo: {profile?.billing_email || profile?.owner_email || 'pendiente'}</span>
              <span>Dominio: {profile?.custom_domain || 'subdominio SaaS'}</span>
            </div>
          </div>
          <Link href="/admin/integraciones" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Configurar integraciones <ArrowRight className="h-4 w-4" /></Link>
        </article>
      </aside>
    </section>
  </main>;
}
