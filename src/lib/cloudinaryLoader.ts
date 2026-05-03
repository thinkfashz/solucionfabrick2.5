/**
 * Cloudinary URL helpers for on-the-fly image optimisation.
 *
 * Goal: every image we render in the public site that lives on
 * `res.cloudinary.com` (or a custom Cloudinary CNAME) gets `f_auto,q_auto`
 * (modern format negotiation + perceptual quality) and a width capped to
 * the device's actual viewport. This is the single biggest mobile-LCP win
 * we can ship without changing assets.
 *
 * Non-Cloudinary URLs (e.g. Unsplash hot-links from old seed data, data:
 * URIs, /local/static files) pass through untouched — the loader becomes a
 * no-op so callers can use it unconditionally for `image_url` fields whose
 * origin is unknown.
 *
 * Idempotency: if the URL already contains `f_auto`/`q_auto`/`w_<n>` in its
 * `/upload/<transformations>/` segment we won't duplicate them. This means
 * applying the loader to admin-pasted, already-optimised URLs is safe.
 */

const CLOUDINARY_HOST_RE = /(^|\.)res\.cloudinary\.com$/i;
const UPLOAD_SEGMENT_RE = /\/(upload|fetch|private|authenticated)\//;

export interface CloudinaryParams {
  /** Target rendered width in CSS pixels. The loader caps to this. */
  width?: number;
  /** 1..100 — overrides `q_auto` when explicitly set (e.g. for hero images). */
  quality?: number;
  /** Pass `'auto'` so Cloudinary multiplies width by client DPR. */
  dpr?: 'auto' | number;
  /** Crop mode. Defaults to `c_limit` so we never upscale beyond the asset. */
  crop?: 'limit' | 'fill' | 'fit' | 'scale';
}

/** True if the URL is hosted on Cloudinary's delivery domain. */
export function isCloudinaryUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
  try {
    const u = new URL(url);
    return CLOUDINARY_HOST_RE.test(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Returns a Cloudinary URL with `f_auto,q_auto[,w_<width>,dpr_auto,c_limit]`
 * injected after the `/upload/` (or `/fetch/`/`/private/`/`/authenticated/`)
 * segment. Non-Cloudinary URLs are returned unchanged.
 */
export function cloudinaryUrl(url: string, params: CloudinaryParams = {}): string {
  if (!isCloudinaryUrl(url)) return url;

  const match = url.match(UPLOAD_SEGMENT_RE);
  if (!match || match.index === undefined) return url;

  const headEnd = match.index + match[0].length; // includes trailing slash
  const head = url.slice(0, headEnd);
  const tail = url.slice(headEnd);

  // The current first path segment after /upload/ may already be a
  // transformation list (no slash before, contains commas like `f_auto,q_80`).
  // Detect and merge instead of stacking duplicate prefixes.
  const slashIdx = tail.indexOf('/');
  const firstSegment = slashIdx === -1 ? tail : tail.slice(0, slashIdx);
  const rest = slashIdx === -1 ? '' : tail.slice(slashIdx); // includes leading '/'

  const isTxList = looksLikeTransformList(firstSegment);
  const existingTokens = isTxList ? firstSegment.split(',').filter(Boolean) : [];
  const existingKeys = new Set(existingTokens.map((t) => t.split('_')[0]));
  const additions: string[] = [];

  // f_auto / q_auto (or numeric quality override)
  if (!existingKeys.has('f')) additions.push('f_auto');
  if (!existingKeys.has('q')) {
    additions.push(typeof params.quality === 'number' ? `q_${clamp(params.quality, 1, 100)}` : 'q_auto');
  }
  // width / crop / dpr — only when caller asked for them
  if (typeof params.width === 'number' && params.width > 0 && !existingKeys.has('w')) {
    additions.push(`w_${Math.round(params.width)}`);
    if (!existingKeys.has('c')) additions.push(`c_${params.crop ?? 'limit'}`);
  }
  if (params.dpr !== undefined && !existingKeys.has('dpr')) {
    additions.push(`dpr_${params.dpr}`);
  }

  if (additions.length === 0 && isTxList) return url; // already optimised

  const merged = [...existingTokens, ...additions].join(',');

  if (isTxList) {
    return `${head}${merged}${rest}`;
  }
  // First segment was the public-id (no transforms yet) — keep `tail` intact
  // and prepend our transformation segment.
  return `${head}${merged}/${tail}`;
}

/**
 * `next/image` compatible loader. Pass as `loader={cloudinaryLoader}` on
 * `<Image>` so Next.js delegates URL generation to us. For non-Cloudinary
 * sources we still return the original URL — `<Image>` will then bypass its
 * built-in optimiser via `unoptimized` (caller's responsibility) or, more
 * commonly, the loader is set on a per-image basis only when the source is
 * known to be Cloudinary.
 */
export function cloudinaryLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return cloudinaryUrl(src, { width, quality, dpr: 'auto' });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function looksLikeTransformList(segment: string): boolean {
  // Cloudinary transformation tokens are `<key>_<value>` joined by commas.
  // Public IDs typically don't contain underscores in that exact pattern at
  // the start. A heuristic that matches the real-world format reliably:
  // starts with two letters + underscore (e.g. f_, q_, w_, c_, dpr_, l_).
  return /^[a-z]{1,5}_[^/]/i.test(segment) && (segment.includes(',') || /^[a-z]{1,5}_[a-z0-9.]+$/i.test(segment));
}
