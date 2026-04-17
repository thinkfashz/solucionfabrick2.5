import { createClient } from '@insforge/sdk';

const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;

const missing = [
  !baseUrl && 'NEXT_PUBLIC_INSFORGE_URL',
  !anonKey && 'NEXT_PUBLIC_INSFORGE_ANON_KEY',
].filter(Boolean);

if (missing.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing.join(', ')}`
  );
}

export const insforge = createClient({ baseUrl: baseUrl!, anonKey: anonKey! });
