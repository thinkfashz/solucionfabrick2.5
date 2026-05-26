'use client';

import DOMPurify from 'isomorphic-dompurify';
import { Copy, MessageCircle, Printer } from 'lucide-react';
import { formatBudgetMoney, sanitizeBudgetHtml, type PresupuestoPro } from '@/lib/presupuestosBuilder';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-zinc-950/75 p-5 shadow-2xl shadow-black/20"><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-white"><span className="h-2 w-2 rounded-full bg-yellow-400" />{title}</h2>{children}</section>;
}

function List({ items }: { items: string[] }) {
  return <ul className="grid gap-2 text-sm text-zinc-200 sm:grid-cols-2">{items.filter(Boolean).map((item, i) => <li key={`${item}-${i}`} className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2">{item}</li>)}</ul>;
}

export default function PresupuestoPublicView({ presupuesto, publicLink, adminPreview = false }: { presupuesto: PresupuestoPro; publicLink?: string; adminPreview?: boolean }) {
  const safeHtml = DOMPurify.sanitize(sanitizeBudgetHtml(presupuesto.html_personalizado), { FORBID_TAGS: ['script', 'iframe', 'object', 'embed'], FORBID_ATTR: ['onerror', 'onclick', 'onload', 'onmouseover'] });
  const waPhone = presupuesto.telefono_whatsapp?.replace(/[^0-9]/g, '');
  const waText = encodeURIComponent(`Hola, revisé el presupuesto ${presupuesto.titulo}. Link: ${publicLink || ''}`);

  if (presupuesto.usar_html_personalizado && safeHtml) {
    return <div className="rounded-3xl border border-yellow-400/20 bg-white p-4 text-black"><div dangerouslySetInnerHTML={{ __html: safeHtml }} /></div>;
  }

  return <article className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-yellow-400/20 bg-black text-white shadow-2xl shadow-yellow-950/20 print:border-0 print:shadow-none">
    <header className="relative overflow-hidden border-b border-yellow-400/20 bg-[radial-gradient(circle_at_top_right,rgba(250,204,21,0.22),transparent_34%),linear-gradient(135deg,#050505,#18181b)] p-6 sm:p-10">
      <div className="absolute right-6 top-6 rounded-full border border-yellow-400/40 px-3 py-1 text-xs font-black uppercase tracking-[0.28em] text-yellow-300">{presupuesto.estado}</div>
      <p className="text-xs font-black uppercase tracking-[0.35em] text-yellow-300">{presupuesto.proveedor}</p>
      <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl">{presupuesto.titulo}</h1>
      <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300">{presupuesto.descripcion}</p>
      <div className="mt-8 grid gap-3 text-sm sm:grid-cols-4">
        <div className="rounded-2xl bg-white/10 p-4"><span className="block text-zinc-400">Cliente</span><b>{presupuesto.cliente}</b></div>
        <div className="rounded-2xl bg-white/10 p-4"><span className="block text-zinc-400">Empresa</span><b>{presupuesto.empresa_cliente || '—'}</b></div>
        <div className="rounded-2xl bg-white/10 p-4"><span className="block text-zinc-400">Fecha</span><b>{presupuesto.fecha}</b></div>
        <div className="rounded-2xl bg-white/10 p-4"><span className="block text-zinc-400">Validez</span><b>{presupuesto.validez}</b></div>
      </div>
      {!adminPreview && <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-black text-black hover:bg-yellow-300"><Printer className="h-4 w-4" /> Imprimir / PDF</button>
        <button onClick={() => publicLink && navigator.clipboard.writeText(publicLink)} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white hover:border-yellow-400/60"><Copy className="h-4 w-4" /> Copiar link</button>
        {waPhone && <a href={`https://wa.me/${waPhone}?text=${waText}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 px-4 py-2 text-sm font-bold text-emerald-200 hover:bg-emerald-400/10"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
      </div>}
    </header>

    <div className="grid gap-5 p-5 sm:p-8">
      <Section title="Descripción del proyecto"><p className="text-sm leading-7 text-zinc-300">{presupuesto.descripcion}</p></Section>
      <Section title="Alcance incluido"><List items={presupuesto.incluye} /></Section>
      <Section title="Materiales y terminaciones"><List items={presupuesto.materiales} /></Section>
      {presupuesto.imagenes.length > 0 && <Section title="Galería de imágenes"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...presupuesto.imagenes].sort((a,b)=>a.orden-b.orden).map((img) => <figure key={img.id} className="overflow-hidden rounded-3xl border border-white/10 bg-black"><img src={img.url} alt={img.titulo || 'Imagen presupuesto'} className="h-56 w-full object-cover" /><figcaption className="p-4"><b className="text-sm text-white">{img.titulo}</b><p className="mt-1 text-xs text-zinc-400">{img.descripcion}</p></figcaption></figure>)}</div></Section>}
      {presupuesto.items.length > 0 && <Section title="Partidas / productos"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-widest text-yellow-300"><tr><th className="py-2">Item</th><th>Cant.</th><th>Unidad</th><th>Unitario</th><th>Total</th></tr></thead><tbody>{presupuesto.items.map((item) => <tr key={item.id} className="border-t border-white/10"><td className="py-3"><b>{item.nombre}</b><p className="text-xs text-zinc-400">{item.descripcion}</p></td><td>{item.cantidad}</td><td>{item.unidad}</td><td>{formatBudgetMoney(item.precio_unitario)}</td><td className="font-bold text-yellow-300">{formatBudgetMoney(item.total)}</td></tr>)}</tbody></table></div></Section>}
      <Section title="Forma de pago"><div className="grid gap-3 sm:grid-cols-5">{presupuesto.forma_pago.map((pago, i) => <div key={i} className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4"><b className="text-2xl text-yellow-300">{pago.porcentaje}%</b><p className="mt-2 text-xs text-zinc-200">{pago.descripcion}</p></div>)}</div></Section>
      <Section title="No incluye"><List items={presupuesto.no_incluye} /></Section>
      <Section title="Observación técnica"><p className="text-sm leading-7 text-zinc-300">{presupuesto.observacion_tecnica}</p></Section>
      <Section title="Valor del proyecto"><div className="ml-auto max-w-xl rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-5"><div className="flex justify-between py-2 text-zinc-300"><span>Valor neto</span><b>{formatBudgetMoney(presupuesto.valor_neto)}</b></div><div className="flex justify-between border-y border-white/10 py-2 text-zinc-300"><span>IVA {presupuesto.iva_porcentaje}%</span><b>{formatBudgetMoney(presupuesto.total_iva)}</b></div><div className="flex justify-between pt-4 text-2xl font-black text-yellow-300"><span>Total</span><span>{formatBudgetMoney(presupuesto.total_con_iva)}</span></div></div></Section>
      <Section title="Plazo de entrega"><p className="text-sm text-zinc-300">{presupuesto.plazo_entrega}</p></Section>
    </div>
  </article>;
}
