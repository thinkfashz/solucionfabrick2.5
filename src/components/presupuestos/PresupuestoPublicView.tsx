'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type ReactNode } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Copy,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { formatBudgetMoney, sanitizeBudgetHtml, type PresupuestoImagen, type PresupuestoPro } from '@/lib/presupuestosBuilder';

const DEFAULT_WHATSAPP_PHONE = '56930121625';

function cleanUrl(url?: string) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return trimmed;
}

function isExternalUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

function imageProxyUrl(url?: string) {
  const cleaned = cleanUrl(url);
  if (!cleaned) return '';
  if (!isExternalUrl(cleaned)) return cleaned;
  return `/api/presupuestos/image-proxy?url=${encodeURIComponent(cleaned)}`;
}

function normalizeWhatsappPhone(phone?: string) {
  const digits = (phone || '').replace(/[^0-9]/g, '');
  if (!digits) return DEFAULT_WHATSAPP_PHONE;
  if (digits.startsWith('569') && digits.length === 11) return digits;
  if (digits.startsWith('56') && digits.length >= 11) return digits;
  if (digits.startsWith('9') && digits.length === 9) return `56${digits}`;
  if (digits.length === 8) return `569${digits}`;
  return digits;
}

function buildWhatsAppUrl(phone: string | undefined, text: string) {
  const cleanPhone = normalizeWhatsappPhone(phone);
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encoded}`;
}

function openCompatibleUrl(url: string) {
  if (typeof window === 'undefined') return;
  window.location.href = url;
}

function Section({ title, eyebrow, children, dark = false }: { title: string; eyebrow?: string; children: ReactNode; dark?: boolean }) {
  return (
    <section className={`${dark ? 'border-white/10 bg-[#111111] text-white' : 'border-black/5 bg-white text-[#111111]'} presupuesto-print-section overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_18px_70px_rgba(0,0,0,0.08)] sm:p-7`}>
      {eyebrow ? <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-600">{eyebrow}</p> : null}
      <h2 className="mb-5 flex items-center gap-2 text-xl font-black tracking-tight sm:text-2xl"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#f4c400]" />{title}</h2>
      {children}
    </section>
  );
}

function List({ items, dark = false }: { items: string[]; dark?: boolean }) {
  const cleanItems = items.filter(Boolean);
  if (!cleanItems.length) return <p className={`${dark ? 'text-zinc-400' : 'text-zinc-500'} rounded-2xl border border-dashed border-current/20 p-4 text-sm`}>Sin información cargada.</p>;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cleanItems.map((item, i) => (
        <li key={`${item}-${i}`} className={`${dark ? 'border-white/10 bg-white/[0.04] text-zinc-100' : 'border-black/5 bg-[#f5f5f5] text-zinc-800'} rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 transition hover:-translate-y-0.5 hover:border-yellow-400/60`}>
          <CheckCircle2 className="mr-2 inline h-4 w-4 text-yellow-500" />{item}
        </li>
      ))}
    </ul>
  );
}

function BudgetImage({ img, index, onClick }: { img: PresupuestoImagen; index: number; onClick: () => void }) {
  const originalSrc = cleanUrl(img.url);
  const [mode, setMode] = useState<'proxy' | 'original' | 'failed'>('proxy');
  const src = mode === 'proxy' ? imageProxyUrl(originalSrc) : originalSrc;

  if (!originalSrc || mode === 'failed') {
    return (
      <div className="presupuesto-print-image flex min-h-[240px] flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-black/10 bg-[#f5f5f5] p-5 text-center text-zinc-500">
        <ImageIcon className="mb-3 h-8 w-8 text-yellow-500" />
        <b className="text-sm text-zinc-700">Imagen no disponible en este dispositivo</b>
        {originalSrc && <a href={originalSrc} target="_blank" rel="noreferrer" className="mt-3 rounded-full bg-[#111111] px-4 py-2 text-xs font-black text-white print:hidden">Abrir imagen</a>}
      </div>
    );
  }

  return (
    <button type="button" onClick={onClick} className="presupuesto-print-image group overflow-hidden rounded-[1.5rem] border border-black/5 bg-white text-left shadow-xl shadow-black/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl print:block print:break-inside-avoid print:shadow-none">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 print:aspect-auto print:overflow-visible">
        <img
          src={src}
          alt={img.titulo || `Imagen ${index + 1}`}
          className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-105 print:h-auto print:max-h-none print:w-full print:object-contain"
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setMode((current) => (current === 'proxy' ? 'original' : 'failed'))}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent print:hidden" />
        <span className="absolute bottom-3 left-3 right-3 text-sm font-black text-white drop-shadow print:static print:block print:bg-white print:px-4 print:py-2 print:text-black print:drop-shadow-none">{img.titulo || `Imagen ${index + 1}`}</span>
      </div>
      {img.descripcion && <p className="line-clamp-2 px-4 py-3 text-xs leading-5 text-zinc-500 print:line-clamp-none">{img.descripcion}</p>}
    </button>
  );
}

function ConfirmButton({ onConfirm, accepting, accepted, compact = false }: { onConfirm: () => void; accepting: boolean; accepted: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={accepting || accepted}
      className={`${compact ? 'mt-4 w-full justify-center rounded-2xl px-4 py-3' : 'w-full justify-center rounded-full px-5 py-3 sm:w-auto'} inline-flex items-center gap-2 bg-emerald-400 text-sm font-black text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70 print:hidden`}
    >
      {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : accepted ? <CheckCircle2 className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
      {accepting ? 'Confirmando...' : accepted ? 'Presupuesto aceptado' : compact ? 'Confirmar presupuesto' : 'Confirmar por WhatsApp'}
    </button>
  );
}

export default function PresupuestoPublicView({ presupuesto, publicLink, adminPreview = false }: { presupuesto: PresupuestoPro; publicLink?: string; adminPreview?: boolean }) {
  const [activeImage, setActiveImage] = useState<PresupuestoImagen | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [heroMode, setHeroMode] = useState<'proxy' | 'original' | 'failed'>('proxy');

  const safeHtml = DOMPurify.sanitize(sanitizeBudgetHtml(presupuesto.html_personalizado), {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });

  const companyName = presupuesto.proveedor || 'Soluciones Fabris';
  const clientName = presupuesto.empresa_cliente || presupuesto.cliente || 'Cliente';
  const currentLink = publicLink || (typeof window !== 'undefined' ? window.location.href : '');
  const consultText = `Hola, revisé la propuesta comercial "${presupuesto.titulo}" para ${clientName}. Link: ${currentLink}`;
  const consultUrl = buildWhatsAppUrl(presupuesto.telefono_whatsapp, consultText);
  const sortedImages = useMemo(() => [...(presupuesto.imagenes || [])].filter((img) => cleanUrl(img.url)).sort((a, b) => a.orden - b.orden), [presupuesto.imagenes]);
  const heroImage = sortedImages[0];
  const heroOriginalSrc = cleanUrl(heroImage?.url);
  const heroSrc = heroMode === 'proxy' ? imageProxyUrl(heroOriginalSrc) : heroOriginalSrc;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(currentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  async function handleConfirmAcceptance() {
    if (accepted || accepting) return;
    setAccepting(true);
    setAcceptMessage('Registrando aceptación del presupuesto...');
    const fallbackText = `Hola, confirmo la aceptación del presupuesto "${presupuesto.titulo}" para ${clientName}. Total: ${formatBudgetMoney(presupuesto.total_con_iva)}. Link: ${currentLink}`;
    const fallbackUrl = buildWhatsAppUrl(presupuesto.telefono_whatsapp, fallbackText);
    try {
      const res = await fetch('/api/presupuestos/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto: { ...presupuesto, telefono_whatsapp: normalizeWhatsappPhone(presupuesto.telefono_whatsapp), public_link: currentLink, email_cliente: presupuesto.email_cliente || '' } }),
      });
      const json = (await res.json().catch(() => ({}))) as { whatsappUrl?: string; email?: { sent?: boolean }; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setAccepted(true);
      setAcceptMessage(json.email?.sent ? 'Confirmación registrada y correo de respaldo enviado.' : 'Confirmación registrada. Abriendo WhatsApp...');
      openCompatibleUrl(json.whatsappUrl || fallbackUrl);
    } catch (err) {
      setAcceptMessage(`No se pudo registrar automáticamente: ${(err as Error).message}. Abriré WhatsApp igualmente.`);
      openCompatibleUrl(fallbackUrl);
    } finally {
      setAccepting(false);
    }
  }

  if (presupuesto.usar_html_personalizado && safeHtml) {
    return <div className="w-full overflow-hidden rounded-3xl border border-yellow-400/20 bg-white p-4 text-black"><div dangerouslySetInnerHTML={{ __html: safeHtml }} /></div>;
  }

  return (
    <article className="presupuesto-public-page mx-auto w-full max-w-7xl overflow-hidden bg-[#f5f5f5] text-[#111111] shadow-[0_40px_120px_rgba(0,0,0,0.18)] sm:rounded-[2rem] print:overflow-visible print:bg-white print:shadow-none">
      <style jsx global>{`
        @media print {
          @page { size: letter; margin: 12mm; }
          .presupuesto-public-page,
          .presupuesto-public-page * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .presupuesto-public-page {
            color: #111111 !important;
          }
          .presupuesto-public-page section,
          .presupuesto-print-section,
          .presupuesto-print-image {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            overflow: visible !important;
          }
          .presupuesto-public-page img {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            max-width: 100% !important;
            height: auto !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .presupuesto-public-page button,
          .presupuesto-public-page .print\\:hidden,
          .presupuesto-public-page [role='dialog'] {
            display: none !important;
          }
        }
      `}</style>
      <header className="relative min-h-[78vh] overflow-hidden bg-[#111111] text-white print:min-h-0 print:overflow-visible print:bg-[#111111]">
        {heroSrc && heroMode !== 'failed' && (
          <img
            src={heroSrc}
            alt={heroImage?.titulo || presupuesto.titulo}
            className="absolute inset-0 h-full w-full object-cover opacity-45 print:static print:h-auto print:opacity-100"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={() => setHeroMode((current) => (current === 'proxy' ? 'original' : 'failed'))}
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(17,17,17,0.98)_0%,rgba(17,17,17,0.86)_45%,rgba(17,17,17,0.50)_100%)] print:hidden" />
        <div className="absolute left-0 top-0 h-1.5 w-full bg-[#f4c400]" />
        <div className="relative z-10 flex min-h-[78vh] flex-col justify-between p-5 sm:p-8 lg:p-12 print:min-h-0">
          <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="max-w-[240px]"><FabrickFullLogo theme="light" tagline="Propuesta comercial" /></div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-[#111111]"><Printer className="h-4 w-4" /> PDF</button>
              <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white"><Copy className="h-4 w-4" /> {copied ? 'Copiado' : 'Copiar link'}</button>
              <button type="button" onClick={() => openCompatibleUrl(consultUrl)} className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-100"><MessageCircle className="h-4 w-4" /> WhatsApp</button>
            </div>
          </nav>
          <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end print:py-5">
            <div className="max-w-5xl">
              <div className="mb-6 inline-flex rounded-full border border-[#f4c400]/40 bg-[#f4c400]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200">Cliente · {clientName}</div>
              <h1 className="text-[2.35rem] font-black uppercase leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl print:text-4xl">{presupuesto.titulo}</h1>
              <p className="mt-7 max-w-3xl text-lg leading-8 text-zinc-200 sm:text-xl print:text-base">{presupuesto.descripcion}</p>
              {!adminPreview && <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap print:hidden"><ConfirmButton onConfirm={handleConfirmAcceptance} accepting={accepting} accepted={accepted} /><button type="button" onClick={() => openCompatibleUrl(consultUrl)} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white sm:w-auto"><MessageCircle className="h-4 w-4" /> Consultar por WhatsApp</button></div>}
              {acceptMessage && <p className="mt-4 max-w-2xl rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100 print:hidden">{acceptMessage}</p>}
            </div>
            <aside className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-2xl sm:p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"><ShieldCheck className="mb-3 h-5 w-5 text-yellow-300" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Proveedor</p><b>{companyName}</b></div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"><BadgeCheck className="mb-3 h-5 w-5 text-yellow-300" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Estado</p><b>{accepted ? 'Aprobado' : presupuesto.estado}</b></div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"><CalendarDays className="mb-3 h-5 w-5 text-yellow-300" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Fecha</p><b>{presupuesto.fecha}</b></div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4"><AlertTriangle className="mb-3 h-5 w-5 text-yellow-300" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Validez</p><b>{presupuesto.validez}</b></div>
              </div>
              <div className="mt-3 rounded-3xl bg-[#f4c400] p-5 text-black"><p className="text-[10px] font-black uppercase tracking-[0.26em]">Total proyecto</p><b className="mt-2 block text-3xl font-black tracking-tight">{formatBudgetMoney(presupuesto.total_con_iva)}</b><span className="mt-1 block text-sm font-black">IVA incluido · Neto {formatBudgetMoney(presupuesto.valor_neto)}</span></div>
            </aside>
          </div>
        </div>
      </header>

      <main className="grid gap-6 p-4 sm:p-6 lg:p-8 print:p-0 print:pt-5">
        <Section title="Descripción del proyecto" eyebrow="01"><p className="max-w-4xl text-lg leading-9 text-zinc-700">{presupuesto.descripcion}</p></Section>
        <Section title="Alcance incluido" eyebrow="02"><List items={presupuesto.incluye} /></Section>
        <Section title="Materiales y terminaciones" eyebrow="03"><List items={presupuesto.materiales} /></Section>
        <Section title="Galería de imágenes" eyebrow="04">
          {sortedImages.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-2">{sortedImages.map((img, index) => <BudgetImage key={img.id || img.url || index} img={img} index={index} onClick={() => setActiveImage(img)} />)}</div> : <p className="rounded-2xl border border-dashed border-black/10 bg-[#f5f5f5] p-5 text-sm font-semibold text-zinc-500">Este presupuesto aún no tiene imágenes cargadas.</p>}
        </Section>
        {presupuesto.items.length > 0 && <Section title="Partidas / productos" eyebrow="05"><div className="grid gap-3 md:hidden print:hidden">{presupuesto.items.map((item) => <div key={item.id} className="rounded-2xl border border-black/5 bg-[#f5f5f5] p-4"><b>{item.nombre}</b><p className="mt-1 text-xs leading-6 text-zinc-500">{item.descripcion}</p><div className="mt-3 flex items-center justify-between text-sm"><span className="text-zinc-500">{item.cantidad} {item.unidad}</span><span className="font-black text-yellow-600">{formatBudgetMoney(item.total)}</span></div></div>)}</div><div className="hidden overflow-x-auto md:block print:block"><table className="w-full min-w-[640px] text-left text-sm print:min-w-0"><thead className="text-xs uppercase tracking-widest text-zinc-500"><tr><th className="py-2">Item</th><th>Cant.</th><th>Unidad</th><th>Unitario</th><th>Total</th></tr></thead><tbody>{presupuesto.items.map((item) => <tr key={item.id} className="border-t border-black/10"><td className="py-3 pr-3"><b>{item.nombre}</b><p className="text-xs text-zinc-500">{item.descripcion}</p></td><td>{item.cantidad}</td><td>{item.unidad}</td><td>{formatBudgetMoney(item.precio_unitario)}</td><td className="font-bold text-yellow-600">{formatBudgetMoney(item.total)}</td></tr>)}</tbody></table></div></Section>}
        <Section title="Forma de pago" eyebrow="06"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-2">{presupuesto.forma_pago.map((pago, i) => <div key={i} className="rounded-2xl bg-[#111111] p-5 text-white"><b className="text-3xl text-[#f4c400]">{pago.porcentaje}%</b><p className="mt-3 text-sm leading-6 text-zinc-300">{pago.descripcion}</p></div>)}</div></Section>
        <Section title="No incluye" eyebrow="07" dark><List items={presupuesto.no_incluye} dark /></Section>
        <Section title="Observación técnica" eyebrow="08"><div className="rounded-2xl border-l-4 border-[#f4c400] bg-[#111111] p-5 text-white"><p className="text-sm leading-7 text-zinc-200">{presupuesto.observacion_tecnica || 'Sin observación técnica registrada.'}</p></div></Section>
        <section className="presupuesto-print-section rounded-[2rem] bg-[#111111] p-6 text-white sm:p-8 lg:p-10"><p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">Total del proyecto</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{formatBudgetMoney(presupuesto.total_con_iva)}</h2><p className="mt-2 text-xl font-black text-[#f4c400]">IVA incluido</p><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-zinc-400">IVA {presupuesto.iva_porcentaje}%</p><b className="mt-1 block text-2xl">{formatBudgetMoney(presupuesto.total_iva)}</b></div><div className="rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-4"><p className="text-xs text-yellow-200">Total con IVA</p><b className="mt-1 block text-2xl text-yellow-300">{formatBudgetMoney(presupuesto.total_con_iva)}</b></div><div className="rounded-3xl bg-[#f4c400] p-4 text-black"><p className="text-xs font-black uppercase">Plazo</p><b className="mt-1 block text-2xl">{presupuesto.plazo_entrega}</b></div></div></section>
      </main>

      <footer className="bg-[#111111] p-6 text-white sm:p-8 lg:p-10"><div className="border-t border-white/10 pt-8"><div className="max-w-[260px]"><FabrickFullLogo theme="light" tagline="Diseño • Fabricación • Instalación" /></div><p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">Mobiliario técnico y soluciones modulares para espacios industriales, comerciales y operativos.</p><button type="button" onClick={() => openCompatibleUrl(consultUrl)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#f4c400] px-5 py-3 text-sm font-black text-black print:hidden"><MessageCircle className="h-4 w-4" /> Contactar por WhatsApp</button></div></footer>

      {activeImage && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur print:hidden" role="dialog" aria-modal="true"><button type="button" onClick={() => setActiveImage(null)} className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:border-yellow-400"><X className="h-5 w-5" /></button><figure className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111] text-white"><div className="flex h-[72vh] w-full items-center justify-center bg-black"><img src={imageProxyUrl(activeImage.url)} alt={activeImage.titulo || 'Imagen del presupuesto'} className="max-h-full max-w-full object-contain" referrerPolicy="no-referrer" /></div><figcaption className="p-5"><b>{activeImage.titulo}</b>{activeImage.descripcion && <p className="mt-1 text-sm text-zinc-400">{activeImage.descripcion}</p>}</figcaption></figure></div>}

      <div className="fixed bottom-3 left-3 right-3 z-50 rounded-2xl border border-yellow-300/40 bg-[#111111] p-3 text-white shadow-2xl shadow-black/30 sm:hidden print:hidden">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-yellow-300">Total proyecto</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <b className="text-xl font-black text-yellow-300">{formatBudgetMoney(presupuesto.total_con_iva)}</b>
          {!adminPreview && (
            <button
              type="button"
              onClick={handleConfirmAcceptance}
              disabled={accepting || accepted}
              className="rounded-full bg-emerald-400 px-3 py-2 text-[11px] font-black text-black disabled:opacity-70"
            >
              {accepted ? 'Aceptado' : 'Confirmar'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
