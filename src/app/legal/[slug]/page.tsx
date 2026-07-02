import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Navbar from '@/components/Navbar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type LegalSlug = 'terminos-y-condiciones' | 'cambios-y-devoluciones' | 'privacidad' | 'cookies';

const LEGAL_PAGES: Record<LegalSlug, { title: string; file: string; description: string }> = {
  'terminos-y-condiciones': {
    title: 'Términos y condiciones',
    file: 'terminos-y-condiciones.md',
    description: 'Condiciones generales de uso, compra, cotización y servicios de Soluciones Fabrick.',
  },
  'cambios-y-devoluciones': {
    title: 'Cambios, devoluciones y logística inversa',
    file: 'cambios-y-devoluciones.md',
    description: 'Condiciones de cambios, devoluciones, retracto y revisión de productos o servicios.',
  },
  privacidad: {
    title: 'Política de privacidad',
    file: 'privacidad.md',
    description: 'Tratamiento de datos personales, formularios, CRM, comunicaciones y derechos del usuario.',
  },
  cookies: {
    title: 'Política de cookies',
    file: 'cookies.md',
    description: 'Uso de cookies esenciales, preferencias, analítica y consentimiento del visitante.',
  },
};

function isLegalSlug(slug: string): slug is LegalSlug {
  return Object.prototype.hasOwnProperty.call(LEGAL_PAGES, slug);
}

async function readLegal(slug: LegalSlug) {
  const filePath = path.join(process.cwd(), 'src', 'content', 'legal', LEGAL_PAGES[slug].file);
  return readFile(filePath, 'utf8');
}

function renderMarkdown(markdown: string) {
  const lines = markdown.split('\n');
  const blocks: Array<{ type: 'h1' | 'h2' | 'h3' | 'p' | 'li'; text: string }> = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('### ')) blocks.push({ type: 'h3', text: line.slice(4) });
    else if (line.startsWith('## ')) blocks.push({ type: 'h2', text: line.slice(3) });
    else if (line.startsWith('# ')) blocks.push({ type: 'h1', text: line.slice(2) });
    else if (line.startsWith('- ')) blocks.push({ type: 'li', text: line.slice(2) });
    else blocks.push({ type: 'p', text: line });
  }

  return blocks.map((block, index) => {
    if (block.type === 'h1') return <h2 key={index} className="mt-10 text-3xl font-black text-white">{block.text}</h2>;
    if (block.type === 'h2') return <h2 key={index} className="mt-10 text-2xl font-black text-yellow-300">{block.text}</h2>;
    if (block.type === 'h3') return <h3 key={index} className="mt-7 text-lg font-black text-white">{block.text}</h3>;
    if (block.type === 'li') return <p key={index} className="ml-4 mt-3 text-sm leading-7 text-zinc-300 before:mr-2 before:text-yellow-300 before:content-['•']">{block.text}</p>;
    return <p key={index} className="mt-4 text-sm leading-8 text-zinc-400">{block.text}</p>;
  });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!isLegalSlug(slug)) return {};
  const page = LEGAL_PAGES[slug];
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: `https://www.solucionesfabrick.com/legal/${slug}` },
  };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isLegalSlug(slug)) notFound();
  const page = LEGAL_PAGES[slug];
  const markdown = await readLegal(slug);

  return (
    <main className="min-h-screen bg-black text-white">
      <Navbar />
      <section className="px-4 pb-20 pt-32 md:px-12 md:pt-40">
        <article className="mx-auto max-w-4xl rounded-[2rem] border border-white/10 bg-zinc-950/85 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] md:p-10">
          <p className="text-[10px] font-black uppercase tracking-[0.34em] text-yellow-300">Soluciones Fabrick</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-6xl">{page.title}</h1>
          <p className="mt-4 text-sm leading-7 text-zinc-400">Documento informativo para navegación, cotizaciones, compra de productos y solicitudes de servicios.</p>
          <div className="mt-10">{renderMarkdown(markdown)}</div>
        </article>
      </section>
    </main>
  );
}
