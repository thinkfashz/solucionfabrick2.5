import { describe, expect, it } from 'vitest';
import {
	average,
	computeStats,
	median,
	normalizeQuery,
	parsePriceString,
	type MarketRef,
} from '@/lib/marketIntel';

describe('marketIntel · helpers numéricos', () => {
	it('median devuelve null en arreglo vacío', () => {
		expect(median([])).toBeNull();
	});
	it('median impar = elemento central', () => {
		expect(median([3, 1, 2])).toBe(2);
	});
	it('median par = promedio de los dos centrales', () => {
		expect(median([1, 2, 3, 4])).toBe(2.5);
	});
	it('average ignora arreglo vacío', () => {
		expect(average([])).toBeNull();
	});
	it('average estándar', () => {
		expect(average([10, 20, 30])).toBe(20);
	});
});

describe('marketIntel · normalizeQuery', () => {
	it('quita acentos, baja a minúsculas y colapsa espacios', () => {
		expect(normalizeQuery('  Panél  SÍP  Estructural ')).toBe('panel sip estructural');
	});
	it('preserva strings ya normalizados', () => {
		expect(normalizeQuery('taladro percutor')).toBe('taladro percutor');
	});
});

describe('marketIntel · parsePriceString', () => {
	it('parsea formato CLP con separador de miles punto', () => {
		expect(parsePriceString('$129.990')).toEqual({ amount: 129990, currency: null });
	});
	it('parsea con código de moneda', () => {
		const r = parsePriceString('CLP 50.000');
		expect(r.amount).toBe(50000);
		expect(r.currency).toBe('CLP');
	});
	it('parsea formato USD con decimales', () => {
		const r = parsePriceString('USD 12.34');
		expect(r.amount).toBe(12.34);
		expect(r.currency).toBe('USD');
	});
	it('parsea coma como decimal cuando hay ≤2 dígitos', () => {
		expect(parsePriceString('19,95').amount).toBe(19.95);
	});
	it('parsea coma como separador de miles cuando hay 3 dígitos', () => {
		expect(parsePriceString('1,234,567').amount).toBe(1234567);
	});
	it('devuelve null para input no parseable', () => {
		expect(parsePriceString('').amount).toBeNull();
		expect(parsePriceString(undefined).amount).toBeNull();
	});
	it('pasa números directos', () => {
		expect(parsePriceString(42).amount).toBe(42);
	});
});

describe('marketIntel · computeStats', () => {
	const refs: MarketRef[] = [
		{ source: 'mercadolibre', sourceId: '1', title: 'a', price: 100, currency: 'CLP', url: '', image: null, position: 1, raw: {} },
		{ source: 'mercadolibre', sourceId: '2', title: 'b', price: 200, currency: 'CLP', url: '', image: null, position: 2, raw: {} },
		{ source: 'serper', sourceId: null, title: 'c', price: 300, currency: 'CLP', url: '', image: null, position: 1, raw: {} },
		{ source: 'serper', sourceId: null, title: 'd', price: null, currency: null, url: '', image: null, position: 2, raw: {} },
	];

	it('count, min, max, avg, median desde las refs con precio', () => {
		const stats = computeStats(refs);
		expect(stats.count).toBe(4);
		expect(stats.min).toBe(100);
		expect(stats.max).toBe(300);
		expect(stats.avg).toBe(200);
		expect(stats.median).toBe(200);
		expect(stats.currency).toBe('CLP');
	});

	it('agrupa por fuente correctamente', () => {
		const stats = computeStats(refs);
		expect(stats.bySource.mercadolibre.count).toBe(2);
		expect(stats.bySource.mercadolibre.avg).toBe(150);
		expect(stats.bySource.serper.count).toBe(2);
		expect(stats.bySource.serper.avg).toBe(300); // ignora la ref sin precio
		expect(stats.bySource.serpapi.count).toBe(0);
		expect(stats.bySource.serpapi.avg).toBeNull();
	});

	it('arreglo vacío devuelve todos los campos en null/0', () => {
		const stats = computeStats([]);
		expect(stats.count).toBe(0);
		expect(stats.min).toBeNull();
		expect(stats.max).toBeNull();
		expect(stats.avg).toBeNull();
		expect(stats.median).toBeNull();
		expect(stats.currency).toBeNull();
	});
});
