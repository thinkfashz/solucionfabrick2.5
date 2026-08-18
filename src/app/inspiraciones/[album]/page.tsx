import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MessageCircle, Search, Sparkles } from 'lucide-react';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import AlbumExperience from '@/components/proyectos/AlbumExperience';
import InterestStars from '@/components/proyectos/InterestStars';
import { loadInspirationCatalog, type InspirationAlbum, type InspirationAsset } from '@/lib/inspirationCatalog';

export const dynamic = 'force-dynamic';

const BASE_URL = 'https://www.solucionesfabrick.com';
const WHATSAPP_PHONE = '56930121625';

type PageProps = { params: Promise<{ album: string }> };

const loadAlbum = cache(async (slug: string) => {
  const catalog = await loadInspirationCatalog({ maxResults: 100 });
  const album = catalog.albums.find((item) => item.key === slug) || null;
  const assets = catalog.assets
    .filter((item) => item.album === slug)
    .sort((left, right) => left.sort_order - right.sort_order);
  return { album, assets, source: catalog.source };
});

function quoteUrl(album: InspirationAlbum) {
  const text = `Hola Soluciones Fabrick, vi el álbum ${album.title} y quiero conversar sobre una solución parecida para mi espacio. Necesito orientación sobre medidas, materiales y rango de inversión.`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

function seoKeywords(album: InspirationAlbum) {
  return Array.from(new Set([
    album.primaryKeyword,
    ...album.keywords,
    ...album.hashtags.map((tag) => tag.replace(/-/g, ' ')),
    `${album.category} Chile`,
    'Soluciones Fabrick',
  ].filter(Boolean))).slice(0, 18);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { album: slug } = await params;
  const { album } = await loadAlbum(slug);
  if (!album) return { title: 'Álbum no encontrado', robots: { index: false, follow: false } };

  const title = album.seoTitle || `${album.title} | Inspiraciones Fabrick`;
  const description = album.seoDescription || album.description;
  const canonical = `${BASE_URL}/inspiraciones/${album.key}`;

  return {
    title,
    description,
    keywords: seoKeywords(album),
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: canonical,
      locale: 'es_CL',
      images: [{ url: album.cover, width: 1200, height: 900, alt: album.imageSearchCaption || album.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [album.cover] },
  };
}

function albumJsonLd(album: InspirationAlbum, assets: InspirationAsset[]) {
  const canonical = `${BASE_URL}/inspiraciones/${album.key}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
          { '@type': 'ListItem', position: 2, name: 'Inspiraciones', item: `${BASE_URL}/proyectos` },
          { '@type': 'ListItem', position: 3, name: album.title, item: canonical },
        ],
      },
      {
        '@type': 'ImageGallery',
        '@id': `${canonical}#galeria`,
        url: canonical,
        name: album.title,
        headline: album.seoTitle || album.title,
        description: album.description,
        keywords: seoKeywords(album).join(', '),
        inLanguage: 'es-CL',
        primaryImageOfPage: {
          '@type': 'ImageObject',
          contentUrl: album.cover,
          thumbnailUrl: album.cover,
          caption: album.imageSearchCaption || album.description,
          name: album.title,
        },
        associatedMedia: assets.map((asset, index) => ({
          '@type': 'ImageObject',
          position: index + 1,
          contentUrl: asset.url,
          thumbnailUrl: asset.thumb,
          name: asset.title,
          caption: asset.description || asset.alt,
          description: asset.description || album.description,
          representativeOfPage: Boolean(asset.album_cover),
          width: asset.width,
          height: asset.height,
          keywords: Array.from(new Set([
            album.primaryKeyword,
            ...album.keywords,
            ...asset.tags.map((tag) => tag.replace(/-/g, ' ')),
          ].filter(Boolean))).join(', '),
        })),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: assets.length,
          itemListElement: assets.map((asset, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: asset.title,
            item: { '@type': 'ImageObject', contentUrl: asset.url, caption: asset.alt || asset.title },
          })),
        },
      },
    ],
  };
}

