import Link from 'next/link';
import { ArrowRight, BadgeCheck, BarChart3, Boxes, CreditCard, Package, Palette, Receipt, ShoppingCart, Store, Truck } from 'lucide-react';

const features = [
  { title: 'Catálogo por empresa', text: 'Cada tenant administra sus productos, categorías, precios, stock e imágenes.', icon: Package },
  { title: 'Carrito y checkout', text: 'Flujo de compra preparado para pedidos, despacho, cliente y método de pago.', icon: ShoppingCart },
  { title: 'Diseño con paleta', text: 'La tienda adopta el color, logo y estilo visual elegido por cada marca.', icon: Palette },
  { title: 'Panel de pedidos', text: 'El negocio puede revisar compras, estados, clientes y seguimiento comercial.', icon: BarChart3 },
  { title: 'Despacho y zonas', text: 'Base para calcular envío por región, comuna o reglas del negocio.', icon: Truck },
  { title: 'Documentos y venta', text: 'Preparado para comprobantes, boletas, facturas y registros comerciales.', icon: Receipt },
];

const flow = [
  ['01', 'El tenant configura su marca'],
  ['02', 'Carga productos o importa catálogo'],
  ['03', 'Activa tienda pública y checkout'],
  ['04', 'Recibe pedidos y cotizaciones'],
];

export default function EcommerceSaaSPage() {
  return <main className="min-h-screen bg-[#050505] text-white">
    <section className="relative overflow-hidden border-b border-white/10 px-4 py-10 md:px-6 md:py-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(6,182,212,.24),transparent_32rem),radial-gradient(circle_at_88%_8%,rgba(245,158,11,.2),transparent_32rem)]" />
      <div className="relative mx-auto max-w-7xl">
        <nav className="mb-12 flex items-center justify-between rounded-full border border-white/10 bg-white/[0.045] px-4 py-3 backdrop-blur-xl">
          <Link href="/saas" className="text-xs font-black uppercase tracking-[.22em] text-cyan-200">SaaS <span className="text-white">Fabrick</span></Link>
          <Link href="/registro" className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-black text-black">Crear tienda demo</Link>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1fr_430px] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[.26em] text-cyan-100"><Store className="h-4 w-4" /> E-commerce SaaS</p>
            <h1 className="mt-6 max-w-5xl text-5xl font-black leading-[.9] tracking-[-.07em] md:text-7xl">Una tienda online distinta para cada empresa.</h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-zinc-300">El módulo e-commerce permite que cada negocio tenga su propio catálogo, colores, marca, checkout, productos y experiencia pública sin duplicar el proyecto.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/registro" className="inline-flex min-h-[54px] items-center gap-2 rounded-full bg-cyan-300 px-7 text-sm font-black text-black">Crear tienda demo <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/tienda" className="inline-flex min-h-[54px] items-center gap-2 rounded-full border border-white/15 bg-white/10 px-7 text-sm font-black text-white">Ver tienda actual</Link>
            </div>
          </div>

          <aside className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/40">
            <div className="rounded-[1.7rem] border border-cyan-300/20 bg-[linear-gradient(145deg,#03131a,#082633)] p-5">
              <div className="flex items-center justify-between"><span className="rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-black uppercase tracking-[.18em] text-black">Preview</span><CreditCard className="h-5 w-5 text-cyan-100" /></div>
              <h2 className="mt-6 text-3xl font-black tracking-[-.05em]">Clima Demo Store</h2>
              <p className="mt-2 text-sm text-cyan-100/70">Aire acondicionado, instalación y servicios técnicos.</p>
              <div className="mt-6 rounded-3xl bg-white p-3 text-black"><div className="h-40 rounded-2xl bg-[linear-gradient(135deg,#06b6d4,#0284c7)]" /><h3 className="mt-4 text-lg font-black">Split inverter 12.000 BTU</h3><p className="mt-1 text-sm text-black/55">Equipo + instalación opcional</p><button className="mt-4 w-full rounded-2xl bg-cyan-400 py-3 text-sm font-black text-black">Comprar ahora</button></div>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
      <p className="text-[10px] font-black uppercase tracking-[.3em] text-cyan-200">Capacidades</p>
      <h2 className="mt-2 text-4xl font-black tracking-[-.06em] md:text-6xl">Lo que necesita una tienda SaaS vendible.</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{features.map((item) => { const Icon = item.icon; return <article key={item.title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 transition hover:border-cyan-300/35 hover:bg-cyan-400/10"><Icon className="h-7 w-7 text-cyan-200" /><h3 className="mt-5 text-xl font-black">{item.title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{item.text}</p></article>; })}</div>
    </section>

    <section className="border-y border-white/10 bg-white/[0.025] px-4 py-14 md:px-6">
      <div className="mx-auto max-w-7xl"><p className="text-[10px] font-black uppercase tracking-[.3em] text-amber-200">Flujo de tienda</p><div className="mt-8 grid gap-4 md:grid-cols-4">{flow.map(([number, title]) => <article key={number} className="rounded-[2rem] border border-white/10 bg-black/35 p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-300 text-lg font-black text-black">{number}</span><h3 className="mt-5 text-lg font-black">{title}</h3></article>)}</div></div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 md:px-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {[['Para comercio', 'Productos, stock, precios, pedidos y clientes.'], ['Para servicios', 'Venta combinada con instalación, visita técnica o cotización.'], ['Para agencias', 'Crear varias tiendas desde la misma base SaaS.']].map(([title, text]) => <article key={title} className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6"><BadgeCheck className="h-7 w-7 text-emerald-300" /><h3 className="mt-5 text-2xl font-black">{title}</h3><p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p></article>)}
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pb-16 md:px-6"><div className="rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_80%_0%,rgba(6,182,212,.22),transparent_32rem),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-6 text-center md:p-10"><Boxes className="mx-auto h-10 w-10 text-cyan-200" /><h2 className="mt-5 text-4xl font-black tracking-[-.06em] md:text-6xl">El e-commerce queda como módulo vendible del SaaS.</h2><p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Esta página presenta el módulo de tienda para prospectos: comercios, servicios técnicos, construcción, climatización y agencias que quieran operar varias marcas.</p><div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/registro" className="rounded-full bg-cyan-300 px-6 py-4 text-sm font-black text-black">Crear tienda demo</Link><Link href="/saas" className="rounded-full border border-white/15 bg-white/10 px-6 py-4 text-sm font-black text-white">Volver al SaaS</Link></div></div></section>
  </main>;
}
