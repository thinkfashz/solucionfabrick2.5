import type { Metadata } from 'next';
import { Anton } from 'next/font/google';
import { notFound } from 'next/navigation';
import {
  ArrowUpRight,
  Building2,
  Code2,
  FileText,
  Hammer,
  Instagram,
  Layers3,
  Linkedin,
  MessageCircle,
  PaintRoller,
  QrCode,
  ShoppingCart,
  Snowflake,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react';
import FounderExperience from '@/components/founder/FounderExperience';
import { getPublicFounderProfile } from '@/lib/founderProfileServer';
import { PUBLIC_FOUNDER_URL } from '@/lib/founderProfile';

export const dynamic = 'force-dynamic';

const anton = Anton({
  subsets: ['latin'],
  display: 'swap',
  weight: '400',
  variable: '--font-founder-condensed',
});

const TECH = [
  { name: 'HTML5', src: 'https://cdn.simpleicons.org/html5/E34F26' },
  { name: 'CSS3', src: 'https://cdn.simpleicons.org/css/663399' },
  { name: 'JavaScript', src: 'https://cdn.simpleicons.org/javascript/F7DF1E' },
  { name: 'TypeScript', src: 'https://cdn.simpleicons.org/typescript/3178C6' },
  { name: 'React', src: 'https://cdn.simpleicons.org/react/149ECA' },
  { name: 'Next.js', src: 'https://cdn.simpleicons.org/nextdotjs/111111' },
  { name: 'Node.js', src: 'https://cdn.simpleicons.org/nodedotjs/5FA04E' },
  { name: 'NestJS', src: 'https://cdn.simpleicons.org/nestjs/E0234E' },
  { name: 'Tailwind CSS', src: 'https://cdn.simpleicons.org/tailwindcss/06B6D4' },
  { name: 'PostgreSQL', src: 'https://cdn.simpleicons.org/postgresql/4169E1' },
  { name: 'Supabase', src: 'https://cdn.simpleicons.org/supabase/3FCF8E' },
  { name: 'GraphQL', src: 'https://cdn.simpleicons.org/graphql/E10098' },
  { name: 'Three.js', src: 'https://cdn.simpleicons.org/threedotjs/111111' },
  { name: 'Cloudinary', src: 'https://cdn.simpleicons.org/cloudinary/3448C5' },
  { name: 'Vercel', src: 'https://cdn.simpleicons.org/vercel/111111' },
] as const;

const PLATFORM = [
  { title: 'E-commerce', text: 'Catálogo, productos y materiales dentro de una experiencia comercial organizada.', icon: ShoppingCart },
  { title: 'Cotizaciones', text: 'Flujos rápidos y claros para transformar medidas y necesidades en decisiones.', icon: FileText },
  { title: 'CMS editable', text: 'Contenido, páginas y bloques que pueden administrarse sin rehacer la lógica.', icon: Code2 },
  { title: 'Visualización', text: 'Visores y recursos 3D para explicar mejor estructuras, capas, medidas y soluciones.', icon: Layers3 },
  { title: 'Administración', text: 'Operación, proyectos, pedidos, datos y herramientas reunidos en un solo panel.', icon: Building2 },
] as const;

const SERVICE_ICONS = [Hammer, PaintRoller, Layers3, Snowflake, Zap, Code2, Wrench, Building2] as const;

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

function shortHandle(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 28) || 'fundador';
}

