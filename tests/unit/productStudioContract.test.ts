import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Product Studio mobile commerce contract', () => {
  it('isolates visual CMS overrides from admin and auth routes', () => {
    const runtime = readFileSync('src/components/cms/VisualCmsRuntime.tsx', 'utf8');
    expect(runtime).toContain("pathname.startsWith('/admin/')");
    expect(runtime).toContain("pathname.startsWith('/auth/')");
    expect(runtime).toContain('if (blockedRoute) return;');
  });

  it('keeps zero-stock products out of every public catalog path', () => {
    const tiendaApi = readFileSync('src/app/api/tienda/products/route.ts', 'utf8');
    const productosApi = readFileSync('src/app/api/productos/route.ts', 'utf8');
    const realtime = readFileSync('src/hooks/useRealtimeProducts.ts', 'utf8');
    const adminApi = readFileSync('src/app/api/admin/products/route.ts', 'utf8');

    expect(tiendaApi).toContain(".gt('stock', 0)");
    expect(productosApi).toContain(".gt('stock', 0)");
    expect(realtime).toContain('(product.stock ?? 0) <= 0');
    expect(adminApi).toContain('Añade al menos 1 unidad de stock antes de activar el producto.');
    expect(adminApi).toContain('patch.activo = false');
  });

  it('renders compact mobile product cards with explicit catalog state and readable edit action', () => {
    const page = readFileSync('src/app/admin/productos/page.tsx', 'utf8');
    expect(page).toContain('Oculto · sin stock');
    expect(page).toContain('Editar producto');
    expect(page).toContain('!text-[#5f430d]');
    expect(page).toContain('grid grid-cols-2 gap-2');
  });

  it('supports guided SEO generation with OpenRouter or Ollama and safe autofill', () => {
    const editor = readFileSync('src/app/admin/productos/ProductStudioEditor.tsx', 'utf8');
    const marketing = readFileSync('src/app/api/admin/products/ai-marketing/route.ts', 'utf8');

    expect(editor).toContain('Guía de contenido + IA');
    expect(editor).toContain('<option value="ollama">Ollama</option>');
    expect(editor).toContain('Autorrellenar desde la guía');
    expect(editor).toContain('ai_content_guide');
    expect(editor).toContain('ai_autofill_from_guide');
    expect(marketing).toContain("resolveTenantProviderConfig('ollama'");
    expect(marketing).toContain("provider === 'ollama'");
    expect(marketing).toContain('Guía editorial obligatoria del administrador');
  });

  it('generates two AI image candidates and requires an explicit cover choice', () => {
    const api = readFileSync('src/app/api/admin/products/ai-image/route.ts', 'utf8');
    const dock = readFileSync('src/components/admin/products/ProductAiImageDock.tsx', 'utf8');
    const editor = readFileSync('src/app/admin/productos/ProductStudioEditor.tsx', 'utf8');

    expect(api).toContain('candidateCount');
    expect(api).toContain('applyFirst');
    expect(api).toContain('persistProductImages');
    expect(dock).toContain('candidateCount: 2');
    expect(dock).toContain('applyFirst: false');
    expect(dock).toContain('Usar esta portada');
    expect(dock).toContain('grid grid-cols-2');
    expect(editor).toContain('grid grid-cols-2 gap-2.5');
  });

  it('searches connected market APIs and imports selected products as hidden stock-zero drafts', () => {
    const importer = readFileSync('src/app/admin/productos/ProductImportModal.tsx', 'utf8');

    expect(importer).toContain('Buscar online');
    expect(importer).toContain('/api/admin/market-intel/search');
    expect(importer).toContain('mercadolibre');
    expect(importer).toContain('serper');
    expect(importer).toContain('serpapi');
    expect(importer).toContain('stock: 0');
    expect(importer).toContain('activo: false');
    expect(importer).toContain('selectedOnline.length');
  });

  it('persists moderated product reviews and exposes moderation inside Product Studio', () => {
    const api = readFileSync('src/app/api/product-reviews/route.ts', 'utf8');
    const schema = readFileSync('scripts/ensure-product-reviews-schema.mjs', 'utf8');
    const storefront = readFileSync('src/app/tienda/[id]/ProductoClient.tsx', 'utf8');
    const editor = readFileSync('src/app/admin/productos/ProductStudioEditor.tsx', 'utf8');

    expect(schema).toContain('CREATE TABLE IF NOT EXISTS public.product_reviews');
    expect(api).toContain("status: 'pending'");
    expect(api).toContain("query = query.eq('status', 'published')");
    expect(api).toContain('verified_purchase');
    expect(storefront).toContain('/api/product-reviews');
    expect(storefront).toContain('Enviar para revisión');
    expect(editor).toContain('Opiniones y moderación');
    expect(editor).toContain('Marcar verificada');
  });
  it('grounds product research in selected online references and official Mercado Libre item details', () => {
    const panel = readFileSync('src/components/admin/products/ProductResearchPanel.tsx', 'utf8');
    const research = readFileSync('src/app/api/admin/products/research/route.ts', 'utf8');
    const editor = readFileSync('src/app/admin/productos/ProductStudioEditor.tsx', 'utf8');

    expect(panel).toContain('/api/admin/market-intel/search');
    expect(panel).toContain('/api/admin/products/research');
    expect(panel).toContain('Precio');
    expect(panel).toContain('Referencias encontradas');
    expect(research).toContain('https://api.mercadolibre.com/items/');
    expect(research).toContain('sourceIndexes');
    expect(research).toContain('No inventes potencia, dimensiones, materiales');
    expect(research).toContain("resolveTenantProviderConfig('ollama'");
    expect(editor).toContain('public_features');
    expect(editor).toContain('product_research');
  });

  it('supports online visual references without auto-publishing them as the cover', () => {
    const dock = readFileSync('src/components/admin/products/ProductAiImageDock.tsx', 'utf8');
    const api = readFileSync('src/app/api/admin/products/ai-image/route.ts', 'utf8');

    expect(dock).toContain('Referencias visuales online');
    expect(dock).toContain('/api/admin/market-intel/search');
    expect(dock).toContain('selectedReferences');
    expect(dock).toContain('referenceUrls: selectedReferences');
    expect(api).toContain('referenceUrls');
    expect(api).toContain('input_references');
    expect(api).toContain('No copies logos, marcas de agua');
  });

  it('offers an unsaved customer preview and explicit related product control', () => {
    const editor = readFileSync('src/app/admin/productos/ProductStudioEditor.tsx', 'utf8');
    const preview = readFileSync('src/components/admin/products/ProductPreviewModal.tsx', 'utf8');

    expect(editor).toContain("label: 'Publicación'");
    expect(editor).toContain('related_product_ids');
    expect(editor).toContain('Productos relacionados');
    expect(editor).toContain('<ProductPreviewModal');
    expect(preview).toContain('Vista previa privada');
    expect(preview).toContain('Ficha que verá el cliente');
  });

  it('keeps storefront characteristics public-only and prioritizes explicit related products', () => {
    const storefront = readFileSync('src/app/tienda/[id]/ProductoClient.tsx', 'utf8');

    expect(storefront).toContain('specifications?.public_features');
    expect(storefront).toContain('related_product_ids');
    expect(storefront).not.toContain('FALLBACK_CATALOG_PRODUCTS');
    expect(storefront).toContain('orderedReviews');
    expect(storefront).toContain('ratingBreakdown');
    expect(storefront).toContain('Productos relacionados');
  });

  it('provides a central review workspace with replies, featured state and Ollama analysis', () => {
    const page = readFileSync('src/app/admin/opiniones-productos/page.tsx', 'utf8');
    const api = readFileSync('src/app/api/product-reviews/route.ts', 'utf8');
    const analyze = readFileSync('src/app/api/admin/product-reviews/analyze/route.ts', 'utf8');
    const schema = readFileSync('scripts/ensure-product-reviews-schema.mjs', 'utf8');
    const nav = readFileSync('src/components/admin/AdminShell.tsx', 'utf8');

    expect(page).toContain('Opiniones de productos');
    expect(page).toContain('Analizar con');
    expect(page).toContain('Destacar');
    expect(page).toContain('Respuesta de Soluciones Fabrick');
    expect(api).toContain('product_name');
    expect(api).toContain('featured');
    expect(schema).toContain('featured boolean');
    expect(schema).toContain('analysis jsonb');
    expect(analyze).toContain("body.provider === 'openrouter' ? 'openrouter' : 'ollama'");
    expect(analyze).toContain('replySuggestion');
    expect(nav).toContain('/admin/opiniones-productos');
  });

  it('orders the catalog by items needing attention before secondary sort choices', () => {
    const page = readFileSync('src/app/admin/productos/page.tsx', 'utf8');

    expect(page).toContain("useState<Sort>('attention')");
    expect(page).toContain('Necesita atención primero');
    expect(page).toContain('attentionScore');
    expect(page).toContain('Destacados primero');
    expect(page).toContain('Stock mayor');
  });

});
