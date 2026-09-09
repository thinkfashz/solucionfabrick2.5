import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MessageCircle } from 'lucide-react';
import { StoreBottomNav, StorefrontHeader } from '@/components/store/StorefrontChrome';
import AlbumExperience from '@/components/proyectos/AlbumExperience';
import InterestStars from '@/components/proyectos/InterestStars';
import InspirationComments from '@/components/proyectos/InspirationComments';
import InspirationFooter from '@/components/proyectos/InspirationFooter';
import InspirationKeywordNavigator from '@/components/proyectos/InspirationKeywordNavigator';
import { isPrivateInspirationAlbum, loadInspirationCatalog, type InspirationAlbum, type InspirationAsset } from '@/lib/inspirationCatalog';

export const dynamic = 'force-dynamic';
const BASE_URL = 'https://www.solucionesfabrick.com';
const WHATSAPP_PHONE = '56930121625';
type PageProps = { params: Promise<{ album: string }> };

const loadAlbum = cache(async (slug: string) => {
  if (isPrivateInspirationAlbum(slug)) return { album: null, assets: [], source: 'cloudinary' as const };
  const catalog = await loadInspirationCatalog({ maxResults: 100 });
  const album = catalog.albums.find((item) => item.key === slug) || null;
  const assets = catalog.assets.filter((item) => item.album === slug).sort((a, b) => a.sort_order - b.sort_order);
  return { album, assets, source: catalog.source };
});

function quoteUrl(album: InspirationAlbum) {
  const text = `Hola Soluciones Fabrick, vi el álbum ${album.title} y quiero conversar sobre una solución parecida para mi espacio. Necesito orientación sobre medidas, materiales y rango de inversión.`;
  return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;
}

function seoKeywords(album: InspirationAlbum) {
  return Array.from(new Set([album.primaryKeyword, ...album.keywords, ...album.hashtags.map((tag) => tag.replace(/-/g, ' ')), `${album.category} Chile`, 'Soluciones Fabrick'].filter(Boolean))).slice(0, 18);
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
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
    openGraph: { title, description, type: 'website', url: canonical, locale: 'es_CL', images: [{ url: album.cover, width: 1200, height: 900, alt: album.imageSearchCaption || album.title }] },
    twitter: { card: 'summary_large_image', title, description, images: [album.cover] },
  };
}

function albumJsonLd(album: InspirationAlbum, assets: InspirationAsset[]) {
  const canonical = `${BASE_URL}/inspiraciones/${album.key}`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: BASE_URL },
        { '@type': 'ListItem', position: 2, name: 'Inspiraciones', item: `${BASE_URL}/proyectos` },
        { '@type': 'ListItem', position: 3, name: album.title, item: canonical },
      ] },
      {
        '@type': 'ImageGallery', '@id': `${canonical}#galeria`, url: canonical, name: album.title,
        headline: album.seoTitle || album.title, description: album.description, keywords: seoKeywords(album).join(', '), inLanguage: 'es-CL',
        primaryImageOfPage: { '@type': 'ImageObject', contentUrl: album.cover, thumbnailUrl: album.cover, caption: album.imageSearchCaption || album.description, name: album.title },
        associatedMedia: assets.map((asset, index) => ({ '@type': 'ImageObject', position: index + 1, contentUrl: asset.url, thumbnailUrl: asset.thumb, name: asset.title, caption: asset.description || asset.alt, description: asset.description || album.description, representativeOfPage: Boolean(asset.album_cover), width: asset.width, height: asset.height })),
        mainEntity: { '@type': 'ItemList', numberOfItems: assets.length, itemListElement: assets.map((asset, index) => ({ '@type': 'ListItem', position: index + 1, name: asset.title, item: { '@type': 'ImageObject', contentUrl: asset.url, caption: asset.alt || asset.title } })) },
      },
    ],
  };
}

