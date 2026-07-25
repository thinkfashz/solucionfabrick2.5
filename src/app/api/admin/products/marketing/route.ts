import { NextResponse, type NextRequest } from 'next/server';
import { insforgeAdmin } from '@/lib/insforge';
import { requireAdminPermission } from '@/lib/adminPermissions';
import { recordAdminAudit, recordAdminFailure } from '@/lib/adminAudit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type GalleryAsset = { url?: string; public_id?: string; source?: string };
type Rewrite = {
  name?: string;
  tagline?: string;
  shortDescription?: string;
  longDescription?: string;
  niche?: string;
  targetAudience?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  longTailKeywords?: string[];
  commercialKeywords?: string[];
  hashtags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  slug?: string;
  imageAltTexts?: string[];
  imageCaptions?: string[];
  adPrimaryText?: string;
  adHeadline?: string;
  adDescription?: string;
  callToAction?: string;
  visualPrompts?: string[];
  searchPotential?: number;
  salesPotential?: number;
  keywordRationale?: string;
};

type Body = {
  productId?: string;
  rewrite?: Rewrite;
  galleryAssets?: GalleryAsset[];
  coverUrl?: string;
  rewriteProduct?: boolean;
};

function strings(value: unknown, limit = 16) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean))).slice(0, limit);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminPermission(request, { resource: 'products', action: 'update' });
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({})) as Body;
  const productId = String(body.productId || '').trim();
  if (!productId) return NextResponse.json({ error: 'Selecciona un producto.' }, { status: 400 });
  if (!body.rewrite) return NextResponse.json({ error: 'Falta la propuesta seleccionada.' }, { status: 400 });

  const { data: rows, error: readError } = await insforgeAdmin.database
    .from('products')
    .select('id, name, description, tagline, image_url, specifications')
    .eq('id', productId)
    .limit(1);

  if (readError || !rows?.length) {
    await recordAdminFailure({ session: auth.session, request, action: 'update', resource: 'products', resourceId: productId, metadata: { error: readError?.message || 'not_found' } });
    return NextResponse.json({ error: readError?.message || 'Producto no encontrado.' }, { status: 404 });
  }

  const current = rows[0] as { name?: string; description?: string; tagline?: string; image_url?: string; specifications?: Record<string, unknown> | null };
  const rewrite = body.rewrite;
  const previousSpecs = current.specifications && typeof current.specifications === 'object' && !Array.isArray(current.specifications) ? current.specifications : {};
  const previousAssets = Array.isArray(previousSpecs.gallery_assets) ? previousSpecs.gallery_assets : [];
  const nextAssets = [...previousAssets, ...(body.galleryAssets || [])]
    .filter((asset) => asset && typeof asset === 'object' && String((asset as GalleryAsset).url || '').trim())
    .filter((asset, index, all) => all.findIndex((candidate) => String((candidate as GalleryAsset).url) === String((asset as GalleryAsset).url)) === index)
    .slice(0, 30);
  const galleryUrls = nextAssets.map((asset) => String((asset as GalleryAsset).url || '').trim()).filter(Boolean);

  const marketing = {
    niche: String(rewrite.niche || '').slice(0, 120),
    target_audience: String(rewrite.targetAudience || '').slice(0, 300),
    primary_keyword: String(rewrite.primaryKeyword || '').slice(0, 120),
    secondary_keywords: strings(rewrite.secondaryKeywords, 14),
    long_tail_keywords: strings(rewrite.longTailKeywords, 12),
    commercial_keywords: strings(rewrite.commercialKeywords, 12),
    hashtags: strings(rewrite.hashtags, 16),
    seo_title: String(rewrite.seoTitle || '').slice(0, 80),
    seo_description: String(rewrite.seoDescription || '').slice(0, 180),
    seo_slug: String(rewrite.slug || '').slice(0, 100),
    short_description: String(rewrite.shortDescription || '').slice(0, 420),
    image_alt_texts: strings(rewrite.imageAltTexts, 30),
    image_captions: strings(rewrite.imageCaptions, 30),
    ad_primary_text: String(rewrite.adPrimaryText || '').slice(0, 900),
    ad_headline: String(rewrite.adHeadline || '').slice(0, 100),
    ad_description: String(rewrite.adDescription || '').slice(0, 220),
    ad_call_to_action: String(rewrite.callToAction || '').slice(0, 50),
    visual_prompts: strings(rewrite.visualPrompts, 8),
    search_potential_estimate: Number(rewrite.searchPotential || 0),
    sales_potential_estimate: Number(rewrite.salesPotential || 0),
    keyword_rationale: String(rewrite.keywordRationale || '').slice(0, 600),
    generated_at: new Date().toISOString(),
  };

  const specifications = {
    ...previousSpecs,
    gallery_assets: nextAssets,
    gallery_images: galleryUrls,
    marketing_ai: marketing,
    seo_title: marketing.seo_title,
    seo_description: marketing.seo_description,
    primary_keyword: marketing.primary_keyword,
    secondary_keywords: marketing.secondary_keywords,
    long_tail_keywords: marketing.long_tail_keywords,
    hashtags: marketing.hashtags,
    image_alt_texts: marketing.image_alt_texts,
    image_captions: marketing.image_captions,
  };

  const patch: Record<string, unknown> = {
    specifications,
    image_url: String(body.coverUrl || galleryUrls[0] || current.image_url || '').trim(),
  };
  if (body.rewriteProduct !== false) {
    patch.name = String(rewrite.name || current.name || '').trim().slice(0, 160);
    patch.tagline = String(rewrite.tagline || current.tagline || '').trim().slice(0, 200);
    patch.description = String(rewrite.longDescription || current.description || '').trim().slice(0, 2400);
  }

  const { error } = await insforgeAdmin.database.from('products').update(patch).eq('id', productId);
  if (error) {
    await recordAdminFailure({ session: auth.session, request, action: 'update', resource: 'products', resourceId: productId, metadata: { error: error.message } });
    return NextResponse.json({ error: error.message || 'No se pudo actualizar el producto.' }, { status: 500 });
  }

  await recordAdminAudit({ session: auth.session, request, action: 'update', resource: 'products', resourceId: productId, metadata: { source: 'ai_marketing', imagesAdded: body.galleryAssets?.length || 0, rewriteProduct: body.rewriteProduct !== false } });
  return NextResponse.json({ ok: true, productId, galleryCount: galleryUrls.length, marketing });
}
