'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type ReactNode } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  MessageCircle,
  Printer,
  X,
} from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { formatBudgetMoney, sanitizeBudgetHtml, type PresupuestoImagen, type PresupuestoPro } from '@/lib/presupuestosBuilder';

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20 backdrop-blur sm:rounded-[1.75rem] sm:p-6">
      {eyebrow ? <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300/80">{eyebrow}</p> : null}
      <h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white sm:text-xl"><span className="h-2 w-2 shrink-0 rounded-full bg-yellow-400" />{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  const cleanItems = items.filter(Boolean);
  if (!cleanItems.length) return <p className="rounded-2xl border border-dashed border-white/15 bg-black/30 p-4 text-sm text-zinc-400">Sin información cargada.</p>;
  return <ul className="grid min-w-0 gap-2 text-sm text-zinc-200 sm:grid-cols-2 xl:grid-cols-3">{cleanItems.map((item, i) => <li key={`${item}-${i}`} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 leading-relaxed">{item}</li>)}</ul>;
}

function normalizeImageUrl(url?: string) {
  const clean = (url || '').trim();
  if (!clean) return '';
  if (clean.startsWith('//')) return `https:${clean}`;
  return clean;
}

function isExternalUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

function proxiedImageUrl(url: string) {
  if (!url) return '';
  if (!isExternalUrl(url)) return url;
  return `/api/presupuestos/image-proxy?url=${encodeURIComponent(url)}`;
}

function BudgetImageCard({ img, index, onOpen }: { img: PresupuestoImagen; index: number; onOpen: () => void }) {
  const originalUrl = normalizeImageUrl(img.url);
  const [mode, setMode] = useState<'proxy' | 'original' | 'failed'>('proxy');
  const src = mode === 'proxy' ? proxiedImageUrl(originalUrl) : originalUrl;

  if (!originalUrl || mode === 'failed') {
    return (
      <div className="flex min-h-[250px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-black/35 p-5 text-center">
        <ImageIcon className="mb-3 h-9 w-9 text-yellow-300" />
        <b className="text-sm text-white">Imagen no disponible en este iPhone</b>
        <p className="mt-2 text-xs leading-5 text-zinc-400">El archivo puede estar bloqueado por el origen, formato o permisos del servidor.</p>
        {originalUrl && <a href={originalUrl} target="_blank" rel="noreferrer" className="mt-4 rounded-full bg-yellow-400 px-4 py-2 text-xs font-black text-black">Abrir imagen original</a>}
      </div>
    );
  }

  return (
    <button type="button" onClick={onOpen} className="group mx-auto w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-black text-left transition hover:-translate-y-1 hover:border-yellow-400/50 sm:max-w-none">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-900">
        <img
          src={src}
          alt={img.titulo || `Imagen ${index + 1}`}
          className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.02]"
          loading={index < 2 ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setMode((current) => (current === 'proxy' ? 'original' : 'failed'))}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
        <ImageIcon className="absolute right-3 top-3 h-5 w-5 text-white/70" />
      </div>
      <div className="p-4">
        <b className="line-clamp-2 text-sm text-white">{img.titulo || `Imagen ${index + 1}`}</b>
        {img.descripcion && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{img.descripcion}</p>}
      </div>
    </button>
  );
}

function ConfirmButton({ onConfirm, accepting, accepted, compact = false }: { onConfirm: () => void; accepting: boolean; accepted: boolean; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={accepting || accepted}
      className={`${compact ? 'mt-4 w-full justify-center rounded-2xl px-4 py-3' : 'w-full justify-center rounded-full px-4 py-2.5 sm:w-auto sm:px-5'} inline-flex min-w-0 items-center gap-2 bg-emerald-400 text-center text-sm font-black text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70`}
    >
      {accepting ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : accepted ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <MessageCircle className="h-4 w-4 shrink-0" />}
      <span className="truncate">{accepting ? 'Confirmando...' : accepted ? 'Presupuesto aceptado' : compact ? 'Confirmar presupuesto' : 'Confirmar por WhatsApp'}</span>
    </button>
  );
}

export default function PresupuestoPublicView({ presupuesto, publicLink, adminPreview = false }: { presupuesto: PresupuestoPro; publicLink?: string; adminPreview?: boolean }) {
  const [galleryVisible, setGalleryVisible] = useState(true);
  const [activeImage, setActiveImage] = useState<number | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState('');

  const safeHtml = DOMPurify.sanitize(sanitizeBudgetHtml(presupuesto.html_personalizado), { FORBID_TAGS: ['script', 'iframe', 'object', 'embed'], FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'] });
  const waPhone = presupuesto.telefono_whatsapp?.replace(/[^0-9]/g, '');
  const waText = encodeURIComponent(`Hola, revisé el presupuesto ${presupuesto.titulo}. Link: ${publicLink || ''}`);
  const whatsappUrl = waPhone ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${waText}` : `https://api.whatsapp.com/send?text=${waText}`;
  const companyName = presupuesto.proveedor || 'Soluciones Fabrick';

  const images = useMemo(() => [...(presupuesto.imagenes || [])].filter((img) => normalizeImageUrl(img.url)).sort((a, b) => a.orden - b.orden), [presupuesto.imagenes]);
  const active = activeImage !== null ? images[activeImage] : null;
  const nextImage = () => setActiveImage((current) => (current === null ? 0 : (current + 1) % images.length));
  const prevImage = () => setActiveImage((current) => (current === null ? 0 : (current - 1 + images.length) % images.length));

  async function handleConfirmAcceptance() {
    if (accepted || accepting) return;
    setAccepting(true);
    setAcceptMessage('Registrando aceptación del presupuesto...');
    const fallbackText = encodeURIComponent(`Hola, confirmo la aceptación del presupuesto "${presupuesto.titulo}" para ${presupuesto.empresa_cliente || presupuesto.cliente}. Total: ${formatBudgetMoney(presupuesto.total_con_iva)}. Link: ${publicLink || ''}`);
    const fallbackUrl = waPhone ? `https://api.whatsapp.com/send?phone=${waPhone}&text=${fallbackText}` : `https://api.whatsapp.com/send?text=${fallbackText}`;
    try {
      const res = await fetch('/api/presupuestos/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto: { ...presupuesto, public_link: publicLink || (typeof window !== 'undefined' ? window.location.href : ''), email_cliente: presupuesto.email_cliente || '' } }),
      });
      const json = (await res.json().catch(() => ({}))) as { whatsappUrl?: string; email?: { sent?: boolean }; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setAccepted(true);
      setAcceptMessage(json.email?.sent ? 'Presupuesto aceptado. Se registró la confirmación y se envió correo de respaldo.' : 'Presupuesto aceptado. Se registró la confirmación y se abrirá WhatsApp.');
      window.location.href = json.whatsappUrl || fallbackUrl;
    } catch (err) {
      setAcceptMessage(`No se pudo registrar automáticamente: ${(err as Error).message}. Abriré WhatsApp igualmente para dejar constancia.`);
      window.location.href = fallbackUrl;
    } finally {
      setAccepting(false);
    }
  }

  if (presupuesto.usar_html_personalizado && safeHtml) return <div className="w-full overflow-hidden rounded-3xl border border-yellow-400/20 bg-white p-4 text-black"><div dangerouslySetInnerHTML={{ __html: safeHtml }} /></div>;

  return (
    <article className="mx-auto w-full max-w-7xl overflow-x-hidden rounded-[1.5rem] border border-yellow-400/20 bg-black text-white shadow-2xl shadow-yellow-950/20 print:border-0 print:shadow-none sm:rounded-[2rem]">
      <header className="relative overflow-hidden border-b border-yellow-400/20 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.22),transparent_34%),linear-gradient(135deg,#050505,#18181b)] p-4 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
        <div className="relative grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div className="min-w-0">
            <div className="mb-6 flex min-w-0 flex-wrap items-center gap-3">
              <div className="min-w-0 max-w-[220px] sm:max-w-none"><FabrickFullLogo theme="light" tagline="Propuesta comercial" /></div>
              <span className="ml-auto rounded-full border border-yellow-400/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{accepted ? 'aprobado' : presupuesto.estado}</span>
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500 sm:text-xs sm:tracking-[0.32em]">Presupuesto para {presupuesto.empresa_cliente || presupuesto.cliente}</p>
            <h1 className="mt-3 max-w-4xl text-[2.45rem] font-black leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">{presupuesto.titulo}</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-300 sm:text-lg">{presupuesto.descripcion}</p>
            {!adminPreview && <div className="mt-7 grid w-full min-w-0 gap-3 print:hidden sm:flex sm:flex-wrap">
              <ConfirmButton onConfirm={handleConfirmAcceptance} accepting={accepting} accepted={accepted} />
              <button type="button" onClick={() => window.print()} className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-full bg-yellow-400 px-4 py-2.5 text-sm font-black text-black hover:bg-yellow-300 sm:w-auto"><Printer className="h-4 w-4 shrink-0" /> Imprimir / PDF</button>
              <button type="button" onClick={() => publicLink && navigator.clipboard.writeText(publicLink)} className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold text-white hover:border-yellow-400/60 sm:w-auto"><Copy className="h-4 w-4 shrink-0" /> Copiar link</button>
              <a href={whatsappUrl} className="inline-flex w-full min-w-0 items-center justify-center gap-2 rounded-full border border-emerald-400/40 px-4 py-2.5 text-sm font-bold text-emerald-200 hover:bg-emerald-400/10 sm:w-auto"><MessageCircle className="h-4 w-4 shrink-0" /> Consultar por WhatsApp</a>
              {acceptMessage && <p className="min-w-0 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100 sm:basis-full">{acceptMessage}</p>}
            </div>}
          </div>
          <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-3 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-black/40 p-4"><span className="block text-xs text-zinc-400">Cliente</span><b>{presupuesto.cliente}</b></div>
              <div className="rounded-2xl bg-black/40 p-4"><span className="block text-xs text-zinc-400">Empresa</span><b>{presupuesto.empresa_cliente || '—'}</b></div>
              <div className="rounded-2xl bg-black/40 p-4"><span className="block text-xs text-zinc-400">Fecha</span><b>{presupuesto.fecha}</b></div>
              <div className="rounded-2xl bg-black/40 p-4"><span className="block text-xs text-zinc-400">Validez</span><b>{presupuesto.validez}</b></div>
            </div>
            <div className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4"><span className="block text-xs text-yellow-200/80">Valor total con IVA</span><b className="mt-1 block text-2xl font-black text-yellow-300">{formatBudgetMoney(presupuesto.total_con_iva)}</b></div>
          </div>
        </div>
      </header>

      <div className="grid min-w-0 gap-5 p-3 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
        <div className="grid min-w-0 gap-5">
          <Section title="Descripción del proyecto" eyebrow="01"><p className="text-sm leading-7 text-zinc-300">{presupuesto.descripcion}</p></Section>
          <Section title="Alcance incluido" eyebrow="02"><List items={presupuesto.incluye} /></Section>
          <Section title="Materiales y terminaciones" eyebrow="03"><List items={presupuesto.materiales} /></Section>
          <Section title="Galería visual del proyecto" eyebrow="04">
            <div className="mb-4 flex min-w-0 flex-wrap items-center gap-2 print:hidden">
              <button type="button" onClick={() => setGalleryVisible((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-yellow-400/50">{galleryVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{galleryVisible ? 'Ocultar imágenes' : 'Mostrar imágenes'}</button>
              <span className="text-xs text-zinc-500">Las imágenes se sirven por proxy para mejorar compatibilidad con iPhone/Safari.</span>
            </div>
            {galleryVisible ? (images.length ? <div className="mx-auto grid w-full max-w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{images.map((img, index) => <BudgetImageCard key={img.id || img.url || index} img={img} index={index} onOpen={() => setActiveImage(index)} />)}</div> : <div className="rounded-3xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm text-zinc-400">Este presupuesto todavía no tiene imágenes cargadas.</div>) : <div className="rounded-3xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm text-zinc-400">La galería está oculta para una lectura más limpia del presupuesto.</div>}
          </Section>
          {presupuesto.items.length > 0 && <Section title="Partidas / productos" eyebrow="05"><div className="grid gap-3 md:hidden">{presupuesto.items.map((item) => <div key={item.id} className="rounded-2xl border border-white/10 bg-black/35 p-4"><b className="text-white">{item.nombre}</b><p className="mt-1 text-xs leading-relaxed text-zinc-400">{item.descripcion}</p><div className="mt-3 flex items-center justify-between text-sm"><span className="text-zinc-500">{item.cantidad} {item.unidad}</span><span className="font-black text-yellow-300">{formatBudgetMoney(item.total)}</span></div></div>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-xs uppercase tracking-widest text-yellow-300"><tr><th className="py-2">Item</th><th>Cant.</th><th>Unidad</th><th>Unitario</th><th>Total</th></tr></thead><tbody>{presupuesto.items.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="py-3 pr-3"><b>{item.nombre}</b><p className="text-xs text-zinc-400">{item.descripcion}</p></td><td>{item.cantidad}</td><td>{item.unidad}</td><td>{formatBudgetMoney(item.precio_unitario)}</td><td className="font-bold text-yellow-300">{formatBudgetMoney(item.total)}</td></tr>)}</tbody></table></div></Section>}
          <Section title="Forma de pago" eyebrow="06"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{presupuesto.forma_pago.map((pago, i) => <div key={i} className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4"><b className="text-2xl text-yellow-300">{pago.porcentaje}%</b><p className="mt-2 text-xs text-zinc-200">{pago.descripcion}</p></div>)}</div></Section>
          <Section title="No incluye" eyebrow="07"><List items={presupuesto.no_incluye} /></Section>
          <Section title="Observación técnica" eyebrow="08"><p className="text-sm leading-7 text-zinc-300">{presupuesto.observacion_tecnica}</p></Section>
        </div>
        <aside className="grid h-max min-w-0 gap-5 lg:sticky lg:top-6">
          <Section title="Valor del proyecto" eyebrow="Resumen"><div className="rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-5"><div className="flex justify-between gap-3 py-2 text-zinc-300"><span>Valor neto</span><b>{formatBudgetMoney(presupuesto.valor_neto)}</b></div><div className="flex justify-between gap-3 border-y border-white/10 py-2 text-zinc-300"><span>IVA {presupuesto.iva_porcentaje}%</span><b>{formatBudgetMoney(presupuesto.total_iva)}</b></div><div className="flex justify-between gap-3 pt-4 text-2xl font-black text-yellow-300"><span>Total</span><span>{formatBudgetMoney(presupuesto.total_con_iva)}</span></div></div>{!adminPreview && <><ConfirmButton onConfirm={handleConfirmAcceptance} accepting={accepting} accepted={accepted} compact />{acceptMessage && <p className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-xs font-bold text-emerald-100">{acceptMessage}</p>}</>}</Section>
          <Section title="Plazo de entrega" eyebrow="Compromiso"><p className="text-sm text-zinc-300">{presupuesto.plazo_entrega}</p></Section>
          <Section title="Empresa" eyebrow="Proveedor"><p className="text-sm font-bold text-white">{companyName}</p><p className="mt-2 text-xs leading-relaxed text-zinc-400">Propuesta preparada para {presupuesto.empresa_cliente || presupuesto.cliente}. Los valores y condiciones se mantienen según la validez indicada.</p></Section>
        </aside>
      </div>

      {active && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-3 backdrop-blur print:hidden" role="dialog" aria-modal="true"><button type="button" onClick={() => setActiveImage(null)} className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:border-yellow-400"><X className="h-5 w-5" /></button>{images.length > 1 && <button type="button" onClick={prevImage} className="absolute left-2 top-1/2 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:border-yellow-400 sm:left-3 sm:p-3"><ChevronLeft className="h-6 w-6" /></button>}<figure className="w-full max-w-6xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-zinc-950 sm:rounded-[2rem]"><div className="flex h-[70vh] w-full items-center justify-center bg-black"><img src={proxiedImageUrl(normalizeImageUrl(active.url))} alt={active.titulo || 'Imagen presupuesto'} className="max-h-full max-w-full object-contain object-center" decoding="async" /></div><figcaption className="border-t border-white/10 p-4"><b className="text-white">{active.titulo}</b>{active.descripcion && <p className="mt-1 text-sm text-zinc-400">{active.descripcion}</p>}<p className="mt-2 text-xs text-yellow-300">{(activeImage ?? 0) + 1} / {images.length}</p></figcaption></figure>{images.length > 1 && <button type="button" onClick={nextImage} className="absolute right-2 top-1/2 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:border-yellow-400 sm:right-3 sm:p-3"><ChevronRight className="h-6 w-6" /></button>}</div>}
    </article>
  );
}
