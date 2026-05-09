import { describe, expect, it } from 'vitest';
import { normalizeRepoPath, UnsafePathError } from '../../src/lib/repoCodeContext';

describe('repoCodeContext.normalizeRepoPath', () => {
  it('accepts whitelisted paths', () => {
    expect(normalizeRepoPath('src/lib/openrouter.ts')).toBe('src/lib/openrouter.ts');
    expect(normalizeRepoPath('docs/README.md')).toBe('docs/README.md');
    expect(normalizeRepoPath('scripts/create-tables.sql')).toBe('scripts/create-tables.sql');
    expect(normalizeRepoPath('public/manifest.json')).toBe('public/manifest.json');
  });

  it('strips leading ./ and /', () => {
    expect(normalizeRepoPath('./src/lib/x.ts')).toBe('src/lib/x.ts');
    expect(normalizeRepoPath('/src/lib/x.ts')).toBe('src/lib/x.ts');
  });

  it('rejects traversal', () => {
    expect(() => normalizeRepoPath('src/../etc/passwd')).toThrow(UnsafePathError);
    expect(() => normalizeRepoPath('../node_modules/.env')).toThrow(UnsafePathError);
    expect(() => normalizeRepoPath('src/lib/../../etc/passwd')).toThrow(UnsafePathError);
  });

  it('rejects paths outside the whitelist', () => {
    expect(() => normalizeRepoPath('node_modules/lodash/index.js')).toThrow(UnsafePathError);
    expect(() => normalizeRepoPath('.env')).toThrow(UnsafePathError);
    expect(() => normalizeRepoPath('package.json')).toThrow(UnsafePathError);
  });

  it('rejects blocked dotfile names', () => {
    expect(() => normalizeRepoPath('src/.env')).toThrow(UnsafePathError);
    expect(() => normalizeRepoPath('src/.env.local')).toThrow(UnsafePathError);
  });

  it('rejects null bytes', () => {
    expect(() => normalizeRepoPath('src/lib/x.ts\u0000.bin')).toThrow(UnsafePathError);
  });

  it('rejects disallowed extensions', () => {
    expect(() => normalizeRepoPath('src/lib/x.exe')).toThrow(UnsafePathError);
    expect(() => normalizeRepoPath('public/binary.so')).toThrow(UnsafePathError);
  });

  it('allows extensionless files inside the whitelist (ej. LICENSE)', () => {
    // No extension is fine; only blocked names are explicitly rejected.
    expect(() => normalizeRepoPath('docs/LICENSE')).not.toThrow();
  });
});