export default async function InspirationAlbumPage({ params }: PageProps) {
  const { album: slug } = await params;
  const { album, assets } = await loadAlbum(slug);
  if (!album || !assets.length) notFound();

  const jsonLd = albumJsonLd(album, assets);
  const relatedKeywords = seoKeywords(album).filter((keyword) => keyword !== album.primaryKeyword);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#FFF9EE] text-[#08090A]">
      <StorefrontHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <main>
        <header className="relative overflow-hidden bg-[#08090A] px-4 pb-14 pt-12 text-[#FFF9EE] sm:px-6 lg:px-10 lg:pb-20 lg:pt-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_10%,rgba(204,177,150,.2),transparent_32rem),radial-gradient(circle_at_10%_80%,rgba(182,144,108,.13),transparent_28rem)]" />
          <div className="relative mx-auto max-w-7xl">
            <Link href="/proyectos" className="inline-flex items-center gap-2 text-xs font-black text-[#FFB000]"><ArrowLeft className="h-4 w-4" /> Volver a todos los álbumes</Link>
            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-end">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.26em] text-[#FFB000]">{album.category} · {assets.length} referencias visuales</p>
                <h1 className="mt-4 max-w-5xl text-5xl font-black leading-[.92] tracking-[-.065em] sm:text-7xl">{album.title}</h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-[#D5C9C0]">{album.description}</p>
                <div className="mt-6 flex flex-wrap items-center gap-4"><InterestStars score={album.interestScore} label={album.interestLabel || 'Interés estimado'} tone="dark" /><span className="text-[10px] leading-5 text-white/38">Estimación editorial de IA; no equivale a volumen real de búsqueda.</span></div>
              </div>
              <aside className="rounded-[2rem] bg-white/7 p-5 shadow-[0_22px_70px_rgba(0,0,0,.2)] backdrop-blur-xl">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#FFB000]">Idea principal</p>
                <p className="mt-2 text-xl font-black">{album.primaryKeyword || album.title}</p>
                <p className="mt-4 text-xs leading-6 text-white/55">{album.imageSearchCaption || album.description}</p>
                <a href={quoteUrl(album)} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#F5871F] px-5 text-sm font-black text-[#08090A]">Cotizar una idea parecida <MessageCircle className="h-4 w-4" /></a>
              </aside>
            </div>
          </div>
        </header>

        <section className="px-4 py-12 sm:px-6 lg:px-10 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr] lg:items-end"><div><span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] text-[#F5871F]"><Sparkles className="h-4 w-4" /> Carrusel spin on scroll</span><h2 className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-6xl">Recorre el álbum en el orden sugerido por la IA.</h2></div><p className="max-w-2xl text-sm leading-7 text-[#BFB8AC]">{album.organizationSummary || 'La colección avanza desde las vistas generales hacia detalles y terminaciones.'}</p></div>
            <AlbumExperience assets={assets} />
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 lg:px-10 lg:py-18">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-[.75fr_1.25fr] lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#F5871F]">Galería semántica completa</p><h2 className="mt-3 text-4xl font-black tracking-[-.05em] sm:text-6xl">Imágenes, nombres y descripciones visibles.</h2></div><p className="max-w-2xl text-sm leading-7 text-[#BFB8AC]">Cada imagen conserva texto alternativo, pie de foto y contexto del álbum para que personas, motores de búsqueda y asistentes de IA comprendan mejor el contenido.</p></div>
            <div className="mt-8 columns-1 gap-5 sm:columns-2 lg:columns-3">
              {assets.map((asset, index) => (
                <figure key={asset.id} className="mb-5 break-inside-avoid overflow-hidden rounded-[1.8rem] bg-[#FFF9EE] shadow-[0_18px_55px_rgba(23,24,32,.09)]">
                  <img src={asset.thumb || asset.url} alt={asset.alt || asset.title} width={asset.width} height={asset.height} loading={index < 3 ? 'eager' : 'lazy'} decoding="async" className="h-auto w-full object-cover" />
                  <figcaption className="p-5"><p className="text-[9px] font-black uppercase tracking-[.17em] text-[#F5871F]">{album.primaryKeyword || album.category} · imagen {index + 1}</p><h3 className="mt-2 text-xl font-black leading-tight">{asset.title}</h3><p className="mt-3 text-xs leading-6 text-[#BFB8AC]">{asset.description || asset.alt || album.description}</p><div className="mt-4 flex flex-wrap gap-1">{asset.tags.slice(0, 6).map((tag) => <span key={tag} className="rounded-full bg-[#F2DFBB] px-2 py-1 text-[8px] font-black text-[#BFB8AC]">#{tag}</span>)}</div></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#F2DFBB] px-4 py-14 sm:px-6 lg:px-10">
          <div className="mx-auto grid max-w-7xl gap-7 lg:grid-cols-[.72fr_1.28fr]">
            <div><span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#08090A] text-[#FFB000]"><Search className="h-6 w-6" /></span><h2 className="mt-5 text-4xl font-black tracking-[-.05em]">Temas relacionados con este álbum.</h2></div>
            <div><div className="flex flex-wrap gap-2">{relatedKeywords.map((keyword) => <span key={keyword} className="rounded-full bg-[#FFF9EE] px-4 py-2 text-xs font-black text-[#BFB8AC]">{keyword}</span>)}</div><div className="mt-6 flex flex-wrap gap-2">{album.hashtags.map((tag) => <span key={tag} className="text-xs font-black text-[#F5871F]">#{tag}</span>)}</div><p className="mt-6 max-w-2xl text-sm leading-7 text-[#BFB8AC]">Estas palabras describen el contenido visible. Se usan de manera natural en títulos, pies de foto y metadata; no garantizan una posición específica en buscadores.</p><Link href="/presupuesto" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#08090A] px-6 text-sm font-black text-[#FFF9EE]">Calcular una solución para mi espacio <ArrowRight className="h-4 w-4" /></Link></div>
          </div>
        </section>
      </main>
      <StoreBottomNav />
    </div>
  );
}
