import { describe, it, expect } from 'vitest';
import { listContent, getContent } from '@/lib/content';

describe('content layer', () => {
  it('lists all blog posts with required frontmatter', () => {
    const posts = listContent('blog');
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(post.title).toBeTruthy();
      expect(post.description).toBeTruthy();
      expect(post.date).toBeTruthy();
      expect(post.slug).toMatch(/^[a-z0-9-]+$/);
      expect(Number.isFinite(Date.parse(post.date))).toBe(true);
    }
  });

  it('lists case studies with required frontmatter', () => {
    const items = listContent('casos');
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.title).toBeTruthy();
      expect(item.slug).toBeTruthy();
    }
  });

  it('slugs are unique per content type', () => {
    for (const type of ['blog', 'casos'] as const) {
      const slugs = listContent(type).map((i) => i.slug);
      const unique = new Set(slugs);
      expect(unique.size).toBe(slugs.length);
    }
  });

  it('sorts items by date descending', () => {
    const posts = listContent('blog');
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1].date >= posts[i].date).toBe(true);
    }
  });

  it('computes a reading time of at least 1 minute', () => {
    const posts = listContent('blog');
    for (const post of posts) {
      expect(post.readingMinutes).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns null for unknown slug', () => {
    expect(getContent('blog', 'does-not-exist')).toBeNull();
    expect(getContent('casos', 'does-not-exist')).toBeNull();
  });

  it('renders HTML body for existing posts', () => {
    const posts = listContent('blog');
    const first = getContent('blog', posts[0].slug);
    expect(first).not.toBeNull();
    expect(first!.html).toContain('<');
    expect(first!.html).not.toMatch(/<script/i);
  });
});
