import Link from 'next/link';
import { Calendar, Clock, ArrowRight, Search } from 'lucide-react';
import SectionPageShell from '@/components/SectionPageShell';
import type { ContentMeta } from '@/lib/content';
import { cloudinaryUrl } from '@/lib/cloudinaryLoader';

const TYPE_LABELS = { blog: 'Blog', casos: 'Casos de estudio' } as const;

interface ContentListPageProps {
  type: 'blog' | 'casos';
  title: string;
  description: string;
  items: ContentMeta[];
}

export default function ContentListPage({ type, title, description, items }: ContentListPageProps) {
  return (
    <SectionPageShell
      eyebrow={TYPE_LABELS[type]}
      title={title}
      description={description}
      primaryAction={{ href: '/contacto', label: 'Solicitar evaluación' }}
      secondaryAction={{ href: '/servicios', label: 'Ver servicios' }}
    >
      {/* Stats bar */}
      <div className="mb-10 flex flex-wrap gap-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-yellow-400/10 flex items-center justify-center">
            <Search className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">Artículos publicados</p>
            <p className="text-2xl font-black text-white">{items.length}</p>
          </div>
        </div>
        <div className="h-12 w-px bg-white/5 mx-2" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-yellow-400/10 flex items-center justify-center">
            <Clock className="h-5 w-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-zinc-400">Tiempo promedio de lectura</p>
            <p className="text-2xl font-black text-white">
              {items.length > 0 ? Math.round(items.reduce((sum, i) => sum + i.readingMinutes, 0) / items.length) : 0} min
            </p>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.5rem] border border-white/5 bg-zinc-950/80 p-12 text-center">
          <p className="text-sm text-zinc-400">Próximamente publicaremos contenido. Mientras tanto, explora nuestros servicios o contáctanos.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Featured item (first) */}
          {items[0] && (
            <Link
              href={`/${type}/${items[0].slug}`}
              className="group grid gap-6 overflow-hidden rounded-[2rem] border border-white/5 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-8 transition hover:border-yellow-400/40 hover:shadow-[0_0_30px_rgba(250,204,21,0.1)] md:grid-cols-3"
            >
              {items[0].cover && (
                <div className="overflow-hidden rounded-xl md:col-span-1">
                  <img
                    src={cloudinaryUrl(items[0].cover, { width: 400, quality: 80 })}
                    alt=""
                    className="h-48 w-full object-cover transition group-hover:scale-110 md:h-64"
                    loading="eager"
                    decoding="async"
                  />
                </div>
              )}
              <div className={items[0].cover ? 'md:col-span-2' : 'md:col-span-3'}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-yellow-400">
                    Destacado
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-3 group-hover:text-yellow-400 transition">
                  {items[0].title}
                </h2>
                <p className="text-sm leading-relaxed text-zinc-300 mb-4">{items[0].description}</p>
                <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  <span className="inline-flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-yellow-400" />
                    {new Date(items[0].date).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: '2-digit' })}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-3 w-3 text-yellow-400" />
                    {items[0].readingMinutes} min
                  </span>
                </div>
                <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400 group-hover:gap-4 transition-all">
                  Leer artículo
                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-2" />
                </div>
              </div>
            </Link>
          )}

          {/* Grid de otros artículos */}
          {items.length > 1 && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.slice(1).map((item) => (
                <Link
                  key={item.slug}
                  href={`/${type}/${item.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-950/85 transition hover:border-yellow-400/30 hover:shadow-[0_0_20px_rgba(250,204,21,0.05)]"
                >
                  {item.cover ? (
                    <div className="overflow-hidden h-44 w-full bg-gradient-to-br from-yellow-400/10 to-black">
                      <img
                        src={cloudinaryUrl(item.cover, { width: 600, quality: 70 })}
                        alt=""
                        className="h-44 w-full object-cover transition group-hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      />
                    </div>
                  ) : (
                    <div className="h-44 w-full bg-gradient-to-br from-yellow-400/10 via-black to-zinc-950" />
                  )}
                  <div className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-yellow-400" />
                        {new Date(item.date).toLocaleDateString('es-CL', { year: 'numeric', month: 'short', day: '2-digit' })}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-yellow-400" />
                        {item.readingMinutes} min
                      </span>
                    </div>
                    <h3 className="text-lg font-bold uppercase tracking-[0.1em] text-white group-hover:text-yellow-400 transition">
                      {item.title}
                    </h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{item.description}</p>
                    {item.tags && item.tags.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {item.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-yellow-400/20 bg-yellow-400/5 px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.2em] text-yellow-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {item.tags.length > 2 && (
                          <span className="text-[8px] text-zinc-500">+{item.tags.length - 2}</span>
                        )}
                      </div>
                    ) : null}
                    <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400 group-hover:gap-3 transition-all">
                      Leer más
                      <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </SectionPageShell>
  );
}
