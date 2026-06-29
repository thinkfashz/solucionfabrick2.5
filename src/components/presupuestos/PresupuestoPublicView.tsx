'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { CheckCircle2, Copy, Loader2, Mail, MessageCircle, Printer, Timer } from 'lucide-react';
import BudgetScene360 from '@/components/presupuestos/BudgetScene360';
import { AnimatedBudgetTicket } from '@/components/presupuestos/AnimatedBudgetTicket';
import { formatBudgetMoney, sanitizeBudgetHtml, type PresupuestoPro } from '@/lib/presupuestosBuilder';
import type { TenantPalette } from '@/lib/tenantTheme';

const DEFAULT_WHATSAPP_PHONE = '56930121625';
const DEFAULT_BRAND = {
  name: 'Soluciones Fabrick',
  primaryColor: '#f59e0b',
  logoUrl: null as string | null,
  phone: null as string | null,
  billingEmail: null as string | null,
  whatsappUrl: null as string | null,
};

type TenantBranding = typeof DEFAULT_BRAND & {
  slug?: string;
  customDomain?: string | null;
  theme?: TenantPalette;
};

function normalizeWhatsappPhone(phone?: string | null) {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return DEFAULT_WHATSAPP_PHONE;
  if (digits.startsWith('569') && digits.length === 11) return digits;
  if (digits.startsWith('56') && digits.length >= 11) return digits;
  if (digits.startsWith('9') && digits.length === 9) return `56${digits}`;
  if (digits.length === 8) return `569${digits}`;
  return digits;
}

function buildWhatsAppUrl(phone: string | undefined | null, text: string) {
  return `https://wa.me/${normalizeWhatsappPhone(phone)}?text=${encodeURIComponent(text)}`;
}

function openCompatibleUrl(url: string) {
  if (typeof window === 'undefined') return;
  window.location.href = url;
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
}

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return <section className="tenant-card overflow-hidden rounded-[1.75rem] border border-white/[0.07] p-5 text-white shadow-[0_4px_32px_rgba(0,0,0,0.4)] sm:p-7">
    {eyebrow ? <p className="tenant-text mb-2 text-[10px] font-black uppercase tracking-[0.32em]">{eyebrow}</p> : null}
    <h2 className="mb-5 flex items-center gap-2.5 text-xl font-black tracking-tight sm:text-2xl"><span className="tenant-dot h-2.5 w-2.5 shrink-0 rounded-full" />{title}</h2>
    {children}
  </section>;
}

function List({ items }: { items: string[] }) {
  const clean = items.filter(Boolean);
  if (!clean.length) return <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-zinc-500">Sin información cargada.</p>;
  return <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">{clean.map((item, i) => <li key={`${item}-${i}`} className="tenant-border rounded-2xl border bg-white/[0.05] px-4 py-3 text-sm font-semibold leading-6 text-zinc-100"><CheckCircle2 className="tenant-icon mr-2 inline h-4 w-4 shrink-0" />{item}</li>)}</ul>;
}