export default async function InspirationAlbumPage({ params }: PageProps) {
  const { album: slug } = await params;
  const { album, assets } = await loadAlbum(slug);
  if (!album || !assets.length) notFound();
  const jsonLd = albumJsonLd(album, assets);
  const relatedKeywords = seoKeywords(album);
  const keywordAssets = assets.map((asset) => ({ id: asset.id, title: asset.title, description: asset.description, alt: asset.alt, tags: asset.tags, url: asset.url, thumb: asset.thumb }));

  return (
    <div className="sf-inspiration-detail min-h-screen overflow-x-hidden bg-[#05090C] text-white">
      <style>{`
        @media(max-width:767px){.sf-inspiration-detail > nav label{display:none!important}.sf-inspiration-detail > nav > div{padding-bottom:.45rem!important}}
        .sf-detail-gallery{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:.75rem!important}
        .sf-detail-gallery>*{min-width:0!important;max-width:none!important}
        @media(min-width:760px){.sf-detail-gallery{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:1rem!important}}
        @media(min-width:1180px){.sf-detail-gallery{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:1.15rem!important}}
      `}</style>
      <StorefrontHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />

      <main className="pb-24 md:pb-0">
        <header className="relative isolate overflow-hidden border-b border-white/8 bg-[#05090C] px-4 py-6 sm:px-6 lg:px-8 lg:py-12">
          <img src={album.cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-24" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,10,.99)_0%,rgba(3,7,10,.91)_55%,rgba(3,7,10,.68)_100%)]" />
          <div className="relative mx-auto max-w-[1380px]">
            <Link href="/proyectos" className="inline-flex items-center gap-2 text-xs font-black text-[#F6C64A]"><ArrowLeft className="h-4 w-4"/>Todas las inspiraciones</Link>
            <div className="mt-6 grid gap-7 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
              <div className="order-2 lg:order-1">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#57D4FF]">{album.category} · {assets.length} referencias</p>
                <h1 className="mt-3 max-w-[12ch] text-5xl font-black leading-[.88] tracking-[-.065em] sm:text-7xl">{album.title}</h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-white/52 sm:text-base">{album.description}</p>
                <div className="mt-5"><InterestStars score={album.interestScore} label={album.interestLabel || 'Interés estimado'} tone="dark"/></div>
                <div className="mt-6 flex flex-wrap gap-2"><a href="#recorrido" className="rounded-full bg-[#F6C64A] px-4 py-2 text-xs font-black text-black">Recorrido</a><a href="#galeria" className="rounded-full border border-white/12 bg-white/[.035] px-4 py-2 text-xs font-black">Galería</a><a href="#detalles" className="rounded-full border border-white/12 bg-white/[.035] px-4 py-2 text-xs font-black">Detalles</a><a href="#comentarios" className="rounded-full border border-[#57D4FF]/20 bg-[#57D4FF]/[.05] px-4 py-2 text-xs font-black text-[#57D4FF]">Comentarios</a></div>
                <div className="mt-7 flex flex-wrap gap-3"><a href={quoteUrl(album)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F6C64A] px-5 text-sm font-black text-black">Cotizar una idea parecida <MessageCircle className="h-4 w-4"/></a><Link href={`/presupuesto?referencia=${encodeURIComponent(album.title)}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/15 bg-white/[.03] px-5 text-sm font-black">Calcular proyecto <ArrowRight className="h-4 w-4"/></Link></div>
              </div>
              <div className="order-1 overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#081015] shadow-[0_30px_100px_rgba(0,0,0,.35)] lg:order-2"><div className="relative aspect-[4/3] lg:aspect-[5/4]"><img src={album.cover} alt={album.imageSearchCaption || album.title} className="h-full w-full object-cover"/><span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent"/><span className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/65 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-white backdrop-blur-md">{assets.length} imágenes</span></div></div>
            </div>
          </div>
        </header>

        <section id="recorrido" className="scroll-mt-20 border-b border-white/8 bg-[#071015] px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-[1380px]">
            <div className="grid gap-4 lg:grid-cols-[.75fr_1.25fr] lg:items-end"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#57D4FF]">Recorrido visual</p><h2 className="mt-2 max-w-[13ch] text-4xl font-black leading-[.92] tracking-[-.055em] sm:text-5xl">Recorre las imágenes y abre la que quieras ampliar.</h2></div><p className="max-w-2xl text-sm leading-7 text-white/42">{album.organizationSummary || 'La colección avanza desde vistas generales hacia detalles, distribución y terminaciones.'}</p></div>
            <AlbumExperience assets={assets}/>
          </div>
        </section>

        <section id="galeria" className="scroll-mt-20 bg-[#05090C] px-3 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-[1380px]">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Galería completa</p><h2 className="mt-2 text-4xl font-black tracking-[-.055em] sm:text-6xl">Todas las referencias del álbum.</h2></div><p className="max-w-xl text-sm leading-6 text-white/40">Cada imagen conserva su título, detalle y etiquetas para que puedas identificar exactamente qué referencia quieres comentar o cotizar.</p></div>
            <div className="sf-detail-gallery mt-7">
              {assets.map((asset, index) => <figure id={`imagen-${asset.id}`} key={asset.id} className="scroll-mt-28 overflow-hidden rounded-[1.15rem] border border-white/9 bg-[#0A0F13]"><div className="relative aspect-[4/5] overflow-hidden bg-[#081015]"><img src={asset.thumb || asset.url} alt={asset.alt || asset.title} width={asset.width} height={asset.height} loading={index < 4 ? 'eager' : 'lazy'} decoding="async" className="h-full w-full object-cover transition duration-500 hover:scale-[1.025]"/><span className="absolute left-2 top-2 rounded-full bg-black/68 px-2 py-1 text-[8px] font-black text-white">{index + 1}/{assets.length}</span></div><figcaption className="p-3"><p className="text-[8px] font-black uppercase tracking-[.1em] text-[#57D4FF]">{album.primaryKeyword || album.category}</p><h3 className="mt-1 line-clamp-2 min-h-[2.2rem] text-xs font-black leading-[1.08] sm:text-base">{asset.title}</h3><details className="mt-2 border-t border-white/8 pt-2"><summary className="cursor-pointer text-[9px] font-black text-white/38">Ver detalle</summary><p className="mt-2 text-[10px] leading-5 text-white/40 sm:text-xs">{asset.description || asset.alt || album.description}</p>{asset.tags?.length ? <div className="mt-2 flex flex-wrap gap-1">{asset.tags.slice(0,5).map((tag)=><span key={tag} className="rounded-full border border-white/8 bg-white/[.03] px-2 py-1 text-[8px] font-bold text-white/35">#{tag}</span>)}</div>:null}</details></figcaption></figure>)}
            </div>
          </div>
        </section>

        <section id="detalles" className="scroll-mt-20 border-y border-white/8 bg-[#081015] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto grid max-w-[1380px] gap-8 lg:grid-cols-[.72fr_1.28fr]">
            <div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[#F6C64A]">Referencias relacionadas</p><h2 className="mt-2 max-w-[12ch] text-4xl font-black leading-[.93] tracking-[-.055em]">Palabras que te llevan directamente a imágenes.</h2><p className="mt-4 max-w-lg text-sm leading-7 text-white/42">Selecciona una palabra clave o idea. Te mostramos las referencias de este álbum que mejor coinciden y puedes saltar directamente a la imagen.</p></div>
            <div><InspirationKeywordNavigator keywords={relatedKeywords} hashtags={album.hashtags} assets={keywordAssets}/><p className="mt-6 max-w-2xl text-sm leading-7 text-white/46">Estas referencias sirven para definir estilo y dirección visual. Para construir una solución real revisamos medidas, estructura, instalaciones, materiales y nivel de terminación.</p><div className="mt-6 flex flex-wrap gap-3"><a href={quoteUrl(album)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F6C64A] px-5 text-sm font-black text-black">Quiero algo parecido <ArrowRight className="h-4 w-4"/></a><a href="#comentarios" className="inline-flex min-h-12 items-center rounded-full border border-[#57D4FF]/20 px-5 text-sm font-black text-[#57D4FF]">Tengo una sugerencia</a></div></div>
          </div>
        </section>

        <InspirationComments albumSlug={album.key} albumTitle={album.title} />
      </main>

      <InspirationFooter />
      <StoreBottomNav/>
    </div>
  );
}
