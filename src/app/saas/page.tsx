'use client';

import { useRouter } from 'next/navigation';
import { Check, Zap, Building2, Rocket, ArrowRight, Star, Shield, Clock, BarChart3, Globe, ChevronDown, Store, Palette, ShoppingCart, FileText, Calculator } from 'lucide-react';
import { useState } from 'react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29990,
    usd: 33,
    icon: Building2,
    accent: 'text-zinc-300',
    border: 'border-zinc-700',
    bg: 'bg-zinc-900',
    features: [
      'Tienda online completa',
      'Hasta 100 productos',
      '50 pedidos por mes',
      'Pagos con MercadoPago',
      'Panel admin completo',
      'Cotizaciones de clientes',
      'Soporte por email',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 59990,
    usd: 66,
    icon: Zap,
    accent: 'text-emerald-400',
    border: 'border-emerald-500',
    bg: 'bg-gradient-to-b from-emerald-950/40 to-zinc-900',
    badge: 'Más popular',
    features: [
      'Todo lo del Starter',
      'Productos ilimitados',
      'Pedidos ilimitados',
      'Facturación DTE (SII Chile)',
      'Meta Ads integrado',
      'Envíos: Chilexpress, Starken, Correos',
      'Programa de fidelidad',
      'Blog y contenido CMS',
      'Soporte prioritario',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 149990,
    usd: 165,
    icon: Rocket,
    accent: 'text-violet-400',
    border: 'border-violet-700',
    bg: 'bg-zinc-900',
    features: [
      'Todo lo del Pro',
      'Acceso completo a API',
      'Dominio personalizado',
      'Onboarding dedicado',
      'SLA garantizado 99.9%',
      'Soporte 24/7',
    ],
  },
] as const;

const FAQS = [
  {
    q: '¿Necesito saber programar?',
    a: 'No. El panel admin está diseñado para que puedas gestionar productos, pedidos, blog y configuración sin tocar código.',
  },
  {
    q: '¿Puedo usar mi propio dominio?',
    a: 'En el plan Enterprise sí. En Starter y Pro tu tienda queda en tu-negocio.fabrick.cl. El dominio personalizado se activa con un simple cambio de DNS.',
  },
  {
    q: '¿Cómo funciona el periodo de prueba?',
    a: '14 días gratis, sin tarjeta. Al vencerse te pedimos los datos de pago. Si no pagas, la cuenta queda suspendida (tus datos se conservan por 30 días).',
  },
  {
    q: '¿La facturación DTE está incluida?',
    a: 'En el plan Pro y Enterprise. Se integra con Haulmer/OpenFactura para emitir boletas y facturas electrónicas al SII automáticamente cuando se confirma un pedido.',
  },
  {
    q: '¿Puedo cambiar de plan en cualquier momento?',
    a: 'Sí. El cambio es inmediato. Si subes de plan, pagas la diferencia proporcional al ciclo actual. Si bajas, el cambio aplica al siguiente ciclo.',
  },
  {
    q: '¿En qué país opera esto?',
    a: 'Chile. Los pagos son en CLP a través de MercadoPago, la facturación cumple con el SII, y los carriers disponibles son Chilexpress, Starken y Correos de Chile.',
  },
];

const FEATURES = [
  { icon: Globe, title: 'Tienda lista en minutos', desc: 'Sube tus productos, conecta MercadoPago y empieza a vender. Sin servidores que configurar.' },
  { icon: Shield, title: 'Facturación DTE incluida', desc: 'Boletas y facturas electrónicas al SII. Se emiten automáticamente con cada pedido pagado.' },
  { icon: BarChart3, title: 'Panel con todo el control', desc: '30 módulos: pedidos, inventario, envíos, blog, Meta Ads, newsletter, reportes y más.' },
  { icon: Clock, title: 'Prueba 14 días gratis', desc: 'Sin tarjeta. Sin compromisos. Si no te convence, se borra todo sin costo.' },
];

