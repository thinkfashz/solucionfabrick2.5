import Link from 'next/link';
import { ArrowLeft, Calculator, FileCheck2, Landmark, ReceiptText, WalletCards } from 'lucide-react';

const blocks = [
  ['Impuestos mensuales', 'Cruzar IVA, PPM, retenciones y obligaciones del período.'],
  ['Pagos pendientes', 'Registrar vencimientos, comprobantes y medios de pago.'],
  ['Renta / cierre', 'Preparar respaldo para cierre anual y utilidad real del negocio.'],
  ['Alertas', 'Evitar multas por atraso y mantener trazabilidad.'],
];

export default function F21Page() {
  return (
    <main className="min-h-screen bg-[#090806] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto grid max-w-6xl gap-5">
        <Link href="/admin/contabilidad" className="inline-flex w-fit items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Volver a contabilidad</Link>
        <header className="rounded-[2rem] border border-amber-300/20 bg-zinc-950 p-6 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-amber-300">F21 · Pagos e impuestos</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Control F21 tributario</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">Módulo para controlar pagos tributarios, obligaciones mensuales, comprobantes y cierres. No reemplaza al SII ni a un contador, pero ordena la información para operar con disciplina.</p>
          <div className="mt-5 flex flex-wrap gap-2"><Link href="/admin/contabilidad" className="rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-black">Abrir F29</Link><Link href="/admin/facturas" className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold">Revisar DTE</Link></div>
        </header>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5"><Calculator className="mb-3 h-7 w-7 text-amber-300" /><b>Cálculo</b><p className="mt-2 text-sm text-zinc-400">IVA, PPM, créditos y pagos.</p></div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5"><Landmark className="mb-3 h-7 w-7 text-amber-300" /><b>SII / TGR</b><p className="mt-2 text-sm text-zinc-400">Obligaciones y comprobantes.</p></div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5"><WalletCards className="mb-3 h-7 w-7 text-amber-300" /><b>Pagos</b><p className="mt-2 text-sm text-zinc-400">Transferencia, webpay, banco.</p></div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5"><FileCheck2 className="mb-3 h-7 w-7 text-amber-300" /><b>Respaldo</b><p className="mt-2 text-sm text-zinc-400">Comprobantes y evidencia.</p></div>
        </section>
        <section className="rounded-[2rem] border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-black">Panel de trabajo</h2>
          <div className="mt-5 grid gap-3">
            {blocks.map(([title, text], index) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><span className="text-xs font-black text-amber-300">0{index + 1}</span><h3 className="mt-1 font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{text}</p></div>)}
          </div>
        </section>
        <section className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-6"><ReceiptText className="mb-3 h-7 w-7 text-amber-300"/><h2 className="text-2xl font-black">Próximo paso</h2><p className="mt-2 text-sm leading-7 text-zinc-300">Cuando tengas DTE reales y compras registradas, este módulo puede transformarse en tablero automático de vencimientos, pagos y utilidad neta mensual.</p></section>
      </section>
    </main>
  );
}
