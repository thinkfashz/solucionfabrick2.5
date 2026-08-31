import 'server-only';

function privateIpv4(hostname: string) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [a, b] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

export function normalizeAiBaseUrl(value: string | undefined, fallback?: string) {
  const raw = (value || fallback || '').trim();
  if (!raw) return undefined;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return undefined;
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const blockedHost = hostname === 'localhost'
    || hostname === '::1'
    || hostname === '0.0.0.0'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname === 'metadata.google.internal'
    || hostname === 'metadata'
    || privateIpv4(hostname);
  if (blockedHost) return undefined;

  const allowHttp = process.env.ALLOW_INSECURE_AI_ENDPOINTS === 'true';
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) return undefined;
  if (url.username || url.password) return undefined;

  url.hash = '';
  url.search = '';
  return url.toString().replace(/\/+$/, '');
}
