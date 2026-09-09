import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const store = readFileSync('src/components/store/TiendaClientV2.tsx', 'utf8');
const storePreview = readFileSync('src/components/store/StoreInspirationPreview.tsx', 'utf8');
const gallery = readFileSync('src/components/proyectos/CloudinaryProjectsGallery.tsx', 'utf8');
const detail = readFileSync('src/app/inspiraciones/[album]/page.tsx', 'utf8');
const comments = readFileSync('src/components/proyectos/InspirationComments.tsx', 'utf8');
const keywords = readFileSync('src/components/proyectos/InspirationKeywordNavigator.tsx', 'utf8');
const footer = readFileSync('src/components/proyectos/InspirationFooter.tsx', 'utf8');
const commentsApi = readFileSync('src/app/api/inspiraciones/comments/route.ts', 'utf8');
const admin = readFileSync('src/app/admin/comentarios-inspiracion/page.tsx', 'utf8');
const schema = readFileSync('scripts/ensure-inspiration-comments-schema.mjs', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

describe('inspiration visual and comments contract', () => {
  it('uses real published inspiration assets in the store card instead of generic storefront imagery', () => {
    expect(store).toContain('StoreInspirationPreview');
    expect(storePreview).toContain('/api/proyectos/cloudinary?folder=fabrick/inspiraciones');
    expect(storePreview).toContain('filter((asset) => !asset.fallback');
    expect(storePreview).toContain('No usamos una foto genérica');
    expect(storePreview).not.toContain('RADIER_VISUAL');
    expect(storePreview).not.toContain('AIR_VISUAL');
  });

  it('keeps the inspiration library aligned to the storefront and prioritizes the real premium kitchen reference', () => {
    expect(gallery).toContain('bg-[#05090C] text-white');
    expect(gallery).toContain('PREMIUM_KITCHEN_PUBLIC_ID');
    expect(gallery).toContain('cctdsbifgfg5ca9edgbq');
    expect(gallery).toContain('miniaturas del mismo álbum');
    expect(gallery).toContain('Cotizar idea');
    expect(detail).toContain('bg-[#05090C] text-white');
  });

  it('removes decorative guide-like title icons from inspiration headings', () => {
    expect(detail).not.toContain('<Sparkles');
    expect(detail).not.toContain('<Search');
    expect(comments).not.toContain('<Sparkles');
    expect(comments).not.toContain('<MessagesSquare');
    expect(detail).toContain('Recorrido visual');
    expect(comments).toContain('Aportes de visitantes');
  });

  it('turns keywords into navigation to matching album images', () => {
    expect(detail).toContain('InspirationKeywordNavigator');
    expect(detail).toContain('id={`imagen-${asset.id}`}');
    expect(keywords).toContain('scoreAsset');
    expect(keywords).toContain("document.getElementById(`imagen-${id}`)");
    expect(keywords).toContain('scrollIntoView');
    expect(keywords).toContain('Imágenes relacionadas');
  });

  it('uses a compact inspiration-specific footer instead of the old generic store footer', () => {
    expect(gallery).toContain('InspirationFooter');
    expect(detail).toContain('InspirationFooter');
    expect(footer).toContain('De la referencia a la obra');
    expect(footer).toContain('Calcular mi proyecto');
  });

  it('stores public contributions as pending and exposes only published comments publicly', () => {
    expect(comments).toContain("fetch('/api/inspiraciones/comments'");
    expect(comments).toContain('quedó guardado y en revisión');
    expect(commentsApi).toContain("status: 'pending'");
    expect(commentsApi).toContain("query.eq('status', 'published')");
    expect(commentsApi).toContain('ip_hash');
    expect(commentsApi).toContain('COMMENTS_STORAGE_UNAVAILABLE');
    expect(commentsApi).not.toContain('message || fallback');
  });

  it('provides an authenticated moderation inbox with publish and archive states', () => {
    expect(commentsApi).toContain('ADMIN_COOKIE_NAME');
    expect(commentsApi).toContain('decodeSession');
    expect(admin).toContain('Comentarios de Inspiraciones');
    expect(admin).toContain("save(row, 'published')");
    expect(admin).toContain("save(row, 'archived')");
    expect(admin).toContain('Respuesta de Soluciones Fabrick');
  });

  it('creates, repairs and verifies the comments table on every deployment', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.inspiration_comments');
    expect(schema).toContain("CHECK (status IN ('pending','published','archived'))");
    expect(schema).toContain('inspiration_comments_album_status_idx');
    expect(schema).toContain('RAISE EXCEPTION');
    expect(schema).toContain('fabrick_schema_health');
    expect(schema).toContain('schema v2 verified');
    expect(schema).not.toContain('DROP TABLE');
    expect(schema).not.toContain('DELETE FROM');
    expect((pkg.scripts.build.match(/schema:inspirations/g) || []).length).toBe(2);
  });
});
