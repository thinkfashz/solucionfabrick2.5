'use client';

import * as React from 'react';
import type { PresupuestoItem } from '@/lib/presupuestosBuilder';

type SaleMode = 'equipo_instalacion' | 'solo_instalacion' | 'solo_equipo' | string;

type BudgetTicketProps = React.HTMLAttributes<HTMLDivElement> & {
  ticketId: string;
  amount: number;
  date: Date | string;
  clientName: string;
  companyName?: string;
  serviceMode?: SaleMode;
  projectTitle?: string;
  coverageM2?: number;
  btu?: number;
  barcodeValue?: string;
  items?: Pick<PresupuestoItem, 'nombre' | 'cantidad' | 'unidad' | 'total'>[];
  showConfetti?: boolean;
};

const moneyCLP = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });

function cx(...classes: Array<string | false | null | undefined>) { return classes.filter(Boolean).join(' '); }

function serviceLabel(mode?: SaleMode) {
  if (mode === 'solo_instalacion') return 'Solo instalación';
  if (mode === 'solo_equipo') return 'Solo equipo';
  return 'Aire + instalación';
}

function serviceAccent(mode?: SaleMode) {
  if (mode === 'solo_instalacion') return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100';
  if (mode === 'solo_equipo') return 'border-violet-300/30 bg-violet-300/10 text-violet-100';
  return 'border-amber-300/30 bg-amber-300/10 text-amber-100';
}

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
);

const FabrickTicketLogo = () => (
  <div className="mx-auto grid place-items-center text-center">
    <div className="grid h-16 w-16 place-items-center rounded-full border border-amber-300/35 bg-black shadow-[0_0_35px_rgba(245,158,11,.22)]">
      <span className="text-xl font-black tracking-[-.06em] text-amber-300">SF</span>
    </div>
    <p className="mt-3 text-[10px] font-black uppercase tracking-[.35em] text-amber-300">Soluciones Fabrick</p>
  </div>
);

const DashedLine = () => <div className="w-full border-t border-dashed border-white/15" aria-hidden="true" />;

function Barcode({ value }: { value: string }) {
  const seed = value.split('').reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  const random = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  const bars = Array.from({ length: 58 }).map((_, index) => ({ width: random(seed + index) > .7 ? 2.6 : 1.4 }));
  const spacing = 1.35;
  const totalWidth = bars.reduce((acc, bar) => acc + bar.width + spacing, 0) - spacing;
  const svgWidth = 250;
  let currentX = (svgWidth - totalWidth) / 2;
  return <div className="flex flex-col items-center py-2">
    <svg xmlns="http://www.w3.org/2000/svg" width={svgWidth} height="70" viewBox={`0 0 ${svgWidth} 70`} aria-label={`Código de barras ${value}`} className="fill-current text-white">
      {bars.map((bar, index) => {
        const x = currentX;
        currentX += bar.width + spacing;
        return <rect key={index} x={x} y="10" width={bar.width} height="50" />;
      })}
    </svg>
    <p className="mt-2 text-xs tracking-[0.28em] text-zinc-500">{value}</p>
  </div>;
}

function ConfettiExplosion() {
  const colors = ['#f59e0b', '#22d3ee', '#22c55e', '#f97316', '#a78bfa', '#facc15'];
  return <>
    <style>{`@keyframes sf-ticket-fall{0%{transform:translateY(-10vh) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(720deg);opacity:0}}`}</style>
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 70 }).map((_, i) => <div key={i} className="absolute h-3 w-1.5 rounded-full" style={{ left: `${Math.random() * 100}%`, top: `${-20 + Math.random() * 10}%`, backgroundColor: colors[i % colors.length], transform: `rotate(${Math.random() * 360}deg)`, animation: `sf-ticket-fall ${2.3 + Math.random() * 2.2}s ${Math.random() * 1.4}s linear forwards` }} />)}
    </div>
  </>;
}

