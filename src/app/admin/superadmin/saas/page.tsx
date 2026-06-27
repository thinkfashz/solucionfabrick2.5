import Link from 'next/link';
import { Building2, FlaskConical, Palette, Rocket, ShieldCheck, UserPlus } from 'lucide-react';
import { SaaSRuntimeToggle } from '@/components/admin/SaaSRuntimeToggle';

const modules = [
  {
    href: '/admin/superadmin/saas/onboarding',
    title: 'Estado onboarding real',
    description: 'Verifica tablas, variables, correo y módulos antes de crear empresas piloto desde registro.',
    icon: UserPlus,
  },
  {
    href: '/admin/superadmin/saas/creador',
    title: 'Tester creador SaaS',
    description: 'Simula el alta de una empresa, su admin dueño, plan, slug y flujo inicial sin tocar la migración.',
    icon: FlaskConical,
  },
  {
    href: '/admin/superadmin/saas/demo',
    title: 'Empresa demo',
    description: 'Plantilla de empresa de prueba para validar branding, módulos, páginas públicas e integraciones.',
    icon: Building2,
  },
  {
    href: '/admin/mi-empresa',
    title: 'Paletas tenant',
    description: 'Configura logo, color principal y paleta visual que alimentará la interfaz pública del sistema.',
    icon: Palette,
  },
  {
    href: '/admin/integraciones',
    title: 'Integraciones por tenant',
    description: 'Revisa MercadoPago, Resend, Cloudinary y APIs guardadas por empresa.',
    icon: ShieldCheck,
  },
];

export default function SuperAdminSaaSPage() {
  return <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6">
    <section className="mx-auto max-w-7xl space-y-5">
      <header className="overflow-hidden rounded-[2.5rem] border border-violet-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(139,92,246,.28),transparent_34rem),linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.025))] p-6 shadow-2xl shadow-black/40 md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-violet-300/30 bg-violet-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.28em] text-violet-200"><Rocket className="h-3.5 w-3.5" /> Super Admin · SaaS</p>
        <h1 className="mt-5 text-4xl font-black tracking-[-.06em] md:text-6xl">Control central del SaaS</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">Centro para controlar empresas, validar el creador SaaS, probar tenants de ejemplo y revisar que cada cliente tenga su propia marca, plan, integraciones y paleta visual.</p>
      </header>

      <SaaSRuntimeToggle />

      <section className="grid gap-4 md:grid-cols-4">
        {[
          ['Modo actual', 'Compatible, sin RLS final'],
          ['Migración', 'Diferida al final'],
          ['Branding', 'Paletas activas'],
          ['Acceso', 'Solo superadmin'],
        ].map(([label, value]) => <article key={label} className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-200">{label}</p>
          <p className="mt-2 text-lg font-black text-white">{value}</p>
        </article>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {modules.map((item) => {
          const Icon = item.icon;
          return <Link key={item.href} href={item.href} className="group rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 transition hover:border-violet-300/35 hover:bg-violet-400/10">
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-400/15 text-violet-100"><Icon className="h-5 w-5" /></span>
              <div>
                <h2 className="text-xl font-black tracking-[-.03em] text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{item.description}</p>
              </div>
            </div>
          </Link>;
        })}
      </section>

      <section className="rounded-[2rem] border border-amber-300/15 bg-amber-400/10 p-5 text-sm leading-7 text-amber-50">
        <p className="font-black">Regla de operación:</p>
        <p className="mt-1">Seguimos desarrollando módulos SaaS en modo compatible. La migración final y RLS quedan para el cierre, después de probar dos empresas reales o demo sin fuga de datos.</p>
      </section>
    </section>
  </main>;
}
