'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart3, CreditCard, Megaphone, Settings2, Sparkles, WalletCards } from 'lucide-react';
import { usePathname } from 'next/navigation';

type Account = {
  name: string;
  currency: string;
  balance: number;
  amountSpent: number;
  spendCap: number;
  remainingToCap: number | null;
  status: number;
  note: string;
};

function money(value: number, currency = 'CLP') {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value || 0);
}

const tabs = [
  { href: '/admin/publicidad', label: 'Campañas y métricas', icon: BarChart3 },
  { href: '/admin/publicidad/creador', label: 'Creador IA', icon: Sparkles },
  { href: '/admin/publicidad/anuncios', label: 'Configurar anuncios', icon: Settings2 },
] as const;

export default function AdvertisingWorkspaceHeader() {
  const pathname = usePathname();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/meta/account', { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || 'No se pudo cargar la cuenta.');
        if (active) setAccount(json.account);
      })
      .catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : 'Meta no disponible.'); });
    return () => { active = false; };
  }, []);

  return (
    <section className="mb-6 overflow-hidden rounded-[2.2rem] bg-[#171820] p-5 text-[#F8F0E9] shadow-[0_24px_80px_rgba(23,24,32,.24)] sm:p-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#B6906C]/18 px-3 py-2 text-[9px] font-black uppercase tracking-[.2em] text-[#E5CFBA]"><Megaphone className="h-3.5 w-3.5" /> Centro publicitario Fabrick</span>
          <h1 className="mt-4 text-3xl font-black tracking-[-.05em] sm:text-5xl">Campañas, creativos y presupuesto en un solo lugar.</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-white/55">Crea anuncios con IA, revisa cómo se ven, configura cada anuncio por separado y compara el gasto real informado por Meta.</p>
        </div>

        <div className="grid min-w-0 gap-2 sm:grid-cols-3 xl:min-w-[560px]">
          <Metric icon={WalletCards} label="Balance informado" value={account ? money(account.balance, account.currency) : '—'} />
          <Metric icon={CreditCard} label="Gastado acumulado" value={account ? money(account.amountSpent, account.currency) : '—'} />
          <Metric icon={BarChart3} label="Margen hasta límite" value={account?.remainingToCap !== null && account?.remainingToCap !== undefined ? money(account.remainingToCap, account.currency) : 'Sin límite'} />
        </div>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin/publicidad' ? pathname === href : pathname.startsWith(href);
          return <Link key={href} href={href} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-black transition ${active ? 'bg-[#B6906C] text-[#171820]' : 'bg-white/7 text-white/65 hover:bg-white/12 hover:text-white'}`}><Icon className="h-4 w-4" />{label}</Link>;
        })}
      </div>
      {error ? <p className="mt-4 text-xs text-[#E5CFBA]">{error}</p> : account?.note ? <p className="mt-4 text-[10px] leading-5 text-white/38">{account.note}</p> : null}
    </section>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof WalletCards; label: string; value: string }) {
  return <div className="rounded-[1.4rem] bg-white/7 p-4"><Icon className="h-4 w-4 text-[#CCB196]" /><p className="mt-3 text-[8px] font-black uppercase tracking-[.14em] text-white/35">{label}</p><b className="mt-1 block truncate text-lg">{value}</b></div>;
}
