import type { Metadata } from 'next';
import CloudinaryProjectsGallery from '@/components/proyectos/CloudinaryProjectsGallery';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Ideas de construcción y remodelación por álbum',
  description: 'Explora álbumes de cocinas, casas, planos, baños, muebles, piscinas, terrazas y quinchos con descripciones, palabras clave y galerías visuales.',
  keywords: [
    'ideas de construcción',
    'ideas de remodelación',
    'diseño de cocinas',
    'ideas para casas',
    'quinchos y terrazas',
    'inspiración para el hogar Chile',
    'Soluciones Fabrick',
  ],
  alternates: { canonical: 'https://www.solucionesfabrick.com/proyectos' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  openGraph: {
    title: 'Inspiraciones Soluciones Fabrick | Álbumes de ideas para el hogar',
    description: 'Catálogo visual organizado por álbumes para comparar estilos, distribución, materiales visibles y terminaciones antes de cotizar.',
    type: 'website',
    url: 'https://www.solucionesfabrick.com/proyectos',
    images: [{ url: '/brand/soluciones-fabrick-social.png', width: 1200, height: 630, alt: 'Álbumes de inspiración Soluciones Fabrick' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ideas de construcción y remodelación | Soluciones Fabrick',
    description: 'Explora álbumes visuales organizados por espacio, estilo y palabras clave.',
    images: ['/brand/soluciones-fabrick-social.png'],
  },
};

const polish = `
  .sf-inspirations{background:#05090c!important}
  .sf-inspirations main>section:first-of-type{min-height:620px!important;background:#05090c!important}
  .sf-inspirations main>section:first-of-type>div:last-child{min-height:620px!important;align-items:center!important;padding-top:3rem!important;padding-bottom:3rem!important}
  .sf-inspirations main>section:first-of-type h1{font-size:clamp(3.15rem,6.3vw,5.9rem)!important;line-height:.9!important;letter-spacing:-.065em!important;max-width:10.5ch!important}
  .sf-inspirations main>section:first-of-type p{max-width:42rem}
  .sf-inspirations main>section:first-of-type>div:last-child>div:last-child{align-self:center!important}
  .sf-inspirations main>section:first-of-type>div:last-child>div:last-child a{border-radius:1.65rem!important;border-color:rgba(255,255,255,.09)!important;box-shadow:0 28px 80px rgba(0,0,0,.28)!important}
  .sf-inspirations main>section:nth-of-type(2){background:#070c0f!important;padding-top:1rem!important;padding-bottom:1rem!important}
  .sf-inspirations main>section:nth-of-type(2) article{border:0!important;border-right:1px solid rgba(255,255,255,.07)!important;border-radius:0!important;background:transparent!important;padding:1rem 1.2rem!important}
  .sf-inspirations main>section:nth-of-type(2) article:last-child{border-right:0!important}
  .sf-inspirations #albumes{padding-top:4.5rem!important;padding-bottom:5rem!important}
  .sf-inspirations #albumes>div>div:first-child{padding-bottom:1.8rem!important}
  .sf-inspirations #albumes h2{max-width:14ch!important;font-size:clamp(2.55rem,5vw,4.8rem)!important;line-height:.92!important}
  .sf-inspirations #albumes>div>div:nth-child(2){top:76px!important;margin-top:1.35rem!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:1.3rem!important;background:rgba(5,9,12,.88)!important;box-shadow:0 16px 44px rgba(0,0,0,.25)!important}
  .sf-inspirations #albumes>div>div:nth-child(2) label{border-radius:1rem!important;background:rgba(255,255,255,.025)!important}
  .sf-inspirations .sf-album-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:1.15rem!important;margin-top:2rem!important}
  .sf-inspirations .sf-album-grid>article{border-radius:1.6rem!important;border-color:rgba(255,255,255,.075)!important;background:linear-gradient(180deg,#0b1115,#080d10)!important;box-shadow:0 22px 70px rgba(0,0,0,.2)!important}
  .sf-inspirations .sf-album-grid>article:hover{transform:translateY(-4px)!important;border-color:rgba(246,198,74,.30)!important;box-shadow:0 30px 90px rgba(0,0,0,.32)!important}
  .sf-inspirations .sf-album-grid>article>a:first-child>div:first-child{aspect-ratio:4/3!important}
  .sf-inspirations .sf-album-grid>article>div:last-child{padding:1rem 1rem 1.1rem!important}
  .sf-inspirations .sf-album-grid h3{font-size:1.05rem!important;line-height:1.08!important;min-height:auto!important}
  .sf-inspirations main>section:last-of-type{background:linear-gradient(135deg,#0a1318,#070d10)!important;padding-top:3.5rem!important;padding-bottom:3.5rem!important}
  @media(max-width:1179px){.sf-inspirations .sf-album-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}
  @media(max-width:767px){
    .sf-inspirations main>section:first-of-type{min-height:auto!important}
    .sf-inspirations main>section:first-of-type>div:last-child{min-height:auto!important;padding:2.2rem 1rem 2.7rem!important;gap:1.8rem!important}
    .sf-inspirations main>section:first-of-type h1{font-size:clamp(2.75rem,13vw,4.2rem)!important;line-height:.91!important;max-width:9.5ch!important}
    .sf-inspirations main>section:first-of-type>div:last-child>div:last-child{gap:.55rem!important}
    .sf-inspirations main>section:first-of-type>div:last-child>div:last-child a{border-radius:1.25rem!important}
    .sf-inspirations main>section:nth-of-type(2){display:none!important}
    .sf-inspirations #albumes{padding:3.2rem .8rem 4rem!important}
    .sf-inspirations #albumes>div>div:nth-child(2){top:62px!important;margin-left:0!important;margin-right:0!important;padding:.6rem!important;border-radius:1rem!important}
    .sf-inspirations #albumes h2{font-size:2.75rem!important;max-width:11ch!important}
    .sf-inspirations .sf-album-grid{grid-template-columns:1fr!important;gap:.9rem!important}
    .sf-inspirations .sf-album-grid>article>a:first-child>div:first-child{aspect-ratio:16/10!important}
    .sf-inspirations .sf-album-grid>article{border-radius:1.35rem!important}
    .sf-inspirations .sf-album-grid>article>div:last-child{padding:.95rem 1rem 1rem!important}
    .sf-inspirations .sf-album-grid h3{font-size:1.15rem!important}
  }
`;

export default function InspiracionesPage() {
  return (
    <>
      <style>{polish}</style>
      <CloudinaryProjectsGallery />
    </>
  );
}
