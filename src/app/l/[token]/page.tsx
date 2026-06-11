import DOMPurify from 'isomorphic-dompurify';
import { notFound } from 'next/navigation';
import { rows, runRawSql, sqlText } from '@/lib/web-pages/sql';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

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
  const seo = (page.seo_json as Record<string, unknown>) || {};
  const title = String(seo.title || page.title || 'Página Fabrick');
  const description = String(seo.description || 'Página creada con Fabrick Page Engine');
  return <html lang="es"><head><title>{title}</title><meta name="description" content={description}/><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/><style dangerouslySetInnerHTML={{ __html: css }} /></head><body><div dangerouslySetInnerHTML={{ __html: html }} />{js ? <script dangerouslySetInnerHTML={{ __html: js }} /> : null}</body></html>;
}
