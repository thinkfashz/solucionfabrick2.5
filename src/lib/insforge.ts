import { createClient, InsForgeClient } from '@insforge/sdk';

// Hardcoded fallbacks so the app works even if env vars aren't set in Vercel.
// Override by setting NEXT_PUBLIC_INSFORGE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY.
const INSFORGE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
const INSFORGE_ANON_KEY =
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';

export function getMissingAdminEnvVars(): string[] {
  const missing: string[] = [];
  if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_SESSION_SECRET) {
    missing.push('ADMIN_SESSION_SECRET');
  }
  return missing;
}

let _insforge: InsForgeClient | undefined;
let _insforgeAdmin: InsForgeClient | undefined;

export const insforge: InsForgeClient = new Proxy({} as InsForgeClient, {
  get(_, prop) {
    if (!_insforge) {
      _insforge = createClient({
        baseUrl: INSFORGE_URL,
        anonKey: INSFORGE_ANON_KEY,
      });
    }
    return (_insforge as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const insforgeAdmin: InsForgeClient = new Proxy({} as InsForgeClient, {
  get(_, prop) {
    if (!_insforgeAdmin) {
      _insforgeAdmin = createClient({
        baseUrl: INSFORGE_URL,
        anonKey: process.env.INSFORGE_API_KEY || INSFORGE_ANON_KEY,
      });
    }
    return (_insforgeAdmin as unknown as Record<string | symbol, unknown>)[prop];
  },
});

