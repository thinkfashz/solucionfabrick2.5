import { describe, expect, it } from 'vitest';
import { extractJsonObject, parseSeoBundle, sanitizeJsonLd } from '@/lib/seoSuggestions';

describe('seoSuggestions · extractJsonObject', () => {
	it('extrae el primer objeto JSON balanceado', () => {
		const txt = 'noise {"a":1,"b":{"c":2}} more';
		expect(extractJsonObject(txt)).toBe('{"a":1,"b":{"c":2}}');
	});
	it('tolera fences markdown ```json', () => {
		const txt = '```json\n{"x":"y"}\n```';
		expect(extractJsonObject(txt)).toBe('{"x":"y"}');
	});
	it('ignora llaves dentro de strings', () => {
		const txt = '{"a":"con } llave"}';
		expect(extractJsonObject(txt)).toBe('{"a":"con } llave"}');
	});
	it('devuelve null si no hay JSON', () => {
		expect(extractJsonObject('no hay nada aquí')).toBeNull();
	});
});

describe('seoSuggestions · sanitizeJsonLd', () => {
	it('mantiene claves whitelisted y agrega @context/@type por defecto', () => {
		const out = sanitizeJsonLd({ name: 'X', description: 'Y' });
		expect(out['@context']).toBe('https://schema.org');
		expect(out['@type']).toBe('Product');
		expect(out.name).toBe('X');
		expect(out.description).toBe('Y');
	});
	it('descarta claves no whitelisted', () => {
		const out = sanitizeJsonLd({ name: 'X', __evil: '<script>', script: 'alert(1)' });
		expect(out.__evil).toBeUndefined();
		expect(out.script).toBeUndefined();
	});
	it('saneamiento de offers conserva sólo claves seguras', () => {
		const out = sanitizeJsonLd({
			name: 'X',
			offers: { '@type': 'Offer', price: 100, priceCurrency: 'CLP', evilKey: 'x' },
		});
		expect((out.offers as Record<string, unknown>)['evilKey']).toBeUndefined();
		expect((out.offers as Record<string, unknown>).price).toBe(100);
	});
	it('input inválido devuelve un Product mínimo', () => {
		const out = sanitizeJsonLd(null);
		expect(out['@type']).toBe('Product');
	});
});

describe('seoSuggestions · parseSeoBundle', () => {
	it('parsea respuesta JSON estándar', () => {
		const text = JSON.stringify({
			meta_title: 'Panel SIP estructural · Soluciones Fabrick',
			meta_description: 'Compra paneles SIP de alta resistencia con envío a todo Chile.',
			keywords: ['panel sip', 'sip estructural', 'panel sip chile'],
			jsonld: {
				'@context': 'https://schema.org',
				'@type': 'Product',
				name: 'Panel SIP',
				description: '90mm',
			},
		});
		const out = parseSeoBundle(text, 'free-model');
		expect(out).not.toBeNull();
		expect(out!.metaTitle).toContain('Panel SIP');
		expect(out!.keywords.length).toBe(3);
		expect(out!.jsonld['@type']).toBe('Product');
		expect(out!.model).toBe('free-model');
	});

	it('trunca metas a longitudes razonables', () => {
		const text = JSON.stringify({
			meta_title: 'a'.repeat(500),
			meta_description: 'b'.repeat(500),
			keywords: Array.from({ length: 50 }, (_, i) => `kw${i}`),
			jsonld: {},
		});
		const out = parseSeoBundle(text, 'm');
		expect(out!.metaTitle.length).toBeLessThanOrEqual(80);
		expect(out!.metaDescription.length).toBeLessThanOrEqual(200);
		expect(out!.keywords.length).toBeLessThanOrEqual(12);
	});

	it('devuelve null cuando no hay JSON parseable', () => {
		expect(parseSeoBundle('no es json', 'm')).toBeNull();
	});
});
