import { createClient } from '@insforge/sdk';

// Required environment variables. Set them in .env.local for development and
// in your deployment platform (e.g. Vercel) for production.
// See .env.example for the variable names and expected format.
const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL;
const INSFORGE_ANON_KEY = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

if (!INSFORGE_URL || !INSFORGE_ANON_KEY) {
  throw new Error(
    'Missing required InsForge configuration. ' +
      'Set NEXT_PUBLIC_INSFORGE_URL and NEXT_PUBLIC_INSFORGE_ANON_KEY ' +
      'in your environment (.env.local for development, deployment env vars for production).',
  );
}

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

