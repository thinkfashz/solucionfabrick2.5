import { describe, it, expect } from 'vitest';
import { computeDteTotals, getBillingDriver } from '../src/lib/billing/provider';

describe('billing provider', () => {
  describe('computeDteTotals', () => {
    it('treats unit prices as gross for boletas (39)', () => {
      const totals = computeDteTotals({
        dte_type: 39,
        order_id: 'o1',
        items: [{ description: 'Servicio', quantity: 1, unit_price: 11_900 }],
      });
      // 11_900 incluye IVA 19% → neto = 10_000, iva = 1_900, total = 11_900.
      expect(totals.neto).toBe(10_000);
      expect(totals.iva).toBe(1_900);
      expect(totals.exento).toBe(0);
      expect(totals.total).toBe(11_900);
    });

    it('treats unit prices as net for facturas (33)', () => {
      const totals = computeDteTotals({
        dte_type: 33,
        order_id: 'o1',
        items: [{ description: 'Servicio', quantity: 2, unit_price: 50_000 }],
      });
      // 100_000 neto + 19_000 iva = 119_000.
      expect(totals.neto).toBe(100_000);
      expect(totals.iva).toBe(19_000);
      expect(totals.total).toBe(119_000);
    });

    it('keeps exempt items out of the IVA base', () => {
      const totals = computeDteTotals({
        dte_type: 33,
        order_id: 'o1',
        items: [
          { description: 'Servicio afecto', quantity: 1, unit_price: 100_000 },
          { description: 'Servicio exento', quantity: 1, unit_price: 50_000, exempt: true },
        ],
      });
      expect(totals.neto).toBe(100_000);
      expect(totals.iva).toBe(19_000);
      expect(totals.exento).toBe(50_000);
      expect(totals.total).toBe(169_000);
    });
  });

  describe('getBillingDriver', () => {
    it('falls back to mock when nothing is configured', () => {
      const prev = process.env.BILLING_PROVIDER;
      delete process.env.BILLING_PROVIDER;
      const driver = getBillingDriver();
      expect(driver.code).toBe('mock');
      if (prev) process.env.BILLING_PROVIDER = prev;
    });
  });
});

// ─── Haulmer driver ───────────────────────────────────────────────────────────

import { describe as hDesc, it as hIt, expect as hExpect, vi, beforeEach, afterEach } from 'vitest';
import { haulmerDriver } from '../src/lib/billing/drivers/haulmer';

