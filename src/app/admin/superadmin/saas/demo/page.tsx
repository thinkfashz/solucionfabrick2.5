import Link from 'next/link';
import { Building2, CheckCircle2, Palette, Rocket, Store } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TENANT_PALETTES } from '@/lib/tenantTheme';

const demo = {
  name: 'Clima Demo Chile',
  slug: 'clima-demo',
  owner: 'faubricioedms+clima-demo@gmail.com',
  plan: 'pro',
  niche: 'Instalación de aire acondicionado y servicios técnicos',
};

const testCards: Array<{ title: string; text: string; icon: LucideIcon }> = [
  { title: 'Branding', text: 'Logo, color aqua, botones y fondos con variables del tenant.', icon: Palette },
  { title: 'Tienda', text: 'Catálogo filtrado por tenant_id y diseño con color del cliente.', icon: Store },
  { title: 'Presupuestos', text: 'Links públicos con marca de la empresa y datos del negocio.', icon: CheckCircle2 },
  { title: 'Pagos', text: 'MercadoPago por tenant cuando se configure access token propio.', icon: CheckCircle2 },
];

export default function SaaSDemoCompanyPage() {
  const palette = TENANT_PALETTES.find((item) => item.id === 'aqua') ?? TENANT_PALETTES[0];
  return <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6">
    <section className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-[2.5rem] border border-white/10 p-6 md:p-8" style={{ background: `radial-gradient(circle at 80% 0%, ${palette.primary}33, transparent 34rem), linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.025))` }}>
        <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.28em]" style={{ color: palette.accent }}><Building2 className="h-3.5 w-3.5" /> Demo · Tenant</p>
        <h1 className="mt-5 text-4xl font-black tracking-[-.06em] md:text-6xl">Empresa demo SaaS</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Plantilla para validar cómo se vería una empresa cliente con su propia marca, color, plan, usuario administrador, tienda, presupuestos e integraciones.</p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <article className="rounded-[2rem] border border-white/10 p-5" style={{ background: `linear-gradient(145deg, ${palette.background}, ${palette.surface})` }}>
          <div className="grid h-16 w-16 place-items-center rounded-2xl text-xl font-black text-black" style={{ background: palette.primary }}>CD</div>
          <h2 className="mt-4 text-3xl font-black tracking-[-.05em]" style={{ color: palette.text }}>{demo.name}</h2>
          <p className="mt-2 text-sm" style={{ color: palette.accent }}>{demo.slug}.solucionesfabrick.com</p>
          <div className="mt-5 grid gap-2 text-sm text-zinc-300">
            <span>Dueño/admin: {demo.owner}</span>
            <span>Plan: {demo.plan}</span>
            <span>Nicho: {demo.niche}</span>
          </div>
          <button className="mt-5 w-full rounded-2xl px-4 py-3 text-sm font-black text-black" style={{ background: palette.primary }}>Vista previa tienda</button>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5">
          <h2 className="flex items-center gap-2 text-2xl font-black tracking-[-.04em]"><Rocket className="h-5 w-5 text-cyan-200" /> Qué debe probar esta empresa</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {testCards.map((item) => {
              const Icon = item.icon;
              return <div key={item.title} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <Icon className="h-5 w-5 text-cyan-200" />
                <p className="mt-3 text-sm font-black text-white">{item.title}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-400">{item.text}</p>
              </div>;
            })}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin/mi-empresa" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Editar marca</Link>
            <Link href="/admin/superadmin/saas/creador" className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Volver al tester</Link>
          </div>
        </article>
      </section>
    </section>
  </main>;
}