function readNumber(data: Record<string, unknown>, key: string, fallback = 0) {
  const value = data[key];
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function readString(data: Record<string, unknown>, key: string, fallback = '') {
  const value = data[key];
  return typeof value === 'string' ? value : fallback;
}

function objectFrom(value: unknown) {
  return typeof value === 'object' && value ? value as Record<string, unknown> : {};
}

function ConfirmButton({ onConfirm, accepting, accepted, compact = false }: { onConfirm: () => void; accepting: boolean; accepted: boolean; compact?: boolean }) {
  return <button type="button" onClick={onConfirm} disabled={accepting || accepted} className={`${compact ? 'mt-4 w-full justify-center rounded-2xl px-4 py-3' : 'w-full justify-center rounded-full px-5 py-3 sm:w-auto'} tenant-bg inline-flex items-center gap-2 text-sm font-black text-black shadow-lg transition disabled:cursor-not-allowed disabled:opacity-70 print:hidden`}>
    {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
    {accepting ? 'Confirmando...' : accepted ? 'Presupuesto aceptado' : compact ? 'Confirmar presupuesto' : 'Confirmar por WhatsApp'}
  </button>;
}

export default function PresupuestoPublicView({ presupuesto, publicLink, adminPreview = false }: { presupuesto: PresupuestoPro; publicLink?: string; adminPreview?: boolean }) {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [brand, setBrand] = useState<TenantBranding>(DEFAULT_BRAND);

  useEffect(() => {
    let alive = true;
    fetch('/api/tenant/branding', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json: { branding?: TenantBranding }) => {
        if (!alive || !json?.branding) return;
        setBrand({ ...DEFAULT_BRAND, ...json.branding });
      })
      .catch(() => undefined);
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('print') === '1') {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const vence = presupuesto.fecha_vencimiento;
    if (!vence) return;
    const target = new Date(vence).getTime();
    if (!Number.isFinite(target)) return;
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { setIsExpired(true); setTimeLeft(null); return; }
      setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000) });
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [presupuesto.fecha_vencimiento]);

  const safeHtml = DOMPurify.sanitize(sanitizeBudgetHtml(presupuesto.html_personalizado), { FORBID_TAGS: ['script', 'iframe', 'object', 'embed'], FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'] });
  const companyName = brand.name || presupuesto.proveedor || 'Soluciones Fabrick';
  const clientName = presupuesto.empresa_cliente || presupuesto.cliente || 'Cliente';
  const currentLink = publicLink || (typeof window !== 'undefined' ? window.location.href : '');
  const presentation = (presupuesto.json_presentacion || {}) as Record<string, unknown>;
  const motor = typeof presentation.motor === 'string' ? presentation.motor : '';
  const sceneKind = motor === 'aire' || motor === 'radier' ? motor : undefined;
  const calc = objectFrom(presentation.calculo);
  const inputs = objectFrom(presentation.inputs);
  const producto = objectFrom(presentation.producto);
  const sceneData = useMemo(() => ({ ...inputs, ...calc }), [inputs, calc]);
  const saleMode = readString(inputs, 'venta', readString(presentation, 'venta', 'equipo_instalacion'));
  const coverageM2 = readNumber(sceneData, 'area', readNumber(inputs, 'largo', 0) * readNumber(inputs, 'ancho', 0));
  const btu = readNumber(sceneData, 'seleccionado', readNumber(sceneData, 'recomendado', readNumber(sceneData, 'btu', 0)));
  const tenantPhone = brand.phone || presupuesto.telefono_whatsapp;
  const consultText = `Hola, revisé la propuesta comercial "${presupuesto.titulo}" para ${clientName}. Link: ${currentLink}`;
  const consultUrl = buildWhatsAppUrl(tenantPhone, consultText);
  const emailTarget = brand.billingEmail || presupuesto.email_cliente || '';
  const emailUrl = `mailto:${emailTarget}?subject=${encodeURIComponent(`Presupuesto ${presupuesto.titulo}`)}&body=${encodeURIComponent(`${consultText}\n\nTotal: ${formatBudgetMoney(presupuesto.total_con_iva)}`)}`;
  const garantia = readString(presentation, 'garantia', 'Garantía según equipo, instalación y condiciones reales verificadas en visita técnica.');
  const visitaTecnica = readString(presentation, 'visita_tecnica', 'Visita técnica recomendada para validar distancia, muro, energía, drenaje y ubicación de condensador.');
  const limites = Array.isArray(presentation.limites) ? presentation.limites.map(String) : presupuesto.no_incluye;
  const brandColor = /^#[0-9a-fA-F]{6}$/.test(brand.primaryColor || '') ? brand.primaryColor : '#f59e0b';
  const theme = brand.theme;
  const themeStyle = {
    '--tenant-primary': theme?.primary || brandColor,
    '--tenant-secondary': theme?.secondary || '#ea580c',
    '--tenant-accent': theme?.accent || '#fde68a',
    '--tenant-bg': theme?.background || '#050505',
    '--tenant-surface': theme?.surface || '#11100d',
    '--tenant-text': theme?.text || '#fff7ed',
  } as CSSProperties;

  async function handleCopyLink() { try { await navigator.clipboard.writeText(currentLink); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setCopied(false); } }
  async function handleConfirmAcceptance() {
    if (accepted || accepting) return;
    setAccepting(true);
    setAcceptMessage('Registrando aceptación del presupuesto...');
    const fallbackText = `Hola, confirmo la aceptación del presupuesto "${presupuesto.titulo}" para ${clientName}. Total: ${formatBudgetMoney(presupuesto.total_con_iva)}. Link: ${currentLink}`;
    const fallbackUrl = buildWhatsAppUrl(tenantPhone, fallbackText);
    try {
      const res = await fetch('/api/presupuestos/confirmar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ presupuesto: { ...presupuesto, proveedor: companyName, telefono_whatsapp: normalizeWhatsappPhone(tenantPhone), public_link: currentLink, email_cliente: emailTarget } }) });
      const json = (await res.json().catch(() => ({}))) as { whatsappUrl?: string; email?: { sent?: boolean }; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setAccepted(true);
      setAcceptMessage(json.email?.sent ? 'Confirmación registrada y correo enviado.' : 'Confirmación registrada. Abriendo WhatsApp...');
      openCompatibleUrl(json.whatsappUrl || fallbackUrl);
    } catch (err) {
      setAcceptMessage(`No se pudo registrar automáticamente: ${(err as Error).message}. Abriré WhatsApp igualmente.`);
      openCompatibleUrl(fallbackUrl);
    } finally { setAccepting(false); }
  }

  if (presupuesto.usar_html_personalizado && safeHtml) return <div className="tenant-card w-full overflow-hidden rounded-3xl border p-4 text-white"><div dangerouslySetInnerHTML={{ __html: safeHtml }} /></div>;

  return <article className="presupuesto-public-page tenant-surface mx-auto w-full max-w-7xl overflow-hidden text-white shadow-[0_40px_120px_rgba(0,0,0,0.55)] sm:rounded-[2rem] print:bg-white print:text-black print:shadow-none" style={themeStyle}>
    <style jsx global>{`.presupuesto-public-page .tenant-text{color:var(--tenant-primary)}.presupuesto-public-page .tenant-bg{background:linear-gradient(135deg,var(--tenant-primary),var(--tenant-secondary))}.presupuesto-public-page .tenant-dot{background:var(--tenant-primary);box-shadow:0 0 10px var(--tenant-primary)}.presupuesto-public-page .tenant-icon{color:var(--tenant-primary)}.presupuesto-public-page .tenant-border{border-color:color-mix(in srgb,var(--tenant-primary) 24%,transparent)}@media print{@page{size:letter;margin:12mm}.presupuesto-public-page,.presupuesto-public-page *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}.presupuesto-public-page button,.presupuesto-public-page .print\:hidden{display:none!important}.presupuesto-public-page section,.presupuesto-public-page header,.presupuesto-public-page footer{background:#fff!important;color:#111!important;border-color:#ddd!important;box-shadow:none!important}}`}</style>

    <header className="relative overflow-hidden p-5 text-white sm:p-8 lg:p-12 print:bg-white print:text-black" style={{ background: `radial-gradient(circle at 80% 0%, var(--tenant-primary), transparent 24rem), linear-gradient(145deg, var(--tenant-bg), var(--tenant-surface))` }}>
      <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl text-sm font-black text-black ring-1 ring-white/20" style={{ background: 'var(--tenant-primary)' }}>{brand.logoUrl ? <img src={brand.logoUrl} alt={companyName} className="h-full w-full object-cover" /> : initials(companyName)}</div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Propuesta comercial</p><p className="text-lg font-black leading-none text-white">{companyName}</p></div>
        </div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-[#111111]"><Printer className="h-4 w-4" /> PDF</button><button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white"><Copy className="h-4 w-4" /> {copied ? 'Copiado' : 'Copiar link'}</button><button type="button" onClick={() => openCompatibleUrl(emailUrl)} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white"><Mail className="h-4 w-4" /> Correo</button><button type="button" onClick={() => openCompatibleUrl(consultUrl)} className="tenant-bg inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-black text-black"><MessageCircle className="h-4 w-4" /> WhatsApp</button></div>
      </nav>
      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end"><div><div className="mb-5 inline-flex rounded-full border px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em]" style={{ borderColor: 'color-mix(in srgb, var(--tenant-primary) 45%, transparent)', background: 'color-mix(in srgb, var(--tenant-primary) 14%, transparent)', color: 'var(--tenant-accent)' }}>Cliente · {clientName}</div><h1 className="tenant-gradient-text text-[2.35rem] font-black uppercase leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl print:text-4xl">{presupuesto.titulo}</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-200 sm:text-xl print:text-base">{presupuesto.descripcion}</p>{!adminPreview && <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap print:hidden"><ConfirmButton onConfirm={handleConfirmAcceptance} accepting={accepting} accepted={accepted} /><button type="button" onClick={() => openCompatibleUrl(consultUrl)} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white sm:w-auto"><MessageCircle className="h-4 w-4" /> Consultar</button></div>}{acceptMessage && <p className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100 print:hidden">{acceptMessage}</p>}</div><aside className="tenant-card rounded-[2rem] border border-white/10 p-5 backdrop-blur-2xl"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-400">Total proyecto</p><b className="tenant-text mt-2 block text-4xl font-black">{formatBudgetMoney(presupuesto.total_con_iva)}</b><p className="mt-2 text-sm text-zinc-300">Neto {formatBudgetMoney(presupuesto.valor_neto)} · IVA {formatBudgetMoney(presupuesto.total_iva)}</p><div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3"><Timer className="tenant-icon mb-2 h-5 w-5" />{isExpired ? <b className="text-red-300">Propuesta vencida</b> : timeLeft ? <b className="tenant-text">Vence en {timeLeft.days}d {String(timeLeft.hours).padStart(2, '0')}h {String(timeLeft.minutes).padStart(2, '0')}m</b> : <b>{presupuesto.validez}</b>}</div></aside></div>
    </header>

    <div className="grid min-w-0 gap-5 p-3 sm:p-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:p-8">
      <div className="grid min-w-0 gap-5">
        {sceneKind && <BudgetScene360 kind={sceneKind} title={sceneKind === 'aire' ? 'Visor 360 del cuarto y condensador' : 'Visor 360 del radier'} subtitle="El cliente puede girar, acercar y revisar la propuesta desde distintos ángulos." data={sceneData} />}
        <Section title="Descripción del proyecto" eyebrow="01"><p className="text-base leading-8 text-zinc-100">{presupuesto.descripcion}</p></Section>
        <Section title="Alcance incluido" eyebrow="02"><List items={presupuesto.incluye} /></Section>
        <Section title="Materiales y productos relacionados" eyebrow="03"><List items={presupuesto.materiales} /></Section>
        <Section title="Visita técnica y garantía" eyebrow="04"><div className="grid gap-3 sm:grid-cols-2"><div className="tenant-border rounded-2xl border bg-white/[.045] p-4"><p className="tenant-text text-[10px] font-black uppercase tracking-widest">Visita técnica</p><p className="mt-2 text-sm leading-6 text-zinc-300">{visitaTecnica}</p></div><div className="tenant-border rounded-2xl border bg-white/[.045] p-4"><p className="tenant-text text-[10px] font-black uppercase tracking-widest">Garantía</p><p className="mt-2 text-sm leading-6 text-zinc-300">{garantia}</p></div></div></Section>
        {presupuesto.items.length > 0 && <Section title="Partidas / productos" eyebrow="05"><div className="grid gap-3">{presupuesto.items.map((item) => <div key={item.id} className="tenant-border rounded-2xl border bg-white/[0.04] p-4"><div className="flex items-start justify-between gap-3"><div><b>{item.nombre}</b>{item.descripcion && <p className="mt-1 text-xs leading-5 text-zinc-400">{item.descripcion}</p>}<p className="mt-2 text-xs text-zinc-500">{item.cantidad} {item.unidad} · {formatBudgetMoney(item.precio_unitario)} c/u</p></div><span className="tenant-text font-black">{formatBudgetMoney(item.total)}</span></div></div>)}</div></Section>}
      </div>

      <aside className="grid h-fit gap-4 lg:sticky lg:top-6">
        <Section title="Boleta resumen" eyebrow="Compra"><div className="grid place-items-center"><AnimatedBudgetTicket ticketId={presupuesto.id} amount={presupuesto.total_con_iva} date={presupuesto.created_at || presupuesto.fecha} clientName={clientName} companyName={companyName} serviceMode={saleMode} projectTitle={presupuesto.titulo} coverageM2={coverageM2} btu={btu} barcodeValue={presupuesto.slug} items={presupuesto.items} showConfetti={!adminPreview} /></div></Section>
        <Section title="Producto / tienda" eyebrow="BD"><div className="grid gap-2 text-sm text-zinc-300"><p><b className="tenant-text">ID BD:</b> {readString(producto, 'productoId', 'No definido')}</p><p><b className="tenant-text">SKU:</b> {readString(producto, 'sku', 'No definido')}</p><p><b className="tenant-text">Stock:</b> {readNumber(producto, 'stock', 0)} unidades</p>{readString(producto, 'linkProducto') && <a href={readString(producto, 'linkProducto')} className="break-all underline" target="_blank" rel="noreferrer">Ver producto</a>}</div></Section>
        <Section title="No incluye / límites" eyebrow="Límites"><List items={limites} /></Section>
        <Section title="Forma de pago" eyebrow="Pago">{presupuesto.forma_pago.map((fp, i) => <div key={`${fp.descripcion}-${i}`} className="tenant-border mb-2 rounded-2xl border bg-white/[0.04] p-3"><b className="tenant-text">{fp.porcentaje}%</b><p className="text-sm text-zinc-300">{fp.descripcion}</p></div>)}</Section>
      </aside>
    </div>
    <footer className="border-t border-white/10 bg-black p-6 text-center text-xs text-zinc-500">Documento comercial generado por {companyName} · Link privado con vencimiento</footer>
  </article>;
}
