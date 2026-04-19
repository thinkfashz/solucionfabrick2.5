import { createClient } from '@insforge/sdk';

const defaultBaseUrl = 'https://txv86efe.us-east.insforge.app';
const defaultAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDY3MDh9.SgPGA4mukrmuKeXA-a9nT46weagLmu_wLjauB4K_Y94';

export const insforge = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || defaultBaseUrl,
  // Never fall back to the admin API key in frontend bundles.
  anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY || defaultAnonKey,
});

export const insforgeAdmin = createClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL || defaultBaseUrl,
  anonKey: process.env.INSFORGE_API_KEY || '',
});

