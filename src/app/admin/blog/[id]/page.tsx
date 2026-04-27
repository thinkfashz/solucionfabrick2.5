import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { BlogEditor, type BlogEditable } from '../BlogEditor';

export const metadata: Metadata = { title: 'Editar entrada · Blog · Admin' };
export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBlogPostPage({ params }: Props) {
  const { id } = await params;
  const h = await headers();
  const cookie = h.get('cookie') ?? '';
  const protocol = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  const res = await fetch(`${protocol}://${host}/api/admin/blog/${encodeURIComponent(id)}`, {
    headers: { cookie },
    cache: 'no-store',
  });
  if (res.status === 404) return notFound();
  if (!res.ok) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-3 text-xs text-red-300">
        No se pudo cargar la entrada (HTTP {res.status}).
      </div>
    );
  }
  const json = (await res.json()) as { post?: BlogEditable & { id: string } };
  if (!json.post) return notFound();
  const initial: BlogEditable = {
    id: json.post.id,
    slug: json.post.slug,
    title: json.post.title,
    description: json.post.description,
    cover_url: json.post.cover_url ?? '',
    body_md: json.post.body_md ?? '',
    tags: Array.isArray(json.post.tags) ? json.post.tags : [],
    author: json.post.author ?? '',
    published: Boolean(json.post.published),
  };
  return <BlogEditor isNew={false} initial={initial} />;
}