hDesc('haulmerDriver', () => {
  beforeEach(() => {
    delete process.env.BILLING_API_KEY;
    delete process.env.BILLING_RUT_EMISOR;
    delete process.env.BILLING_RAZON_SOCIAL;
    delete process.env.BILLING_BASE_URL;
  });
  afterEach(() => vi.restoreAllMocks());

  hIt('isConfigured() is false without credentials', () => {
    hExpect(haulmerDriver.isConfigured()).toBe(false);
  });

  hIt('emitDte() throws when unconfigured', async () => {
    await hExpect(
      haulmerDriver.emitDte({
        dte_type: 39,
        order_id: 'o1',
        items: [{ description: 'Test', quantity: 1, unit_price: 5000 }],
      }),
    ).rejects.toThrow('Haulmer no configurado');
  });

  hIt('voidDte() throws when unconfigured', async () => {
    await hExpect(
      haulmerDriver.voidDte({ invoice_id: 'i1', folio: '1', dte_type: 39, reason: 'test' }),
    ).rejects.toThrow('Haulmer no configurado');
  });

  hIt('getDtePdfUrl() returns null when unconfigured', async () => {
    hExpect(await haulmerDriver.getDtePdfUrl('123', 39)).toBeNull();
  });

  hIt('getDtePdfUrl() returns Haulmer PDF endpoint when configured', async () => {
    process.env.BILLING_API_KEY = 'key';
    process.env.BILLING_RUT_EMISOR = '12345678-9';
    process.env.BILLING_RAZON_SOCIAL = 'Test SA';
    process.env.BILLING_BASE_URL = 'https://api.test.haulmer.com';
    const url = await haulmerDriver.getDtePdfUrl('42', 39);
    hExpect(url).toContain('/v2/dte/document/');
    hExpect(url).toContain('/39/');
    hExpect(url).toContain('/42/pdf');
  });

  hIt('emitDte() sends correct OpenFactura payload for boleta 39', async () => {
    process.env.BILLING_API_KEY = 'test-key';
    process.env.BILLING_RUT_EMISOR = '12345678-9';
    process.env.BILLING_RAZON_SOCIAL = 'Empresa Test';
    process.env.BILLING_BASE_URL = 'https://api.test.haulmer.com';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ folio: '55', pdf: 'https://example.com/pdf', track_id: 'TRK001', estado_sii: 'DOK' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await haulmerDriver.emitDte({
      dte_type: 39,
      order_id: 'order-1',
      items: [{ description: 'Producto', quantity: 2, unit_price: 11_900 }],
    });

    hExpect(result.ok).toBe(true);
    hExpect(result.provider).toBe('haulmer');
    hExpect(result.folio).toBe('55');
    hExpect(result.sii_status).toBe('accepted');
    hExpect(result.pdf_url).toBe('https://example.com/pdf');
    // 2 × 11900 gross = 23800; neto = 23800/1.19 ≈ 20000, iva ≈ 3800 (rounded)
    hExpect(result.neto).toBe(20_000);
    hExpect(result.iva).toBe(3_800);
    hExpect(result.total).toBe(23_800);

    // Verify payload structure
    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(init?.body as string) as {
      response: string[];
      dte: { Encabezado: { IdDoc: { TipoDTE: number }; Totales: { MntNeto: number; IVA: number; MntTotal: number } } };
    };
    hExpect(body.response).toContain('PDF');
    hExpect(body.dte.Encabezado.IdDoc.TipoDTE).toBe(39);
    hExpect(body.dte.Encabezado.Totales.MntNeto).toBe(20_000);
    hExpect(body.dte.Encabezado.Totales.IVA).toBe(3_800);
    hExpect(body.dte.Encabezado.Totales.MntTotal).toBe(23_800);
  });

  hIt('emitDte() builds correct payload for factura 33 (neto pricing)', async () => {
    process.env.BILLING_API_KEY = 'key';
    process.env.BILLING_RUT_EMISOR = '12345678-9';
    process.env.BILLING_RAZON_SOCIAL = 'Empresa Test';
    process.env.BILLING_BASE_URL = 'https://api.test.haulmer.com';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ folio: '10', track_id: 'TRK002', estado_sii: 'SOK' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await haulmerDriver.emitDte({
      dte_type: 33,
      order_id: 'o2',
      rut_receptor: '98765432-1',
      razon_social_receptor: 'Cliente SA',
      items: [{ description: 'Servicio', quantity: 1, unit_price: 100_000 }],
    });

    hExpect(result.neto).toBe(100_000);
    hExpect(result.iva).toBe(19_000);
    hExpect(result.total).toBe(119_000);
    hExpect(result.sii_status).toBe('pending');  // SOK maps to pending

    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(init?.body as string) as {
      dte: {
        Encabezado: {
          Receptor: { RUTRecep: string };
          IdDoc: { FmaPago: number };
          Totales: { MntNeto: number };
        };
      };
    };
    hExpect(body.dte.Encabezado.Receptor.RUTRecep).toBe('98765432-1');
    hExpect(body.dte.Encabezado.IdDoc.FmaPago).toBe(1);
    hExpect(body.dte.Encabezado.Totales.MntNeto).toBe(100_000);
  });

  hIt('emitDte() handles mixed exempt and taxed items', async () => {
    process.env.BILLING_API_KEY = 'key';
    process.env.BILLING_RUT_EMISOR = '12345678-9';
    process.env.BILLING_RAZON_SOCIAL = 'Test';
    process.env.BILLING_BASE_URL = 'https://api.test.haulmer.com';

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ folio: '7' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await haulmerDriver.emitDte({
      dte_type: 33,
      order_id: 'o3',
      items: [
        { description: 'Afecto', quantity: 1, unit_price: 100_000 },
        { description: 'Exento', quantity: 1, unit_price: 50_000, exempt: true },
      ],
    });

    hExpect(result.neto).toBe(100_000);
    hExpect(result.iva).toBe(19_000);
    hExpect(result.exento).toBe(50_000);
    hExpect(result.total).toBe(169_000);
  });

  hIt('emitDte() throws on HTTP error from Haulmer', async () => {
    process.env.BILLING_API_KEY = 'bad-key';
    process.env.BILLING_RUT_EMISOR = '12345678-9';
    process.env.BILLING_RAZON_SOCIAL = 'Test';
    process.env.BILLING_BASE_URL = 'https://api.test.haulmer.com';

    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('{"error":"Unauthorized"}', { status: 401 }),
    );

    await hExpect(
      haulmerDriver.emitDte({
        dte_type: 39,
        order_id: 'o4',
        items: [{ description: 'P', quantity: 1, unit_price: 1000 }],
      }),
    ).rejects.toThrow('HTTP 401');
  });

  hIt('voidDte() emits DTE 61 referencing original folio', async () => {
    process.env.BILLING_API_KEY = 'key';
    process.env.BILLING_RUT_EMISOR = '12345678-9';
    process.env.BILLING_RAZON_SOCIAL = 'Test';
    process.env.BILLING_BASE_URL = 'https://api.test.haulmer.com';

    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ folio: '99', estado_sii: 'DOK' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }),
    );

    const result = await haulmerDriver.voidDte({
      invoice_id: 'inv-1',
      folio: '42',
      dte_type: 39,
      reason: 'Error en emisión',
      neto_clp: 10_000,
    });

    hExpect(result.provider).toBe('haulmer');
    hExpect(result.folio).toBe('99');

    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse(init?.body as string) as {
      dte: {
        Encabezado: { IdDoc: { TipoDTE: number } };
        Referencia: Array<{ TpoDocRef: number; FolioRef: string }>;
      };
    };
    hExpect(body.dte.Encabezado.IdDoc.TipoDTE).toBe(61);
    hExpect(body.dte.Referencia[0].TpoDocRef).toBe(39);
    hExpect(body.dte.Referencia[0].FolioRef).toBe('42');
  });
});
