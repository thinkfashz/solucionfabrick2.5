import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
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
      {items.length === 0 ? (
        <p className="rounded-[1.5rem] border border-white/5 bg-zinc-950/80 p-10 text-center text-sm text-zinc-400">
          Próximamente publicaremos contenido. Mientras tanto, explora nuestros servicios o contáctanos.
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/${type}/${item.slug}`}
              className="group flex flex-col overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-950/85 transition hover:border-yellow-400/30"
            >
              {item.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cloudinaryUrl(item.cover, { width: 600, quality: 70 })}
                  alt=""
                  className="h-44 w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
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
                <h2 className="text-lg font-bold uppercase tracking-[0.1em] text-white">{item.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-zinc-400">{item.description}</p>
                {item.tags && item.tags.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-yellow-400/20 bg-yellow-400/5 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] text-yellow-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
                <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-400">
                  Leer más
                  <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </SectionPageShell>
  );
}
