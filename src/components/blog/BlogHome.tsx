'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ArrowUpRight, Clock } from 'lucide-react';
import { FabrickFullLogo } from '@/components/FabrickBrandIcon';
import BlogAuthorities from '@/components/blog/BlogAuthorities';
import type { ContentMeta } from '@/lib/content';

type Topic = { id: string; title: string; text: string; image: string; keywords: string[] };

const TOPICS: Topic[] = [
  { id: 'terremotos', title: 'Terremotos y estructura', text: 'Cómo se construye para que la casa siga en pie.', image: '/flow/fabrick-blog-terremotos.jpeg', keywords: ['sismo', 'terremoto', 'estructura', 'metalcon', 'antisísmico'] },
  { id: 'lujo', title: 'Lujo habitable', text: 'Terminaciones y espacios que se sienten premium sin exagerar.', image: '/flow/fabrick-blog-lujo.jpeg', keywords: ['lujo', 'premium', 'dormitorio', 'diseño interior'] },
  { id: 'cocinas', title: 'Cocinas', text: 'Porcelanato, grifería y distribución que cambian la cocina completa.', image: '/flow/fabrick-coleccion-cocina.jpeg', keywords: ['cocina', 'porcelanato', 'grifería', 'remodelación cocina'] },
  { id: 'wallpanel', title: 'Wall Panel y revestimientos', text: 'Listones, siding y fachadas que visten la casa.', image: '/flow/fabrick-blog-wallpanel.jpeg', keywords: ['wall panel', 'siding', 'revestimiento', 'fachada'] },
  { id: 'accesorios', title: 'Accesorios de casa', text: 'Grifería, iluminación y detalles que se notan al entrar.', image: '/flow/fabrick-coleccion-accesorios.jpeg', keywords: ['accesorios', 'grifería', 'iluminación', 'detalles'] },
  { id: 'vivienda', title: 'Vivienda lujosa', text: 'Casas terminadas para mirar antes de decidir la tuya.', image: '/flow/fabrick-blog-vivienda-lujo.jpeg', keywords: ['casa', 'vivienda', 'lujosa', 'proyecto', 'ampliación'] },
];

function matchesTopic(post: ContentMeta, topic: Topic) {
  const haystack = `${post.title} ${post.description || ''} ${(post.tags || []).join(' ')}`.toLowerCase();
  return topic.keywords.some((keyword) => haystack.includes(keyword));
}

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

/**
 * Portada cinematográfica del blog: hero con el destacado, 6 temas visuales
 * con imágenes propias y grilla filtrable de artículos.
 */
