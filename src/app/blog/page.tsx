import type { Metadata } from 'next';
import ContentListPage from '@/components/ContentListPage';
import { listAllBlog } from '@/lib/content';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Blog de Construcción y Remodelación',
  description:
    'Guías, consejos y análisis sobre construcción, remodelación, Metalcon, instalaciones certificadas y costos reales en la Región del Maule.',
  alternates: {
    canonical: 'https://www.solucionesfabrick.com/blog',
    types: { 'application/rss+xml': 'https://www.solucionesfabrick.com/blog/rss.xml' },
  },
  openGraph: {
    title: 'Blog Soluciones Fabrick',
    description: 'Guías y análisis sobre construcción y remodelación en Chile.',
    url: 'https://www.solucionesfabrick.com/blog',
    type: 'website',
  },
};

export default async function BlogIndexPage() {
  const items = await listAllBlog();
  return (
    <ContentListPage
      type="blog"
      title="Construcción sin humo"
      description="Guías prácticas, costos reales y criterios técnicos para que tomes decisiones informadas sobre tu obra."
      items={items}
    />
  );
}
