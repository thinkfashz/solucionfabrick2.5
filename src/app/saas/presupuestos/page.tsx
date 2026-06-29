import Link from 'next/link';
import { ArrowRight, BadgeCheck, Calculator, CheckCircle2, ClipboardList, FileText, Gauge, LayoutTemplate, Link2, Palette, PenTool, ShieldCheck, Sparkles, Wrench } from 'lucide-react';

const features = [
  { title: 'Cotizador público', text: 'Cada empresa puede recibir solicitudes, datos del cliente, medidas, imágenes y notas.', icon: ClipboardList },
  { title: 'Links compartibles', text: 'Presupuestos con URL pública para enviar por WhatsApp, correo o campañas.', icon: Link2 },
  { title: 'Branding por tenant', text: 'Logo, color, datos comerciales, correo y teléfono aparecen con la marca del cliente.', icon: Palette },
  { title: 'Motores técnicos', text: 'Base para radier, aire acondicionado, muebles, construcción y servicios medibles.', icon: Calculator },
  { title: 'Plantillas visuales', text: 'Formato comercial claro, premium, imprimible y fácil de entender por el comprador.', icon: LayoutTemplate },
  { title: 'Estado comercial', text: 'Seguimiento de aprobado, rechazado, pendiente, visita técnica y pago inicial.', icon: Gauge },
];

const niches = [
  'Construcción y remodelación',
  'Aire acondicionado',
  'Radier y hormigón',
  'Muebles a medida',
  'Electricidad y gasfitería',
  'Servicios técnicos',
];

const flow = [
  ['01', 'Cliente solicita cotización'],
  ['02', 'La empresa arma propuesta'],
  ['03', 'Comparte link público'],
  ['04', 'Cliente aprueba o agenda visita'],
];

export default function PresupuestosSaaSPage() {
  return <main className="min-h-screen bg-[#050505] text-white">
    <section className="relative overflow-hidden border-b border-white/10 px-4 py-10 md:px-6 md:py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(245,158,11,.24),transparent_32rem),radial-gradient(circle_at_88%_5%,rgba(251,146,60,.18),transparent_32rem)]" />
      <div className="relative mx-auto max-w-7xl">
        <nav className="mb-12 flex items-center justify-between rounded-full border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur-xl">
          <Link href="/saas" className="text-xs font-black uppercase tracking-[.22em] text-amber-200">SaaS <span className="text-white">Fabrick</span></Link>
          <Link href="/registro" className="rounded-full bg-amber-300 px-4 py-2 text-xs font-black text-black">Crear demo</Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_430px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.26em] text-amber-100"><FileText className="h-4 w-4" /> Presupuestos SaaS</p>
            <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[.9] tracking-[-.07em] md:text-7xl">Cotizaciones profesionales para cada empresa.</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300">El módulo de presupuestos permite que cada negocio genere propuestas visuales, links públicos, cálculos técnicos y seguimiento comercial con su propia marca.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="inline-flex min-h-[54px] items-center gap-2 rounded-full bg-amber-300 px-7 text-sm font-black text-black">Crear demo <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/presupuesto" className="inline-flex min-h-[54px] items-center gap-2 rounded-full border border-white/15 bg-white/10 px-7 text-sm font-black text-white">Ver cotizador actual</Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/40">
            <div className="rounded-[1.7rem] border border-amber-300/20 bg-[linear-gradient(145deg,#181008,#050505)] p-5">
              <div className="flex items-center justify-between"><span className="rounded-full bg-amber-300 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-black">Preview</span><PenTool className="h-5 w-5 text-amber-100" /></div>
              <h2 className="mt-6 text-3xl font-black tracking-[-.05em]">Propuesta #AC-12000</h2>
              <p className="mt-2 text-sm text-amber-100/70">Instalación aire acondicionado 12.000 BTU</p>
              <div className="mt-6 rounded-3xl border border-white/10 bg-white p-4 text-black">
                <div className="flex items-center justify-between"><b>Clima Demo Chile</b><span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">Aprobable</span></div>
                <div className="mt-4 grid gap-2 text-sm text-black/65"><span>Equipo + instalación</span><span>Garantía incluida</span><span>Visita técnica opcional</span></div>
                <div className="mt-5 flex items-end justify-between border-t border-black/10 pt-4"><span className="text-xs uppercase tracking-[.18em] text-black/45">Total</span><b className="text-2xl">$489.990</b></div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
      <p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-200">Capacidades</p>
      <h2 className="mt-2 text-4xl font-black tracking-[-.06em] md:text-6xl">Presupuestos que venden, no solo calculan.</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map((item) => { const Icon = item.icon; return <article key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 transition hover:border-amber-300/35 hover:bg-amber-400/10"><Icon className="h-7 w-7 text-amber-200" /><h3 className="mt-5 text-xl font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{item.text}</p></article>; })}</div>
    </section>

    <section className="border-y border-white/10 bg-white/[0.025] px-4 py-14 md:px-6">
      <div className="mx-auto max-w-7xl"><p className="text-[10px] font-black uppercase tracking-[.3em] text-orange-200">Flujo comercial</p><div className="mt-8 grid gap-4 md:grid-cols-4">{flow.map(([number, title]) => <article key={number} className="rounded-[2rem] border border-white/10 bg-black/35 p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-300 text-lg font-black text-black">{number}</span><h3 className="mt-5 text-lg font-black">{title}</h3></article>)}</div></div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
        <article className="rounded-[2.3rem] border border-white/10 bg-white/[0.045] p-6 md:p-8">
          <Wrench className="h-9 w-9 text-amber-200" />
          <h2 className="mt-5 text-4xl font-black tracking-[-.06em]">Ideal para negocios técnicos.</h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">Este módulo es el puente entre una página bonita y una venta real: permite tomar medidas, explicar alcance, mostrar precio, garantía, condiciones y próximos pasos.</p>
          <div className="mt-6 flex flex-wrap gap-2">{niches.map((item) => <span key={item} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-100">{item}</span>)}</div>
        </article>
        <article className="rounded-[2.3rem] border border-emerald-300/20 bg-emerald-400/10 p-6 md:p-8">
          <ShieldCheck className="h-9 w-9 text-emerald-200" />
          <h3 className="mt-5 text-3xl font-black tracking-[-.05em]">Módulo vendible dentro del SaaS.</h3>
          <p className="mt-3 text-sm leading-7 text-emerald-50/70">Se puede vender como parte del plan Pro o como extra para negocios que dependen de propuestas antes de cobrar.</p>
          <Link href="/saas" className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-black text-black">Volver al SaaS</Link>
        </article>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6"><div className="rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_80%_0%,rgba(245,158,11,.22),transparent_32rem),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-6 text-center md:p-10"><Sparkles className="mx-auto h-10 w-10 text-amber-200" /><h2 className="mt-5 text-4xl font-black tracking-[-.06em] md:text-6xl">Cotizar más claro aumenta la confianza.</h2><p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Esta página deja presentado el módulo de presupuestos como producto comercial del SaaS, sin tocar migración ni lógica sensible.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/registro" className="rounded-full bg-amber-300 px-6 py-4 text-sm font-black text-black">Crear demo</Link><Link href="/saas/ecommerce" className="rounded-full border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white">Ver e-commerce SaaS</Link></div></div></section>
  </main>;
}
