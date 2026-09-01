import 'server-only';

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);

function enabled(value: unknown) {
  return ['1', 'true', 'yes', 'on'].includes(String(value ?? '').trim().toLowerCase());
}

function privateIpv4(address: string) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b, c] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && c === 0)
    || (a === 192 && b === 0 && c === 2)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && c === 100)
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

function privateIpv6(address: string) {
  const value = address.toLowerCase().replace(/^\[|\]$/g, '');
  if (value === '::' || value === '::1') return true;
  if (value.startsWith('fc') || value.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(value)) return true;
  if (value.startsWith('ff')) return true;
  if (value.startsWith('2001:db8')) return true;
  const mapped = value.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mapped ? privateIpv4(mapped) : false;
}

function privateAddress(address: string) {
  const version = isIP(address);
  return version === 4 ? privateIpv4(address) : version === 6 ? privateIpv6(address) : false;
}

function allowPrivateDevelopment() {
  return process.env.NODE_ENV !== 'production' && enabled(process.env.MCP_OAUTH_ALLOW_PRIVATE_DEV);
}

function blockedHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return host === 'localhost'
    || host === 'metadata'
    || host === 'metadata.google.internal'
    || host === 'instance-data'
    || host.endsWith('.localhost')
    || host.endsWith('.local')
    || host.endsWith('.internal')
    || privateAddress(host);
}

export function normalizePublicOAuthUrl(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (url.username || url.password) return '';
    if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:')) return '';
    if (!allowPrivateDevelopment() && blockedHostname(url.hostname)) return '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

export async function assertPublicOAuthUrl(value: unknown) {
  const normalized = normalizePublicOAuthUrl(value);
  if (!normalized) throw new Error('OAuth URL inválida o bloqueada.');
  if (allowPrivateDevelopment()) return normalized;

  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (blockedHostname(hostname)) throw new Error('OAuth host privado o reservado bloqueado.');
  if (isIP(hostname)) {
    if (privateAddress(hostname)) throw new Error('OAuth IP privada o reservada bloqueada.');
    return normalized;
  }

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length) throw new Error('OAuth host sin direcciones públicas.');
  if (addresses.some((entry) => privateAddress(entry.address))) {
    throw new Error('OAuth host resuelve a una red privada o reservada.');
  }
  return normalized;
}

export async function safeOAuthFetchJson(
  value: unknown,
  options?: { timeoutMs?: number; maxBytes?: number; maxRedirects?: number },
) {
  const timeoutMs = Math.min(15_000, Math.max(1_000, Number(options?.timeoutMs ?? 6_000)));
  const maxBytes = Math.min(2_000_000, Math.max(1_024, Number(options?.maxBytes ?? 1_000_000)));
  const maxRedirects = Math.min(5, Math.max(0, Number(options?.maxRedirects ?? 2)));
  let current = await assertPublicOAuthUrl(value);

  for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
    const response = await fetch(current, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (REDIRECT_CODES.has(response.status)) {
      if (redirects >= maxRedirects) throw new Error('Demasiados redirects OAuth.');
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect OAuth sin Location.');
      current = await assertPublicOAuthUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) throw new Error(`OAuth endpoint HTTP ${response.status}`);
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error('Respuesta OAuth demasiado grande.');
    let data: Record<string, unknown>;
    try { data = JSON.parse(text) as Record<string, unknown>; }
    catch { throw new Error('OAuth endpoint no devolvió JSON válido.'); }
    return { data, url: current, status: response.status };
  }

  throw new Error('No se pudo completar la consulta OAuth.');
}
