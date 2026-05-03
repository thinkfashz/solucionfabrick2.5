import Link from 'next/link';
import { headers } from 'next/headers';
import { Calendar, Clock, User, ArrowLeft, MapPin, Briefcase, Timer, Target } from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';
import type { ContentPost, ContentMeta } from '@/lib/content';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';

const BASE_URL = 'https://www.solucionesfabrick.com';

const TYPE_LABELS = { blog: 'Blog', casos: 'Casos de estudio' } as const;

interface ArticlePageProps {
  post: ContentPost;
  related: ContentMeta[];
}

export default async function ArticlePage({ post, related }: ArticlePageProps) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const { type, slug, title, description, date, author, cover, tags, html, readingMinutes } = post;
  const url = `${BASE_URL}/${type}/${slug}`;

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': type === 'casos' ? 'Article' : 'BlogPosting',
    headline: title,
    description,
    datePublished: date,
    dateModified: date,
    author: { '@type': 'Organization', name: author || 'Soluciones Fabrick' },
    publisher: {
      '@type': 'Organization',
      name: 'Soluciones Fabrick',
      logo: { '@type': 'ImageObject', url: `${BASE_URL}/icon-512.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    ...(cover ? { image: [cover.startsWith('http') ? cover : `${BASE_URL}${cover}`] } : {}),
    ...(tags && tags.length > 0 ? { keywords: tags.join(', ') } : {}),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: TYPE_LABELS[type], item: `${BASE_URL}/${type}` },
      { '@type': 'ListItem', position: 3, name: title, item: url },
    ],
  };

  return (
    <SectionPageShell
      eyebrow={TYPE_LABELS[type]}
      title={title}
      description={description}
      primaryAction={{ href: '/contacto', label: 'Cotizar mi proyecto' }}
      secondaryAction={{ href: `/${type}`, label: `Volver a ${TYPE_LABELS[type]}` }}
    >
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb */}
      <nav aria-label="Migas de pan" className="mb-6 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
        <Link href="/" className="hover:text-yellow-400">Inicio</Link>
        <span>/</span>
        <Link href={`/${type}`} className="hover:text-yellow-400">{TYPE_LABELS[type]}</Link>
        <span>/</span>
        <span className="text-yellow-400">{title.length > 40 ? `${title.slice(0, 40)}…` : title}</span>
      </nav>

      {/* Metadata bar */}
      <div className="mb-8 flex flex-wrap items-center gap-5 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500">
        <span className="inline-flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-yellow-400" />
          {new Date(date).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: '2-digit' })}
        </span>
        <span className="inline-flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-yellow-400" />
          {readingMinutes} min
        </span>
        {author ? (
          <span className="inline-flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-yellow-400" />
            {author}
          </span>
        ) : null}
      </div>

      {/* Cover */}
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cloudinaryUrl(cover, { width: 1200, quality: 75 })}
          alt={title}
          className="mb-10 w-full rounded-[1.5rem] border border-white/5 object-cover"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      ) : null}

      {/* Case study metadata block */}
      {type === 'casos' && (post.client || post.location || post.services || post.duration || post.outcome) ? (
        <aside className="mb-10 grid gap-4 rounded-[1.5rem] border border-yellow-400/20 bg-yellow-400/5 p-6 md:grid-cols-2 lg:grid-cols-4">
          {post.client ? (
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400">
                <Briefcase className="h-3 w-3" /> Cliente
              </p>
              <p className="mt-1.5 text-sm font-bold text-white">{post.client}</p>
            </div>
          ) : null}
          {post.location ? (
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400">
                <MapPin className="h-3 w-3" /> Ubicación
              </p>
              <p className="mt-1.5 text-sm font-bold text-white">{post.location}</p>
            </div>
          ) : null}
          {post.duration ? (
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400">
                <Timer className="h-3 w-3" /> Duración
              </p>
              <p className="mt-1.5 text-sm font-bold text-white">{post.duration}</p>
            </div>
          ) : null}
          {post.outcome ? (
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400">
                <Target className="h-3 w-3" /> Resultado
              </p>
              <p className="mt-1.5 text-sm font-bold text-white">{post.outcome}</p>
            </div>
          ) : null}
        </aside>
      ) : null}

      {/* Rendered Markdown */}
      <article
        className="prose prose-invert prose-yellow mx-auto max-w-3xl text-zinc-300 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-headings:text-white prose-h2:mt-12 prose-h2:text-2xl prose-h3:mt-8 prose-h3:text-xl prose-p:leading-relaxed prose-a:text-yellow-400 prose-a:no-underline hover:prose-a:underline prose-strong:text-white prose-code:rounded prose-code:bg-zinc-900 prose-code:px-1.5 prose-code:py-0.5 prose-code:text-yellow-300 prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-xl prose-pre:border prose-pre:border-white/5 prose-pre:bg-zinc-950 prose-blockquote:border-l-yellow-400 prose-blockquote:bg-yellow-400/5 prose-blockquote:px-4 prose-blockquote:py-2 prose-blockquote:not-italic prose-li:marker:text-yellow-400"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Tags */}
      {tags && tags.length > 0 ? (
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="rounded-full border border-yellow-400/20 bg-yellow-400/5 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-400">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {/* Related */}
      {related.length > 0 ? (
        <section className="mt-16">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-400">Seguir leyendo</h2>
          <h3 className="mt-3 text-2xl font-black uppercase tracking-tight text-white md:text-3xl">Artículos relacionados</h3>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/${r.type}/${r.slug}`}
                className="group flex flex-col rounded-[1.25rem] border border-white/5 bg-zinc-950/80 p-6 transition hover:border-yellow-400/30"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                  {new Date(r.date).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: '2-digit' })}
                </p>
                <p className="mt-3 text-sm font-bold uppercase tracking-[0.1em] text-white">{r.title}</p>
                <p className="mt-3 flex-1 text-xs leading-relaxed text-zinc-400">{r.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400">
                  Leer →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Back link */}
      <div className="mt-16 flex justify-center">
        <Link
          href={`/${type}`}
          className="inline-flex items-center gap-2 rounded-full border border-yellow-400/35 px-6 py-3 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400 transition hover:bg-yellow-400/10"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a {TYPE_LABELS[type]}
        </Link>
      </div>
    </SectionPageShell>
  );
}
