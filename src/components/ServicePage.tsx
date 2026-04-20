import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';

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

const RELATED_TITLES: Record<string, string> = {
  metalcon: 'Estructuras Metalcon',
  gasfiteria: 'Gasfitería certificada',
  electricidad: 'Instalaciones eléctricas',
  ampliaciones: 'Ampliaciones residenciales',
};

export default function ServicePage({ content }: { content: ServicePageContent }) {
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
      telephone: '+56912345678',
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
      primaryAction={{ href: '/contacto', label: 'Cotizar ahora' }}
      secondaryAction={{ href: '/servicios', label: 'Todos los servicios' }}
    >
      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb */}
      <nav aria-label="Migas de pan" className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
        <Link href="/" className="hover:text-yellow-400">Inicio</Link>
        <span>/</span>
        <Link href="/servicios" className="hover:text-yellow-400">Servicios</Link>
        <span>/</span>
        <span className="text-yellow-400">{eyebrow}</span>
      </nav>

      {/* Overview */}
      <section className="grid gap-8 md:grid-cols-[auto,1fr] md:items-start">
        <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-yellow-400/30 bg-yellow-400/5">
          <Icon className="h-9 w-9 text-yellow-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold uppercase tracking-[0.18em] text-white">{serviceType}</h2>
          <p className="mt-4 text-base leading-relaxed text-zinc-300 md:text-lg">{overview}</p>
          {priceFrom ? (
            <p className="mt-6 inline-flex items-center gap-3 rounded-full border border-yellow-400/30 bg-black px-5 py-2 text-xs font-bold uppercase tracking-[0.2em]">
              <span className="text-zinc-400">Desde</span>
              <span className="text-yellow-400">{priceFrom}</span>
            </p>
          ) : null}
        </div>
      </section>

      {/* Scope */}
      <section className="mt-14">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">Qué incluye</h2>
        <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">Alcance técnico del servicio</h3>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {scope.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-[1.25rem] border border-white/5 bg-zinc-950/80 p-5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-400/15 text-yellow-400">
                <Check className="h-3.5 w-3.5" />
              </span>
              <span className="text-sm leading-relaxed text-zinc-300">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Process */}
      <section className="mt-14">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">Cómo trabajamos</h2>
        <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">Nuestro proceso</h3>
        <ol className="mt-8 grid gap-5 md:grid-cols-3">
          {process.map(({ step, detail }, i) => (
            <li key={step} className="rounded-[1.5rem] border border-white/5 bg-zinc-950/80 p-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">Paso {i + 1}</p>
              <p className="mt-3 text-base font-bold uppercase tracking-[0.1em] text-white">{step}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQs */}
      <section className="mt-14">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">Preguntas frecuentes</h2>
        <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">Dudas habituales</h3>
        <div className="mt-8 divide-y divide-white/5 rounded-[1.5rem] border border-white/5 bg-zinc-950/80">
          {faqs.map(({ question, answer }) => (
            <details key={question} className="group p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold uppercase tracking-[0.12em] text-white">
                {question}
                <span className="text-yellow-400 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-zinc-400">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Related services */}
      {relatedSlugs.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">Servicios relacionados</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {relatedSlugs.map((s) => (
              <Link
                key={s}
                href={`/servicios/${s}`}
                className="group flex items-center justify-between rounded-[1.25rem] border border-white/5 bg-zinc-950/80 p-6 transition hover:border-yellow-400/30"
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

      {/* CTA */}
      <div className="mt-14 rounded-[2rem] border border-yellow-400/20 bg-gradient-to-br from-yellow-400/5 to-black p-10 text-center md:p-14">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-yellow-400">Evaluación sin costo</p>
        <h2 className="mt-4 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">
          ¿Listo para coordinar tu {eyebrow.toLowerCase()}?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
          Agenda una visita técnica gratuita. Respondemos cotizaciones en menos de 24 horas hábiles.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            href={`/contacto?servicio=${slug}`}
            className="rounded-full bg-yellow-400 px-8 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-black transition hover:bg-white"
          >
            Solicitar evaluación
          </Link>
          <Link
            href="/proyectos"
            className="rounded-full border border-yellow-400/35 px-8 py-4 text-[11px] font-bold uppercase tracking-[0.22em] text-yellow-400 transition hover:bg-yellow-400/10"
          >
            Ver proyectos realizados
          </Link>
        </div>
      </div>
    </SectionPageShell>
  );
}
