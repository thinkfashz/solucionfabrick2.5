import 'server-only';
import { chatCompletion, RECOMMENDED_FREE_MODELS, type ChatMessage } from './openrouter';
import { insforgeAdmin } from './insforge';

/**
 * SEO con IA — genera bundles de SEO (meta_title, meta_description,
 * keywords, JSON-LD) usando OpenRouter para productos del catálogo o queries
 * libres. Forzamos respuesta JSON estricta para hacer parseo robusto.
 *
 * El JSON-LD se construye como un objeto Product de schema.org con campos
 * mínimos y se sanitiza antes de persistirlo (sólo estructura segura).
 */

export interface SeoBundle {
	metaTitle: string;
	metaDescription: string;
	keywords: string[];
	jsonld: Record<string, unknown>;
	model: string;
	raw: string;
}

export interface GenerateSeoOpts {
	model?: string;
	targetKeyword: string;
	productName?: string;
	productDescription?: string;
	priceCLP?: number | null;
	url?: string;
	tone?: 'profesional' | 'cercano' | 'urgente';
}

const SYSTEM_PROMPT = `Eres un especialista en SEO técnico para tiendas e-commerce de construcción y mejoras del hogar en Chile.
Tu tarea: generar metadatos SEO orientados a posicionar productos en Google y motores de búsqueda.
Respondes SIEMPRE con un único objeto JSON válido (sin texto extra, sin markdown, sin \`\`\`).
Estructura exacta:
{
  "meta_title": "...",            // máx 60 caracteres, incluye keyword principal
  "meta_description": "...",      // máx 155 caracteres, persuasiva, incluye CTA
  "keywords": ["...", "..."],     // 5–10 keywords y long-tails relevantes en español de Chile
  "jsonld": { ... }               // objeto schema.org/Product mínimo válido
}
El JSON-LD debe contener al menos: "@context":"https://schema.org", "@type":"Product", "name", "description". Si hay precio, añadir "offers" con "@type":"Offer", "priceCurrency":"CLP" y "price".`;

function buildUserPrompt(opts: GenerateSeoOpts): string {
	const tone = opts.tone ?? 'profesional';
	const lines: string[] = [
		`Keyword principal: ${opts.targetKeyword}`,
		opts.productName ? `Nombre del producto: ${opts.productName}` : null,
		opts.productDescription ? `Descripción: ${opts.productDescription}` : null,
		typeof opts.priceCLP === 'number' && opts.priceCLP > 0 ? `Precio en CLP: ${Math.round(opts.priceCLP)}` : null,
		opts.url ? `URL canónica: ${opts.url}` : null,
		`Tono: ${tone}`,
		'Tienda: Soluciones Fabrick (construcción, ferretería, mejoras del hogar, Chile).',
		'Devuelve solo el JSON.',
	].filter((l): l is string => Boolean(l));
	return lines.join('\n');
}

/** Extrae el primer objeto JSON balanceado de una cadena. Tolera fences ```json. */
export function extractJsonObject(text: string): string | null {
	if (!text) return null;
	const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced ? fenced[1]! : text;
	const start = candidate.indexOf('{');
	if (start < 0) return null;
	let depth = 0;
	let inString = false;
	let escape = false;
	for (let i = start; i < candidate.length; i += 1) {
		const c = candidate[i]!;
		if (escape) {
			escape = false;
			continue;
		}
		if (c === '\\') {
			escape = true;
			continue;
		}
		if (c === '"') {
			inString = !inString;
			continue;
		}
		if (inString) continue;
		if (c === '{') depth += 1;
		else if (c === '}') {
			depth -= 1;
			if (depth === 0) return candidate.slice(start, i + 1);
		}
	}
	return null;
}

const ALLOWED_JSONLD_KEYS = new Set([
	'@context',
	'@type',
	'name',
	'description',
	'image',
	'sku',
	'mpn',
	'brand',
	'offers',
	'aggregateRating',
	'review',
	'category',
	'url',
]);

const ALLOWED_OFFER_KEYS = new Set([
	'@type',
	'priceCurrency',
	'price',
	'availability',
	'url',
	'priceValidUntil',
	'itemCondition',
]);

/** Sanea un objeto JSON-LD aceptando solo claves whitelisted y tipos primitivos. */
export function sanitizeJsonLd(input: unknown): Record<string, unknown> {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		return { '@context': 'https://schema.org', '@type': 'Product' };
	}
	const src = input as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(src)) {
		if (!ALLOWED_JSONLD_KEYS.has(key)) continue;
		if (key === 'offers' && value && typeof value === 'object' && !Array.isArray(value)) {
			const offer: Record<string, unknown> = {};
			for (const [ok, ov] of Object.entries(value as Record<string, unknown>)) {
				if (!ALLOWED_OFFER_KEYS.has(ok)) continue;
				if (typeof ov === 'string' || typeof ov === 'number' || typeof ov === 'boolean') offer[ok] = ov;
			}
			if (!offer['@type']) offer['@type'] = 'Offer';
			out.offers = offer;
			continue;
		}
		if (key === 'brand' && value && typeof value === 'object' && !Array.isArray(value)) {
			const brand = value as Record<string, unknown>;
			out.brand = {
				'@type': 'Brand',
				name: typeof brand.name === 'string' ? brand.name : 'Soluciones Fabrick',
			};
			continue;
		}
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
			out[key] = value;
		} else if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
			out[key] = value.slice(0, 10);
		}
	}
	if (!out['@context']) out['@context'] = 'https://schema.org';
	if (!out['@type']) out['@type'] = 'Product';
	return out;
}

