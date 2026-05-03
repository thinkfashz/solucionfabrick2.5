import { describe, expect, it } from 'vitest';
import { filterLogsByLevel, mapVercelEvent, type VercelLogEntry } from '@/lib/vercelClient';

describe('mapVercelEvent', () => {
  const fallback = 'dpl_fallback';

  it('classifies HTTP 5xx runtime events as error', () => {
    const out = mapVercelEvent(
      {
        id: 'evt_1',
        type: 'fn-stderr',
        created: 1700000000000,
        payload: {
          text: 'Function exited with status 500',
          deploymentId: 'dpl_abc',
          requestId: 'req_1',
          proxy: { path: '/api/admin/integrations', method: 'POST', statusCode: 500 },
        },
      },
      fallback,
    );
    expect(out).not.toBeNull();
    expect(out!.level).toBe('error');
    expect(out!.source).toBe('runtime');
    expect(out!.path).toBe('/api/admin/integrations');
    expect(out!.deploymentId).toBe('dpl_abc');
  });

  it('classifies HTTP 4xx as warning', () => {
    const out = mapVercelEvent(
      {
        id: 'evt_2',
        type: 'fn',
        created: 1700000001000,
        payload: { text: 'Not found', proxy: { path: '/api/x', statusCode: 404 } },
      },
      fallback,
    );
    expect(out!.level).toBe('warning');
  });

  it('honours explicit payload.level when present', () => {
    const out = mapVercelEvent(
      {
        id: 'evt_3',
        type: 'stdout',
        created: 1700000002000,
        payload: { text: 'just a note', level: 'error' },
      },
      fallback,
    );
    expect(out!.level).toBe('error');
  });

  it('detects build failures by text heuristic', () => {
    const out = mapVercelEvent(
      {
        id: 'evt_4',
        type: 'stderr',
        created: 1700000003000,
        payload: { text: 'Module not found: Error: Can\'t resolve "@/foo"' },
      },
      fallback,
    );
    expect(out!.level).toBe('error');
    expect(out!.source).toBe('build');
  });

  it('falls back to fallback deploymentId when missing', () => {
    const out = mapVercelEvent(
      { id: 'evt_5', type: 'stdout', created: 1700000004000, payload: { text: 'hi' } },
      fallback,
    );
    expect(out!.deploymentId).toBe(fallback);
    expect(out!.level).toBe('info');
  });

  it('skips empty state heartbeats', () => {
    const out = mapVercelEvent({ id: 'evt_6', type: 'state' }, fallback);
    expect(out).toBeNull();
  });
});

describe('filterLogsByLevel', () => {
  const logs: VercelLogEntry[] = [
    { id: '1', ts: 1, level: 'info', source: 'runtime', message: 'a', deploymentId: 'd' },
    { id: '2', ts: 2, level: 'warning', source: 'runtime', message: 'b', deploymentId: 'd' },
    { id: '3', ts: 3, level: 'error', source: 'runtime', message: 'c', deploymentId: 'd' },
  ];

  it('returns everything for level=all', () => {
    expect(filterLogsByLevel(logs, 'all')).toHaveLength(3);
  });

  it('returns warnings + errors for level=warning', () => {
    const out = filterLogsByLevel(logs, 'warning');
    expect(out.map((l) => l.level)).toEqual(['warning', 'error']);
  });

  it('returns only errors for level=error', () => {
    const out = filterLogsByLevel(logs, 'error');
    expect(out).toHaveLength(1);
    expect(out[0].level).toBe('error');
  });
});
