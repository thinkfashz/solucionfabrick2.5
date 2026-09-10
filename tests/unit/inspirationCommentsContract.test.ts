import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const store = readFileSync('src/components/store/TiendaClientV2.tsx', 'utf8');
const storePreview = readFileSync('src/components/store/StoreInspirationPreview.tsx', 'utf8');
const gallery = readFileSync('src/components/proyectos/CloudinaryProjectsGallery.tsx', 'utf8');
const projectPage = readFileSync('src/app/proyectos/page.tsx', 'utf8');
const detail = readFileSync('src/app/inspiraciones/[album]/page.tsx', 'utf8');
const spin = readFileSync('src/components/proyectos/AlbumSpinViewer.tsx', 'utf8');
const comments = readFileSync('src/components/proyectos/InspirationComments.tsx', 'utf8');
const keywords = readFileSync('src/components/proyectos/InspirationKeywordNavigator.tsx', 'utf8');
const footer = readFileSync('src/components/proyectos/InspirationFooter.tsx', 'utf8');
const commentsApi = readFileSync('src/app/api/inspiraciones/comments/route.ts', 'utf8');
const admin = readFileSync('src/app/admin/comentarios-inspiracion/page.tsx', 'utf8');
const schema = readFileSync('scripts/ensure-inspiration-comments-schema.mjs', 'utf8');
const home = readFileSync('src/components/landing/HomePremiumV10.tsx', 'utf8');
const seismicStory = readFileSync('src/components/landing/MetalconSeismicStory.tsx', 'utf8');
const budgetPage = readFileSync('src/app/presupuesto/page.tsx', 'utf8');
const budgetGuide = readFileSync('src/components/presupuesto/BudgetPageGuide.tsx', 'utf8');
const directWhatsApp = readFileSync('src/components/presupuesto/BudgetDirectWhatsApp.tsx', 'utf8');
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
    expect(projectPage).toContain('.sf-album-grid');
    expect(projectPage).toContain('aspect-ratio:16/10');
  });

  it('keeps the desktop inspiration viewer inside one viewport instead of requiring long scroll choreography', () => {
    expect(spin).toContain('Vista 3D · botones y miniaturas');
    expect(spin).toContain('h-[clamp(640px,calc(100vh-112px),820px)]');
    expect(spin).toContain('No necesitas desplazarte varios largos de pantalla');
    expect(spin).not.toContain("window.addEventListener('scroll'");
    expect(spin).not.toContain('trackHeight');
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

  it('surfaces inspiration, calculators, Metalcon and the seismic simulator from the homepage', () => {
    expect(home).toContain("href: '/proyectos'");
    expect(home).toContain("href: '/herramientas/aire-acondicionado'");
    expect(home).toContain("href: '/herramientas/radier'");
    expect(home).toContain("href: '/herramientas/metalcon'");
    expect(home).toContain("href: '/herramientas/metalcon/monitoreo'");
    expect(home).toContain('HOME_PREMIUM_VISUALS.metalcon');
    expect(home).toContain('Simulador sísmico 4D');
    expect(home).toContain('Simular sismo');
    expect(seismicStory).toContain("'/herramientas/metalcon/monitoreo'");
    expect(seismicStory).toContain('Simular sismo y daños');
  });

  it('turns the budget page into a guided service-to-email-or-whatsapp journey', () => {
    expect(budgetPage).toContain('BudgetPageGuide');
    expect(budgetPage).toContain('BudgetDirectWhatsApp');
    expect(budgetPage).toContain('id="budget-core"');
    expect(budgetGuide).toContain('Elige el trabajo. Mide. Compara. Decide.');
    expect(budgetGuide).toContain('Ejecución desde');
    expect(budgetGuide).toContain('Trabajo vendido');
    expect(budgetGuide).toContain('Recibir por correo');
    expect(budgetGuide).toContain('Continuar por WhatsApp');
    expect(budgetGuide).toContain("'metalcon'");
    expect(budgetGuide).toContain("'radier'");
    expect(budgetGuide).toContain("'aire'");
    expect(directWhatsApp).toContain('¿Prefieres WhatsApp sin completar el correo?');
    expect(directWhatsApp).toContain('buildWhatsAppLink');
    expect(directWhatsApp).toContain('TOTAL REFERENCIAL');
    expect(directWhatsApp).toContain('Cotizar directo por WhatsApp');
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

  it('keeps the comments schema repairable but outside the Vercel build', () => {
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.inspiration_comments');
    expect(schema).toContain("CHECK (status IN ('pending','published','archived'))");
    expect(schema).toContain('inspiration_comments_album_status_idx');
    expect(schema).toContain('RAISE EXCEPTION');
    expect(schema).toContain('fabrick_schema_health');
    expect(schema).toContain('schema v2 verified');
    expect(schema).not.toContain('DROP TABLE');
    expect(schema).not.toContain('DELETE FROM');
    expect(pkg.scripts['schema:inspirations']).toContain('ensure-inspiration-comments-schema.mjs');
    expect(pkg.scripts.build).not.toContain('schema:inspirations');
  });
});
