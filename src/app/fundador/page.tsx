import type { Metadata } from 'next';
import Link from 'next/link';
import { Outfit } from 'next/font/google';
import {
  ArrowDown,
  ArrowUpRight,
  ExternalLink,
  QrCode,
} from 'lucide-react';
import FounderExperience from '@/components/founder/FounderExperience';
import { getPublicFounderProfile } from '@/lib/founderProfileServer';
import { PUBLIC_FOUNDER_URL } from '@/lib/founderProfile';

export const dynamic = 'force-dynamic';

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-founder-display',
  weight: ['500', '600', '700', '800'],
});

const displayStyle = { fontFamily: 'var(--font-founder-display), Manrope, ui-sans-serif, system-ui, sans-serif' } as const;

const appMap = [
  {
    title: 'Sitio y servicios',
    text: 'Presentación de servicios, proyectos, contacto y contenido para explicar con claridad qué puede resolver Soluciones Fabrick.',
  },
  {
    title: 'Presupuestos y cálculo',
    text: 'Herramientas para estimar partidas, materiales, superficies, equipos y alcances antes de ejecutar una obra.',
  },
  {
    title: 'Tienda y compra',
    text: 'Catálogo, fichas de producto, carrito, checkout y flujos comerciales integrados dentro de una misma experiencia.',
  },
  {
    title: 'Visualización técnica',
    text: 'Visores, esquemas y experiencias 3D para comprender capas, estructuras, medidas y soluciones constructivas.',
  },
  {
    title: 'Administración y Visual CMS',
    text: 'Panel interno para gestionar contenido, tienda, operaciones y editar visualmente el sitio sin rehacer su lógica.',
  },
  {
    title: 'Automatización e inteligencia',
    text: 'Capas de automatización e IA orientadas a reducir tareas repetitivas, organizar información y apoyar decisiones operativas.',
  },
];

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'SF';
}

