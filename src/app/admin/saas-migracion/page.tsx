import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ClipboardCheck, Database, ExternalLink, ShieldCheck, TerminalSquare } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Migración SaaS | Admin Fabrick',
  description: 'Acceso guiado a migraciones multi-tenant y endurecimiento SaaS.',
};

const repoBase = 'https://github.com/thinkfashz/solucionfabrick2.5/blob/radier-engine-ui';
const migrationFiles = [
  {
    title: '1. Migración multi-tenant base',
    path: 'scripts/add-multitenancy.sql',
    href: `${repoBase}/scripts/add-multitenancy.sql`,
    text: 'Crea planes, tenants, suscripciones y agrega tenant_id a tablas existentes.',
  },
  {
    title: '2. Endurecimiento SaaS',
    path: 'scripts/saas-tenant-hardening.sql',
    href: `${repoBase}/scripts/saas-tenant-hardening.sql`,
    text: 'Agrega constraints únicos e índices para evitar colisiones entre empresas.',
  },
];

const checklist = [
  'Hacer respaldo de la base antes de ejecutar SQL.',
  'Ejecutar primero add-multitenancy.sql.',
  'Ejecutar después saas-tenant-hardening.sql.',
  'Verificar tenants, platform_plans y platform_subscriptions.',
  'Validar unique provider + tenant_id en integrations.',
  'Validar unique email + tenant_id en admin_users.',
  'Probar dos empresas distintas sin fuga de datos.',
];

export default function SaasMigrationAdminPage() {
  return <main className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6">
    <section className="mx-auto max-w-6xl space-y-5">
      <header className="relative overflow-hidden rounded-[2.4rem] border border-amber-300/20 bg-[radial-gradient(circle_at_85%_0%,rgba(245,158,11,.25),transparent_30rem),linear-gradient(135deg,rgba(255,255,255,.07),rgba(255,255,255,.025))] p-6 shadow-2xl shadow-black/40 md:p-8">
        <div className="relative z-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[.28em] text-amber-200"><ShieldCheck className="h-3.5 w-3.5" /> SaaS seguro</p>
          <h1 className="mt-5 text-4xl font-black tracking-[-.06em] md:text-6xl">Migración multi-tenant</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-300">Acceso rápido a los archivos SQL necesarios para dejar la base lista para vender como SaaS. La ejecución es manual por seguridad.</p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {migrationFiles.map((file) => <article key={file.path} className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-amber-400/10 p-2 text-amber-300 ring-1 ring-amber-300/25"><Database className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-black text-white">{file.title}</h2>
              <p className="mt-1 text-xs leading-5 text-zinc-400">{file.text}</p>
              <code className="mt-3 block rounded-2xl border border-white/10 bg-black/40 p-3 text-xs text-amber-100">{file.path}</code>
            </div>
          </div>
          <a href={file.href} target="_blank" rel="noreferrer" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3 text-sm font-black text-black transition hover:bg-amber-300">
            Abrir archivo SQL <ExternalLink className="h-4 w-4" />
          </a>
        </article>)}
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30">
          <div className="flex items-center gap-3">
            <TerminalSquare className="h-6 w-6 text-amber-300" />
            <h2 className="text-2xl font-black">Comandos de validación</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Después de ejecutar las migraciones, revisa la base y corre el auditor del proyecto.</p>
          <pre className="mt-4 overflow-auto rounded-3xl border border-white/10 bg-black/55 p-4 text-xs leading-6 text-zinc-200">{`pnpm audit:tenant
pnpm typecheck
pnpm build

-- SQL de verificación:
select count(*) from tenants;
select count(*) from platform_plans;
select count(*) from platform_subscriptions;`}</pre>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white">Volver al admin <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/admin/integraciones" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-black">Probar integraciones <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </article>

        <aside className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-6 w-6 text-emerald-300" />
            <h2 className="text-2xl font-black">Checklist</h2>
          </div>
          <div className="mt-5 space-y-3">
            {checklist.map((item) => <div key={item} className="flex gap-3 rounded-2xl border border-white/10 bg-black/35 p-3 text-sm leading-5 text-zinc-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <span>{item}</span>
            </div>)}
          </div>
        </aside>
      </section>
    </section>
  </main>;
}
