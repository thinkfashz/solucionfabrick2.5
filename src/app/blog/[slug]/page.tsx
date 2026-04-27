import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticlePage from '@/components/ArticlePage';
import { getBlogPost, listAllBlog, listContent } from '@/lib/content';

const BASE_URL = 'https://www.solucionesfabrick.com';

// Dynamic rendering is required so the middleware-generated CSP nonce is
// available to the inline JSON-LD <script> tags inside ArticlePage.
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  // Statically generate only file-system slugs; DB-only posts render dynamically.
  return listContent('blog').map((item) => ({ slug: item.slug }));
}

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
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
  const post = await getBlogPost(slug);
  if (!post) return notFound();

  const all = await listAllBlog();
  const related = all.filter((i) => i.slug !== post.slug).slice(0, 3);

  return <ArticlePage post={post} related={related} />;
}
