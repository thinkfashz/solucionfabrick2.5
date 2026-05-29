'use client';

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Printer,
  Search,
  ShieldCheck,
  Timer,
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

function Section({ title, eyebrow, children, dark = true }: { title: string; eyebrow?: string; children: ReactNode; dark?: boolean }) {
  return (
    <section className={`${dark ? 'border-white/[0.07] bg-[#181818] text-white' : 'border-black/8 bg-white text-[#111111]'} presupuesto-print-section overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_4px_32px_rgba(0,0,0,0.4)] sm:p-7`}>
      {eyebrow ? <p className="mb-2 text-[10px] font-black uppercase tracking-[0.32em] text-yellow-500">{eyebrow}</p> : null}
      <h2 className="mb-5 flex items-center gap-2.5 text-xl font-black tracking-tight sm:text-2xl">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#f4c400] shadow-[0_0_8px_rgba(244,196,0,0.5)]" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function List({ items, dark = true }: { items: string[]; dark?: boolean }) {
  const cleanItems = items.filter(Boolean);
  if (!cleanItems.length) return <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-zinc-500">Sin información cargada.</p>;
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {cleanItems.map((item, i) => (
        <li key={`${item}-${i}`} className={`${dark ? 'border-white/[0.08] bg-white/[0.05] text-zinc-100 hover:border-yellow-400/50 hover:bg-yellow-400/[0.06]' : 'border-black/6 bg-zinc-50 text-zinc-800 hover:border-yellow-400/50'} rounded-2xl border px-4 py-3 text-sm font-semibold leading-6 transition hover:-translate-y-0.5`}>
          <CheckCircle2 className="mr-2 inline h-4 w-4 shrink-0 text-yellow-400" />{item}
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
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [galleryVisible, setGalleryVisible] = useState(true);
  const [useReferences, setUseReferences] = useState(false);

  // Auto-print when ?print=1 is in the URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('print') === '1') {
        const t = setTimeout(() => window.print(), 800);
        return () => clearTimeout(t);
      }
    }
  }, []);

  useEffect(() => {
    const vence = presupuesto.fecha_vencimiento;
    if (!vence) return;
    const target = new Date(vence + 'T23:59:59').getTime();
    function tick() {
      const diff = target - Date.now();
      if (diff <= 0) { setIsExpired(true); setTimeLeft(null); return; }
      setTimeLeft({ days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [presupuesto.fecha_vencimiento]);

  const safeHtml = DOMPurify.sanitize(sanitizeBudgetHtml(presupuesto.html_personalizado), {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });

  const companyName = presupuesto.proveedor || 'Soluciones Fabrick';
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
    <article className="presupuesto-public-page mx-auto w-full max-w-7xl overflow-hidden bg-[#0d0d0d] text-white shadow-[0_40px_120px_rgba(0,0,0,0.55)] sm:rounded-[2rem] print:overflow-visible print:bg-white print:text-black print:shadow-none">
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
          .presupuesto-public-page [role='dialog'],
          .presupuesto-public-page [data-fixed] {
            display: none !important;
          }
          .presupuesto-public-page header,
          .presupuesto-public-page footer,
          .presupuesto-public-page section {
            background: #fff !important;
            color: #111 !important;
            border-color: #ddd !important;
            box-shadow: none !important;
          }
          .presupuesto-public-page * {
            background-color: transparent !important;
            color: inherit !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .presupuesto-public-page b,
          .presupuesto-public-page strong { color: #111 !important; }
          .presupuesto-public-page [class*="text-yellow"],
          .presupuesto-public-page [class*="text-zinc"],
          .presupuesto-public-page [class*="text-emerald"] { color: #333 !important; }
          .presupuesto-public-page thead th { background: #111 !important; color: #fff !important; }
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
            crossOrigin={heroMode === 'proxy' ? 'anonymous' : undefined}
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
                <div className={`rounded-3xl border p-4 ${isExpired ? 'border-red-500/40 bg-red-500/10' : timeLeft ? 'border-orange-400/30 bg-orange-400/[0.06]' : 'border-white/10 bg-white/[0.06]'}`}>
                  {isExpired ? <AlertTriangle className="mb-3 h-5 w-5 text-red-400" /> : timeLeft ? <Timer className="mb-3 h-5 w-5 text-orange-400" /> : <AlertTriangle className="mb-3 h-5 w-5 text-yellow-300" />}
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{isExpired ? 'Vencida' : timeLeft ? 'Vence en' : 'Validez'}</p>
                  {isExpired ? <b className="text-red-400">Propuesta vencida</b> : timeLeft ? <b className="text-orange-300">{timeLeft.days}d {String(timeLeft.hours).padStart(2,'0')}h {String(timeLeft.minutes).padStart(2,'0')}m</b> : <b>{presupuesto.validez}</b>}
                </div>
              </div>
              <div className="mt-3 rounded-3xl bg-[#f4c400] p-5 text-black"><p className="text-[10px] font-black uppercase tracking-[0.26em]">Total proyecto</p><b className="mt-2 block text-3xl font-black tracking-tight">{formatBudgetMoney(presupuesto.total_con_iva)}</b><span className="mt-1 block text-sm font-black">IVA incluido · Neto {formatBudgetMoney(presupuesto.valor_neto)}</span></div>
            </aside>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 p-3 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
        <div className="grid min-w-0 gap-5">
          <Section title="Descripción del proyecto" eyebrow="01"><p className="text-base leading-8 text-zinc-100">{presupuesto.descripcion}</p></Section>
          <Section title="Alcance incluido" eyebrow="02"><List items={presupuesto.incluye} /></Section>
          <Section title="Materiales y terminaciones" eyebrow="03"><List items={presupuesto.materiales} /></Section>
          <Section title="Galería visual del proyecto" eyebrow="04">
            <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2 print:hidden">
              <button onClick={() => setGalleryVisible((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-yellow-400/50">{galleryVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{galleryVisible ? 'Ocultar imágenes' : 'Mostrar imágenes'}</button>
              <button onClick={() => setUseReferences((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-200 hover:bg-yellow-400/20"><Search className="h-4 w-4" />{useReferences ? 'Ocultar referencias' : 'Buscar referencias'}</button>
              <span className="text-xs text-zinc-500">Toca cualquier imagen para verla completa.</span>
            </div>
            {galleryVisible ? <div className="mx-auto grid w-full max-w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{sortedImages.map((img, index) => <button key={img.id} onClick={() => setActiveImage(img)} className="group mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-black text-left transition hover:-translate-y-1 hover:border-yellow-400/50 sm:max-w-none"><div className="relative aspect-square w-full overflow-hidden bg-zinc-900"><img src={img.url} alt={img.titulo || 'Imagen presupuesto'} className="h-full w-full object-contain object-center p-0 transition duration-500 group-hover:scale-[1.02]" loading="lazy" /><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" /><ImageIcon className="absolute right-3 top-3 h-5 w-5 text-white/70" /></div><div className="p-4"><b className="line-clamp-2 text-sm text-white">{img.titulo || `Imagen ${index + 1}`}</b><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{img.descripcion}</p></div></button>)}</div> : <div className="rounded-3xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm text-zinc-400">La galería está oculta para una lectura más limpia del presupuesto.</div>}
          </Section>
          {presupuesto.video_url && (
            <Section title={presupuesto.video_titulo || 'Video del proyecto'} eyebrow="Video">
              <video
                src={presupuesto.video_url}
                controls
                preload="metadata"
                className="w-full rounded-2xl border border-white/10"
                style={{ maxHeight: '520px' }}
              />
              {presupuesto.video_descripcion && (
                <p className="mt-3 text-sm leading-7 text-zinc-200">{presupuesto.video_descripcion}</p>
              )}
            </Section>
          )}
          {presupuesto.items.length > 0 && (
            <Section title="Partidas / productos" eyebrow="05">
              {/* Mobile cards */}
              <div className="grid gap-3 md:hidden">
                {presupuesto.items.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
                    <div className="flex items-start justify-between gap-2">
                      <b className="text-sm text-white">{item.nombre}</b>
                      <span className="shrink-0 font-black text-yellow-300">{formatBudgetMoney(item.total)}</span>
                    </div>
                    {item.descripcion && <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">{item.descripcion}</p>}
                    <div className="mt-2 text-xs text-zinc-500">{item.cantidad} {item.unidad} · {formatBudgetMoney(item.precio_unitario)} c/u</div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-white/10 text-[10px] uppercase tracking-widest text-yellow-400">
                    <tr><th className="pb-3">Item</th><th>Cant.</th><th>Unidad</th><th>Unitario</th><th className="text-right">Total</th></tr>
                  </thead>
                  <tbody>
                    {presupuesto.items.map((item, idx) => (
                      <tr key={item.id} className={`border-b border-white/[0.06] last:border-0 ${idx % 2 === 1 ? 'bg-white/[0.025]' : ''}`}>
                        <td className="py-3.5 pr-4">
                          <b className="text-white">{item.nombre}</b>
                          {item.descripcion && <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">{item.descripcion}</p>}
                        </td>
                        <td className="text-zinc-300">{item.cantidad}</td>
                        <td className="text-zinc-300">{item.unidad}</td>
                        <td className="text-zinc-300">{formatBudgetMoney(item.precio_unitario)}</td>
                        <td className="text-right font-black text-yellow-300">{formatBudgetMoney(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-yellow-400/30">
                      <td colSpan={4} className="pt-3 text-sm font-black text-zinc-400 uppercase tracking-wider">Total</td>
                      <td className="pt-3 text-right text-lg font-black text-yellow-300">{formatBudgetMoney(presupuesto.total_con_iva)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>
          )}
          <Section title="Forma de pago" eyebrow="06">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {presupuesto.forma_pago.map((pago, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-2xl border border-yellow-400/25 bg-gradient-to-b from-yellow-400/[0.12] to-yellow-400/[0.04] p-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-500">Hito {i + 1}</span>
                  <b className="text-3xl font-black leading-none text-yellow-300">{pago.porcentaje}%</b>
                  {presupuesto.total_con_iva > 0 && (
                    <span className="text-sm font-black text-white">{formatBudgetMoney(Math.round(presupuesto.total_con_iva * pago.porcentaje / 100))}</span>
                  )}
                  <p className="text-xs leading-5 text-zinc-200">{pago.descripcion}</p>
                </div>
              ))}
            </div>
          </Section>
          <Section title="No incluye" eyebrow="07"><List items={presupuesto.no_incluye} /></Section>
          <Section title="Observación técnica" eyebrow="08"><p className="text-sm leading-8 text-zinc-100">{presupuesto.observacion_tecnica}</p></Section>
        </div>
        <aside className="grid h-max min-w-0 gap-5 lg:sticky lg:top-6">
          <Section title="Valor del proyecto" eyebrow="Resumen">
            <div className="rounded-3xl border border-yellow-400/30 bg-gradient-to-b from-yellow-400/[0.12] to-yellow-400/[0.05] p-5">
              <div className="flex justify-between gap-3 py-2.5 text-sm text-zinc-300"><span>Valor neto</span><b className="text-white">{formatBudgetMoney(presupuesto.valor_neto)}</b></div>
              <div className="flex justify-between gap-3 border-y border-yellow-400/15 py-2.5 text-sm text-zinc-300"><span>IVA {presupuesto.iva_porcentaje}%</span><b className="text-white">{formatBudgetMoney(presupuesto.total_iva)}</b></div>
              <div className="flex justify-between gap-3 pt-4 text-2xl font-black text-yellow-300"><span>Total</span><span>{formatBudgetMoney(presupuesto.total_con_iva)}</span></div>
            </div>
            {!adminPreview && (
              <>
                <ConfirmButton onConfirm={handleConfirmAcceptance} accepting={accepting} accepted={accepted} compact />
                {acceptMessage && <p className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-xs font-bold text-emerald-100">{acceptMessage}</p>}
              </>
            )}
          </Section>
          <Section title="Plazo de entrega" eyebrow="Compromiso"><p className="text-sm font-semibold leading-7 text-zinc-100">{presupuesto.plazo_entrega}</p></Section>
          <Section title="Empresa" eyebrow="Proveedor">
            <p className="text-sm font-bold text-white">{companyName}</p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">Propuesta preparada para <b className="text-white">{presupuesto.empresa_cliente || presupuesto.cliente}</b>. Los valores y condiciones se mantienen según la validez indicada.</p>
          </Section>
        </aside>
      </div>

      {presupuesto.fecha_vencimiento && (
        <section className="presupuesto-print-section mx-4 mb-6 overflow-hidden rounded-[2rem] sm:mx-6 lg:mx-8 print:hidden">
          {isExpired ? (
            <div className="relative bg-[#130000] p-6 text-center sm:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(239,68,68,0.08)_0%,transparent_70%)]" />
              <div className="relative">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.2)]"><Clock className="h-10 w-10 text-red-400" /></div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500">⚠ Propuesta vencida</p>
                <h2 className="mt-3 text-3xl font-black text-white sm:text-5xl">Esta propuesta ha expirado</h2>
                <p className="mt-4 max-w-md mx-auto text-zinc-400">Venció el <b className="text-zinc-200">{new Date(presupuesto.fecha_vencimiento + 'T23:59:59').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</b>. El precio y las condiciones pueden haber cambiado.</p>
                {!adminPreview && <button type="button" onClick={() => openCompatibleUrl(consultUrl)} className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black hover:bg-zinc-100"><MessageCircle className="h-4 w-4" /> Solicitar nueva propuesta</button>}
              </div>
            </div>
          ) : timeLeft ? (() => {
            const isUrgent = timeLeft.days === 0;
            const isCritical = timeLeft.days === 0 && timeLeft.hours < 6;
            const accentColor = isCritical ? '#ef4444' : isUrgent ? '#f97316' : '#f4c400';
            const bgGlow = isCritical ? 'rgba(239,68,68,0.12)' : isUrgent ? 'rgba(249,115,22,0.10)' : 'rgba(244,196,0,0.07)';
            const chipColor = isCritical ? 'border-red-500/40 bg-red-500/10 text-red-400' : isUrgent ? 'border-orange-500/40 bg-orange-500/10 text-orange-400' : 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400';
            const urgencyText = isCritical ? '¡Últimas horas! Confirma ahora antes que venza.' : isUrgent ? '¡Menos de 24 horas! No pierdas esta propuesta.' : 'Esta propuesta vence pronto. Confirma para asegurar el precio.';
            return (
              <div className="relative overflow-hidden bg-[#0a0a0a] p-6 sm:p-12" style={{ boxShadow: `inset 0 0 80px ${bgGlow}` }}>
                <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 100%, ${bgGlow.replace('0.12','0.18').replace('0.10','0.15').replace('0.07','0.10')} 0%, transparent 65%)` }} />
                {isCritical && <div className="absolute inset-x-0 top-0 h-1 animate-pulse" style={{ background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />}
                <div className="relative flex flex-col items-center text-center">
                  <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 ${chipColor} ${isCritical ? 'animate-pulse' : ''}`}>
                    <Timer className="h-3.5 w-3.5" />
                    <p className="text-[10px] font-black uppercase tracking-[0.28em]">{isCritical ? '¡Crítico! · Auto-destrucción' : isUrgent ? 'Urgente · Auto-destrucción' : 'Auto-destrucción activa'}</p>
                  </div>
                  <p className="mt-4 max-w-sm text-sm font-bold text-zinc-400">{urgencyText}</p>
                  <div className="mt-8 flex items-end gap-2 sm:gap-5">
                    {[{ v: timeLeft.days, u: 'días' }, { v: timeLeft.hours, u: 'horas' }, { v: timeLeft.minutes, u: 'min' }, { v: timeLeft.seconds, u: 'seg' }].map(({ v, u }, i) => (
                      <div key={u} className="flex flex-col items-center">
                        <span
                          className="min-w-[58px] rounded-2xl border px-2 py-2 text-center text-3xl font-black tabular-nums sm:min-w-[80px] sm:text-5xl"
                          style={{ color: accentColor, borderColor: `${accentColor}30`, background: `${accentColor}10`, boxShadow: i === 3 && isCritical ? `0 0 24px ${accentColor}40` : undefined }}
                        >
                          {String(v).padStart(2, '0')}
                        </span>
                        <span className="mt-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{u}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-xs text-zinc-600">Vence el {new Date(presupuesto.fecha_vencimiento + 'T23:59:59').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  {!adminPreview && (
                    <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
                      <ConfirmButton onConfirm={handleConfirmAcceptance} accepting={accepting} accepted={accepted} />
                      <button type="button" onClick={() => openCompatibleUrl(consultUrl)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-black text-white"><MessageCircle className="h-4 w-4" /> Consultar por WhatsApp</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : null}
        </section>
      )}

      <footer className="bg-[#111111] p-6 text-white sm:p-8 lg:p-10"><div className="border-t border-white/10 pt-8"><div className="max-w-[260px]"><FabrickFullLogo theme="light" tagline="Diseño • Fabricación • Instalación" /></div><p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">Mobiliario técnico y soluciones modulares para espacios industriales, comerciales y operativos.</p><button type="button" onClick={() => openCompatibleUrl(consultUrl)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-[#f4c400] px-5 py-3 text-sm font-black text-black print:hidden"><MessageCircle className="h-4 w-4" /> Contactar por WhatsApp</button><p className="mt-8 text-[10px] uppercase tracking-widest text-zinc-700">Generado con Soluciones Fabrick</p></div></footer>

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
