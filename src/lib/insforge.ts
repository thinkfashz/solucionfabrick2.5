import { createClient, InsForgeClient } from '@insforge/sdk';

// Required environment variables. Set them in .env.local for development and
// in your deployment platform (e.g. Vercel) for production.
// See .env.example for the variable names and expected format.
//
// Clients are initialized lazily (on first use) so that missing env vars produce
// a clear runtime error rather than a build-time module-initialization crash.

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required InsForge configuration: ${name}. ` +
        'Set NEXT_PUBLIC_INSFORGE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY ' +
        'in your environment (.env.local for development, deployment env vars for production).',
    );
  }
  return value;
}

let _insforge: InsForgeClient | undefined;
let _insforgeAdmin: InsForgeClient | undefined;

export const insforge: InsForgeClient = new Proxy({} as InsForgeClient, {
  get(_, prop) {
    if (!_insforge) {
      _insforge = createClient({
        baseUrl: requireEnv('NEXT_PUBLIC_INSFORGE_URL'),
        anonKey: requireEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY'),
      });
    }
    return (_insforge as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// Server-side admin client. Requires INSFORGE_API_KEY (never expose in the browser).
// Falls back to the anon key so importing from the client bundle does not crash —
// admin-only routes must still verify that INSFORGE_API_KEY is set.
export const insforgeAdmin: InsForgeClient = new Proxy({} as InsForgeClient, {
  get(_, prop) {
    if (!_insforgeAdmin) {
      const baseUrl = requireEnv('NEXT_PUBLIC_INSFORGE_URL');
      const anonKey = requireEnv('NEXT_PUBLIC_INSFORGE_ANON_KEY');
      _insforgeAdmin = createClient({
        baseUrl,
        anonKey: process.env.INSFORGE_API_KEY || anonKey,
      });
    }
    return (_insforgeAdmin as unknown as Record<string | symbol, unknown>)[prop];
  },
});

