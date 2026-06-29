'use client';

import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, CreditCard, ExternalLink, KeyRound, Plug, ShieldCheck, Users, Webhook } from 'lucide-react';

const links = [
  {
    title: 'MCP Server Mercado Pago',
    description: 'Documentación del servidor MCP para agentes IA compatibles.',
    href: 'https://www.mercadopago.cl/developers/es/docs/mcp-server/overview',
    icon: Bot,
  },
  {
    title: 'Credenciales de prueba',
    description: 'Public Key y Access Token TEST de tu aplicación.',
    href: 'https://www.mercadopago.cl/developers/panel/app',
    icon: KeyRound,
  },
  {
    title: 'Cuentas de prueba',
    description: 'Crea comprador y vendedor de prueba. No uses la misma cuenta para comprar y vender.',
    href: 'https://www.mercadopago.cl/developers/es/docs/checkout-pro/additional-content/test-users',
    icon: Users,
  },
  {
    title: 'Tarjetas de prueba',
    description: 'Números de tarjetas para aprobar, rechazar o dejar pendiente un pago.',
    href: 'https://www.mercadopago.cl/developers/es/docs/checkout-pro/additional-content/test-cards',
    icon: CreditCard,
  },
  {
    title: 'Webhooks Mercado Pago',
    description: 'Configura eventos de pagos hacia la URL de Soluciones Fabrick.',
    href: 'https://www.mercadopago.cl/developers/es/docs/checkout-pro/additional-content/notifications/webhooks',
    icon: Webhook,
  },
];

const checklist = [
  'Crear o usar una cuenta de prueba VENDEDOR para generar las credenciales TEST.',
  'Crear una cuenta de prueba COMPRADOR distinta para pagar en sandbox.',
  'No pagar con la misma cuenta que generó el Access Token.',
  'Usar una tarjeta de prueba de Mercado Pago, no una tarjeta real.',
  'Configurar webhook: https://www.solucionesfabrick.com/api/webhooks/mercadopago',
  'En eventos, activar principalmente Pagos para el checkout.',
];

export default function MercadoPagoMcpPage() {
  return <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6">
    <section className="mx-auto max-w-7xl space-y-5">
      <header className="overflow-hidden rounded-[2.5rem] border border-sky-300/20 bg-[radial-gradient(circle_at_80%_0%,rgba(56,189,248,.24),transparent_34rem),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-6 shadow-2xl shadow-black/40 md:p-8">
        <Link href="/admin/integraciones" className="inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white">← Volver a integraciones</Link>
        <p className="mt-8 inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.28em] text-sky-100"><Plug className="h-3.5 w-3.5" /> Mercado Pago MCP</p>
        <h1 className="mt-5 text-4xl font-black tracking-[-.06em] md:text-6xl">Centro MCP y pruebas Mercado Pago.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Accesos directos para conectar Mercado Pago con agentes IA, revisar credenciales TEST, crear usuarios de prueba, configurar webhooks y validar tarjetas sandbox.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        {links.map((item) => {
          const Icon = item.icon;
          return <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className="group rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 transition hover:border-sky-300/35 hover:bg-sky-400/10">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-400/15 text-sky-100"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black tracking-[-.03em] text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-zinc-500 transition group-hover:text-sky-200" />
            </div>
          </a>;
        })}
      </section>

      <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
          <h2 className="text-2xl font-black tracking-[-.04em]">Checklist para que el pago TEST funcione</h2>
          <div className="mt-5 grid gap-3">
            {checklist.map((item) => <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 text-zinc-300"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />{item}</div>)}
          </div>
        </article>

        <aside className="space-y-4">
          <article className="rounded-[2rem] border border-amber-300/20 bg-amber-400/10 p-5">
            <ShieldCheck className="h-8 w-8 text-amber-200" />
            <h2 className="mt-4 text-2xl font-black tracking-[-.04em]">Por qué te salió “No pudimos procesar tu pago”</h2>
            <p className="mt-3 text-sm leading-7 text-amber-50/80">Eso suele pasar cuando pagas en sandbox con la misma cuenta vendedora, con una tarjeta no válida para pruebas, con un comprador real o con credenciales TEST que no pertenecen a un usuario vendedor de prueba.</p>
          </article>
          <Link href="/admin/pagos/mercadopago-test" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-300 px-5 py-4 text-sm font-black text-black">Ir a prueba de credenciales <ArrowRight className="h-4 w-4" /></Link>
        </aside>
      </section>
    </section>
  </main>;
}
