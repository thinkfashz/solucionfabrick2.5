import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowRight, Check, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';
import ServiceQuoteCalculator from '@/components/servicios/ServiceQuoteCalculator';
import { getWhatsAppNumber } from '@/lib/whatsapp';

export interface ServicePageContent {
  slug: string;
  eyebrow: string;
  heroTitle: string;
  heroDescription: string;
  icon: LucideIcon;
  overview: string;
  /** Short offer name shown in the JSON-LD Service schema */
  serviceType: string;
  priceFrom?: string;
  /** 4–6 bullets, technical scope */
  scope: string[];
  /** 3 process steps */
  process: Array<{ step: string; detail: string }>;
  /** 3–5 FAQs for FAQPage JSON-LD */
  faqs: Array<{ question: string; answer: string }>;
  relatedSlugs: string[];
}

const BASE_URL = 'https://www.solucionesfabrick.com';
const PROVIDER_PHONE = `+${getWhatsAppNumber()}`;

const RELATED_TITLES: Record<string, string> = {
  metalcon: 'Estructuras Metalcon',
  gasfiteria: 'Gasfitería certificada',
  electricidad: 'Instalaciones eléctricas',
  ampliaciones: 'Ampliaciones residenciales',
  cimientos: 'Cimientos y Fundaciones',
  revestimiento: 'Revestimiento y Aislación',
  pintura: 'Pintura Profesional',
  seguridad: 'Seguridad Residencial',
};

function shortText(text: string, limit = 138) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit).replace(/\s+\S*$/, '')}…`;
}

export default async function ServicePage({ content }: { content: ServicePageContent }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const { slug, eyebrow, heroTitle, heroDescription, icon: Icon, overview, serviceType, priceFrom, scope, process, faqs, relatedSlugs } = content;
  const url = `${BASE_URL}/servicios/${slug}`;

  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType,
    provider: {
      '@type': 'LocalBusiness',
      name: 'Soluciones Fabrick',
      url: BASE_URL,
      telephone: PROVIDER_PHONE,
      areaServed: { '@type': 'AdministrativeArea', name: 'Región del Maule, Chile' },
    },
    areaServed: 'Región del Maule, Chile',
    url,
    ...(priceFrom ? { offers: { '@type': 'Offer', priceCurrency: 'CLP', price: priceFrom.replace(/[^0-9]/g, ''), url } } : {}),
  };

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Servicios', item: `${BASE_URL}/servicios` },
      { '@type': 'ListItem', position: 3, name: eyebrow, item: url },
    ],
  };

  return (
    <SectionPageShell
      eyebrow={eyebrow}
      title={heroTitle}
      description={heroDescription}
      primaryAction={{ href: `/contacto?servicio=${slug}`, label: 'Solicitar evaluación' }}
      secondaryAction={{ href: '/servicios', label: 'Todos los servicios' }}
    >
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav aria-label="Migas de pan" className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
        <Link href="/" className="hover:text-yellow-400">Inicio</Link>
        <span>/</span>
        <Link href="/servicios" className="hover:text-yellow-400">Servicios</Link>
        <span>/</span>
        <span className="text-yellow-400">{eyebrow}</span>
      </nav>

      <section className="grid gap-6 rounded-[2rem] border border-white/10 bg-zinc-950/75 p-5 md:grid-cols-[auto,1fr] md:p-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-[1.3rem] border border-yellow-400/30 bg-yellow-400/10 md:h-20 md:w-20">
          <Icon className="h-8 w-8 text-yellow-400 md:h-9 md:w-9" />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-400">Resumen del servicio</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white md:text-3xl">{serviceType}</h2>
          <p className="mt-4 text-sm leading-7 text-zinc-300 md:text-base">{shortText(overview, 245)}</p>
          <div className="mt-5 rounded-2xl border border-yellow-400/20 bg-yellow-400/8 p-4 text-xs leading-6 text-zinc-300">
            <span className="mb-1 flex items-center gap-2 font-black uppercase tracking-[0.18em] text-yellow-400"><Info className="h-4 w-4" /> Precio referencial</span>
            La calculadora entrega un aproximado para orientar la conversación. El valor final se confirma con medidas reales, materiales, acceso y alcance.
          </div>
        </div>
      </section>

      <div className="mt-8">
        <ServiceQuoteCalculator slug={slug} serviceName={serviceType} />
      </div>

      <section className="mt-10 grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[2rem] border border-white/10 bg-black/55 p-5 md:p-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400">Qué incluye</h2>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-white">Lo esencial del servicio</h3>
          <ul className="mt-6 grid gap-3 md:grid-cols-2">
            {scope.slice(0, 6).map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm leading-6 text-zinc-300">{shortText(item, 105)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/75 p-5 md:p-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400">Proceso corto</h2>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-white">De la duda a la cotización</h3>
          <ol className="mt-6 grid gap-3">
            {process.slice(0, 3).map(({ step, detail }, i) => (
              <li key={step} className="rounded-[1.25rem] border border-white/8 bg-black/45 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-400">Paso {i + 1}</p>
                <p className="mt-2 font-black text-white">{step}</p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{shortText(detail, 110)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400">Preguntas frecuentes</h2>
        <div className="mt-5 divide-y divide-white/5 rounded-[1.5rem] border border-white/10 bg-zinc-950/80">
          {faqs.slice(0, 4).map(({ question, answer }) => (
            <details key={question} className="group p-5 md:p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-black tracking-[0.08em] text-white">
                {question}
                <span className="text-yellow-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-sm leading-7 text-zinc-400">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      {relatedSlugs.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400">Servicios relacionados</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {relatedSlugs.map((s) => (
              <Link
                key={s}
                href={`/servicios/${s}`}
                className="group flex items-center justify-between rounded-[1.25rem] border border-white/10 bg-zinc-950/80 p-5 transition hover:border-yellow-400/30"
              >
                <span className="text-sm font-bold uppercase tracking-[0.12em] text-white">
                  {RELATED_TITLES[s] ?? s}
                </span>
                <ArrowRight className="h-4 w-4 text-yellow-400 transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="mt-10 rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-black p-8 text-center md:p-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Siguiente paso</p>
        <h2 className="mt-4 text-3xl font-black tracking-tight text-white md:text-4xl">
          Convierte este cálculo en una cotización real
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-zinc-400">
          Envíanos las medidas, fotos o ubicación del proyecto y revisamos qué cambia antes de comprometer un precio final.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={`/contacto?servicio=${slug}`}
            className="rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-white"
          >
            Solicitar evaluación
          </Link>
          <Link
            href="/tienda"
            className="rounded-full border border-yellow-400/35 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400 transition hover:bg-yellow-400/10"
          >
            Ver productos
          </Link>
        </div>
      </div>
    </SectionPageShell>
  );
}
