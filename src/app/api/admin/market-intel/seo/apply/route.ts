import { NextResponse, type NextRequest } from 'next/server';
import { adminUnauthorized, getAdminSession } from '@/lib/adminApi';
import { applySeoSuggestion } from '@/lib/seoSuggestions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Body {
	suggestion_id?: unknown;
	producto_id?: unknown;
}

/**
 * POST /api/admin/market-intel/seo/apply
 *
 * Aplica una sugerencia SEO ya generada al producto indicado: copia
 * meta_title, meta_description, seo_keywords y jsonld a `productos` y
 * marca la sugerencia como `applied=true`.
 */
export async function POST(request: NextRequest) {
	const session = await getAdminSession(request);
	if (!session) return adminUnauthorized();
	let body: Body;
	try {
		body = (await request.json()) as Body;
	} catch {
		return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
	}
	const suggestionId = typeof body.suggestion_id === 'string' ? body.suggestion_id : '';
	const productoId = typeof body.producto_id === 'string' ? body.producto_id : '';
	if (!suggestionId || !productoId) {
		return NextResponse.json({ error: 'Faltan suggestion_id o producto_id.' }, { status: 400 });
	}
	const ok = await applySeoSuggestion(suggestionId, productoId);
	if (!ok) {
		return NextResponse.json({ error: 'No se pudo aplicar la sugerencia (¿id inválido?).' }, { status: 500 });
	}
	return NextResponse.json({ ok: true });
}
