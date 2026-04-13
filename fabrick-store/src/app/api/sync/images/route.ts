/**
 * AGENTE 1 — IMAGE SYNC
 * Busca imágenes reales en Unsplash por nombre de producto
 * y actualiza image_url en la DB de InsForge.
 */
import { NextResponse } from 'next/server';
import { insforge } from '@/lib/insforge';

/* Mapa de búsqueda por palabra clave → query Unsplash */
const SEARCH_MAP: Record<string, string> = {
  'wall panel wpc':       'wood wall panel interior',
  'pvc mármol calacatta': 'white marble luxury interior',
  'termopanel':           'modern glass window architecture',
  'porcelanato black':    'black gold floor tiles luxury',
  'smart hub fabrick':    'security camera smart home',
  'wall panel hd':        'white wall panel clean modern',
  'pvc mármol carrara':   'carrara marble white texture',
  'perfil aluminio':      'aluminum profile metal construction',
};

function getUnsplashQuery(productName: string): string {
  const lower = productName.toLowerCase();
  for (const [key, query] of Object.entries(SEARCH_MAP)) {
    if (lower.includes(key)) return query;
  }
  return productName + ' construction material luxury';
}

async function fetchRealImageUrl(query: string): Promise<string> {
  const encoded = encodeURIComponent(query);
  try {
    const res = await fetch(
      `https://source.unsplash.com/800x600/?${encoded}`,
      { redirect: 'follow', signal: AbortSignal.timeout(8000) }
    );
    if (res.ok && res.url.includes('images.unsplash.com')) {
      // Limpiar query params de tracking → URL limpia
      const url = new URL(res.url);
      url.search = '?w=800&q=85&fit=crop';
      return url.toString();
    }
  } catch { /* timeout o error → fallback */ }

  // Fallback: imagen genérica de materiales de construcción
  const fallbacks = [
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=85&fit=crop',
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=85&fit=crop',
    'https://images.unsplash.com/photo-1565008576549-57569a49371d?w=800&q=85&fit=crop',
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const productIds: string[] = body.productIds ?? [];

    // Obtener productos (todos si no se especifican IDs)
    let query = insforge.database.from('products').select('id, name, image_url');
    if (productIds.length > 0) query = query.in('id', productIds);
    const { data: products, error: fetchErr } = await query;

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });

    const results: Array<{ id: string; name: string; image_url: string; status: string }> = [];

    // Procesar en paralelo (máx 5 concurrentes)
    const CHUNK = 5;
    const chunks = [];
    for (let i = 0; i < (products ?? []).length; i += CHUNK) {
      chunks.push((products ?? []).slice(i, i + CHUNK));
    }

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (product: { id: string; name: string; image_url?: string }) => {
          const searchQuery = getUnsplashQuery(product.name);
          const image_url = await fetchRealImageUrl(searchQuery);

          const { error: updateErr } = await insforge.database
            .from('products')
            .update({ image_url })
            .eq('id', product.id);

          results.push({
            id: product.id,
            name: product.name,
            image_url,
            status: updateErr ? 'error' : 'synced',
          });
        })
      );
    }

    const synced = results.filter((r) => r.status === 'synced').length;
    return NextResponse.json({
      agent: 'IMAGE_SYNC',
      total: results.length,
      synced,
      failed: results.length - synced,
      results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
