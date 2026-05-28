'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type ReactNode } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Box,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  CreditCard,
  Hammer,
  Image as ImageIcon,
  Layers3,
  MessageCircle,
  PackageCheck,
  Printer,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
} from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import { formatBudgetMoney, sanitizeBudgetHtml, type PresupuestoImagen, type PresupuestoPro } from '@/lib/presupuestosBuilder';

const BRAND_YELLOW = '#f4c400';

function SectionShell({ id, eyebrow, title, children, dark = false }: { id?: string; eyebrow: string; title: string; children: ReactNode; dark?: boolean }) {
  return (
    <section id={id} className={`${dark ? 'bg-[#111111] text-white' : 'bg-white text-[#111111]'} overflow-hidden rounded-[2rem] border ${dark ? 'border-white/10' : 'border-black/5'} p-5 shadow-[0_24px_80px_rgba(0,0,0,0.08)] transition duration-300 hover:-translate-y-0.5 sm:p-7 lg:p-9`}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className={`${dark ? 'text-yellow-300' : 'text-yellow-600'} text-[10px] font-black uppercase tracking-[0.32em]`}>{eyebrow}</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2>
        </div>
        <span className="hidden h-px flex-1 bg-gradient-to-r from-[#f4c400] to-transparent sm:block" />
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed border-black/10 bg-[#f5f5f5] p-5 text-sm font-semibold text-zinc-500">{text}</p>;
}

function PremiumItem({ icon, text, dark = false }: { icon: ReactNode; text: string; dark?: boolean }) {
  return (
    <div className={`${dark ? 'border-white/10 bg-white/[0.04] text-zinc-100' : 'border-black/5 bg-[#f5f5f5] text-zinc-800'} group rounded-3xl border p-4 transition duration-300 hover:-translate-y-1 hover:border-yellow-400/60 hover:shadow-xl hover:shadow-yellow-950/10`}>
      <div className="mb-4 inline-flex rounded-2xl bg-[#f4c400] p-2.5 text-black shadow-lg shadow-yellow-500/20">{icon}</div>
      <p className="text-sm font-bold leading-6">{text}</p>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
      <div className="mb-3 inline-flex rounded-2xl bg-[#f4c400] p-2 text-black">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">{label}</p>
      <b className="mt-1 block text-base text-white sm:text-lg">{value || '—'}</b>
    </div>
  );
}

function getActiveModel(presupuesto: PresupuestoPro) {
  return (presupuesto.archivos || [])
    .filter((file) => file.mostrar_cliente !== false && file.url && ['glb', 'gltf'].includes((file.formato || file.url.split('?')[0].split('.').pop() || '').toLowerCase()))
    .sort((a, b) => a.orden - b.orden)[0];
}

export default function PresupuestoPublicView({ presupuesto, publicLink, adminPreview = false }: { presupuesto: PresupuestoPro; publicLink?: string; adminPreview?: boolean }) {
  const [activeImage, setActiveImage] = useState<PresupuestoImagen | null>(null);
  const [copied, setCopied] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState('');

  const safeHtml = DOMPurify.sanitize(sanitizeBudgetHtml(presupuesto.html_personalizado), {
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'],
  });

  const companyName = presupuesto.proveedor || 'Soluciones Fabris';
  const clientName = presupuesto.empresa_cliente || presupuesto.cliente || 'Cliente';
  const waPhone = presupuesto.telefono_whatsapp?.replace(/[^0-9]/g, '');
  const whatsappBase = waPhone ? `https://wa.me/${waPhone}` : 'https://wa.me/';
  const waText = encodeURIComponent(`Hola, revisé la propuesta comercial "${presupuesto.titulo}" para ${clientName}. Link: ${publicLink || ''}`);
  const sortedImages = useMemo(() => [...(presupuesto.imagenes || [])].filter((img) => img.url).sort((a, b) => a.orden - b.orden), [presupuesto.imagenes]);
  const heroImage = sortedImages[0];
  const activeModel = getActiveModel(presupuesto);
  const modelLink = activeModel ? `/presupuestos/visor-3d?model=${encodeURIComponent(activeModel.url)}&name=${encodeURIComponent(activeModel.nombre || 'Modelo 3D del proyecto')}` : '';

  const subtotal = formatBudgetMoney(presupuesto.valor_neto);
  const iva = formatBudgetMoney(presupuesto.total_iva);
  const total = formatBudgetMoney(presupuesto.total_con_iva);

  async function copyLink() {
    const link = publicLink || (typeof window !== 'undefined' ? window.location.href : '');
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function handleConfirmAcceptance() {
    if (accepted || accepting) return;
    setAccepting(true);
    setAcceptMessage('Registrando aceptación del presupuesto...');
    try {
      const res = await fetch('/api/presupuestos/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presupuesto: { ...presupuesto, public_link: publicLink || (typeof window !== 'undefined' ? window.location.href : ''), email_cliente: presupuesto.email_cliente || '' } }),
      });
      const json = (await res.json().catch(() => ({}))) as { whatsappUrl?: string; email?: { sent?: boolean }; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setAccepted(true);
      setAcceptMessage(json.email?.sent ? 'Presupuesto aceptado. Confirmación registrada y correo de respaldo enviado.' : 'Presupuesto aceptado. Confirmación registrada y WhatsApp abierto.');
      if (json.whatsappUrl) window.open(json.whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const fallbackText = encodeURIComponent(`Hola, confirmo la aceptación del presupuesto "${presupuesto.titulo}" para ${clientName}. Total: ${total}. Link: ${publicLink || ''}`);
      setAcceptMessage(`No se pudo registrar automáticamente: ${(err as Error).message}. Abriré WhatsApp para dejar constancia.`);
      window.open(`${whatsappBase}?text=${fallbackText}`, '_blank', 'noopener,noreferrer');
    } finally {
      setAccepting(false);
    }
  }

  if (presupuesto.usar_html_personalizado && safeHtml) {
    return <div className="w-full overflow-hidden rounded-3xl border border-yellow-400/20 bg-white p-4 text-black shadow-2xl"><div dangerouslySetInnerHTML={{ __html: safeHtml }} /></div>;
  }

  return (
    <article className="mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] bg-[#f5f5f5] text-[#111111] shadow-[0_40px_120px_rgba(0,0,0,0.18)] print:rounded-none print:shadow-none">
      <header className="relative min-h-[82vh] overflow-hidden bg-[#111111] text-white">
        {heroImage ? <img src={heroImage.url} alt={heroImage.titulo || presupuesto.titulo} className="absolute inset-0 h-full w-full object-cover opacity-45" /> : null}
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(17,17,17,0.98)_0%,rgba(17,17,17,0.86)_42%,rgba(17,17,17,0.46)_100%)]" />
        <div className="absolute left-0 top-0 h-1.5 w-full bg-[#f4c400]" />
        <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full bg-[#f4c400]/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-52 w-full bg-gradient-to-t from-[#111111] to-transparent" />

        <div className="relative z-10 flex min-h-[82vh] flex-col justify-between p-5 sm:p-8 lg:p-12">
          <nav className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
            <div className="max-w-[240px]"><FabrickFullLogo theme="light" tagline="Propuesta comercial" /></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-black text-[#111111] transition hover:scale-[1.02]"><Printer className="h-4 w-4" /> PDF</button>
              <button onClick={copyLink} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white backdrop-blur transition hover:border-[#f4c400]"><Copy className="h-4 w-4" /> {copied ? 'Copiado' : 'Copiar link'}</button>
              {waPhone && <a href={`${whatsappBase}?text=${waText}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/10 px-4 py-2.5 text-sm font-bold text-emerald-100 transition hover:bg-emerald-400/20"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
            </div>
          </nav>

          <div className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
            <div className="max-w-5xl">
              <div className="mb-6 inline-flex rounded-full border border-[#f4c400]/40 bg-[#f4c400]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.32em] text-yellow-200">Cliente · {clientName}</div>
              <h1 className="text-[2.65rem] font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">{presupuesto.titulo}</h1>
              <p className="mt-7 max-w-3xl text-lg leading-8 text-zinc-200 sm:text-xl">{presupuesto.descripcion}</p>
              {!adminPreview && (
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap print:hidden">
                  <button onClick={handleConfirmAcceptance} disabled={accepting || accepted} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f4c400] px-6 py-3 text-sm font-black text-black shadow-2xl shadow-yellow-500/20 transition hover:scale-[1.02] disabled:opacity-70"><BadgeCheck className="h-4 w-4" />{accepting ? 'Confirmando...' : accepted ? 'Presupuesto aceptado' : 'Confirmar presupuesto'}</button>
                  {activeModel && <a href={modelLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-black text-white backdrop-blur transition hover:border-[#f4c400]"><Box className="h-4 w-4" /> Abrir visor 3D</a>}
                </div>
              )}
              {acceptMessage && <p className="mt-4 max-w-2xl rounded-2xl border border-emerald-300/30 bg-emerald-400/10 p-4 text-sm font-bold text-emerald-100">{acceptMessage}</p>}
            </div>

            <aside className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-4 backdrop-blur-2xl sm:p-5">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Proveedor" value={companyName} icon={<ShieldCheck className="h-4 w-4" />} />
                <StatCard label="Estado" value={accepted ? 'Aprobado' : presupuesto.estado} icon={<BadgeCheck className="h-4 w-4" />} />
                <StatCard label="Fecha" value={presupuesto.fecha} icon={<CalendarDays className="h-4 w-4" />} />
                <StatCard label="Validez" value={presupuesto.validez} icon={<Clock3 className="h-4 w-4" />} />
              </div>
              <div className="mt-3 rounded-3xl bg-[#f4c400] p-5 text-black">
                <p className="text-[10px] font-black uppercase tracking-[0.26em]">Valor proyecto</p>
                <b className="mt-2 block text-3xl font-black tracking-tight">{subtotal}</b>
                <span className="mt-1 block text-sm font-black">NETO + IVA</span>
              </div>
            </aside>
          </div>
        </div>
      </header>

      <main className="grid gap-6 p-4 sm:p-6 lg:p-8">
        <SectionShell eyebrow="01" title="Descripción del proyecto">
          <p className="max-w-4xl text-lg leading-9 text-zinc-700">{presupuesto.descripcion}</p>
        </SectionShell>

        <SectionShell eyebrow="02" title="Alcance incluido">
          {presupuesto.incluye.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{presupuesto.incluye.map((item, index) => <PremiumItem key={`${item}-${index}`} icon={<CheckCircle2 className="h-5 w-5" />} text={item} />)}</div> : <EmptyState text="No hay alcance incluido configurado." />}
        </SectionShell>

        <SectionShell eyebrow="03" title="Materiales y terminaciones">
          {presupuesto.materiales.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{presupuesto.materiales.map((item, index) => <PremiumItem key={`${item}-${index}`} icon={<Layers3 className="h-5 w-5" />} text={item} />)}</div> : <EmptyState text="No hay materiales configurados." />}
        </SectionShell>

        <SectionShell eyebrow="04" title="Galería de imágenes">
          {sortedImages.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedImages.map((img, index) => (
                <button key={img.id || img.url} onClick={() => setActiveImage(img)} className="group overflow-hidden rounded-[1.75rem] border border-black/5 bg-[#111111] text-left shadow-xl shadow-black/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl">
                  <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
                    <img src={img.url} alt={img.titulo || `Imagen ${index + 1}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <ImageIcon className="absolute right-4 top-4 h-5 w-5 text-white/80" />
                  </div>
                  <div className="p-4 text-white">
                    <b className="line-clamp-1 text-sm">{img.titulo || `Imagen ${index + 1}`}</b>
                    {img.descripcion && <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">{img.descripcion}</p>}
                  </div>
                </button>
              ))}
              {activeModel && (
                <a href={modelLink} target="_blank" rel="noreferrer" className="group flex min-h-[260px] flex-col justify-between rounded-[1.75rem] border border-yellow-400/30 bg-[#111111] p-5 text-white shadow-xl shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-yellow-400">
                  <div><div className="mb-5 inline-flex rounded-2xl bg-[#f4c400] p-3 text-black"><Box className="h-6 w-6" /></div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Visor técnico 3D</p><h3 className="mt-2 text-xl font-black">{activeModel.nombre || 'Modelo 3D del proyecto'}</h3><p className="mt-3 text-sm leading-7 text-zinc-400">Abre el modelo técnico en una página aislada para revisar volumen, proporciones y detalles del proyecto.</p></div>
                  <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-yellow-300">Abrir visor <ArrowUpRight className="h-4 w-4" /></span>
                </a>
              )}
            </div>
          ) : activeModel ? (
            <a href={modelLink} target="_blank" rel="noreferrer" className="flex flex-col gap-4 rounded-[1.75rem] border border-yellow-400/30 bg-[#111111] p-6 text-white sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-300">Visor técnico 3D</p><h3 className="mt-2 text-2xl font-black">{activeModel.nombre || 'Modelo 3D del proyecto'}</h3></div><span className="inline-flex items-center gap-2 rounded-full bg-[#f4c400] px-5 py-3 text-sm font-black text-black">Abrir visor <ArrowUpRight className="h-4 w-4" /></span></a>
          ) : <EmptyState text="Este presupuesto aún no tiene imágenes cargadas." />}
        </SectionShell>

        <SectionShell eyebrow="05" title="Forma de pago">
          {presupuesto.forma_pago.length ? <div className="grid gap-4 lg:grid-cols-5">{presupuesto.forma_pago.map((pay, index) => <div key={`${pay.descripcion}-${index}`} className="rounded-[1.5rem] bg-[#111111] p-5 text-white shadow-xl shadow-black/10"><p className="text-4xl font-black text-[#f4c400]">{pay.porcentaje}%</p><p className="mt-4 text-sm font-bold leading-6 text-zinc-200">{pay.descripcion}</p></div>)}</div> : <EmptyState text="No hay forma de pago configurada." />}
        </SectionShell>

        <SectionShell eyebrow="06" title="No incluye" dark>
          {presupuesto.no_incluye.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{presupuesto.no_incluye.map((item, index) => <PremiumItem key={`${item}-${index}`} dark icon={<XCircle className="h-5 w-5" />} text={item} />)}</div> : <EmptyState text="No hay exclusiones configuradas." />}
        </SectionShell>

        <SectionShell eyebrow="07" title="Observación técnica">
          <div className="rounded-[1.75rem] border-l-4 border-[#f4c400] bg-[#111111] p-5 text-white sm:p-7">
            <div className="mb-4 inline-flex rounded-2xl bg-[#f4c400] p-3 text-black"><AlertTriangle className="h-5 w-5" /></div>
            <p className="text-base leading-8 text-zinc-200">{presupuesto.observacion_tecnica || 'Sin observación técnica registrada.'}</p>
          </div>
        </SectionShell>

        <section className="overflow-hidden rounded-[2rem] bg-[#111111] p-6 text-white shadow-[0_30px_100px_rgba(0,0,0,0.25)] sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">09 · Valor del proyecto</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">{subtotal}</h2>
              <p className="mt-2 text-xl font-black text-[#f4c400]">NETO + IVA</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"><p className="text-xs text-zinc-400">IVA {presupuesto.iva_porcentaje}%</p><b className="mt-1 block text-2xl">{iva}</b></div>
                <div className="rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-4"><p className="text-xs text-yellow-200">Total con IVA</p><b className="mt-1 block text-2xl text-yellow-300">{total}</b></div>
              </div>
            </div>
            <div className="rounded-[1.75rem] bg-[#f4c400] p-6 text-black">
              <Clock3 className="h-9 w-9" />
              <p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em]">10 · Plazo de entrega</p>
              <b className="mt-2 block text-4xl font-black">{presupuesto.plazo_entrega}</b>
              <p className="mt-3 text-sm font-bold leading-6 text-black/70">Plazo estimado desde la aprobación comercial y coordinación técnica del proyecto.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#111111] p-6 text-white sm:p-8 lg:p-10">
        <div className="grid gap-8 border-t border-white/10 pt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <div className="max-w-[260px]"><FabrickFullLogo theme="light" tagline="Diseño • Fabricación • Instalación" /></div>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400">Mobiliario técnico y soluciones modulares para espacios industriales, comerciales y operativos.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap print:hidden">
            {waPhone && <a href={`${whatsappBase}?text=${waText}`} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f4c400] px-5 py-3 text-sm font-black text-black"><MessageCircle className="h-4 w-4" /> Contacto WhatsApp</a>}
            <a href="https://www.solucionesfabrick.com" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-white hover:border-yellow-400/50"><PackageCheck className="h-4 w-4" /> Sitio web</a>
            <a href="https://www.instagram.com/solucionesfabrick" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-bold text-white hover:border-yellow-400/50"><Sparkles className="h-4 w-4" /> Instagram</a>
          </div>
        </div>
      </footer>

      {activeImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3 backdrop-blur" role="dialog" aria-modal="true">
          <button onClick={() => setActiveImage(null)} className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:border-yellow-400"><X className="h-5 w-5" /></button>
          <figure className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#111111] text-white">
            <div className="flex h-[72vh] w-full items-center justify-center bg-black"><img src={activeImage.url} alt={activeImage.titulo || 'Imagen del presupuesto'} className="max-h-full max-w-full object-contain" /></div>
            <figcaption className="p-5"><b>{activeImage.titulo}</b>{activeImage.descripcion && <p className="mt-1 text-sm text-zinc-400">{activeImage.descripcion}</p>}</figcaption>
          </figure>
        </div>
      )}
    </article>
  );
}