export function parseSeoBundle(text: string, model: string): SeoBundle | null {
	const json = extractJsonObject(text);
	if (!json) return null;
	let parsed: Record<string, unknown>;
	try {
		parsed = JSON.parse(json) as Record<string, unknown>;
	} catch {
		return null;
	}
	const metaTitle = typeof parsed.meta_title === 'string' ? parsed.meta_title.trim().slice(0, 80) : '';
	const metaDescription = typeof parsed.meta_description === 'string' ? parsed.meta_description.trim().slice(0, 200) : '';
	const keywordsRaw = Array.isArray(parsed.keywords) ? parsed.keywords : [];
	const keywords = keywordsRaw
		.filter((k): k is string => typeof k === 'string')
		.map((k) => k.trim())
		.filter((k) => k.length > 0)
		.slice(0, 12);
	const jsonld = sanitizeJsonLd(parsed.jsonld);
	if (!metaTitle && !metaDescription && keywords.length === 0) return null;
	return { metaTitle, metaDescription, keywords, jsonld, model, raw: text };
}

export async function generateSeoBundle(opts: GenerateSeoOpts): Promise<SeoBundle> {
	const model = opts.model ?? RECOMMENDED_FREE_MODELS[0] ?? 'meta-llama/llama-3.2-3b-instruct:free';
	const messages: ChatMessage[] = [
		{ role: 'system', content: SYSTEM_PROMPT },
		{ role: 'user', content: buildUserPrompt(opts) },
	];
	const result = await chatCompletion({ model, messages, temperature: 0.4, maxTokens: 900 });
	const parsed = parseSeoBundle(result.text, result.model);
	if (parsed) return parsed;
	// Fallback: si no parsea, devolvemos un bundle mínimo basado en los inputs.
	return {
		metaTitle: (opts.productName ?? opts.targetKeyword).slice(0, 60),
		metaDescription: (opts.productDescription ?? `Descubre ${opts.targetKeyword} en Soluciones Fabrick. Calidad y envíos a todo Chile.`).slice(0, 155),
		keywords: [opts.targetKeyword],
		jsonld: sanitizeJsonLd({
			'@context': 'https://schema.org',
			'@type': 'Product',
			name: opts.productName ?? opts.targetKeyword,
			description: opts.productDescription ?? '',
		}),
		model: result.model,
		raw: result.text,
	};
}

export interface PersistSeoSuggestionInput extends SeoBundle {
	productoId: string | null;
	targetKeyword: string;
}

export async function persistSeoSuggestion(input: PersistSeoSuggestionInput): Promise<string | null> {
	try {
		const { data, error } = await insforgeAdmin.database
			.from('seo_suggestions')
			.insert([
				{
					producto_id: input.productoId,
					target_keyword: input.targetKeyword,
					meta_title: input.metaTitle,
					meta_description: input.metaDescription,
					keywords: input.keywords,
					jsonld: input.jsonld,
					raw: input.raw.slice(0, 4000),
					model: input.model,
					applied: false,
				},
			])
			.select('id')
			.single();
		if (error || !data) return null;
		return (data as { id: string }).id;
	} catch {
		return null;
	}
}

export async function applySeoSuggestion(suggestionId: string, productoId: string): Promise<boolean> {
	try {
		const { data: sug } = await insforgeAdmin.database
			.from('seo_suggestions')
			.select('meta_title, meta_description, keywords, jsonld')
			.eq('id', suggestionId)
			.maybeSingle();
		if (!sug) return false;
		const row = sug as { meta_title?: string; meta_description?: string; keywords?: string[]; jsonld?: Record<string, unknown> };
		await insforgeAdmin.database
			.from('productos')
			.update({
				meta_title: row.meta_title ?? null,
				meta_description: row.meta_description ?? null,
				seo_keywords: Array.isArray(row.keywords) ? row.keywords : null,
				jsonld: row.jsonld ?? null,
			})
			.eq('id', productoId);
		await insforgeAdmin.database
			.from('seo_suggestions')
			.update({ applied: true, applied_at: new Date().toISOString(), producto_id: productoId })
			.eq('id', suggestionId);
		return true;
	} catch {
		return false;
	}
}
