'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Building2, CheckCircle2, Loader2, Mail, Palette, Phone, Rocket, ShieldCheck, Sparkles, Store, User } from 'lucide-react';
import { TENANT_PALETTES, type TenantPaletteId } from '@/lib/tenantTheme';

type PlanId = 'starter' | 'pro' | 'enterprise';

type ApiResponse = {
  ok: boolean;
  error?: string;
  setupRequired?: boolean;
  tenantId?: string;
  slug?: string;
  adminEmail?: string;
  modules?: string[];
  welcomeEmail?: 'sent' | 'skipped' | 'failed';
  urls?: { storeUrl: string; adminUrl: string; fallbackAdminUrl: string } | null;
  message?: string;
};

const plans: Array<{ id: PlanId; name: string; price: string; text: string }> = [
  { id: 'starter', name: 'Starter', price: '$29.990', text: 'Tienda, catálogo y presupuestos base.' },
  { id: 'pro', name: 'Pro', price: '$59.990', text: 'Tienda completa, integraciones y motores técnicos.' },
  { id: 'enterprise', name: 'Enterprise', price: '$149.990', text: 'Multiempresa, soporte y operación avanzada.' },
];

const modules = [
  ['store', 'Tienda pública'],
  ['checkout', 'Carrito y checkout'],
  ['quotes', 'Cotizaciones'],
  ['budgets', 'Presupuestos'],
  ['tenant_branding', 'Marca y paletas'],
  ['integrations', 'Integraciones'],
];

function fieldClass() {
  return 'h-13 w-full rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-300/50';
}