export default function BlogHome({ items }: { items: ContentMeta[] }) {
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const featured = items[0];
  const topic = TOPICS.find((t) => t.id === activeTopic) || null;
  const visible = topic ? items.filter((post) => matchesTopic(post, topic)) : items;

  return (
    <div>
      {/* Hero cinematográfico */}
      <section className="relative isolate overflow-hidden">
        {featured?.cover ? (
          <Image src={featured.cover} alt="" fill priority sizes="100vw" className="-z-10 object-cover object-center" unoptimized />
        ) : (
          <Image src="/flow/fabrick-blog-vivienda-lujo.jpeg" alt="" fill priority sizes="100vw" className="-z-10 object-cover object-center" unoptimized />
        )}
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(5,8,11,.55)_0%,rgba(5,8,11,.82)_100%)]" />
        <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-20 sm:px-6 sm:pb-14 sm:pt-28">
          <FabrickFullLogo compact theme="light" />
          <p className="mt-4 text-[10px] font-black uppercase tracking-[.24em] text-[#F6C64A]">Blog · construcción sin humo</p>
          <h1 className="mt-3 max-w-[16ch] text-[clamp(2.2rem,6vw,3.8rem)] font-black leading-[.95] tracking-[-.045em]">
            {featured ? featured.title : 'Guías para construir sin improvisar.'}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">
            {featured?.description || 'Costos reales, criterios técnicos y decisiones informadas para tu obra.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {featured ? (
              <Link href={`/blog/${featured.slug}`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F6C64A] px-6 text-xs font-black text-black transition hover:bg-white">
                Leer artículo destacado <ArrowRight size={15} aria-hidden />
              </Link>
            ) : null}
            <Link href="#temas" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/20 px-6 text-xs font-black text-white transition hover:border-[#F6C64A]/60 hover:text-[#F6C64A]">
              Explorar por tema
            </Link>
          </div>
        </div>
      </section>

      {/* Temas */}
      <section id="temas" aria-labelledby="temas-title" className="mx-auto max-w-[1200px] scroll-mt-24 px-4 pt-10 sm:px-6 sm:pt-14">
        <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">Temas que cubrimos</p>
        <h2 id="temas-title" className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">Elige por dónde partir.</h2>
        <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
          {TOPICS.map((item) => {
            const active = activeTopic === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTopic((current) => (current === item.id ? null : item.id))}
                aria-pressed={active}
                className={`group relative isolate min-h-[240px] w-[76vw] shrink-0 snap-start overflow-hidden rounded-[1.4rem] border text-left transition sm:w-auto sm:min-h-[220px] ${active ? 'border-[#F6C64A]/60' : 'border-white/10'}`}
              >
                <img src={item.image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.04]" />
                <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,8,11,.15)_0%,rgba(5,8,11,.35)_40%,rgba(5,8,11,.92)_100%)]" />
                <span className="absolute inset-x-0 bottom-0 block p-4 sm:p-5">
                  <b className="block text-lg font-black tracking-[-.03em]">{item.title}</b>
                  <small className="mt-1 block text-[11px] leading-4 text-white/60">{item.text}</small>
                  <span className={`mt-2.5 inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-[10px] font-black transition ${active ? 'bg-[#F6C64A] text-black' : 'border border-white/20 bg-black/45 text-white/85 backdrop-blur'}`}>
                    {active ? 'Viendo artículos' : 'Ver artículos'} <ArrowUpRight size={13} aria-hidden />
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Artículos */}
      <section aria-labelledby="articulos-title" className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#F6C64A]">
              {topic ? `Tema: ${topic.title}` : 'Últimos artículos'}
            </p>
            <h2 id="articulos-title" className="mt-1 text-2xl font-black tracking-[-.04em] sm:text-3xl">
              {topic ? `${visible.length} artículo${visible.length === 1 ? '' : 's'}` : 'Para leer con calma.'}
            </h2>
          </div>
          {topic ? (
            <button type="button" onClick={() => setActiveTopic(null)} className="min-h-10 rounded-full border border-white/15 px-4 text-[11px] font-black text-white/70 transition hover:border-white/30">
              Ver todos
            </button>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <div className="mt-6 rounded-[1.4rem] border border-dashed border-white/15 p-8 text-center">
            <p className="text-sm font-black">Aún no hay artículos de este tema.</p>
            <p className="mx-auto mt-1 max-w-md text-[12px] leading-5 text-white/50">Estamos escribiendo sobre {topic?.title.toLowerCase()}. Mientras tanto, revisa el resto del blog.</p>
            <button type="button" onClick={() => setActiveTopic(null)} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#F6C64A] px-6 text-[11px] font-black text-black">Ver todos los artículos</button>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/[.02] transition hover:border-white/25">
                {post.cover ? (
                  <span className="block aspect-[16/9] overflow-hidden bg-black/30">
                    <img src={post.cover} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                  </span>
                ) : null}
                <span className="block p-4 sm:p-5">
                  <b className="block text-[15px] font-black leading-snug tracking-[-.02em] group-hover:text-[#F6C64A]">{post.title}</b>
                  {post.description ? <small className="mt-1.5 line-clamp-2 block text-[12px] leading-5 text-white/50">{post.description}</small> : null}
                  <span className="mt-3 flex items-center gap-3 text-[10px] font-bold text-white/35">
                    {post.date ? <span>{formatDate(post.date)}</span> : null}
                    <span className="inline-flex items-center gap-1"><Clock size={11} aria-hidden />{post.readingMinutes} min</span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <BlogAuthorities />
    </div>
  );
}
