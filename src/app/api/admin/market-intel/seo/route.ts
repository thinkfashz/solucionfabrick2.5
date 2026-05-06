import { NextResponse, type NextRequest } from 'next/server';
import { adminUnauthorized, getAdminInsforge, getAdminSession } from '@/lib/adminApi';
import { generateSeoBundle, persistSeoSuggestion } from '@/lib/seoSuggestions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface Body {
	target_keyword?: unknown;
	producto_id?: unknown;
	product_name?: unknown;
	product_description?: unknown;
	price_clp?: unknown;
	url?: unknown;
	tone?: unknown;
	model?: unknown;
}

/**
 * POST /api/admin/market-intel/seo
 *
 * Genera un bundle SEO con OpenRouter (meta_title, meta_description,
 * keywords, JSON-LD). Si `producto_id` viene, se cargan automáticamente
 * los datos del producto desde la BD. La sugerencia se persiste en
 * `seo_suggestions` para revisión + aplicación posterior.
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
	const targetKeyword = typeof body.target_keyword === 'string' ? body.target_keyword.trim() : '';
	if (!targetKeyword) return NextResponse.json({ error: 'Falta target_keyword.' }, { status: 400 });
	if (targetKeyword.length > 200) return NextResponse.json({ error: 'target_keyword demasiado largo.' }, { status: 400 });

	let productoId: string | null = typeof body.producto_id === 'string' && body.producto_id.length > 0 ? body.producto_id : null;
	let productName = typeof body.product_name === 'string' ? body.product_name : '';
	let productDescription = typeof body.product_description === 'string' ? body.product_description : '';
	let priceCLP: number | null = typeof body.price_clp === 'number' ? body.price_clp : null;
	const url = typeof body.url === 'string' ? body.url : undefined;
	const tone: 'profesional' | 'cercano' | 'urgente' =
		body.tone === 'cercano' || body.tone === 'urgente' ? body.tone : 'profesional';
	const model = typeof body.model === 'string' && body.model ? body.model : undefined;

	if (productoId) {
		try {
			const client = getAdminInsforge();
			const { data } = await client.database
				.from('productos')
				.select('id, nombre, descripcion, precio')
				.eq('id', productoId)
				.maybeSingle();
			if (data) {
				const row = data as { id: string; nombre?: string; descripcion?: string; precio?: number };
				productName ||= row.nombre ?? '';
				productDescription ||= row.descripcion ?? '';
				if (priceCLP == null && typeof row.precio === 'number') priceCLP = row.precio;
			} else {
				productoId = null;
			}
		} catch {
			productoId = null;
		}
	}

	try {
		const bundle = await generateSeoBundle({
			targetKeyword,
			productName: productName || undefined,
			productDescription: productDescription || undefined,
			priceCLP,
			url,
			tone,
			model,
		});
		const suggestionId = await persistSeoSuggestion({ ...bundle, productoId, targetKeyword });
		return NextResponse.json({ ok: true, bundle, suggestionId });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Error generando SEO.';
		return NextResponse.json({ error: msg }, { status: 500 });
	}
}
