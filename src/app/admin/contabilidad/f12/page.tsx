import Link from 'next/link';
import { ArrowLeft, BookOpen, CalendarDays, FileText, Receipt, ShieldCheck } from 'lucide-react';

const steps = [
  ['Ventas del mes', 'Revisar boletas, facturas, notas de crédito y documentos anulados.'],
  ['Compras y gastos', 'Registrar facturas de materiales, herramientas, software, combustible y servicios.'],
  ['Respaldo', 'Guardar PDF/XML, comprobantes, transferencias y capturas de pagos.'],
  ['Cierre', 'Comparar ventas menos gastos y preparar declaración mensual.'],
];

export default function F12Page() {
  return (
    <main className="min-h-screen bg-[#090806] p-4 text-white sm:p-6 lg:p-8">
      <section className="mx-auto grid max-w-6xl gap-5">
        <Link href="/admin/contabilidad" className="inline-flex w-fit items-center gap-2 text-sm text-zinc-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Volver a contabilidad</Link>
        <header className="rounded-[2rem] border border-amber-300/20 bg-zinc-950 p-6 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-amber-300">F12 · Registro operativo</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Control F12 mensual</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">Pantalla de control para ordenar documentos, ventas, compras y respaldos antes de declarar impuestos. Úsalo como checklist contable operativo de Soluciones Fabrick.</p>
          <div className="mt-5 flex flex-wrap gap-2"><Link href="/admin/facturas" className="rounded-full bg-amber-400 px-4 py-2 text-sm font-black text-black">Abrir DTE</Link><Link href="/admin/contabilidad" className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold">Ver F29</Link></div>
        </header>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5"><Receipt className="mb-3 h-7 w-7 text-amber-300" /><b>DTE</b><p className="mt-2 text-sm text-zinc-400">Boletas, facturas y notas.</p></div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5"><FileText className="mb-3 h-7 w-7 text-amber-300" /><b>Compras</b><p className="mt-2 text-sm text-zinc-400">Materiales y gastos.</p></div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5"><CalendarDays className="mb-3 h-7 w-7 text-amber-300" /><b>Calendario</b><p className="mt-2 text-sm text-zinc-400">Cierre mensual.</p></div>
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.045] p-5"><ShieldCheck className="mb-3 h-7 w-7 text-amber-300" /><b>Respaldo</b><p className="mt-2 text-sm text-zinc-400">PDF, XML y pagos.</p></div>
        </section>
        <section className="rounded-[2rem] border border-white/10 bg-zinc-950 p-6">
          <h2 className="text-2xl font-black">Checklist operativo</h2>
          <div className="mt-5 grid gap-3">
            {steps.map(([title, text], index) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><span className="text-xs font-black text-amber-300">0{index + 1}</span><h3 className="mt-1 font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-zinc-400">{text}</p></div>)}
          </div>
        </section>
        <section className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-6"><BookOpen className="mb-3 h-7 w-7 text-amber-300"/><h2 className="text-2xl font-black">Uso recomendado</h2><p className="mt-2 text-sm leading-7 text-zinc-300">Al finalizar cada semana, revisa ventas, compras y respaldos. Al final del mes, pasa el resumen a Contabilidad/F29 para estimar IVA y pagos.</p></section>
      </section>
    </main>
  );
}
