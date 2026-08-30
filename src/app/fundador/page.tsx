import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowUpRight,
  Blocks,
  Bot,
  Building2,
  Code2,
  Compass,
  ExternalLink,
  Hammer,
  Layers3,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { getPublicFounderProfile } from '@/lib/founderProfileServer';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Fundador | Soluciones Fabrick',
  description: 'Conoce la historia, la visión, la tecnología y los servicios detrás de Soluciones Fabrick.',
  alternates: { canonical: 'https://www.solucionesfabrick.com/fundador' },
  openGraph: {
    title: 'Fundador de Soluciones Fabrick',
    description: 'Construcción real, tecnología útil y herramientas creadas para resolver problemas concretos.',
    url: 'https://www.solucionesfabrick.com/fundador',
    type: 'profile',
  },
};

const appMap = [
  {
    icon: Building2,
    title: 'Sitio y servicios',
    text: 'Presentación de servicios, proyectos, contacto y contenido para explicar de forma clara qué puede resolver Soluciones Fabrick.',
  },
  {
    icon: Layers3,
    title: 'Presupuestos y cálculo',
    text: 'Herramientas para estimar partidas, materiales, superficies, equipos y alcances antes de ejecutar una obra.',
  },
  {
    icon: ShoppingBag,
    title: 'Tienda y compra',
    text: 'Catálogo, fichas de producto, carrito, checkout y flujos comerciales integrados dentro de la misma experiencia.',
  },
  {
    icon: Blocks,
    title: 'Visualización técnica',
    text: 'Visores, esquemas y experiencias 3D para ayudar a entender capas, estructuras, medidas y soluciones constructivas.',
  },
  {
    icon: Code2,
    title: 'Administración y Visual CMS',
    text: 'Panel interno para gestionar contenido, tienda, operaciones y editar visualmente partes del sitio sin rehacer la lógica de la aplicación.',
  },
  {
    icon: Bot,
    title: 'Automatización e inteligencia',
    text: 'Capas de automatización e inteligencia orientadas a reducir tareas repetitivas, organizar información y apoyar decisiones operativas.',
  },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
}

function externalUrl(value: string | null, network = 'web') {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (network === 'instagram' && value.startsWith('@')) return `https://instagram.com/${value.slice(1)}`;
  if (network === 'linkedin' && value.startsWith('@')) return `https://linkedin.com/in/${value.slice(1)}`;
  if (network === 'whatsapp') {
    const digits = value.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  }
  return value.includes('.') ? `https://${value}` : null;
}

