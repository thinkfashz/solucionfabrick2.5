import type { Metadata } from 'next';
import ContentListPage from '@/components/ContentListPage';
import { listContent } from '@/lib/content';

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

export default function BlogIndexPage() {
  const items = listContent('blog');
  return (
    <ContentListPage
      type="blog"
      title="Construcción sin humo"
      description="Guías prácticas, costos reales y criterios técnicos para que tomes decisiones informadas sobre tu obra."
      items={items}
    />
  );
}
