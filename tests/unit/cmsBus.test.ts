import { describe, it, expect } from 'vitest';
import { publishCmsEvent, subscribeCmsEvents } from '@/lib/cmsBus';

describe('cmsBus', () => {
  it('delivers published events to subscribers', () => {
    const received: Array<{ topic: string; action: string }> = [];
    const unsub = subscribeCmsEvents((ev) => {
      received.push({ topic: ev.topic, action: ev.action });
    });
    publishCmsEvent({ topic: 'blog', action: 'create', id: 'hello' });
    publishCmsEvent({ topic: 'home', action: 'reorder' });
    unsub();
    publishCmsEvent({ topic: 'settings', action: 'update' }); // should NOT arrive

    expect(received).toEqual([
      { topic: 'blog', action: 'create' },
      { topic: 'home', action: 'reorder' },
    ]);
  });

  it('stamps a numeric server timestamp on every event', () => {
    let ts = 0;
    const unsub = subscribeCmsEvents((ev) => {
      ts = ev.ts;
    });
    publishCmsEvent({ topic: 'media', action: 'upload' });
    unsub();
    expect(ts).toBeGreaterThan(0);
    expect(Number.isFinite(ts)).toBe(true);
  });

  it('supports multiple concurrent subscribers', () => {
    let a = 0;
    let b = 0;
    const u1 = subscribeCmsEvents(() => { a += 1; });
    const u2 = subscribeCmsEvents(() => { b += 1; });
    publishCmsEvent({ topic: 'home', action: 'create' });
    u1();
    u2();
    expect(a).toBe(1);
    expect(b).toBe(1);
  });
});