export default async function FounderPage() {
  const founder = await getPublicFounderProfile();
  const profile = founder.profile;
  const links = [
    { label: 'Instagram', href: externalUrl(founder.instagram, 'instagram') },
    { label: 'LinkedIn', href: externalUrl(founder.linkedin, 'linkedin') },
    { label: 'Sitio web', href: externalUrl(founder.website) },
    { label: 'WhatsApp', href: externalUrl(founder.whatsapp, 'whatsapp') },
  ].filter((item): item is { label: string; href: string } => Boolean(item.href));

  return (
    <main className="min-h-screen bg-[#08090a] text-[#fff9ee]">
      <section className="relative isolate overflow-hidden border-b border-white/10">
        {founder.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={founder.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        ) : null}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(255,176,0,.20),transparent_34%),linear-gradient(180deg,rgba(8,9,10,.58),#08090a_88%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10 lg:pb-24 lg:pt-36">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.18em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" /> Quién está detrás de la plataforma
            </div>
            <h1 className="mt-6 max-w-4xl text-[clamp(2.7rem,8vw,6.7rem)] font-black leading-[.91] tracking-[-.065em] text-white">
              {founder.displayName}
            </h1>
            <p className="mt-5 max-w-3xl text-sm font-bold uppercase tracking-[.14em] text-amber-200/75 sm:text-base">{profile.role}</p>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-white/68 sm:text-xl sm:leading-9">{profile.headline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ffb000] px-5 text-xs font-black text-[#17120b] transition hover:brightness-110">
                Ver Soluciones Fabrick <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link href="/contacto" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 text-xs font-black text-white transition hover:bg-white/10">
                Contacto <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <aside className="self-end rounded-[28px] border border-white/10 bg-black/35 p-5 shadow-2xl backdrop-blur-xl">
            <div className="relative mx-auto grid aspect-square w-full max-w-[280px] place-items-center overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
              {founder.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={founder.avatarUrl} alt={founder.displayName} className="h-full w-full object-cover" />
              ) : (
                <span className="text-5xl font-black tracking-[-.06em] text-amber-300">{initials(founder.displayName)}</span>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />
            </div>
            <p className="mt-5 text-sm leading-6 text-white/56">{profile.summary}</p>
            {links.length ? (
              <div className="mt-5 grid grid-cols-2 gap-2">
                {links.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-[11px] font-bold text-white/72 hover:bg-white/[.08]">
                    {link.label}<ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[.78fr_1.22fr] lg:gap-16">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Biografía</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-white sm:text-4xl">Entre la obra y el código.</h2>
          </div>
          <div className="space-y-6 text-base leading-8 text-white/64 sm:text-lg sm:leading-9">
            {profile.biography.split(/\n+/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-white/[.025]">
        <div className="mx-auto grid max-w-7xl gap-4 px-5 py-16 sm:px-8 md:grid-cols-2 lg:grid-cols-4 lg:px-10 lg:py-20">
          {[
            { icon: Hammer, title: 'Origen', text: profile.origin },
            { icon: Compass, title: 'Misión', text: profile.mission },
            { icon: ShieldCheck, title: 'Visión', text: profile.vision },
            { icon: Rocket, title: 'Proyección', text: profile.projection },
          ].map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-[24px] border border-white/10 bg-[#0d0f10] p-5 sm:p-6">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300/10 text-amber-300"><Icon className="h-4.5 w-4.5" /></span>
              <h3 className="mt-5 text-lg font-black tracking-[-.025em] text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/52">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Cómo está organizada la aplicación</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-white sm:text-4xl">Una plataforma, varias capas conectadas.</h2>
          <p className="mt-4 text-base leading-7 text-white/55">La aplicación no es solo una página comercial: reúne presentación, cálculo, compra, visualización, administración y automatización dentro de un mismo sistema.</p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {appMap.map(({ icon: Icon, title, text }, index) => (
            <article key={title} className="group rounded-[24px] border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-1 hover:border-amber-300/20 hover:bg-white/[.055] sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300/10 text-amber-300"><Icon className="h-4.5 w-4.5" /></span>
                <span className="text-xs font-black text-white/20">0{index + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-black tracking-[-.025em] text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/50">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-gradient-to-b from-amber-300/[.055] to-transparent">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:px-10 lg:py-24">
          <div>
            <div className="flex items-center gap-2 text-amber-300"><Code2 className="h-5 w-5" /><span className="text-[10px] font-black uppercase tracking-[.2em]">Tecnología</span></div>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-white">El lenguaje detrás de Fabrick.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/52">La plataforma combina frontend, backend, bases de datos, visualización 3D, medios en la nube, despliegue continuo e inteligencia artificial.</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {profile.stack.map((item) => <span key={item} className="rounded-full border border-white/10 bg-white/[.045] px-3 py-2 text-[11px] font-bold text-white/66">{item}</span>)}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-amber-300"><Wrench className="h-5 w-5" /><span className="text-[10px] font-black uppercase tracking-[.2em]">Servicios</span></div>
            <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-white">Qué ofrece Soluciones Fabrick.</h2>
            <div className="mt-7 grid gap-2 sm:grid-cols-2">
              {profile.services.map((item) => (
                <div key={item} className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[.035] px-4 py-3 text-sm font-bold text-white/66">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300" />{item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:px-10 lg:py-24">
        <div className="rounded-[30px] border border-white/10 bg-white/[.035] p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.2em] text-amber-300">Principios</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-.045em] text-white">Lo que buscamos cuidar mientras crece.</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {profile.values.map((value, index) => (
                <div key={value} className="flex gap-3 rounded-2xl border border-white/10 bg-[#0d0f10] p-4">
                  <span className="text-xs font-black text-amber-300">{String(index + 1).padStart(2, '0')}</span>
                  <p className="text-sm font-bold leading-6 text-white/62">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
