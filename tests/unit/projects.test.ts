import { describe, it, expect } from 'vitest';
import { getSeedProjects, SEED_PROJECTS, PROJECTS_CACHE_TAG } from '@/lib/projects';

describe('SEED_PROJECTS', () => {
  it('declares at least 5 realistic projects', () => {
    expect(SEED_PROJECTS.length).toBeGreaterThanOrEqual(5);
  });

  it('every project has the required commerce-display fields', () => {
    for (const p of SEED_PROJECTS) {
      expect(p.id).toMatch(/^PRJ-\d{3}$/);
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.location.length).toBeGreaterThan(0);
      expect(p.area_m2).toBeGreaterThan(0);
      expect(p.hero_image.startsWith('http')).toBe(true);
      expect(p.summary.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
      expect(Array.isArray(p.materials)).toBe(true);
      expect(Array.isArray(p.highlights)).toBe(true);
      expect(Array.isArray(p.scope)).toBe(true);
    }
  });

  it('project ids are unique', () => {
    const ids = SEED_PROJECTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getSeedProjects', () => {
  it('returns a fresh shallow copy (mutating the result does not poison the seed)', () => {
    const a = getSeedProjects();
    const b = getSeedProjects();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a[0]).toEqual(b[0]);

    a[0].title = 'MUTATED';
    expect(getSeedProjects()[0].title).not.toBe('MUTATED');
  });

  it('returns the same number of projects as the seed', () => {
    expect(getSeedProjects().length).toBe(SEED_PROJECTS.length);
  });
});

describe('PROJECTS_CACHE_TAG', () => {
  it('uses the documented tag value', () => {
    expect(PROJECTS_CACHE_TAG).toBe('projects:public');
  });
});
