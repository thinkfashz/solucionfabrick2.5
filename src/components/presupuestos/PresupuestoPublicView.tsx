'use client';

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type ReactNode } from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { ChevronLeft, ChevronRight, CheckCircle2, Copy, Eye, EyeOff, Image as ImageIcon, Loader2, MessageCircle, Printer, Search, X } from 'lucide-react';
import { formatBudgetMoney, sanitizeBudgetHtml, type PresupuestoImagen, type PresupuestoPro } from '@/lib/presupuestosBuilder';

function Section({ title, eyebrow, children }: { title: string; eyebrow?: string; children: ReactNode }) {
  return <section className="rounded-[1.75rem] border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">{eyebrow ? <p className="mb-1 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-300/80">{eyebrow}</p> : null}<h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white sm:text-xl"><span className="h-2 w-2 rounded-full bg-yellow-400" />{title}</h2>{children}</section>;
}

function List({ items }: { items: string[] }) {
  return <ul className="grid gap-2 text-sm text-zinc-200 sm:grid-cols-2 xl:grid-cols-3">{items.filter(Boolean).map((item, i) => <li key={`${item}-${i}`} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2.5 leading-relaxed">{item}</li>)}</ul>;
}

function referenceImages(query: string): PresupuestoImagen[] {
  const clean = encodeURIComponent(`${query || 'mobiliario laboratorio industrial'} workshop laboratory modular furniture`);
  return [1, 2, 3].map((n) => ({ id: `ref-${n}`, url: `https://source.unsplash.com/1200x800/?${clean}&sig=${n}`, titulo: `Referencia visual ${n}`, descripcion: 'Imagen de inspiración relacionada al concepto del proyecto. Reemplazar por fotografía real cuando esté disponible.', orden: 900 + n }));
}

function ConfirmButton({ onConfirm, accepting, accepted, compact = false }: { onConfirm: () => void; accepting: boolean; accepted: boolean; compact?: boolean }) {
  return <button type="button" onClick={onConfirm} disabled={accepting || accepted} className={`${compact ? 'mt-4 w-full justify-center rounded-2xl px-5 py-3' : 'rounded-full px-5 py-2.5'} inline-flex items-center gap-2 bg-emerald-400 text-sm font-black text-black shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-70`}>
    {accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : accepted ? <CheckCircle2 className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
    {accepting ? 'Confirmando...' : accepted ? 'Presupuesto aceptado' : compact ? 'Confirmar presupuesto' : 'Confirmar por WhatsApp'}
  </button>;
}

export default function PresupuestoPublicView({ presupuesto, publicLink, adminPreview = false }: { presupuesto: PresupuestoPro; publicLink?: string; adminPreview?: boolean }) {
  const [galleryVisible, setGalleryVisible] = useState(true);
  const [activeImage, setActiveImage] = useState<number | null>(null);
  const [useReferences, setUseReferences] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState('');

  const safeHtml = DOMPurify.sanitize(sanitizeBudgetHtml(presupuesto.html_personalizado), { FORBID_TAGS: ['script', 'iframe', 'object', 'embed'], FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'] });
  const waPhone = presupuesto.telefono_whatsapp?.replace(/[^0-9]/g, '');
  const waText = encodeURIComponent(`Hola, revisé el presupuesto ${presupuesto.titulo}. Link: ${publicLink || ''}`);
  const whatsappBase = waPhone ? `https://wa.me/${waPhone}` : 'https://wa.me/';
  const companyName = presupuesto.proveedor || 'Soluciones Fabris';

  const sortedImages = useMemo(() => [...presupuesto.imagenes].filter((img) => img.url).sort((a, b) => a.orden - b.orden), [presupuesto.imagenes]);
  const images = useMemo(() => (useReferences || sortedImages.length === 0 ? [...sortedImages, ...referenceImages(presupuesto.titulo)] : sortedImages), [sortedImages, useReferences, presupuesto.titulo]);
  const active = activeImage !== null ? images[activeImage] : null;
  const nextImage = () => setActiveImage((current) => (current === null ? 0 : (current + 1) % images.length));
  const prevImage = () => setActiveImage((current) => (current === null ? 0 : (current - 1 + images.length) % images.length));

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
      const json = (await res.json().catch(() => ({}))) as { whatsappUrl?: string; email?: { sent?: boolean; reason?: string }; error?: string };
      if (!res.ok) throw new Error(json.error || `Error ${res.status}`);
      setAccepted(true);
      setAcceptMessage(json.email?.sent ? 'Presupuesto aceptado. Se registró la confirmación y se envió correo de respaldo.' : 'Presupuesto aceptado. Se registró la confirmación y se abrirá WhatsApp.');
      if (json.whatsappUrl) window.open(json.whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      const fallbackText = encodeURIComponent(`Hola, confirmo la aceptación del presupuesto "${presupuesto.titulo}" para ${presupuesto.empresa_cliente || presupuesto.cliente}. Total: ${formatBudgetMoney(presupuesto.total_con_iva)}. Link: ${publicLink || ''}`);
      setAcceptMessage(`No se pudo registrar automáticamente: ${(err as Error).message}. Abriré WhatsApp igualmente para dejar constancia.`);
      window.open(`${whatsappBase}?text=${fallbackText}`, '_blank', 'noopener,noreferrer');
    } finally {
      setAccepting(false);
    }
  }

  if (presupuesto.usar_html_personalizado && safeHtml) return <div className="rounded-3xl border border-yellow-400/20 bg-white p-4 text-black"><div dangerouslySetInnerHTML={{ __html: safeHtml }} /></div>;

  return <article className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-black text-white shadow-2xl shadow-yellow-950/20 print:border-0 print:shadow-none">
    <header className="relative overflow-hidden border-b border-yellow-400/20 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.22),transparent_34%),linear-gradient(135deg,#050505,#18181b)] p-5 sm:p-8 lg:p-10">
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end"><div><div className="mb-6 flex flex-wrap items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/40 bg-yellow-400 text-xl font-black text-black shadow-lg shadow-yellow-500/20">SF</div><div><p className="text-[10px] font-black uppercase tracking-[0.35em] text-yellow-300">{companyName}</p><p className="mt-1 text-xs text-zinc-400">Propuesta comercial profesional</p></div><span className="ml-auto rounded-full border border-yellow-400/40 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-yellow-300">{accepted ? 'aprobado' : presupuesto.estado}</span></div>
        <p className="text-xs font-black uppercase tracking-[0.32em] text-zinc-500">Presupuesto para {presupuesto.empresa_cliente || presupuesto.cliente}</p><h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">{presupuesto.titulo}</h1><p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 sm:text-base">{presupuesto.descripcion}</p>
        {!adminPreview && <div className="mt-7 flex flex-wrap gap-3 print:hidden"><ConfirmButton onConfirm={handleConfirmAcceptance} accepting={accepting} accepted={accepted} /><button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-black hover:bg-yellow-300"><Printer className="h-4 w-4" /> Imprimir / PDF</button><button onClick={() => publicLink && navigator.clipboard.writeText(publicLink)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/60"><Copy className="h-4 w-4" /> Copiar link</button>{waPhone && <a href={`${whatsappBase}?text=${waText}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-400/10"><MessageCircle className="h-4 w-4" /> Consultar por WhatsApp</a>}{acceptMessage && <p className="basis-full rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100">{acceptMessage}</p>}</div>}
      </div><div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl"><div className="grid grid-cols-2 gap-3 text-sm"><div className="rounded-2xl bg-black/40 p-4"><span className="block text-xs text-zinc-400">Cliente</span><b>{presupuesto.cliente}</b></div><div className="rounded-2xl bg-black/40 p-4"><span className="block text-xs text-zinc-400">Empresa</span><b>{presupuesto.empresa_cliente || '—'}</b></div><div className="rounded-2xl bg-black/40 p-4"><span className="block text-xs text-zinc-400">Fecha</span><b>{presupuesto.fecha}</b></div><div className="rounded-2xl bg-black/40 p-4"><span className="block text-xs text-zinc-400">Validez</span><b>{presupuesto.validez}</b></div></div><div className="mt-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4"><span className="block text-xs text-yellow-200/80">Valor total con IVA</span><b className="mt-1 block text-2xl font-black text-yellow-300">{formatBudgetMoney(presupuesto.total_con_iva)}</b></div></div></div>
    </header>

    <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8"><div className="grid gap-5"><Section title="Descripción del proyecto" eyebrow="01"><p className="text-sm leading-7 text-zinc-300">{presupuesto.descripcion}</p></Section><Section title="Alcance incluido" eyebrow="02"><List items={presupuesto.incluye} /></Section><Section title="Materiales y terminaciones" eyebrow="03"><List items={presupuesto.materiales} /></Section><Section title="Galería visual del proyecto" eyebrow="04"><div className="mb-4 flex flex-wrap items-center gap-2 print:hidden"><button onClick={() => setGalleryVisible((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-bold text-zinc-200 hover:border-yellow-400/50">{galleryVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{galleryVisible ? 'Ocultar imágenes' : 'Mostrar imágenes'}</button><button onClick={() => setUseReferences((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs font-bold text-yellow-200 hover:bg-yellow-400/20"><Search className="h-4 w-4" />{useReferences ? 'Ocultar referencias' : 'Buscar referencias'}</button><span className="text-xs text-zinc-500">Toca cualquier imagen para verla completa.</span></div>{galleryVisible ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{images.map((img, index) => <button key={img.id} onClick={() => setActiveImage(index)} className="group overflow-hidden rounded-3xl border border-white/10 bg-black text-left transition hover:-translate-y-1 hover:border-yellow-400/50"><div className="relative aspect-[4/3] overflow-hidden bg-zinc-900"><img src={img.url} alt={img.titulo || 'Imagen presupuesto'} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" loading="lazy" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-80" /><ImageIcon className="absolute right-3 top-3 h-5 w-5 text-white/70" /></div><div className="p-4"><b className="text-sm text-white">{img.titulo || `Imagen ${index + 1}`}</b><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{img.descripcion}</p></div></button>)}</div> : <div className="rounded-3xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm text-zinc-400">La galería está oculta para una lectura más limpia del presupuesto.</div>}</Section>{presupuesto.items.length > 0 && <Section title="Partidas / productos" eyebrow="05"><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="text-xs uppercase tracking-widest text-yellow-300"><tr><th className="py-2">Item</th><th>Cant.</th><th>Unidad</th><th>Unitario</th><th>Total</th></tr></thead><tbody>{presupuesto.items.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="py-3 pr-3"><b>{item.nombre}</b><p className="text-xs text-zinc-400">{item.descripcion}</p></td><td>{item.cantidad}</td><td>{item.unidad}</td><td>{formatBudgetMoney(item.precio_unitario)}</td><td className="font-bold text-yellow-300">{formatBudgetMoney(item.total)}</td></tr>)}</tbody></table></div></Section>}<Section title="Forma de pago" eyebrow="06"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{presupuesto.forma_pago.map((pago, i) => <div key={i} className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4"><b className="text-2xl text-yellow-300">{pago.porcentaje}%</b><p className="mt-2 text-xs text-zinc-200">{pago.descripcion}</p></div>)}</div></Section><Section title="No incluye" eyebrow="07"><List items={presupuesto.no_incluye} /></Section><Section title="Observación técnica" eyebrow="08"><p className="text-sm leading-7 text-zinc-300">{presupuesto.observacion_tecnica}</p></Section></div>
      <aside className="grid h-max gap-5 lg:sticky lg:top-6"><Section title="Valor del proyecto" eyebrow="Resumen"><div className="rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-5"><div className="flex justify-between py-2 text-zinc-300"><span>Valor neto</span><b>{formatBudgetMoney(presupuesto.valor_neto)}</b></div><div className="flex justify-between border-y border-white/10 py-2 text-zinc-300"><span>IVA {presupuesto.iva_porcentaje}%</span><b>{formatBudgetMoney(presupuesto.total_iva)}</b></div><div className="flex justify-between pt-4 text-2xl font-black text-yellow-300"><span>Total</span><span>{formatBudgetMoney(presupuesto.total_con_iva)}</span></div></div>{!adminPreview && <><ConfirmButton onConfirm={handleConfirmAcceptance} accepting={accepting} accepted={accepted} compact />{acceptMessage && <p className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-xs font-bold text-emerald-100">{acceptMessage}</p>}</>}</Section><Section title="Plazo de entrega" eyebrow="Compromiso"><p className="text-sm text-zinc-300">{presupuesto.plazo_entrega}</p></Section><Section title="Empresa" eyebrow="Proveedor"><p className="text-sm font-bold text-white">{companyName}</p><p className="mt-2 text-xs leading-relaxed text-zinc-400">Propuesta preparada para {presupuesto.empresa_cliente || presupuesto.cliente}. Los valores y condiciones se mantienen según la validez indicada.</p></Section></aside></div>

    {active && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 p-3 backdrop-blur print:hidden" role="dialog" aria-modal="true"><button onClick={() => setActiveImage(null)} className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:border-yellow-400"><X className="h-5 w-5" /></button>{images.length > 1 && <button onClick={prevImage} className="absolute left-3 top-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white hover:border-yellow-400"><ChevronLeft className="h-6 w-6" /></button>}<figure className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950"><img src={active.url} alt={active.titulo || 'Imagen presupuesto'} className="max-h-[72vh] w-full object-contain bg-black" /><figcaption className="border-t border-white/10 p-4"><b className="text-white">{active.titulo}</b><p className="mt-1 text-sm text-zinc-400">{active.descripcion}</p><p className="mt-2 text-xs text-yellow-300">{(activeImage ?? 0) + 1} / {images.length}</p></figcaption></figure>{images.length > 1 && <button onClick={nextImage} className="absolute right-3 top-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white hover:border-yellow-400"><ChevronRight className="h-6 w-6" /></button>}</div>}
  </article>;
}