export const AnimatedBudgetTicket = React.forwardRef<HTMLDivElement, BudgetTicketProps>(function AnimatedBudgetTicket({ className, ticketId, amount, date, clientName, companyName = 'Soluciones Fabrick', serviceMode = 'equipo_instalacion', projectTitle = 'Presupuesto Aire 360', coverageM2, btu, barcodeValue, items = [], showConfetti = false, ...props }, ref) {
  const [confetti, setConfetti] = React.useState(false);
  React.useEffect(() => {
    if (!showConfetti) return;
    const mount = setTimeout(() => setConfetti(true), 100);
    const unmount = setTimeout(() => setConfetti(false), 5200);
    return () => { clearTimeout(mount); clearTimeout(unmount); };
  }, [showConfetti]);

  const parsedDate = typeof date === 'string' ? new Date(date) : date;
  const formattedDate = Number.isNaN(parsedDate.getTime()) ? new Date().toLocaleString('es-CL') : new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(parsedDate).replace(',', ' •');
  const code = barcodeValue || ticketId.replace(/[^a-zA-Z0-9]/g, '').slice(-14).padStart(12, '0');
  const visibleItems = items.slice(0, 4);

  return <>
    {confetti && <ConfettiExplosion />}
    <div ref={ref} className={cx('relative z-10 w-full max-w-sm rounded-[1.8rem] bg-[#161616] text-white shadow-2xl shadow-black/40 ring-1 ring-white/10 animate-in fade-in-0 zoom-in-95 duration-500', className)} {...props}>
      <div className="absolute -left-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-[#0d0d0d]" />
      <div className="absolute -right-4 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-[#0d0d0d]" />

      <div className="px-7 pt-7 text-center">
        <FabrickTicketLogo />
        <div className="mx-auto mt-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/25"><CheckCircleIcon className="h-8 w-8" /></div>
        <h2 className="mt-4 text-2xl font-black tracking-tight">Boleta generada</h2>
        <p className="mt-1 text-sm text-zinc-400">Resumen comercial emitido correctamente</p>
      </div>

      <div className="space-y-5 px-7 pb-7 pt-6">
        <DashedLine />
        <div className="grid grid-cols-2 gap-4 text-left">
          <div><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Folio</p><p className="font-mono text-sm font-semibold">{ticketId}</p></div>
          <div className="text-right"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Monto</p><p className="text-lg font-black text-amber-300">{moneyCLP.format(amount)}</p></div>
        </div>
        <div className={cx('rounded-2xl border p-3 text-sm font-black', serviceAccent(serviceMode))}>{serviceLabel(serviceMode)}</div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Cliente / Proyecto</p>
          <p className="mt-1 font-semibold">{clientName}</p>
          <p className="text-sm text-zinc-400">{projectTitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MiniTicketStat label="Cobertura" value={coverageM2 ? `${num.format(coverageM2)} m²` : 'Por validar'} />
          <MiniTicketStat label="Equipo" value={btu ? `${new Intl.NumberFormat('es-CL').format(btu)} BTU` : 'Auto'} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Fecha y hora</p>
          <p className="mt-1 font-medium">{formattedDate}</p>
        </div>
        {visibleItems.length > 0 && <div className="rounded-2xl bg-white/[.055] p-3"><p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Detalle compra</p>{visibleItems.map((item) => <div key={`${item.nombre}-${item.total}`} className="flex items-start justify-between gap-3 border-b border-white/10 py-2 last:border-0"><div><b className="text-sm">{item.nombre}</b><p className="text-xs text-zinc-500">{item.cantidad} {item.unidad}</p></div><span className="text-sm font-black text-amber-200">{moneyCLP.format(item.total)}</span></div>)}</div>}
        <div className="rounded-2xl bg-white/[.055] p-3"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Emitido por</p><p className="font-semibold">{companyName}</p></div>
        <DashedLine />
        <Barcode value={code} />
      </div>
    </div>
  </>;
});

function MiniTicketStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-black/35 p-3"><p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</p><b className="mt-1 block text-sm">{value}</b></div>;
}
