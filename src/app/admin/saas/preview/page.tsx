'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Eye,
  Laptop,
  Loader2,
  Monitor,
  Palette,
  RefreshCw,
  Save,
  Smartphone,
  Store,
} from 'lucide-react';
import { AdminCard, AdminMotion, AdminPage, AdminPageHeader, AdminStat } from '@/components/admin/ui';
import { TENANT_PALETTES } from '@/lib/tenantTheme';

type Tenant = {
  id: string;
  slug: string;
  name: string;
  plan_id: string;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  owner_email: string | null;
  custom_domain: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

type Device = 'desktop' | 'tablet' | 'mobile';

type Draft = {
  name: string;
  logo_url: string;
  primary_color: string;
  headline: string;
  subheadline: string;
  cta: string;
};

const DEMO: Tenant = {
  id: 'demo',
  slug: 'empresa-demo',
  name: 'Empresa Demo',
  plan_id: 'starter',
  status: 'trial',
  owner_email: null,
  custom_domain: null,
  logo_url: null,
  primary_color: '#F5871F',
};

function draftFromTenant(tenant: Tenant): Draft {
  return {
    name: tenant.name,
    logo_url: tenant.logo_url || '',
    primary_color: tenant.primary_color || '#F5871F',
    headline: `${tenant.name}: soluciones hechas para tu proyecto`,
    subheadline: 'Cotiza, compra y coordina servicios desde una experiencia moderna, rápida y adaptada a tu marca.',
    cta: 'Solicitar presupuesto',
  };
}

function futureHost(tenant: Tenant) {
  return tenant.custom_domain || `${tenant.slug}.fabrick.cl`;
}

const inputClass = 'w-full min-h-11 rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-[#171612] outline-none transition placeholder:text-[#aaa397] focus:border-[#c77a00]/35 focus:ring-4 focus:ring-[#ffb000]/10';

export default function SaasPreviewPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState('demo');
  const [draft, setDraft] = useState<Draft>(() => draftFromTenant(DEMO));
  const [device, setDevice] = useState<Device>('desktop');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/saas/tenants', { cache: 'no-store' });
      const data = await response.json() as Tenant[] | { error?: string; detail?: string };
      if (!response.ok || !Array.isArray(data)) throw new Error(Array.isArray(data) ? 'No se pudieron cargar los tenants.' : data.detail || data.error || 'No se pudieron cargar los tenants.');
      setTenants(data);
      if (data.length && selectedId === 'demo') {
        setSelectedId(data[0].id);
        setDraft(draftFromTenant(data[0]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los tenants.');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => { void load(); }, [load]);

  const selected = useMemo(() => tenants.find((tenant) => tenant.id === selectedId) || DEMO, [selectedId, tenants]);

  function selectTenant(id: string) {
    const tenant = tenants.find((item) => item.id === id) || DEMO;
    setSelectedId(id);
    setDraft(draftFromTenant(tenant));
    setNotice('');
    setError('');
  }

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function saveBranding() {
    if (selected.id === 'demo') {
      setNotice('Esta es una demo visual. Crea o selecciona un tenant real para guardar los cambios.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/saas/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selected.id, name: draft.name, logo_url: draft.logo_url, primary_color: draft.primary_color }),
      });
      const data = await response.json() as { error?: string; detail?: string };
      if (!response.ok) throw new Error(data.detail || data.error || 'No se pudo guardar la marca.');
      setNotice('Marca actualizada. La vista previa sigue funcionando aunque todavía no exista DNS.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la marca.');
    } finally {
      setSaving(false);
    }
  }

  const widthClass = device === 'mobile' ? 'max-w-[390px]' : device === 'tablet' ? 'max-w-[820px]' : 'max-w-[1280px]';
  const primary = draft.primary_color || '#F5871F';
  const samples = [
    { title: 'Servicio destacado', text: 'Presenta tu servicio principal con precio, cobertura y llamada a la acción.' },
    { title: 'Cotización rápida', text: 'El cliente puede iniciar un presupuesto y dejar sus datos en pocos pasos.' },
    { title: 'Pago y seguimiento', text: 'Centraliza compra, estado del pedido y contacto postventa desde la misma marca.' },
  ];

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Root · SaaS · laboratorio"
        title="Vista previa SaaS"
        description="Visualiza y ajusta una aplicación cliente antes de configurar wildcard, Cloudflare o dominio propio. Esta herramienta no depende del DNS: usa directamente los datos del tenant."
        icon={Eye}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/saas" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-black/10 bg-white/75 px-4 text-xs font-black text-[#514b42]"><ArrowLeft className="h-4 w-4" /> Fabrick SaaS</Link>
            <button type="button" onClick={() => void saveBranding()} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#171612] px-4 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar marca</button>
          </div>
        }
        meta={
          <>
            <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-emerald-800">Sin DNS requerido</span>
            <span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-[.13em] text-[#716b60]">{futureHost(selected)}</span>
          </>
        }
      />

      {(error || notice) ? <AdminMotion><div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${error ? 'border-rose-500/20 bg-rose-500/8 text-rose-800' : 'border-emerald-500/20 bg-emerald-500/8 text-emerald-800'}`}>{error || notice}</div></AdminMotion> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStat label="Tenant" value={selected.name} icon={Store} />
        <AdminStat label="Plan" value={selected.plan_id} icon={CheckCircle2} accent="emerald" />
        <AdminStat label="URL futura" value={selected.custom_domain ? 'Propio' : 'Wildcard'} icon={ExternalLink} accent="cyan" hint={futureHost(selected)} />
        <AdminStat label="Preview" value="Activo" icon={Eye} hint="Se renderiza dentro del admin." />
      </section>

      <div className="grid gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <AdminCard>
            <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Aplicación</p>
            <h2 className="mt-1 text-lg font-black text-[#171612]">Seleccionar tenant</h2>
            <select value={selectedId} onChange={(event) => selectTenant(event.target.value)} disabled={loading} className={`${inputClass} mt-4`}>
              {!tenants.length ? <option value="demo">Empresa Demo</option> : null}
              {tenants.map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name} · {tenant.slug}</option>)}
            </select>
            <button type="button" onClick={() => void load()} disabled={loading} className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-xl border border-black/10 bg-white px-3 text-[10px] font-black uppercase tracking-[.1em] text-[#716b60]">{loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Recargar</button>
          </AdminCard>

          <AdminCard>
            <div className="flex items-center gap-2"><Palette className="h-4 w-4 text-[#a56600]" /><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#8f887c]">Edición en vivo</p></div>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.13em] text-[#80786d]">Nombre</span><input className={inputClass} value={draft.name} onChange={(event) => setField('name', event.target.value)} /></label>
              <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.13em] text-[#80786d]">Logo URL</span><input className={inputClass} value={draft.logo_url} onChange={(event) => setField('logo_url', event.target.value)} placeholder="https://…" /></label>
              <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.13em] text-[#80786d]">Color principal</span><div className="flex gap-2"><input type="color" value={draft.primary_color} onChange={(event) => setField('primary_color', event.target.value)} className="h-11 w-14 rounded-xl border border-black/10 bg-white p-1" /><input className={inputClass} value={draft.primary_color} onChange={(event) => setField('primary_color', event.target.value)} /></div></label>
              <div className="grid grid-cols-6 gap-1.5">{TENANT_PALETTES.map((palette) => <button key={palette.id} type="button" title={palette.name} onClick={() => setField('primary_color', palette.primary)} className="h-8 rounded-lg border border-black/10" style={{ background: palette.primary }} />)}</div>
              <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.13em] text-[#80786d]">Titular</span><textarea rows={2} className={`${inputClass} resize-none`} value={draft.headline} onChange={(event) => setField('headline', event.target.value)} /></label>
              <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.13em] text-[#80786d]">Descripción</span><textarea rows={3} className={`${inputClass} resize-none`} value={draft.subheadline} onChange={(event) => setField('subheadline', event.target.value)} /></label>
              <label className="grid gap-1.5"><span className="text-[10px] font-black uppercase tracking-[.13em] text-[#80786d]">Botón principal</span><input className={inputClass} value={draft.cta} onChange={(event) => setField('cta', event.target.value)} /></label>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-[#8f887c]">Nombre, logo y color se pueden guardar hoy en el tenant. Los textos de esta maqueta son temporales hasta conectar el editor SaaS/Visual CMS por tenant.</p>
          </AdminCard>
        </div>

        <AdminCard className="min-w-0 p-3 sm:p-4" glow>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-3">
            <div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#8f887c]">Canvas de tenant</p><p className="mt-0.5 text-sm font-black text-[#171612]">https://{futureHost(selected)}</p></div>
            <div className="flex rounded-xl border border-black/10 bg-white/70 p-1">
              {([
                ['desktop', Monitor],
                ['tablet', Laptop],
                ['mobile', Smartphone],
              ] as const).map(([id, Icon]) => <button key={id} type="button" onClick={() => setDevice(id)} className={`grid h-8 w-9 place-items-center rounded-lg ${device === id ? 'bg-[#171612] text-white' : 'text-[#716b60]'}`}><Icon className="h-4 w-4" /></button>)}
            </div>
          </div>

          <div className="overflow-x-auto py-5">
            <div className={`mx-auto overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_28px_90px_rgba(50,38,18,.12)] transition-all duration-300 ${widthClass}`}>
              <div className="flex min-h-9 items-center gap-2 border-b border-black/10 bg-[#f5f1e8] px-4 text-[9px] font-bold text-[#8f887c]"><span className="h-2 w-2 rounded-full bg-rose-400" /><span className="h-2 w-2 rounded-full bg-amber-400" /><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="ml-2 truncate">{futureHost(selected)}</span></div>

              <div className="min-h-[650px]" style={{ background: '#0b0d0e', color: '#fffaf1' }}>
                <header className={`flex items-center justify-between gap-3 border-b border-white/10 ${device === 'mobile' ? 'px-4 py-4' : 'px-7 py-5'}`}>
                  <div className="flex min-w-0 items-center gap-3">{draft.logo_url ? <img src={draft.logo_url} alt="" className="h-9 w-9 rounded-xl object-contain" /> : <span className="grid h-9 w-9 place-items-center rounded-xl text-xs font-black text-black" style={{ background: primary }}>{draft.name.slice(0, 2).toUpperCase()}</span>}<div className="min-w-0"><p className="truncate text-sm font-black">{draft.name || 'Tu empresa'}</p><p className="text-[9px] font-bold uppercase tracking-[.14em] text-white/45">Servicios · Tienda</p></div></div>
                  {device !== 'mobile' ? <nav className="flex items-center gap-5 text-[10px] font-black uppercase tracking-[.12em] text-white/60"><span>Inicio</span><span>Servicios</span><span>Tienda</span><span>Contacto</span></nav> : <span className="rounded-lg border border-white/15 px-2 py-1 text-[9px]">MENÚ</span>}
                </header>

                <section className={`grid items-center gap-8 border-b border-white/8 ${device === 'mobile' ? 'px-5 py-12' : 'min-h-[360px] grid-cols-[1.1fr_.9fr] px-8 py-12'}`}>
                  <div><span className="inline-flex rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[.16em] text-black" style={{ background: primary }}>Aplicación SaaS Fabrick</span><h1 className={`mt-5 max-w-3xl font-black leading-[.96] tracking-[-.055em] ${device === 'mobile' ? 'text-4xl' : 'text-6xl'}`}>{draft.headline}</h1><p className="mt-5 max-w-xl text-sm leading-6 text-white/58">{draft.subheadline}</p><div className="mt-6 flex flex-wrap gap-2"><button className="rounded-xl px-4 py-3 text-xs font-black text-black" style={{ background: primary }}>{draft.cta}</button><button className="rounded-xl border border-white/15 px-4 py-3 text-xs font-black text-white">Ver servicios</button></div></div>
                  {device !== 'mobile' ? <div className="relative min-h-[250px] overflow-hidden rounded-[28px] border border-white/10 bg-white/[.04] p-5"><div className="absolute -right-12 -top-12 h-52 w-52 rounded-full blur-3xl" style={{ background: `${primary}55` }} /><div className="relative grid h-full content-end"><p className="text-[10px] font-black uppercase tracking-[.16em] text-white/40">Cotizador inteligente</p><p className="mt-2 text-3xl font-black">Tu servicio<br />en una sola experiencia.</p><div className="mt-5 grid grid-cols-3 gap-2">{['Cotizar', 'Pagar', 'Seguir'].map((item) => <div key={item} className="rounded-xl border border-white/10 bg-black/20 p-3 text-center text-[10px] font-black">{item}</div>)}</div></div></div> : null}
                </section>

                <section className={device === 'mobile' ? 'px-5 py-10' : 'px-8 py-10'}><div className="flex items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.16em]" style={{ color: primary }}>Qué puede mostrar</p><h2 className="mt-1 text-2xl font-black">Servicios destacados</h2></div><span className="text-[9px] font-bold text-white/40">Administrable</span></div><div className={`mt-5 grid gap-3 ${device === 'mobile' ? '' : 'grid-cols-3'}`}>{samples.map((item, index) => <article key={item.title} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><span className="grid h-8 w-8 place-items-center rounded-xl text-xs font-black text-black" style={{ background: index === 0 ? primary : `${primary}bb` }}>{index + 1}</span><h3 className="mt-4 text-sm font-black">{item.title}</h3><p className="mt-2 text-xs leading-5 text-white/48">{item.text}</p></article>)}</div></section>

                <footer className={`border-t border-white/10 text-[10px] text-white/40 ${device === 'mobile' ? 'px-5 py-6' : 'px-8 py-6'}`}><div className="flex flex-wrap items-center justify-between gap-3"><span>{draft.name} · Powered by Fabrick SaaS</span><span>Presupuestos · Pagos · Catálogo · CRM</span></div></footer>
              </div>
            </div>
          </div>
        </AdminCard>
      </div>
    </AdminPage>
  );
}
