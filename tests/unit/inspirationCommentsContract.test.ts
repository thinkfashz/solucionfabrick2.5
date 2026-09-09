import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const store = readFileSync('src/components/store/TiendaClientV2.tsx', 'utf8');
const storePreview = readFileSync('src/components/store/StoreInspirationPreview.tsx', 'utf8');
const gallery = readFileSync('src/components/proyectos/CloudinaryProjectsGallery.tsx', 'utf8');
const detail = readFileSync('src/app/inspiraciones/[album]/page.tsx', 'utf8');
const comments = readFileSync('src/components/proyectos/InspirationComments.tsx', 'utf8');
const commentsApi = readFileSync('src/app/api/inspiraciones/comments/route.ts', 'utf8');
const admin = readFileSync('src/app/admin/comentarios-inspiracion/page.tsx', 'utf8');
const schema = readFileSync('scripts/ensure-inspiration-comments-schema.mjs', 'utf8');

describe('inspiration visual and comments contract', () => {
  it('uses real published inspiration assets in the store card instead of generic storefront imagery', () => {
    expect(store).toContain('StoreInspirationPreview');
    expect(storePreview).toContain('/api/proyectos/cloudinary?folder=fabrick/inspiraciones');
    expect(storePreview).toContain('filter((asset) => !asset.fallback');
    expect(storePreview).toContain('No usamos una foto genérica');
    expect(storePreview).not.toContain('RADIER_VISUAL');
    expect(storePreview).not.toContain('AIR_VISUAL');
  });

  it('keeps the inspiration library aligned to the dark storefront visual language', () => {
    expect(gallery).toContain('bg-[#05090C] text-white');
    expect(gallery).toContain('Cotizar idea');
    expect(gallery).toContain('miniaturas del mismo álbum');
    expect(detail).toContain('bg-[#05090C] text-white');
    expect(detail).toContain('Comentarios');
  });

  it('stores public contributions as pending and exposes only published comments publicly', () => {
    expect(comments).toContain("fetch('/api/inspiraciones/comments'");
    expect(comments).toContain('quedó guardado y en revisión');
    expect(commentsApi).toContain("status: 'pending'");
    expect(commentsApi).toContain("query.eq('status', 'published')");
    expect(commentsApi).toContain('ip_hash');
  });

  it('provides an authenticated moderation inbox with publish and archive states', () => {
    expect(commentsApi).toContain('ADMIN_COOKIE_NAME');
    expect(commentsApi).toContain('decodeSession');
    expect(admin).toContain('Comentarios de Inspiraciones');
    expect(admin).toContain("save(row, 'published')");
    expect(admin).toContain("save(row, 'archived')");
    expect(admin).toContain('Respuesta de Soluciones Fabrick');
  });

  it('bootstraps the comments table and preserves moderation history', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.inspiration_comments');
    expect(schema).toContain("CHECK (status IN ('pending','published','archived'))");
    expect(schema).toContain('inspiration_comments_album_status_idx');
    expect(schema).not.toContain('DROP TABLE');
    expect(schema).not.toContain('DELETE FROM');
  });
});
