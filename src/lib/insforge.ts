import { createClient } from '@insforge/sdk';

// Public client-side values. The anon key is safe to expose in frontend code.
// Configure NEXT_PUBLIC_INSFORGE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY in your deployment
// environment; the defaults below are only used for local development convenience.
const INSFORGE_URL =
  process.env.NEXT_PUBLIC_INSFORGE_URL || 'https://txv86efe.us-east.insforge.app';
const INSFORGE_ANON_KEY =
  process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || 'ik_7e23032539c2dc64d5d27ca29d07b928';

export const insforge = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: INSFORGE_ANON_KEY,
});

// Server-side admin client. Requires INSFORGE_API_KEY (never expose in the browser).
// We fall back to the anon key so that importing this module from the client bundle
// does not crash — admin-only routes must still verify that INSFORGE_API_KEY is set.
export const insforgeAdmin = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: process.env.INSFORGE_API_KEY || INSFORGE_ANON_KEY,
});

