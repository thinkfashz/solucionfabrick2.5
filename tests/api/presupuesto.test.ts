import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// These tests exercise the public contract of the /api/presupuesto route: body
// parsing, turnstile gating, validation, and the two response shapes (JSON vs.
// native form redirect). They deliberately avoid asserting on nodemailer calls;
// when SMTP envs are unset the route skips email sending, which is the path we
// test here.

const routeModulePath = '@/app/api/presupuesto/route';

describe('POST /api/presupuesto', () => {
  const savedEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Ensure SMTP skip path and turnstile disabled by default.
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.TURNSTILE_SECRET_KEY;
  });

  afterEach(() => {
    process.env = { ...savedEnv };
  });

  async function loadPost() {
    const mod = await import(routeModulePath);
    return mod.POST as (req: Request) => Promise<Response>;
  }

  it('returns 400 when nombre is missing (JSON)', async () => {
    const POST = await loadPost();
    const res = await POST(
      new Request('http://localhost/api/presupuesto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: 'foo@bar.com' }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/requerid/i);
  });

  it('returns 201 with JSON payload on success when SMTP disabled', async () => {
    const POST = await loadPost();
    const res = await POST(
      new Request('http://localhost/api/presupuesto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: 'Juan', email: 'juan@example.com', descripcion: 'hola' }),
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.mensaje).toMatch(/24 horas/i);
  });

  it('redirects HTML form submissions to ?enviado=1 on success', async () => {
    const POST = await loadPost();
    const params = new URLSearchParams({ nombre: 'Juan', email: 'juan@example.com' }).toString();
    const res = await POST(
      new Request('http://localhost/api/presupuesto', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params,
      }),
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toContain('/contacto?enviado=1');
  });

  it('rejects when captcha is required but missing', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    // Force fetch to simulate Cloudflare rejection (shouldn't even be called since token missing).
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ success: false }), { status: 200 })) as typeof fetch;

    const POST = await loadPost();
    const res = await POST(
      new Request('http://localhost/api/presupuesto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nombre: 'Juan', email: 'juan@example.com' }),
      }),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/captcha/i);
  });

  it('accepts when captcha token validates successfully', async () => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
    globalThis.fetch = vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })) as typeof fetch;

    const POST = await loadPost();
    const res = await POST(
      new Request('http://localhost/api/presupuesto', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Juan',
          email: 'juan@example.com',
          'cf-turnstile-response': 'good-token',
        }),
      }),
    );
    expect(res.status).toBe(201);
  });
});
