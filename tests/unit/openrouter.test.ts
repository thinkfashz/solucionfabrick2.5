import { describe, expect, it, vi } from 'vitest';
import {
  buildCandidateList,
  chatCompletionWithFallback,
  type CallChatModelResult,
  type OpenRouterModel,
} from '@/lib/openrouter';
import type { MetricRow } from '@/lib/aiChatStats';

const NOW = new Date('2026-01-01T12:00:00Z').getTime();

function model(id: string, isFree: boolean, price = 0): OpenRouterModel {
  return {
    id,
    name: id,
    description: null,
    context_length: 8000,
    pricing: { prompt: price, completion: price },
    isFree,
  };
}

const FREE_A = model('meta-llama/llama-3.2-3b-instruct:free', true);
const FREE_B = model('meta-llama/llama-3.1-8b-instruct:free', true);
const FREE_OTHER = model('foo/bar:free', true);
const PAID_CHEAP = model('anthropic/cheap', false, 1e-7);
const PAID_EXPENSIVE = model('anthropic/expensive', false, 1e-3);

describe('buildCandidateList', () => {
  it('preferred siempre primero', () => {
    const list = buildCandidateList({
      preferredModel: 'foo/custom:free',
      models: [FREE_A, FREE_B],
      metrics: [],
      allowPaid: false,
      now: NOW,
    });
    expect(list[0]).toBe('foo/custom:free');
    expect(list).toContain(FREE_A.id);
  });

  it('incluye recomendados gratis', () => {
    const list = buildCandidateList({
      preferredModel: FREE_A.id,
      models: [FREE_A, FREE_B, FREE_OTHER],
      metrics: [],
      allowPaid: false,
      now: NOW,
    });
    expect(list).toContain(FREE_A.id);
    expect(list).toContain(FREE_B.id);
  });

  it('NO incluye modelos de pago si allowPaid=false', () => {
    const list = buildCandidateList({
      preferredModel: FREE_A.id,
      models: [FREE_A, PAID_CHEAP, PAID_EXPENSIVE],
      metrics: [],
      allowPaid: false,
      now: NOW,
    });
    expect(list).not.toContain(PAID_CHEAP.id);
    expect(list).not.toContain(PAID_EXPENSIVE.id);
  });

  it('incluye solo pago barato si allowPaid=true', () => {
    const list = buildCandidateList({
      preferredModel: FREE_A.id,
      models: [FREE_A, PAID_CHEAP, PAID_EXPENSIVE],
      metrics: [],
      allowPaid: true,
      now: NOW,
    });
    expect(list).toContain(PAID_CHEAP.id);
    expect(list).not.toContain(PAID_EXPENSIVE.id);
  });

  it('excluye modelos con 3 fallos consecutivos recientes (excepto preferred)', () => {
    const failingId = FREE_B.id;
    const metrics: MetricRow[] = [
      { model: failingId, status: 'timeout', latency_ms: 25000, ts: new Date(NOW - 60_000).toISOString(), is_free: true },
      { model: failingId, status: 'timeout', latency_ms: 25000, ts: new Date(NOW - 120_000).toISOString(), is_free: true },
      { model: failingId, status: 'error', latency_ms: 0, ts: new Date(NOW - 180_000).toISOString(), is_free: true },
    ];
    const list = buildCandidateList({
      preferredModel: FREE_A.id,
      models: [FREE_A, FREE_B],
      metrics,
      allowPaid: false,
      now: NOW,
    });
    expect(list).not.toContain(FREE_B.id);
    expect(list).toContain(FREE_A.id);
  });
});

function fakeResult(overrides: Partial<CallChatModelResult>): CallChatModelResult {
  return {
    ok: false,
    status: 'error',
    http_status: null,
    latency_ms: 100,
    text: '',
    model: 'x',
    usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    images: [],
    raw: null,
    ...overrides,
  };
}