export default function RegistroSaaSPage() {
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [planId, setPlanId] = useState<PlanId>('pro');
  const [paletteId, setPaletteId] = useState<TenantPaletteId>('lava');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ApiResponse | null>(null);

  const palette = useMemo(() => TENANT_PALETTES.find((item) => item.id === paletteId) || TENANT_PALETTES[0], [paletteId]);
  const valid = businessName.trim().length > 2 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim()) && acceptTerms;

  async function submit() {
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/saas/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          ownerName,
          ownerEmail,
          ownerPhone,
          planId,
          paletteId,
          primaryColor: palette.primary,
          acceptTerms,
        }),
      });
      const json = await res.json() as ApiResponse;
      if (!res.ok || !json.ok) throw new Error(json.error || 'No se pudo crear la empresa.');
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creando empresa.');
    } finally {
      setLoading(false);
    }
  }

  if (result?.ok) {
    return <main className="min-h-screen bg-[#050505] px-4 py-8 text-white md:px-6">
      <section className="mx-auto max-w-5xl rounded-[2.5rem] border border-emerald-300/25 bg-[radial-gradient(circle_at_80%_0%,rgba(16,185,129,.22),transparent_34rem),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-6 shadow-2xl shadow-black/50 md:p-10">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-emerald-300 text-black"><CheckCircle2 className="h-8 w-8" /></div>
        <h1 className="mt-6 text-4xl font-black tracking-[-.06em] md:text-6xl">Empresa creada.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">{result.message || 'El tenant fue creado correctamente.'}</p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-black/35 p-4"><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-200">Tenant</p><b className="mt-2 block text-lg">{result.slug}</b></div>
          <div className="rounded-3xl border border-white/10 bg-black/35 p-4"><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-200">Admin</p><b className="mt-2 block truncate text-lg">{result.adminEmail}</b></div>
          <div className="rounded-3xl border border-white/10 bg-black/35 p-4"><p className="text-[10px] font-black uppercase tracking-[.2em] text-emerald-200">Correo</p><b className="mt-2 block text-lg">{result.welcomeEmail || 'pendiente'}</b></div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          {result.urls?.adminUrl && <a href={result.urls.adminUrl} className="rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-black text-black">Abrir panel del tenant</a>}
          {result.urls?.storeUrl && <a href={result.urls.storeUrl} className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-black text-white">Ver tienda pública</a>}
          <Link href="/admin/superadmin/saas" className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm font-black text-white">Revisar Super Admin</Link>
        </div>
        <div className="mt-6 rounded-3xl border border-amber-300/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-50"><AlertTriangle className="mr-2 inline h-4 w-4" /> Si el correo no llegó, revisa configuración de Resend/SMTP o entrega acceso manual desde el panel.</div>
      </section>
    </main>;
  }

  return <main className="min-h-screen bg-[#050505] px-4 py-8 text-white md:px-6">
    <section className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_430px]">
      <div className="space-y-5">
        <header className="rounded-[2.5rem] border border-amber-300/20 bg-[radial-gradient(circle_at_82%_0%,rgba(245,158,11,.25),transparent_34rem),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-6 shadow-2xl shadow-black/40 md:p-8">
          <Link href="/saas" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white">← Volver al SaaS</Link>
          <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.26em] text-amber-100"><Rocket className="h-4 w-4" /> Onboarding SaaS real</p>
          <h1 className="mt-5 text-5xl font-black leading-[.9] tracking-[-.07em] md:text-7xl">Crea una empresa tenant.</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300">Registro → tenant → admin dueño → paleta → módulos → acceso. La migración final/RLS queda para el cierre, pero este flujo ya prepara la operación real.</p>
        </header>

        {error && <div className="rounded-3xl border border-red-300/25 bg-red-500/10 p-4 text-sm leading-6 text-red-100"><AlertTriangle className="mr-2 inline h-4 w-4" />{error}</div>}

        <section className="grid gap-4 md:grid-cols-2">
          <label className="rounded-3xl border border-white/10 bg-white/[0.045] p-4"><span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><Building2 className="h-4 w-4" /> Empresa</span><input className={fieldClass()} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ej: Clima Demo Chile" /></label>
          <label className="rounded-3xl border border-white/10 bg-white/[0.045] p-4"><span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><User className="h-4 w-4" /> Dueño/admin</span><input className={fieldClass()} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Nombre del encargado" /></label>
          <label className="rounded-3xl border border-white/10 bg-white/[0.045] p-4"><span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><Mail className="h-4 w-4" /> Correo de acceso</span><input className={fieldClass()} value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} placeholder="admin@empresa.cl" /></label>
          <label className="rounded-3xl border border-white/10 bg-white/[0.045] p-4"><span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><Phone className="h-4 w-4" /> WhatsApp</span><input className={fieldClass()} value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} placeholder="+56 9 0000 0000" /></label>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-4">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><Sparkles className="h-4 w-4" /> Plan inicial</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">{plans.map((plan) => <button key={plan.id} type="button" onClick={() => setPlanId(plan.id)} className={`rounded-3xl border p-4 text-left transition ${planId === plan.id ? 'border-amber-300/60 bg-amber-400/15' : 'border-white/10 bg-black/25 hover:bg-white/10'}`}><p className="text-lg font-black">{plan.name}</p><p className="mt-1 text-2xl font-black text-amber-200">{plan.price}</p><p className="mt-2 text-xs leading-5 text-zinc-400">{plan.text}</p></button>)}</div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-4">
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.2em] text-amber-200"><Palette className="h-4 w-4" /> Paleta visual</p>
          <div className="mt-4 grid gap-3 md:grid-cols-3">{TENANT_PALETTES.map((item) => <button key={item.id} type="button" onClick={() => setPaletteId(item.id)} className={`rounded-3xl border p-4 text-left transition ${paletteId === item.id ? 'border-white/45 bg-white/15' : 'border-white/10 bg-black/25 hover:bg-white/10'}`}><div className="flex gap-2">{[item.primary, item.secondary, item.accent].map((color) => <span key={color} className="h-7 flex-1 rounded-xl border border-white/10" style={{ background: color }} />)}</div><p className="mt-3 text-sm font-black">{item.name}</p><p className="mt-1 text-xs leading-5 text-zinc-400">{item.description}</p></button>)}</div>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-4">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-200">Módulos que se activan</p>
          <div className="mt-4 grid gap-2 md:grid-cols-3">{modules.map(([id, label]) => <div key={id} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-3 text-sm text-zinc-300"><CheckCircle2 className="h-4 w-4 text-emerald-300" />{label}</div>)}</div>
        </section>

        <label className="flex items-start gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-4 text-sm leading-6 text-zinc-300"><input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1" /><span>Acepto crear una empresa demo/piloto y entiendo que la activación productiva final requiere revisión de pago, seguridad y migración final.</span></label>

        <button onClick={submit} disabled={!valid || loading} className="inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-amber-300 px-6 py-5 text-sm font-black text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-45 md:w-auto">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} Crear tenant y enviar acceso
        </button>
      </div>

      <aside className="space-y-5">
        <article className="sticky top-5 rounded-[2.4rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/40">
          <div className="rounded-[2rem] border border-white/10 p-5" style={{ background: `linear-gradient(145deg, ${palette.background}, ${palette.surface})` }}>
            <div className="grid h-16 w-16 place-items-center rounded-2xl text-xl font-black text-black" style={{ background: palette.primary }}>{businessName.trim().slice(0, 2).toUpperCase() || 'CD'}</div>
            <h2 className="mt-4 text-3xl font-black tracking-[-.05em]" style={{ color: palette.text }}>{businessName || 'Tu Empresa Demo'}</h2>
            <p className="mt-2 text-sm" style={{ color: palette.accent }}>tu-empresa.solucionesfabrick.com</p>
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-4"><Store className="h-6 w-6" style={{ color: palette.primary }} /><p className="mt-3 text-sm font-black" style={{ color: palette.text }}>Vista previa SaaS</p><p className="mt-1 text-xs leading-5 text-zinc-400">Tienda, presupuestos, checkout y panel tomarán esta paleta como base.</p><button className="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black text-black" style={{ background: palette.primary }}>Comprar / Cotizar</button></div>
          </div>
        </article>
      </aside>
    </section>
  </main>;
}