const ECOMMERCE_FEATURES = [
  { icon: Store, title: 'Tienda por tenant', desc: 'Cada empresa puede tener su propia tienda pública, colores, logo y datos comerciales.' },
  { icon: ShoppingCart, title: 'Compra guiada', desc: 'Carrito, checkout, pedido, cliente, despacho y método de pago en un solo flujo.' },
  { icon: Palette, title: 'Diseño de marca', desc: 'La experiencia visual toma la paleta seleccionada por el negocio desde Mi Empresa.' },
];

const BUDGET_FEATURES = [
  { icon: FileText, title: 'Propuestas públicas', desc: 'Links de presupuesto para enviar por WhatsApp, correo o campañas.' },
  { icon: Calculator, title: 'Motores técnicos', desc: 'Radier, aire acondicionado, muebles, instalación y servicios medibles.' },
  { icon: Palette, title: 'Marca del cliente', desc: 'Cada presupuesto usa logo, colores, correo y datos del tenant.' },
];

function formatClp(n: number) {
  return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left py-4 flex items-center justify-between gap-4 text-sm font-medium text-white/80 hover:text-white transition-colors"
      >
        {q}
        <ChevronDown size={14} className={`shrink-0 text-white/30 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm text-white/50 leading-relaxed">{a}</p>}
    </div>
  );
}

export default function SaasLandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/8 bg-black/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between">
        <button onClick={() => router.push('/')} className="text-lg font-black tracking-tight hover:text-emerald-400 transition-colors">
          FABRICK
        </button>
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/saas/ecommerce')} className="text-sm text-white/50 hover:text-white transition-colors hidden lg:block">E-commerce</button>
          <button onClick={() => router.push('/saas/presupuestos')} className="text-sm text-white/50 hover:text-white transition-colors hidden lg:block">Presupuestos</button>
          <a href="#precios" className="text-sm text-white/50 hover:text-white transition-colors hidden md:block">Precios</a>
          <a href="#faq" className="text-sm text-white/50 hover:text-white transition-colors hidden md:block">FAQ</a>
          <button
            onClick={() => router.push('/registro')}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm px-4 py-2 transition-colors"
          >
            Empezar gratis <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-6">
          <Star size={10} fill="currentColor" /> Plataforma SaaS · Chile
        </div>
        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.9] mb-6">
          Tu negocio de{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">
            construcción
          </span>
          <br />en línea, hoy.
        </h1>
        <p className="text-lg text-white/50 max-w-2xl mx-auto mb-8 leading-relaxed">
          Tienda online completa, facturación DTE, envíos con carriers chilenos,
          Meta Ads y panel admin de 30 módulos. Listo en minutos, no en meses.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => router.push('/registro')}
            className="flex items-center gap-2 rounded-2xl bg-white text-black font-bold text-base px-8 py-4 hover:bg-emerald-400 transition-colors"
          >
            Prueba 14 días gratis <ArrowRight size={16} />
          </button>
          <button
            onClick={() => router.push('/saas/ecommerce')}
            className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-100 font-bold text-base px-8 py-4 hover:border-emerald-300/60 hover:bg-emerald-400/20 transition-colors"
          >
            Ver e-commerce <Store size={16} />
          </button>
          <button
            onClick={() => router.push('/saas/presupuestos')}
            className="flex items-center gap-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-100 font-bold text-base px-8 py-4 hover:border-amber-300/60 hover:bg-amber-400/20 transition-colors"
          >
            Ver presupuestos <FileText size={16} />
          </button>
        </div>
        <p className="mt-4 text-xs text-white/30">Sin tarjeta de crédito · Cancela cuando quieras</p>
      </section>

      {/* Features grid */}
      <section className="py-16 px-4 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/8 bg-white/3 p-6">
              <f.icon size={20} className="text-emerald-400 mb-3" />
              <h3 className="font-bold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Ecommerce SaaS module */}
      <section className="px-4 pb-16 max-w-6xl mx-auto">
        <div className="overflow-hidden rounded-3xl border border-emerald-400/20 bg-[radial-gradient(circle_at_80%_0%,rgba(16,185,129,.18),transparent_30rem),linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.24em] text-emerald-200">
                <Store className="h-3.5 w-3.5" /> Módulo vendible
              </div>
              <h2 className="mt-5 text-3xl md:text-5xl font-black tracking-[-0.06em] leading-[.95]">E-commerce SaaS para cada empresa.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">Convierte la tienda en un módulo comercial del SaaS: catálogo por tenant, checkout, carrito, productos, paleta visual y experiencia pública adaptada a la marca de cada cliente.</p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {ECOMMERCE_FEATURES.map((item) => <article key={item.title} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <item.icon className="h-5 w-5 text-emerald-300" />
                  <h3 className="mt-3 text-sm font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-white/45">{item.desc}</p>
                </article>)}
              </div>
              <button onClick={() => router.push('/saas/ecommerce')} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-6 py-4 text-sm font-black text-black hover:bg-emerald-300 transition-colors">
                Abrir página e-commerce SaaS <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <aside className="rounded-[2rem] border border-white/10 bg-black/35 p-4">
              <div className="rounded-[1.5rem] bg-white p-3 text-black">
                <div className="h-36 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500" />
                <h3 className="mt-4 text-lg font-black">Tienda demo por tenant</h3>
                <p className="mt-1 text-sm text-black/55">Productos, instalación y checkout con colores de marca.</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {['#10b981', '#06b6d4', '#a7f3d0'].map((color) => <span key={color} className="h-8 rounded-xl" style={{ background: color }} />)}
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Presupuestos SaaS module */}
      <section className="px-4 pb-16 max-w-6xl mx-auto">
        <div className="overflow-hidden rounded-3xl border border-amber-400/20 bg-[radial-gradient(circle_at_80%_0%,rgba(245,158,11,.18),transparent_30rem),linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.02))] p-6 md:p-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.24em] text-amber-200">
                <FileText className="h-3.5 w-3.5" /> Módulo técnico
              </div>
              <h2 className="mt-5 text-3xl md:text-5xl font-black tracking-[-0.06em] leading-[.95]">Presupuestos SaaS para servicios técnicos.</h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/55">Convierte la cotización en una experiencia comercial: links públicos, motores técnicos, propuesta clara, marca del cliente y seguimiento de aprobación.</p>
              <div className="mt-6 grid gap-3 md:grid-cols-3">
                {BUDGET_FEATURES.map((item) => <article key={item.title} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <item.icon className="h-5 w-5 text-amber-300" />
                  <h3 className="mt-3 text-sm font-black text-white">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-white/45">{item.desc}</p>
                </article>)}
              </div>
              <button onClick={() => router.push('/saas/presupuestos')} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-amber-300 px-6 py-4 text-sm font-black text-black hover:bg-amber-200 transition-colors">
                Abrir página presupuestos SaaS <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <aside className="rounded-[2rem] border border-white/10 bg-black/35 p-4">
              <div className="rounded-[1.5rem] bg-white p-3 text-black">
                <div className="flex items-center justify-between rounded-2xl bg-gradient-to-br from-amber-300 to-orange-500 p-4 text-black">
                  <span className="text-xs font-black uppercase tracking-[.2em]">Propuesta</span>
                  <Calculator className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-black">Instalación 12.000 BTU</h3>
                <p className="mt-1 text-sm text-black/55">Equipo, instalación, garantía y visita técnica opcional.</p>
                <div className="mt-4 flex items-end justify-between border-t border-black/10 pt-4">
                  <span className="text-xs uppercase tracking-[.18em] text-black/45">Total</span>
                  <b className="text-2xl">$489.990</b>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Social proof strip */}
      <section className="border-y border-white/8 py-6 px-4 text-center">
        <p className="text-xs text-white/30 uppercase tracking-widest mb-4">Construido con</p>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/40 font-medium">
          {['MercadoPago', 'SII Chile', 'Chilexpress', 'Starken', 'Meta Ads', 'Haulmer DTE', 'Cloudinary'].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="precios" className="py-20 px-4 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Precios claros, sin sorpresas</h2>
          <p className="mt-3 text-white/50">Todos los planes incluyen 14 días gratis. Sin contrato anual.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border ${plan.border} ${plan.bg} p-6 flex flex-col`}
            >
              {'badge' in plan && plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-emerald-500 text-black text-[10px] font-bold px-3 py-1 uppercase tracking-wide">
                  <Star size={9} fill="currentColor" /> {plan.badge}
                </div>
              )}
              <plan.icon size={20} className={`${plan.accent} mb-3`} />
              <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${plan.accent}`}>{plan.name}</div>
              <div className="text-3xl font-black mb-0.5">{formatClp(plan.price)}</div>
              <div className="text-xs text-white/30 mb-5">por mes · aprox. USD {plan.usd}</div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <Check size={12} className={`${plan.accent} mt-0.5 shrink-0`} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => router.push(`/registro?plan=${plan.id}`)}
                className={`w-full rounded-xl font-bold py-3 text-sm transition-colors ${
                  plan.id === 'pro'
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                    : 'border border-white/20 text-white hover:bg-white/8'
                }`}
              >
                {plan.id === 'enterprise' ? 'Contactar' : 'Empezar gratis'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-white/30 mt-6">
          ¿Tienes más de 5 negocios? <a href="mailto:hola@fabrick.cl" className="underline hover:text-white/60">Escríbenos para un plan personalizado.</a>
        </p>
      </section>

      {/* What you get full list */}
      <section className="py-16 px-4 max-w-3xl mx-auto">
        <h2 className="text-2xl font-black text-center mb-8">Todo incluido en cada plan</h2>
        <div className="grid sm:grid-cols-2 gap-2 text-sm text-white/60">
          {[
            'Tienda con carrito y checkout',
            'Variantes de productos (talla, color)',
            'Cupones de descuento',
            'Gestión de inventario por bodega',
            'Panel de pedidos con estados',
            'Cotizaciones y presupuestos',
            'Envíos multi-carrier',
            'Seguimiento en tiempo real',
            'Facturación DTE (Pro+)',
            'Nota de crédito automática',
            'CMS: blog + home reordenable',
            'Galería de proyectos terminados',
            'Catálogo de materiales',
            'Meta Ads (Pro+)',
            'Newsletter y email marketing',
            'PWA con notificaciones push',
            'Dashboard de analytics',
            'Consola SQL directa',
            'Log de errores en tiempo real',
            'TOTP 2FA para admin',
            'Backup codes de recuperación',
            'Equipo con roles y permisos',
            'Auditoría de accesos',
            'Certificado SSL automático',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2">
              <Check size={11} className="text-emerald-500 shrink-0" />
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-4 max-w-2xl mx-auto">
        <h2 className="text-2xl font-black text-center mb-8">Preguntas frecuentes</h2>
        <div>
          {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-950/30 to-transparent p-10">
          <h2 className="text-3xl font-black mb-3">Empieza hoy, gratis</h2>
          <p className="text-white/50 mb-6 text-sm">14 días sin costo. Sin tarjeta. Tu tienda y presupuestos listos en minutos.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => router.push('/registro')}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-base px-8 py-4 transition-colors"
            >
              Crear demo gratis <ArrowRight size={16} />
            </button>
            <button
              onClick={() => router.push('/saas/ecommerce')}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 text-white font-bold text-base px-8 py-4 transition-colors hover:bg-white/12"
            >
              Explorar e-commerce <Store size={16} />
            </button>
            <button
              onClick={() => router.push('/saas/presupuestos')}
              className="inline-flex items-center gap-2 rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100 font-bold text-base px-8 py-4 transition-colors hover:bg-amber-300/20"
            >
              Explorar presupuestos <FileText size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-8 px-6 text-center text-xs text-white/25">
        © {new Date().getFullYear()} Fabrick Platform · Chile ·{' '}
        <a href="mailto:hola@fabrick.cl" className="hover:text-white/50 transition-colors">hola@fabrick.cl</a>
      </footer>
    </div>
  );
}
