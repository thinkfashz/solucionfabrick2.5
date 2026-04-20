import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticlePage from '@/components/ArticlePage';
import { getContent, listContent } from '@/lib/content';

const BASE_URL = 'https://www.solucionesfabrick.com';

export function generateStaticParams() {
  return listContent('blog').map((item) => ({ slug: item.slug }));
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const post = getContent('blog', slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `${BASE_URL}/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `${BASE_URL}/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.date,
      ...(post.cover ? { images: [post.cover] } : {}),
    },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description },
  };
}

export default async function BlogPostPage({ params }: RouteParams) {
  const { slug } = await params;
  const post = getContent('blog', slug);
  if (!post) return notFound();

  const related = listContent('blog')
    .filter((i) => i.slug !== post.slug)
    .slice(0, 3);

  return <ArticlePage post={post} related={related} />;
}
