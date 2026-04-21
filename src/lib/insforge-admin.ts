import 'server-only';
import { createClient } from '@insforge/sdk';

/**
 * Privileged InsForge client for server-side use only.
 * Uses INSFORGE_API_KEY — never expose this to the browser.
 * Import only from Route Handlers, Server Actions, or Server Components.
 */

const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL;
if (!INSFORGE_URL) {
  throw new Error(
    'Missing required environment variable: NEXT_PUBLIC_INSFORGE_URL. ' +
      'Set it in .env.local for development or in your deployment environment for production.',
  );
}

export const insforgeAdmin = createClient({
  baseUrl: INSFORGE_URL,
  anonKey: process.env.INSFORGE_API_KEY!,
});
