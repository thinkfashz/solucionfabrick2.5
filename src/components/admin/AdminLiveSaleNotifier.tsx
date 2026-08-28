'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2, ShoppingBag, X } from 'lucide-react';

type Sale = { id: string; customerName: string; total: number; products: Array<{ name: string; quantity: number }> };
const CLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

export default function AdminLiveSaleNotifier() {
  const pathname = usePathname() || '/admin';
  const [sale, setSale] = useState<Sale | null>(null);
  const lastId = useRef<string | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (pathname === '/admin/login' || pathname.startsWith('/admin/plan-suspendido')) return;
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    async function check() {
      try {
        const res = await fetch('/api/admin/payments/operations?light=1', { cache: 'no-store', credentials: 'same-origin' });
        if (!res.ok) return;
        const json = await res.json() as { recentSales?: Sale[] };
        const newest = json.recentSales?.[0];
        if (!newest || !active) return;
        if (!initialized.current) { initialized.current = true; lastId.current = newest.id; return; }
        if (newest.id !== lastId.current) { lastId.current = newest.id; setSale(newest); }
      } catch {}
    }
    void check();
    timer = setInterval(check, 25_000);
    return () => { active = false; if (timer) clearInterval(timer); };
  }, [pathname]);

  if (!sale) return null;
  const product = sale.products?.[0];
  return <div className="fixed bottom-5 right-4 z-[1000] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-emerald-300/25 bg-[#111214] text-white shadow-[0_24px_80px_rgba(0,0,0,.35)]">
    <div className="flex items-start gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-400/12 text-emerald-300"><CheckCircle2 className="h-5 w-5"/></span>
      <div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-[.16em] text-emerald-300">Nueva compra confirmada</p><b className="mt-1 block truncate text-sm">{product?.name || `Pedido ${sale.id}`}</b><p className="mt-1 text-xs text-zinc-400">{sale.customerName} · <strong className="text-amber-300">{CLP.format(sale.total)}</strong></p></div>
      <button type="button" onClick={() => setSale(null)} aria-label="Cerrar notificación" className="text-zinc-500 hover:text-white"><X className="h-4 w-4"/></button>
    </div>
    <Link href="/admin/pagos" onClick={() => setSale(null)} className="flex min-h-10 items-center justify-center gap-2 border-t border-white/10 bg-white/[.04] text-xs font-black text-amber-300"><ShoppingBag className="h-4 w-4"/>Ver compra</Link>
  </div>;
}
