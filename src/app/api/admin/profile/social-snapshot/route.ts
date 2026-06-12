import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminError, adminUnauthorized, getAdminSession } from '@/lib/adminApi';

export const dynamic = 'force-dynamic';

type Snapshot = { platform: string; url: string; title: string; description: string; followers?: number | null; ok: boolean; error?: string };

function normalizeUrl(value: string) {
  const raw = value.trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('@')) return `https://instagram.com/${raw.slice(1)}`;
  if (raw.includes('.')) return `https://${raw}`;
  return `https://instagram.com/${raw}`;
}
function platform(url: string) {
  const u = url.toLowerCase();
  if (u.includes('instagram')) return 'Instagram';
  if (u.includes('facebook')) return 'Facebook';
  if (u.includes('linkedin')) return 'LinkedIn';
  if (u.includes('tiktok')) return 'TikTok';
  return 'Web';
}
function meta(html: string, name: string) {
  const og = new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i').exec(html)?.[1];
  const nm = new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*)["']`, 'i').exec(html)?.[1];
  return og || nm || '';
}
function extractFollowers(text: string) {
  const patterns = [/(\d+(?:[.,]\d+)?)\s*(k|mil|m|millones)?\s*(?:seguidores|followers)/i, /(?:seguidores|followers)\D{0,16}(\d+(?:[.,]\d+)?)\s*(k|mil|m|millones)?/i];
  for (const p of patterns) {
    const m = p.exec(text);
    if (!m) continue;
    const base = Number(String(m[1]).replace(',', '.'));
    if (!Number.isFinite(base)) continue;
    const suffix = String(m[2] || '').toLowerCase();
    if (suffix === 'k' || suffix === 'mil') return Math.round(base * 1000);
    if (suffix === 'm' || suffix === 'millones') return Math.round(base * 1000000);
    return Math.round(base);
  }
  return null;
}
async function inspect(rawUrl: string): Promise<Snapshot> {
  const url = normalizeUrl(rawUrl);
  const p = platform(url);
  if (!url) return { platform: p, url, title: '', description: '', ok: false, error: 'URL vacía' };
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 SolucionesFabrickBot/1.0' }, signal: AbortSignal.timeout(8000), cache: 'no-store' });
    const html = await res.text();
    const title = meta(html, 'og:title') || /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] || p;
    const description = meta(html, 'og:description') || meta(html, 'description') || '';
    return { platform: p, url, title, description, followers: extractFollowers(`${title} ${description}`), ok: res.ok };
  } catch (err) {
    return { platform: p, url, title: p, description: '', followers: null, ok: false, error: err instanceof Error ? err.message : 'No se pudo leer la red pública' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession(request);
    if (!session) return adminUnauthorized();
    const body = await request.json().catch(() => ({})) as { urls?: string[] };
    const urls = Array.isArray(body.urls) ? body.urls.map(String).filter(Boolean).slice(0, 8) : [];
    const snapshots = await Promise.all(urls.map(inspect));
    return NextResponse.json({ ok: true, snapshots });
  } catch (err) {
    return adminError(err, 'PROFILE_SOCIAL_SNAPSHOT_FAILED');
  }
}
