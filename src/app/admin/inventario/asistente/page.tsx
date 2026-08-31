'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, PackageSearch, Search, Send, Sparkles } from 'lucide-react';
import { AdminCard, AdminPage, AdminPageHeader } from '@/components/admin/ui';

type Product = {
  id: string;
  name: string;
  stock: number | null;
  price?: number | null;
  sku?: string | null;
  ean?: string | null;
  scan_code?: string | null;
  image_url?: string | null;
  activo?: boolean | null;
};

type Message = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  products?: Product[];
};

const buttonClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-xs font-black text-[#5f594f] transition hover:bg-[#fffaf0] disabled:opacity-45';

export default function InventoryAssistantPage() {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: 'Escribe el nombre, SKU, EAN o código de un producto. Te mostraré coincidencias y el stock registrado.' },
  ]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (!q || busy) return;
    setQuery('');
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text: q }]);
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/inventory/search?q=${encodeURIComponent(q)}&limit=8`, { cache: 'no-store' });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'No se pudo consultar el inventario.');
      const products = Array.isArray(json.products) ? json.products as Product[] : [];
      let text = String(json.answer || 'Consulta completada.');
      if (products.length === 1) {
        const product = products[0];
        text = `${product.name}: quedan ${Math.max(0, Number(product.stock ?? 0))} unidad(es).${product.sku ? ` SKU ${product.sku}.` : ''}`;
      }
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text, products }]);
    } catch (error) {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: error instanceof Error ? error.message : 'No se pudo consultar el inventario.' }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Inventario · Consulta"
        title="Asistente de stock"
        description="Una interfaz de consulta rápida sobre el catálogo real. Es la base para conectar después un modelo de IA sin darle acceso directo a modificar stock."
        icon={Bot}
        actions={<Link href="/admin/inventario" className={buttonClass}><ArrowLeft className="h-4 w-4" /> Inventario</Link>}
      />

      <div className="mx-auto w-full max-w-4xl">
        <AdminCard className="overflow-hidden p-0">
          <div className="border-b border-black/10 bg-[#faf8f3] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2 text-xs font-black text-[#5f594f]"><Sparkles className="h-4 w-4 text-[#b17400]" /> Consulta segura: solo lectura</div>
          </div>
          <div className="min-h-[420px] space-y-4 p-4 sm:p-5">
            {messages.map((message) => <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-[18px] px-4 py-3 ${message.role === 'user' ? 'bg-[#171612] text-white' : 'border border-black/10 bg-white text-[#39352f]'}`}>
                <p className="text-sm leading-6">{message.text}</p>
                {message.products?.length ? <div className="mt-3 grid gap-2 sm:grid-cols-2">{message.products.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-black/10 bg-[#faf8f3] p-3 text-[#171612]">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-white">{product.image_url ? <img src={product.image_url} alt="" className="h-full w-full object-cover" /> : <PackageSearch className="m-3 h-5 w-5 text-[#aaa294]" />}</div>
                  <div className="min-w-0 flex-1"><strong className="block truncate text-xs">{product.name}</strong><small className="block text-[11px] text-[#817a6f]">Stock: {Math.max(0, Number(product.stock ?? 0))} · {product.sku || product.ean || product.scan_code || 'sin código'}</small></div>
                </div>)}</div> : null}
              </div>
            </div>)}
            {busy ? <div className="flex justify-start"><div className="rounded-[18px] border border-black/10 bg-white px-4 py-3 text-sm text-[#817a6f]">Buscando en el inventario…</div></div> : null}
          </div>
          <form onSubmit={ask} className="flex gap-2 border-t border-black/10 bg-white p-3 sm:p-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#aaa294]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-12 w-full rounded-xl border border-black/10 bg-[#faf8f3] pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#d79a27]/50" placeholder="Ej.: ¿cuántos tornillos 3 pulgadas quedan?" /></div>
            <button type="submit" disabled={!query.trim() || busy} className="grid h-12 w-12 place-items-center rounded-xl bg-[#171612] text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
          </form>
        </AdminCard>
        <p className="mt-3 text-center text-[11px] leading-5 text-[#817a6f]">Esta primera versión consulta por nombre, SKU, EAN y código. La capa de IA futura podrá interpretar frases más complejas y llamar a esta misma API de lectura.</p>
      </div>
    </AdminPage>
  );
}