export async function generateMetadata(): Promise<Metadata> {
  const founder = await getPublicFounderProfile();
  const title = `${founder.displayName} — Fundador`;
  const description = cleanBrandCopy(
    founder.profile.headline || 'Construcción real, tecnología útil y herramientas digitales creadas para resolver problemas concretos.',
  );
  const shareImage = `${PUBLIC_FOUNDER_URL}/opengraph-image`;

  return {
    title: { absolute: title },
    description,
    keywords: [
      founder.displayName,
      'fundador',
      'Soluciones Fabrick',
      'construcción y tecnología',
      'desarrollo de software',
      'automatización',
      'Three.js',
      'Visual CMS',
    ],
    authors: [{ name: founder.displayName }],
    creator: founder.displayName,
    alternates: { canonical: PUBLIC_FOUNDER_URL },
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false, 'max-image-preview': 'large' },
    },
    openGraph: {
      title,
      description,
      url: PUBLIC_FOUNDER_URL,
      siteName: `Perfil público · ${founder.displayName}`,
      locale: 'es_CL',
      type: 'profile',
      images: [{ url: shareImage, width: 1200, height: 630, alt: `${founder.displayName}, fundador de Soluciones Fabrick` }],
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
  if (!profile.enabled) notFound();

  const displayName = founder.displayName;
  const handle = shortHandle(displayName);
  const biography = cleanBrandCopy(profile.biography);
  const summary = cleanBrandCopy(profile.summary);
  const qrUrl = `https://quickchart.io/qr?size=320&margin=1&ecLevel=H&text=${encodeURIComponent(PUBLIC_FOUNDER_URL)}`;
  const whatsapp = externalUrl(founder.whatsapp, 'whatsapp');
  const instagram = externalUrl(founder.instagram, 'instagram');
  const linkedin = externalUrl(founder.linkedin, 'linkedin');
  const website = externalUrl(founder.website);

  const publicLinks = [
    { label: 'Instagram', href: instagram, icon: Instagram },
    { label: 'LinkedIn', href: linkedin, icon: Linkedin },
    { label: 'WhatsApp', href: whatsapp, icon: MessageCircle },
  ].filter((item): item is { label: string; href: string; icon: typeof Instagram } => Boolean(item.href));

  const story = [
    { number: '01', label: 'Origen', title: 'Una idea nacida de problemas reales.', text: cleanBrandCopy(profile.origin) },
    { number: '02', label: 'Misión', title: 'Hacer más simple lo que suele sentirse complejo.', text: cleanBrandCopy(profile.mission) },
    { number: '03', label: 'Visión', title: 'Conectar obra, información y tecnología.', text: cleanBrandCopy(profile.vision) },
    { number: '04', label: 'Proyección', title: 'Construir un ecosistema que pueda seguir creciendo.', text: cleanBrandCopy(profile.projection) },
  ];

  return (
    <main
      data-founder-page
      data-no-tenant-copy
      className={`${anton.variable} relative isolate min-h-screen overflow-hidden bg-[#f4eee3] text-[#171612]`}
    >
      <FounderExperience />

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-5 sm:px-8 lg:px-12 xl:px-16">
        <header data-founder-hero className="flex items-center justify-between gap-5 border-b border-[#171612]/12 py-5 sm:py-7">
          <div className="text-[15px] font-extrabold tracking-[-.035em] sm:text-lg">
            Soluciones <span className="text-[#b84d27]">Fabrick</span>
          </div>
          <div className="text-right text-[8px] font-extrabold uppercase leading-4 tracking-[.19em] text-[#7f7569] sm:text-[9px]">
            Perfil público independiente<br />compartido por enlace o QR
          </div>
        </header>

        <section className="relative border-b border-[#171612]/12 pb-12 pt-8 sm:pb-16 sm:pt-12 lg:pb-20">
          <p data-founder-hero className="text-[10px] font-extrabold uppercase tracking-[.42em] text-[#b84d27]">Biografía</p>
          <h1
            data-founder-hero
            className="mt-3 whitespace-nowrap font-[var(--font-founder-condensed)] text-[clamp(4.8rem,18.2vw,16rem)] leading-[.82] tracking-[-.035em] text-[#151515]"
          >
            FUNDADOR
          </h1>

          <div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,.88fr)_minmax(420px,1.12fr)] lg:items-end lg:gap-12 xl:gap-20">
            <div className="order-2 lg:order-1">
              <p data-founder-hero className="font-serif text-[clamp(2.8rem,6.6vw,6.2rem)] leading-[.78] tracking-[-.055em] text-[#1b1916]">
                f.{handle}
              </p>
              <p data-founder-hero className="mt-7 max-w-2xl text-[10px] font-extrabold uppercase leading-6 tracking-[.2em] text-[#b84d27] sm:text-xs">
                {cleanBrandCopy(profile.role)}
              </p>
              <p data-founder-hero className="mt-6 max-w-xl text-[clamp(1rem,2vw,1.24rem)] leading-8 text-[#554e45]">
                {cleanBrandCopy(profile.headline)}
              </p>

              {publicLinks.length ? (
                <div data-founder-stagger className="mt-8 flex flex-wrap gap-2.5">
                  {publicLinks.map(({ label, href, icon: Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#171612]/14 bg-white/30 px-4 text-[11px] font-extrabold text-[#2c2924] transition hover:-translate-y-0.5 hover:border-[#b84d27]/35 hover:bg-white/65"
                    >
                      <Icon className="h-3.5 w-3.5" /> {label} <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div data-founder-hero className="order-1 lg:order-2">
              <div className="relative mx-auto max-w-[620px] lg:mr-0">
                <div className="absolute left-[4%] top-[10%] h-[78%] w-[78%] rounded-full bg-[#c96037]" />
                <div className="absolute -right-3 top-9 h-28 w-28 rounded-full border border-[#171612]/14 sm:h-40 sm:w-40" />
                <div className="absolute right-[2%] top-[17%] grid grid-cols-4 gap-2 opacity-40">
                  {Array.from({ length: 16 }).map((_, index) => <span key={index} className="h-1 w-1 rounded-full bg-[#b84d27]" />)}
                </div>
                <div data-founder-portrait className="relative mx-auto aspect-[4/4.05] w-[88%] overflow-hidden rounded-t-[46%] rounded-b-[2.2rem] sm:w-[82%]">
                  {founder.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={founder.avatarUrl} alt={displayName} className="h-full w-full object-cover object-center" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-[#24211c] font-[var(--font-founder-condensed)] text-8xl text-[#f4eee3]">SF</div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_72%,rgba(23,22,18,.10))]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="biografia" className="grid gap-10 border-b border-[#171612]/12 py-16 lg:grid-cols-[.62fr_1.38fr] lg:gap-16 lg:py-24">
          <div data-founder-reveal>
            <p className="text-[9px] font-extrabold uppercase tracking-[.28em] text-[#b84d27]">Mi historia</p>
            <h2 className="mt-5 max-w-[9ch] font-serif text-[clamp(2.8rem,5.6vw,5.4rem)] leading-[.92] tracking-[-.045em]">
              Entre la obra y el código.
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-7 text-[#6c6358]">Construcción real, tecnología útil y una forma práctica de convertir necesidades de terreno en herramientas digitales.</p>
          </div>
          <div data-founder-reveal className="self-end border-l border-[#171612]/12 pl-6 sm:pl-9 lg:pl-12">
            <div className="max-w-4xl space-y-6 text-[clamp(1.02rem,2vw,1.28rem)] leading-[1.9] text-[#4f4941]">
              {biography.split(/\n+/).filter(Boolean).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
            <div className="mt-10 border-t border-[#171612]/10 pt-6">
              <p className="font-serif text-3xl italic text-[#b84d27]">{displayName}</p>
              <p className="mt-2 text-[9px] font-extrabold uppercase tracking-[.2em] text-[#6f665b]">Fundador de Soluciones Fabrick</p>
            </div>
          </div>
        </section>

        <section className="border-b border-[#171612]/12 py-16 lg:py-24">
          <div data-founder-reveal className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[.28em] text-[#b84d27]">Tecnologías y lenguajes</p>
              <h2 className="mt-4 font-serif text-[clamp(2.4rem,4.8vw,4.4rem)] leading-none tracking-[-.04em]">Herramientas que sostienen la plataforma.</h2>
            </div>
            <p className="max-w-sm text-sm leading-7 text-[#70675c]">Iconografía oficial de las principales tecnologías utilizadas en el desarrollo y operación de la aplicación.</p>
          </div>

          <div data-founder-stagger className="mt-10 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-[#171612]/10 bg-[#171612]/10 sm:grid-cols-5 lg:grid-cols-8">
            {TECH.map((tech) => (
              <div key={tech.name} className="grid min-h-[132px] place-items-center bg-[#f8f3ea]/88 p-4 text-center backdrop-blur-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tech.src} alt={`Logo ${tech.name}`} className="h-10 w-10 object-contain sm:h-11 sm:w-11" loading="lazy" />
                <span className="mt-3 text-[9px] font-extrabold tracking-[-.01em] text-[#3b3731]">{tech.name}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-12 border-b border-[#171612]/12 py-16 lg:grid-cols-[.55fr_1.45fr] lg:gap-16 lg:py-24">
          <div data-founder-reveal>
            <p className="text-[9px] font-extrabold uppercase tracking-[.28em] text-[#b84d27]">Qué hace la plataforma</p>
            <h2 className="mt-5 max-w-[10ch] font-serif text-[clamp(2.7rem,5vw,5rem)] leading-[.92] tracking-[-.045em]">Unifica construcción y tecnología en un solo sistema.</h2>
            <p className="mt-7 max-w-md text-sm leading-7 text-[#6b6358]">{summary}</p>
          </div>

          <div data-founder-stagger className="grid gap-px overflow-hidden rounded-2xl border border-[#171612]/10 bg-[#171612]/10 sm:grid-cols-2 xl:grid-cols-5">
            {PLATFORM.map(({ title, text, icon: Icon }) => (
              <article key={title} className="min-h-[235px] bg-[#f8f3ea]/90 p-5 backdrop-blur-sm">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#c96037]/10 text-[#a84825]"><Icon className="h-4.5 w-4.5" /></span>
                <h3 className="mt-7 text-[11px] font-extrabold uppercase tracking-[.09em]">{title}</h3>
                <p className="mt-3 text-xs leading-6 text-[#70675c]">{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-[#171612]/12 py-16 lg:py-24">
          <div data-founder-reveal>
            <p className="text-[9px] font-extrabold uppercase tracking-[.28em] text-[#b84d27]">Origen, misión y proyección</p>
            <h2 className="mt-5 max-w-4xl font-serif text-[clamp(2.6rem,5vw,5rem)] leading-[.94] tracking-[-.045em]">La aplicación crece desde una iniciativa práctica, no desde una idea abstracta.</h2>
          </div>
          <div data-founder-stagger className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-[#171612]/10 bg-[#171612]/10 md:grid-cols-2">
            {story.map((item) => (
              <article key={item.label} className="bg-[#f8f3ea]/90 p-6 sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-serif text-4xl text-[#c96037]">{item.number}</span>
                  <span className="text-[9px] font-extrabold uppercase tracking-[.22em] text-[#8a7e70]">{item.label}</span>
                </div>
                <h3 className="mt-7 max-w-[14ch] font-serif text-3xl leading-[1.02] tracking-[-.035em] sm:text-4xl">{item.title}</h3>
                <p className="mt-5 text-sm leading-7 text-[#625a50]">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-b border-[#171612]/12 py-16 lg:py-24">
          <div data-founder-reveal className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[.28em] text-[#b84d27]">Servicios</p>
              <h2 className="mt-5 font-serif text-[clamp(2.6rem,5vw,5rem)] leading-[.94] tracking-[-.045em]">Trabajo real, soluciones digitales.</h2>
            </div>
            <Sparkles className="hidden h-8 w-8 text-[#c96037] sm:block" />
          </div>

          <div data-founder-stagger className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {profile.services.slice(0, 8).map((service, index) => {
              const Icon = SERVICE_ICONS[index % SERVICE_ICONS.length];
              return (
                <article key={service} className="min-h-[190px] rounded-2xl border border-[#171612]/10 bg-white/28 p-5">
                  <Icon className="h-6 w-6 text-[#a84825]" />
                  <h3 className="mt-8 text-sm font-extrabold leading-6 text-[#2c2924]">{service}</h3>
                  <p className="mt-2 text-xs leading-6 text-[#756b5f]">Planificación, ejecución y herramientas claras para entender mejor cada alcance.</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="py-16 lg:py-24">
          <div data-founder-reveal className="grid gap-8 rounded-[2rem] border border-[#171612]/12 bg-[linear-gradient(105deg,rgba(255,255,255,.48),rgba(211,116,68,.10))] p-6 sm:p-8 lg:grid-cols-[.8fr_1fr_320px] lg:items-center lg:p-10">
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[.28em] text-[#b84d27]">Hablemos</p>
              <h2 className="mt-4 font-serif text-[clamp(2.5rem,4.4vw,4.3rem)] leading-[.9] tracking-[-.045em]">Construyamos algo útil.</h2>
            </div>

            <div>
              <p className="max-w-xl text-sm leading-7 text-[#61594f]">Esta página es una presentación pública independiente. No forma parte de la navegación de la tienda ni del sitio principal; se comparte directamente mediante este enlace o QR.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {whatsapp ? <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#b84d27] px-5 text-xs font-extrabold text-white"><MessageCircle className="h-4 w-4" /> Escríbeme</a> : null}
                {website ? <a href={website} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#171612]/14 bg-white/40 px-5 text-xs font-extrabold text-[#2c2924]">Sitio web <ArrowUpRight className="h-4 w-4" /></a> : null}
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-[#171612]/10 bg-[#fbf7ef]/80 p-4">
              <div className="shrink-0 rounded-xl bg-white p-1.5 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR del perfil público del fundador" className="h-[92px] w-[92px] object-contain sm:h-[108px] sm:w-[108px]" />
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[.18em] text-[#b84d27]"><QrCode className="h-3.5 w-3.5" /> Perfil público</span>
                <p className="mt-2 text-xs font-bold leading-5 text-[#4f4941]">Escanea para abrir o compartir esta biografía.</p>
                <p className="mt-1 truncate text-[9px] text-[#8b8175]">solucionesfabrick.com/fundador</p>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-col gap-4 border-t border-[#171612]/12 py-7 text-[9px] font-semibold uppercase tracking-[.14em] text-[#8b8175] sm:flex-row sm:items-center sm:justify-between">
          <span>Perfil público · {displayName}</span>
          <span>Construcción · Tecnología · Automatización</span>
        </footer>
      </div>
    </main>
  );
}
