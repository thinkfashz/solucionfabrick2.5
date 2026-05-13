import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chilexpressDriver } from '../../src/lib/shipping/drivers/chilexpress';
import { starkenDriver } from '../../src/lib/shipping/drivers/starken';
import { correoschileDriver } from '../../src/lib/shipping/drivers/correoschile';
import type { QuoteRequest } from '../../src/lib/shipping/carrier';

const BASE_REQ: QuoteRequest = {
  origin: { region: 'Maule', comuna: 'Linares' },
  destination: { region: 'RM', comuna: 'Santiago' },
  items: [{ qty: 1, weight_g: 2000, length_cm: 30, width_cm: 20, height_cm: 15, declared_value_clp: 50000 }],
};

// ─── Chilexpress ─────────────────────────────────────────────────────────────

describe('chilexpressDriver', () => {
  it('isConfigured() is false when API key is absent', () => {
    const original = process.env.CHILEXPRESS_API_KEY;
    delete process.env.CHILEXPRESS_API_KEY;
    expect(chilexpressDriver.isConfigured()).toBe(false);
    if (original !== undefined) process.env.CHILEXPRESS_API_KEY = original;
  });

  it('quote() returns [] when unconfigured (no fetch needed)', async () => {
    const original = process.env.CHILEXPRESS_API_KEY;
    delete process.env.CHILEXPRESS_API_KEY;
    const quotes = await chilexpressDriver.quote(BASE_REQ);
    expect(quotes).toEqual([]);
    if (original !== undefined) process.env.CHILEXPRESS_API_KEY = original;
  });

  it('getTracking() returns unknown status when unconfigured', async () => {
    const original = process.env.CHILEXPRESS_API_KEY;
    delete process.env.CHILEXPRESS_API_KEY;
    const result = await chilexpressDriver.getTracking('99000TEST001');
    expect(result.status).toBe('unknown');
    expect(result.carrier).toBe('chilexpress');
    if (original !== undefined) process.env.CHILEXPRESS_API_KEY = original;
  });

  it('quote() calls geodata + rating APIs and maps response', async () => {
    process.env.CHILEXPRESS_API_KEY = 'test-key';
    process.env.CHILEXPRESS_BASE_URL = 'https://testservices.wschilexpress.com';

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes('coverage-areas')) {
        return new Response(
          JSON.stringify({
            statusCode: 0,
            data: { coverageAreas: [{ countyCode: 'LINAR', countyName: 'LINARES' }, { countyCode: 'SANTI', countyName: 'SANTIAGO' }] },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (u.includes('rates/courier')) {
        return new Response(
          JSON.stringify({
            statusCode: 0,
            data: {
              courierServiceOptions: [
                { serviceTypeCode: 'PDN', serviceDescription: 'Próximo día hábil', serviceValue: 7800, promisedDelivery: '2026-05-15' },
                { serviceTypeCode: 'CER', serviceDescription: 'Estándar', serviceValue: 5500 },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('not found', { status: 404 });
    });

    const quotes = await chilexpressDriver.quote(BASE_REQ);

    expect(quotes).toHaveLength(2);
    expect(quotes[0].carrier).toBe('chilexpress');
    expect(quotes[0].service_code).toBe('PDN');
    expect(quotes[0].cost_clp).toBe(7800);
    expect(quotes[1].cost_clp).toBe(5500);
    for (const q of quotes) {
      expect(q.eta_days_min).toBeLessThanOrEqual(q.eta_days_max);
    }

    fetchSpy.mockRestore();
    delete process.env.CHILEXPRESS_API_KEY;
    delete process.env.CHILEXPRESS_BASE_URL;
  });

  it('getTracking() maps delivered status', async () => {
    process.env.CHILEXPRESS_API_KEY = 'test-key';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          statusCode: 0,
          data: {
            trackingData: [
              { status: '1', statusDescription: 'Recibido en sucursal', eventDateTime: '2026-05-14T09:00:00', office: 'Linares' },
              { status: '8', statusDescription: 'Entregado', eventDateTime: '2026-05-15T14:30:00', office: 'Santiago' },
            ],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await chilexpressDriver.getTracking('99000TEST001');
    expect(result.status).toBe('delivered');
    expect(result.events).toHaveLength(2);
    expect(result.events[1].location).toBe('Santiago');

    fetchSpy.mockRestore();
    delete process.env.CHILEXPRESS_API_KEY;
  });
});

// ─── Starken ─────────────────────────────────────────────────────────────────

describe('starkenDriver', () => {
  beforeEach(() => { delete process.env.STARKEN_USER; delete process.env.STARKEN_PASS; });

  it('isConfigured() false without credentials', () => {
    expect(starkenDriver.isConfigured()).toBe(false);
  });

  it('quote() returns [] when unconfigured', async () => {
    expect(await starkenDriver.quote(BASE_REQ)).toEqual([]);
  });

  it('getTracking() returns unknown when unconfigured', async () => {
    const r = await starkenDriver.getTracking('STK123');
    expect(r.status).toBe('unknown');
    expect(r.carrier).toBe('starken');
  });

  it('quote() uses static tariff fallback when API fails', async () => {
    process.env.STARKEN_USER = 'u';
    process.env.STARKEN_PASS = 'p';

    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));

    const quotes = await starkenDriver.quote(BASE_REQ);
    expect(quotes.length).toBeGreaterThan(0);
    expect(quotes[0].carrier).toBe('starken');
    expect(quotes[0].cost_clp).toBeGreaterThan(0);
    expect(quotes[0].eta_days_min).toBeLessThanOrEqual(quotes[0].eta_days_max);

    vi.restoreAllMocks();
  });

  it('static tariff charges more for Magallanes than RM', async () => {
    process.env.STARKEN_USER = 'u';
    process.env.STARKEN_PASS = 'p';
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network error'));

    const [rm] = await starkenDriver.quote(BASE_REQ);
    const [mag] = await starkenDriver.quote({
      ...BASE_REQ,
      destination: { region: 'XII', comuna: 'Punta Arenas' },
    });
    expect(mag.cost_clp).toBeGreaterThan(rm.cost_clp);

    vi.restoreAllMocks();
  });

  it('quote() uses API response when available', async () => {
    process.env.STARKEN_USER = 'u';
    process.env.STARKEN_PASS = 'p';

    vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const u = String(url);
      if (u.includes('/auth/token')) {
        return new Response(JSON.stringify({ token: 'jwt-token', expires_in: 3600 }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        });
      }
      if (u.includes('/cotizacion')) {
        return new Response(
          JSON.stringify({
            servicios: [
              { codigo: 'STK-STD', descripcion: 'Starken Estándar', tarifa: 4200, diasHabiles: 3 },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    });

    const quotes = await starkenDriver.quote(BASE_REQ);
    expect(quotes[0].service_code).toBe('STK-STD');
    expect(quotes[0].cost_clp).toBe(4200);
    expect(quotes[0].meta?.source).toBe('api');

    vi.restoreAllMocks();
  });
});

// ─── Correos de Chile ─────────────────────────────────────────────────────────

describe('correoschileDriver', () => {
  beforeEach(() => { delete process.env.CORREOSCHILE_USER; delete process.env.CORREOSCHILE_PASS; });

  it('isConfigured() false without credentials', () => {
    expect(correoschileDriver.isConfigured()).toBe(false);
  });

  it('quote() returns [] when unconfigured', async () => {
    expect(await correoschileDriver.quote(BASE_REQ)).toEqual([]);
  });

  it('getTracking() returns unknown status gracefully', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('unreachable'));
    const r = await correoschileDriver.getTracking('CE123456789CL');
    expect(r.status).toBe('unknown');
    expect(r.carrier).toBe('correoschile');
    vi.restoreAllMocks();
  });

  it('static tariff: returns 2 service options with positive CLP cost', async () => {
    process.env.CORREOSCHILE_USER = 'u';
    process.env.CORREOSCHILE_PASS = 'p';
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('no api'));

    const quotes = await correoschileDriver.quote(BASE_REQ);
    expect(quotes).toHaveLength(2);
    expect(quotes.find(q => q.service_code === 'CRT')).toBeDefined();
    expect(quotes.find(q => q.service_code === 'EMS')).toBeDefined();
    for (const q of quotes) {
      expect(q.cost_clp).toBeGreaterThan(0);
      expect(q.eta_days_min).toBeLessThanOrEqual(q.eta_days_max);
      expect(q.carrier).toBe('correoschile');
    }

    vi.restoreAllMocks();
  });

  it('static tariff: extreme regions (Magallanes) cost more than RM', async () => {
    process.env.CORREOSCHILE_USER = 'u';
    process.env.CORREOSCHILE_PASS = 'p';
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('no api'));

    const [rmQuote] = await correoschileDriver.quote(BASE_REQ);
    const [magQuote] = await correoschileDriver.quote({
      ...BASE_REQ,
      destination: { region: 'XII', comuna: 'Punta Arenas' },
    });
    expect(magQuote.cost_clp).toBeGreaterThan(rmQuote.cost_clp);

    vi.restoreAllMocks();
  });

  it('static tariff: heavier packages cost more', async () => {
    process.env.CORREOSCHILE_USER = 'u';
    process.env.CORREOSCHILE_PASS = 'p';
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('no api'));

    const light = await correoschileDriver.quote({ ...BASE_REQ, items: [{ qty: 1, weight_g: 200 }] });
    const heavy = await correoschileDriver.quote({ ...BASE_REQ, items: [{ qty: 1, weight_g: 15000 }] });
    expect(heavy[0].cost_clp).toBeGreaterThan(light[0].cost_clp);

    vi.restoreAllMocks();
  });

  it('getTracking() parses API response and maps status', async () => {
    process.env.CORREOSCHILE_USER = 'u';
    process.env.CORREOSCHILE_PASS = 'p';

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          estado: 'EN_TRANSITO',
          eventos: [
            { estado: 'INGRESADO', descripcion: 'Ingresado en oficina de origen', fecha: '2026-05-14T08:00:00', oficina: 'Linares' },
            { estado: 'EN_TRANSITO', descripcion: 'En ruta al destino', fecha: '2026-05-14T15:00:00' },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const r = await correoschileDriver.getTracking('CE123456789CL');
    expect(r.status).toBe('in_transit');
    expect(r.events).toHaveLength(2);
    expect(r.events[0].location).toBe('Linares');

    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete process.env.CORREOSCHILE_USER;
    delete process.env.CORREOSCHILE_PASS;
  });
});