function cleanBrandCopy(value: string) {
  return value
    .replace(/\bSoluciones(?:\s+Soluciones)+\s+Fabrick\b/gi, 'Soluciones Fabrick')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function externalUrl(value: string | null, network: 'web' | 'instagram' | 'facebook' | 'linkedin' | 'whatsapp' = 'web') {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const clean = value.trim().replace(/^@/, '');
  if (network === 'instagram') return clean ? `https://instagram.com/${clean}` : null;
  if (network === 'facebook') return clean ? `https://facebook.com/${clean}` : null;
  if (network === 'linkedin') return clean ? `https://linkedin.com/in/${clean}` : null;
  if (network === 'whatsapp') {
    const digits = value.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : null;
  }
  return value.includes('.') ? `https://${value}` : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const founder = await getPublicFounderProfile();
  const title = `${founder.displayName} — Fundador de Soluciones Fabrick`;
  const description = cleanBrandCopy(
    founder.profile.headline || 'Construcción real, tecnología útil y herramientas digitales creadas para resolver problemas concretos.',
  );
  const shareImage = `${PUBLIC_FOUNDER_URL}/opengraph-image`;

  return {
    title: { absolute: title },
    description,
    keywords: [
      founder.displayName,
      'Fundador Soluciones Fabrick',
      'Soluciones Fabrick',
      'construcción y tecnología',
      'desarrollo de software',
      'automatización para construcción',
      'Three.js',
      'Visual CMS',
    ],
    authors: [{ name: founder.displayName }],
    creator: founder.displayName,
    alternates: { canonical: PUBLIC_FOUNDER_URL },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    openGraph: {
      title,
      description,
      url: PUBLIC_FOUNDER_URL,
      siteName: 'Soluciones Fabrick',
      locale: 'es_CL',
      type: 'profile',
      images: [{
        url: shareImage,
        width: 1200,
        height: 630,
        alt: `${founder.displayName}, fundador de Soluciones Fabrick`,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [shareImage],
    },
  };
}

export default async function FounderPage() {
  const founder = await getPublicFounderProfile();
  const profile = founder.profile;
  const summary = cleanBrandCopy(profile.summary);
  const biography = cleanBrandCopy(profile.biography);
  const qrUrl = `https://quickchart.io/qr?size=220&margin=1&ecLevel=H&text=${encodeURIComponent(PUBLIC_FOUNDER_URL)}`;
  const links = [
    { label: 'Instagram', href: externalUrl(founder.instagram, 'instagram') },
    { label: 'Facebook', href: externalUrl(founder.facebook, 'facebook') },
    { label: 'LinkedIn', href: externalUrl(founder.linkedin, 'linkedin') },
    { label: 'Sitio web', href: externalUrl(founder.website) },
    { label: 'WhatsApp', href: externalUrl(founder.whatsapp, 'whatsapp') },
  ].filter((item): item is { label: string; href: string } => Boolean(item.href));

  const storyCards = [
    { title: 'Origen', text: cleanBrandCopy(profile.origin) },
    { title: 'Misión', text: cleanBrandCopy(profile.mission) },
    { title: 'Visión', text: cleanBrandCopy(profile.vision) },
    { title: 'Proyección', text: cleanBrandCopy(profile.projection) },
  ];

  return (
    <main
      data-founder-page
      data-no-tenant-copy
      className={`${outfit.variable} relative isolate min-h-screen overflow-hidden bg-[#08090a] text-[#f6f1e8]`}
    >
      <FounderExperience />

      <div className="relative z-10">
        <section className="relative min-h-[92svh] border-b border-white/[.07]">
          <div className="mx-auto grid min-h-[92svh] max-w-[1380px] items-center gap-12 px-5 pb-16 pt-24 sm:px-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,.62fr)] lg:gap-16 lg:px-10 lg:pb-20 lg:pt-28 xl:px-14">
            <div className="max-w-5xl">
              <p
                data-founder-hero
                className="inline-flex min-h-9 items-center rounded-full border border-[#ffbd52]/25 bg-[#ffb000]/[.055] px-4 text-[9px] font-extrabold uppercase tracking-[.24em] text-[#ffd78c] sm:text-[10px]"
              >
                Quién está detrás de la plataforma
              </p>

              <h1
                data-founder-hero
                style={displayStyle}
                className="mt-7 max-w-[12ch] break-words text-[clamp(3.05rem,10.5vw,7.4rem)] font-semibold leading-[.86] tracking-[-.075em] text-[#fffaf1]"
              >
                {founder.displayName}
              </h1>

              <p
                data-founder-hero
                className="mt-7 max-w-3xl text-[11px] font-extrabold uppercase leading-6 tracking-[.18em] text-[#d8b87b] sm:text-xs sm:leading-7"
              >
                {cleanBrandCopy(profile.role)}
              </p>

              <p
                data-founder-hero
                className="mt-7 max-w-3xl text-[clamp(1.15rem,3.6vw,1.75rem)] font-medium leading-[1.5] tracking-[-.025em] text-white/72"
              >
                {cleanBrandCopy(profile.headline)}
              </p>

              <div data-founder-hero className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#ffb000] px-5 text-xs font-extrabold text-[#18120a] shadow-[0_12px_45px_rgba(255,176,0,.18)] transition hover:-translate-y-0.5 hover:bg-[#ffc038]"
                >
                  Ver Soluciones Fabrick <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contacto"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/12 bg-white/[.035] px-5 text-xs font-extrabold text-white/82 transition hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[.07]"
                >
                  Contacto <ExternalLink className="h-4 w-4" />
                </Link>
              </div>

              <a
                data-founder-hero
                href="#biografia"
                className="mt-12 inline-flex items-center gap-3 text-[10px] font-extrabold uppercase tracking-[.19em] text-white/38 transition hover:text-white/66"
              >
                Conocer la historia <ArrowDown className="h-3.5 w-3.5" />
              </a>
            </div>

            <aside data-founder-hero className="relative lg:justify-self-end">
              <div className="relative overflow-hidden rounded-[30px] border border-white/[.09] bg-[#0b0c0d]/70 p-3 shadow-[0_34px_110px_rgba(0,0,0,.38)] sm:p-4">
                <div data-founder-portrait className="relative aspect-[4/4.55] overflow-hidden rounded-[24px] bg-white/[.035]">
                  {founder.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={founder.avatarUrl} alt={founder.displayName} className="h-full w-full object-cover" />
                  ) : (
                    <span style={displayStyle} className="grid h-full w-full place-items-center text-6xl font-semibold tracking-[-.07em] text-[#ffbd52]">
                      {initials(founder.displayName)}
                    </span>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_62%,rgba(5,6,7,.62))]" />
                </div>

                <div className="px-2 pb-2 pt-5 sm:px-3">
                  <p className="text-[15px] leading-7 text-white/63">{summary}</p>

                  {links.length ? (
                    <div className="mt-5 grid grid-cols-2 gap-2" data-founder-stagger>
                      {links.map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center justify-between gap-2 rounded-xl border border-white/[.08] bg-white/[.025] px-3 text-[11px] font-bold text-white/72 transition hover:border-[#ffbd52]/25 hover:bg-[#ffb000]/[.055] hover:text-white"
                        >
                          {link.label}<ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] p-3">
                    <div className="shrink-0 rounded-xl bg-[#fffaf0] p-1.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrUrl} alt="QR para abrir el perfil público del fundador" className="h-[78px] w-[78px] object-contain sm:h-[86px] sm:w-[86px]" />
                    </div>
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[.16em] text-[#ffcb6e]"><QrCode className="h-3.5 w-3.5" /> Perfil público</span>
                      <p className="mt-2 text-xs font-semibold leading-5 text-white/67">Escanea para abrir o compartir esta presentación.</p>
                      <p className="mt-1 truncate text-[9px] text-white/28">solucionesfabrick.com/fundador</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="biografia" className="scroll-mt-20 border-b border-white/[.07]">
          <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.72fr_1.28fr] lg:gap-20 lg:px-10 lg:py-28 xl:px-14">
            <div data-founder-reveal>
              <p className="text-[9px] font-extrabold uppercase tracking-[.24em] text-[#e5b45b]">01 · Biografía</p>
              <h2 style={displayStyle} className="mt-5 max-w-[10ch] text-[clamp(2.65rem,7vw,5.4rem)] font-semibold leading-[.96] tracking-[-.06em] text-[#fffaf1]">
                Entre la obra y el código.
              </h2>
              <p className="mt-6 max-w-md text-sm leading-7 text-white/42">Una visión práctica que conecta experiencia en terreno, diseño digital y automatización.</p>
            </div>

            <div data-founder-reveal className="space-y-6 self-end text-[clamp(1.02rem,2.4vw,1.28rem)] leading-[1.85] tracking-[-.012em] text-white/64">
              {biography.split(/\n+/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
        </section>

        <section className="border-b border-white/[.07] bg-black/[.11]">
          <div className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28 xl:px-14">
            <div data-founder-reveal className="max-w-3xl">
              <p className="text-[9px] font-extrabold uppercase tracking-[.24em] text-[#e5b45b]">02 · De dónde nace</p>
              <h2 style={displayStyle} className="mt-5 text-[clamp(2.45rem,6vw,4.8rem)] font-semibold leading-[1] tracking-[-.055em] text-[#fffaf1]">Una idea construida desde problemas reales.</h2>
            </div>

            <div data-founder-stagger className="mt-12 grid gap-px overflow-hidden rounded-[28px] border border-white/[.07] bg-white/[.07] md:grid-cols-2 xl:grid-cols-4">
              {storyCards.map((card, index) => (
                <article key={card.title} className="min-h-[300px] bg-[#0a0b0c]/94 p-6 sm:p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold uppercase tracking-[.2em] text-[#e5b45b]">{card.title}</span>
                    <span className="text-[10px] font-semibold text-white/20">0{index + 1}</span>
                  </div>
                  <p className="mt-10 text-[14px] leading-7 text-white/56">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-white/[.07]">
          <div className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28 xl:px-14">
            <div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr] lg:gap-20">
              <div data-founder-reveal>
                <p className="text-[9px] font-extrabold uppercase tracking-[.24em] text-[#e5b45b]">03 · Arquitectura</p>
                <h2 style={displayStyle} className="mt-5 max-w-[10ch] text-[clamp(2.55rem,6vw,4.9rem)] font-semibold leading-[.98] tracking-[-.055em] text-[#fffaf1]">Una plataforma, varias capas conectadas.</h2>
                <p className="mt-6 max-w-md text-sm leading-7 text-white/43">No es solo un sitio comercial: reúne presentación, cálculo, compra, visualización, administración y automatización.</p>
              </div>

              <div data-founder-stagger className="grid gap-3 sm:grid-cols-2">
                {appMap.map((item, index) => (
                  <article key={item.title} className="rounded-[22px] border border-white/[.08] bg-white/[.025] p-5 transition hover:-translate-y-1 hover:border-[#e5b45b]/20 hover:bg-white/[.045] sm:p-6">
                    <span className="text-[9px] font-extrabold tracking-[.18em] text-[#e5b45b]">{String(index + 1).padStart(2, '0')}</span>
                    <h3 style={displayStyle} className="mt-6 text-xl font-semibold tracking-[-.035em] text-[#fffaf1]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-white/48">{item.text}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-white/[.07] bg-black/[.12]">
          <div className="mx-auto grid max-w-[1380px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-28 xl:px-14">
            <div data-founder-reveal>
              <p className="text-[9px] font-extrabold uppercase tracking-[.24em] text-[#e5b45b]">04 · Tecnología</p>
              <h2 style={displayStyle} className="mt-5 text-[clamp(2.4rem,5.3vw,4.35rem)] font-semibold leading-[1] tracking-[-.055em] text-[#fffaf1]">El lenguaje detrás de Fabrick.</h2>
              <p className="mt-5 max-w-xl text-sm leading-7 text-white/45">Frontend, backend, datos, 3D, medios en la nube, despliegue continuo e inteligencia artificial trabajando como un solo sistema.</p>
              <div data-founder-stagger className="mt-8 flex flex-wrap gap-2">
                {profile.stack.map((item) => (
                  <span key={item} className="rounded-full border border-white/[.09] bg-white/[.025] px-3.5 py-2 text-[10px] font-bold text-white/60">{item}</span>
                ))}
              </div>
            </div>

            <div data-founder-reveal>
              <p className="text-[9px] font-extrabold uppercase tracking-[.24em] text-[#e5b45b]">05 · Servicios</p>
              <h2 style={displayStyle} className="mt-5 text-[clamp(2.4rem,5.3vw,4.35rem)] font-semibold leading-[1] tracking-[-.055em] text-[#fffaf1]">Qué ofrece Soluciones Fabrick.</h2>
              <div data-founder-stagger className="mt-8 grid gap-2 sm:grid-cols-2">
                {profile.services.map((item, index) => (
                  <div key={item} className="flex min-h-16 items-center gap-3 rounded-2xl border border-white/[.08] bg-white/[.025] px-4 py-3 text-sm font-semibold leading-6 text-white/60">
                    <span className="text-[9px] font-extrabold text-[#e5b45b]">{String(index + 1).padStart(2, '0')}</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative">
          <div className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 lg:px-10 lg:py-28 xl:px-14">
            <div data-founder-reveal className="grid gap-10 rounded-[30px] border border-white/[.08] bg-white/[.025] p-6 sm:p-8 lg:grid-cols-[.75fr_1.25fr] lg:gap-16 lg:p-10">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[.24em] text-[#e5b45b]">06 · Principios</p>
                <h2 style={displayStyle} className="mt-5 max-w-[11ch] text-[clamp(2.35rem,5.4vw,4.45rem)] font-semibold leading-[1] tracking-[-.055em] text-[#fffaf1]">Lo que buscamos cuidar mientras crece.</h2>
              </div>
              <div data-founder-stagger className="grid gap-px overflow-hidden rounded-2xl bg-white/[.07] sm:grid-cols-2">
                {profile.values.map((value, index) => (
                  <div key={value} className="flex min-h-24 gap-4 bg-[#090a0b]/88 p-4 sm:p-5">
                    <span className="pt-0.5 text-[9px] font-extrabold text-[#e5b45b]">{String(index + 1).padStart(2, '0')}</span>
                    <p className="text-sm font-semibold leading-6 text-white/58">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div data-founder-reveal className="mt-14 flex flex-col items-start justify-between gap-6 border-t border-white/[.07] pt-8 sm:flex-row sm:items-end">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-[.2em] text-white/32">Soluciones Fabrick</p>
                <p style={displayStyle} className="mt-2 text-2xl font-semibold tracking-[-.04em] text-white/78">Construcción real. Tecnología útil.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ffb000] px-4 text-xs font-extrabold text-[#18120a]">Explorar la plataforma <ArrowUpRight className="h-4 w-4" /></Link>
                <Link href="/contacto" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[.03] px-4 text-xs font-extrabold text-white/75">Conversar <ArrowUpRight className="h-4 w-4" /></Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