describe('chatCompletionWithFallback', () => {
  it('devuelve la respuesta del primer modelo si responde ok', async () => {
    const callImpl = vi.fn(async () =>
      fakeResult({ ok: true, status: 'ok', latency_ms: 200, text: 'hola', model: 'A' }),
    );
    const recordImpl = vi.fn(async () => {});
    const res = await chatCompletionWithFallback({
      preferredModel: 'A',
      messages: [{ role: 'user', content: 'hi' }],
      candidatesOverride: ['A', 'B'],
      callImpl: callImpl as unknown as typeof import('@/lib/openrouter').callChatModel,
      recordImpl: recordImpl as unknown as Parameters<typeof chatCompletionWithFallback>[0]['recordImpl'],
    });
    expect(res.text).toBe('hola');
    expect(res.tried).toHaveLength(1);
    expect(callImpl).toHaveBeenCalledTimes(1);
    expect(recordImpl).toHaveBeenCalledTimes(1);
  });

  it('hace fallback al segundo si el primero da timeout', async () => {
    const callImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResult({ status: 'timeout', latency_ms: 25_000, error: 'Timeout 25s' }))
      .mockResolvedValueOnce(fakeResult({ ok: true, status: 'ok', latency_ms: 500, text: 'B response', model: 'B' }));
    const res = await chatCompletionWithFallback({
      preferredModel: 'A',
      messages: [{ role: 'user', content: 'hi' }],
      candidatesOverride: ['A', 'B'],
      callImpl: callImpl as unknown as typeof import('@/lib/openrouter').callChatModel,
      recordImpl: async () => {},
    });
    expect(res.text).toBe('B response');
    expect(res.tried).toHaveLength(2);
    expect(res.tried[0].status).toBe('timeout');
    expect(res.tried[1].status).toBe('ok');
  });

  it('hace fallback ante 429 (rate_limit)', async () => {
    const callImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResult({ status: 'rate_limit', http_status: 429, error: '429' }))
      .mockResolvedValueOnce(fakeResult({ ok: true, status: 'ok', text: 'ok', model: 'B' }));
    const res = await chatCompletionWithFallback({
      preferredModel: 'A',
      messages: [{ role: 'user', content: 'x' }],
      candidatesOverride: ['A', 'B'],
      callImpl: callImpl as unknown as typeof import('@/lib/openrouter').callChatModel,
      recordImpl: async () => {},
    });
    expect(res.tried[0].status).toBe('rate_limit');
    expect(res.tried[1].status).toBe('ok');
    expect(res.text).toBe('ok');
  });

  it('hace fallback ante respuesta vacía', async () => {
    const callImpl = vi
      .fn()
      .mockResolvedValueOnce(fakeResult({ status: 'empty', error: 'vacío' }))
      .mockResolvedValueOnce(fakeResult({ ok: true, status: 'ok', text: 'hello', model: 'B' }));
    const res = await chatCompletionWithFallback({
      preferredModel: 'A',
      messages: [{ role: 'user', content: 'x' }],
      candidatesOverride: ['A', 'B'],
      callImpl: callImpl as unknown as typeof import('@/lib/openrouter').callChatModel,
      recordImpl: async () => {},
    });
    expect(res.text).toBe('hello');
  });

  it('lanza si todos fallan', async () => {
    const callImpl = vi.fn(async () => fakeResult({ status: 'error', error: 'boom' }));
    await expect(
      chatCompletionWithFallback({
        preferredModel: 'A',
        messages: [{ role: 'user', content: 'x' }],
        candidatesOverride: ['A', 'B', 'C'],
        callImpl: callImpl as unknown as typeof import('@/lib/openrouter').callChatModel,
        recordImpl: async () => {},
      }),
    ).rejects.toThrow(/Ningún modelo respondió correctamente/);
  });

  it('respeta el máximo de 4 intentos', async () => {
    const callImpl = vi.fn(async () => fakeResult({ status: 'error' }));
    await expect(
      chatCompletionWithFallback({
        preferredModel: 'A',
        messages: [{ role: 'user', content: 'x' }],
        candidatesOverride: ['A', 'B', 'C', 'D', 'E', 'F'],
        callImpl: callImpl as unknown as typeof import('@/lib/openrouter').callChatModel,
        recordImpl: async () => {},
      }),
    ).rejects.toThrow();
    expect(callImpl).toHaveBeenCalledTimes(4);
  });
});
