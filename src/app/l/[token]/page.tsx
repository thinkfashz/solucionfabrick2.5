import DOMPurify from 'isomorphic-dompurify';
import { notFound } from 'next/navigation';
import { rows, runRawSql, sqlText } from '@/lib/web-pages/sql';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  const safe = String(token || '').replace(/[^a-zA-Z0-9-_]/g, '');
  const result = await runRawSql(`SELECT title, seo_json FROM web_pages WHERE slug = ${sqlText(safe)} OR token = ${sqlText(safe)} LIMIT 1`);
  const page = result.ok ? rows(result)[0] : null;
  const seo = (page?.seo_json as Record<string, unknown>) || {};
  return {
    title: String(seo.title || page?.title || 'Página Fabrick'),
    description: String(seo.description || 'Página creada con Fabrick Page Engine'),
  };
}

export default async function PublicLandingPage({ params }: Props) {
  const { token } = await params;
  const safe = String(token || '').replace(/[^a-zA-Z0-9-_]/g, '');
  const result = await runRawSql(`SELECT * FROM web_pages WHERE slug = ${sqlText(safe)} OR token = ${sqlText(safe)} LIMIT 1`);
  if (!result.ok) notFound();
  const page = rows(result)[0];
  if (!page || page.status !== 'published') notFound();
  void runRawSql(`UPDATE web_pages SET visits = COALESCE(visits, 0) + 1, last_viewed_at = NOW() WHERE id = ${Number(page.id) || 0}`);
  const html = DOMPurify.sanitize(String(page.html || ''), { ADD_ATTR: ['target', 'rel'] });
  const css = String(page.css || '');
  const js = String(page.js || '');
  return <main className="min-h-screen overflow-x-hidden bg-black text-white"><style dangerouslySetInnerHTML={{ __html: css }} /><div dangerouslySetInnerHTML={{ __html: html }} />{js ? <script dangerouslySetInnerHTML={{ __html: js }} /> : null}</main>;
}
