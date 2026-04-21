import 'server-only';
import { createClient, InsForgeClient } from '@insforge/sdk';

/**
 * Privileged InsForge client for server-side use only.
 * Uses INSFORGE_API_KEY — never expose this to the browser.
 * Import only from Route Handlers, Server Actions, or Server Components.
 *
 * Lazily initialized on first use to avoid build-time failures when env vars
 * are not available during the Next.js build phase.
 */

let _insforgeAdmin: InsForgeClient | undefined;

export const insforgeAdmin: InsForgeClient = new Proxy({} as InsForgeClient, {
  get(_, prop) {
    if (!_insforgeAdmin) {
      const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
      if (!baseUrl) {
        throw new Error(
          'Missing required environment variable: NEXT_PUBLIC_INSFORGE_URL. ' +
            'Set it in .env.local for development or in your deployment environment for production.',
        );
      }
      _insforgeAdmin = createClient({
        baseUrl,
        anonKey: process.env.INSFORGE_API_KEY!,
      });
    }
    return (_insforgeAdmin as unknown as Record<string | symbol, unknown>)[prop];
  },
});

