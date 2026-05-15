import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buildCsp, generateNonce } from '@/lib/csp'
import { slugFromHostname, DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '@/lib/tenant-edge'

// Cookie name used to cache custom-domain → tenant resolution so we don't
// hit the DB on every request.
const CUSTOM_DOMAIN_CACHE_COOKIE = 'x-cd-tenant'
const CUSTOM_DOMAIN_CACHE_TTL = 300 // seconds (5 min)

/** True when the host belongs to the platform itself (not a client's domain). */
function isPlatformHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase()
  return h === 'fabrick.cl' || h === 'www.fabrick.cl' ||
    h.endsWith('.fabrick.cl') || h === 'localhost' || h.endsWith('.localhost') ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(h)
}

function normalizeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (base64.length % 4)) % 4
  return base64 + '='.repeat(padding)
}

/** Edge-compatible session validation (no Buffer dependency). */
async function isValidSession(value: string): Promise<boolean> {
  try {
    const dotIdx = value.lastIndexOf('.')
    if (dotIdx === -1) return false
    const data = value.slice(0, dotIdx)
    const sigB64 = value.slice(dotIdx + 1)

    const secret = process.env.ADMIN_SESSION_SECRET
    if (!secret) {
      if (process.env.NODE_ENV === 'production') {
        // No secret in production → safest behaviour is to reject every session.
        // Fix: set ADMIN_SESSION_SECRET in your deployment environment.
        return false
      }
    }
    const signingSecret = secret ?? 'fabrick-admin-dev-only-secret'
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(signingSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    // Convert base64url to Uint8Array
    const base64 = normalizeBase64Url(sigB64)
    const binaryStr = atob(base64)
    const sigBytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) sigBytes[i] = binaryStr.charCodeAt(i)

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))
    if (!valid) return false

    // Decode and validate payload expiry
    const payloadBase64 = normalizeBase64Url(data)
    const payloadStr = atob(payloadBase64)
    const payload = JSON.parse(payloadStr) as { exp?: number }
    if (typeof payload.exp !== 'number') return false
    if (Date.now() > payload.exp) return false

    return true
  } catch {
    return false
  }
}

/**
 * Attach a strict Content-Security-Policy with a per-request nonce to every
 * HTML navigation response. The nonce is also propagated via the `x-nonce`
 * request header so that server components rendering inline <script> blocks
 * (JSON-LD) can opt-in via `headers().get('x-nonce')`.
 */
function withSecurityHeaders(
  response: NextResponse,
  nonce: string,
  csp: string,
): NextResponse {
  // Make the nonce available to downstream route handlers / server components.
  response.headers.set('x-nonce', nonce)
  response.headers.set('Content-Security-Policy', csp)
  return response
}

function isHtmlRequest(request: NextRequest): boolean {
  // Skip assets, API endpoints, and Next.js internals. They don't benefit from
  // a nonce'd CSP (scripts aren't embedded in their responses) and carrying
  // the CSP on, e.g., JSON responses would block nothing useful.
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/_next/')) return false
  if (pathname.startsWith('/api/')) return false
  if (pathname.startsWith('/sw.js')) return false
  if (/\.(?:png|jpe?g|gif|svg|webp|ico|css|js|map|txt|xml|webmanifest|woff2?|ttf|eot|mp4|webm|pdf)$/i.test(pathname)) {
    return false
  }
  return true
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce()
  const isHtml = isHtmlRequest(request)
  const isDev = process.env.NODE_ENV !== 'production'
  const csp = buildCsp({ nonce, isDev })

  // Admin gate (unchanged, but now also emits the CSP nonce on its responses).
  const isAdmin = request.nextUrl.pathname.startsWith('/admin')
  const isLogin = request.nextUrl.pathname === '/admin/login'
  const isJoin = request.nextUrl.pathname === '/admin/unirse'
  const isDemo = request.nextUrl.pathname === '/admin/acceso-demo'

  if (isAdmin && !isLogin && !isJoin && !isDemo) {
    const sessionCookie = request.cookies.get('admin_session')
    if (!sessionCookie?.value || !(await isValidSession(sessionCookie.value))) {
      const redirect = NextResponse.redirect(new URL('/admin/login', request.url))
      return isHtml ? withSecurityHeaders(redirect, nonce, csp) : redirect
    }

    // Decode session to get tenant_id + rol (edge-compatible — no Node crypto)
    let sessionPayload: { rol?: string; tenant_id?: string } = {}
    try {
      const dotIdx = sessionCookie.value.lastIndexOf('.')
      if (dotIdx !== -1) {
        const data = sessionCookie.value.slice(0, dotIdx)
        const payloadStr = atob(normalizeBase64Url(data))
        sessionPayload = JSON.parse(payloadStr) as typeof sessionPayload
      }
    } catch { /* ignore */ }

    // Tenant status gate: suspended/cancelled tenants go to /admin/plan-suspendido
    // Skip for the default Fabrick tenant (platform owner)
    const suspendedPath = '/admin/plan-suspendido'
    const isSuspendedPage = request.nextUrl.pathname === suspendedPath
    if (!isSuspendedPage && sessionPayload.tenant_id &&
        sessionPayload.tenant_id !== DEFAULT_TENANT_ID) {
      const tenantStatus = request.cookies.get('tenant_status')?.value
      if (tenantStatus === 'suspended' || tenantStatus === 'cancelled') {
        const redirect = NextResponse.redirect(new URL(suspendedPath, request.url))
        return isHtml ? withSecurityHeaders(redirect, nonce, csp) : redirect
      }
    }

    // Role gate for /admin/equipo
    if (request.nextUrl.pathname.startsWith('/admin/equipo')) {
      if (sessionPayload.rol !== 'superadmin') {
        const redirect = NextResponse.redirect(new URL('/admin?forbidden=team', request.url))
        return isHtml ? withSecurityHeaders(redirect, nonce, csp) : redirect
      }
    }
  }

  // ── Tenant resolution ────────────────────────────────────────────────────
  const hostname = request.headers.get('host') ?? ''
  let tenantSlug = DEFAULT_TENANT_SLUG
  let tenantId: string | null = DEFAULT_TENANT_ID
  let tenantStatus: string | null = null

  if (isPlatformHost(hostname)) {
    // ── Platform host: resolve slug from subdomain ──────────────────────────
    tenantSlug = slugFromHostname(hostname) ?? DEFAULT_TENANT_SLUG
    if (tenantSlug === DEFAULT_TENANT_SLUG) tenantId = DEFAULT_TENANT_ID
    else tenantId = null // will be resolved by the first handler that needs it
  } else {
    // ── Custom domain: tiendamarta.cl, etc. ────────────────────────────────
    // Check cookie cache first to avoid a DB round-trip on every request.
    const cached = request.cookies.get(CUSTOM_DOMAIN_CACHE_COOKIE)?.value
    if (cached) {
      try {
        const { slug, id, status } = JSON.parse(cached) as { slug: string; id: string; status?: string }
        tenantSlug = slug
        tenantId = id
        tenantStatus = status ?? null
      } catch { /* stale/corrupt cookie — fall through to fresh lookup */ }
    }

    if (tenantSlug === DEFAULT_TENANT_SLUG) {
      // Fresh lookup: call our own domain-resolve endpoint.
      // This adds ~50ms on the first request; the cookie caches it for 5 min.
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
          ? (process.env.NEXT_PUBLIC_APP_URL.startsWith('http') ? process.env.NEXT_PUBLIC_APP_URL : `https://${process.env.NEXT_PUBLIC_APP_URL}`)
          : `https://${request.headers.get('x-forwarded-host') ?? 'fabrick.cl'}`
        const res = await fetch(
          `${baseUrl}/api/tenant/domain-resolve?host=${encodeURIComponent(hostname)}`,
          { cache: 'no-store', signal: AbortSignal.timeout(5_000) }
        )
        if (res.ok) {
          const json = await res.json() as { slug: string; tenant_id: string; status: string }
          tenantSlug = json.slug
          tenantId = json.tenant_id
          tenantStatus = json.status
        }
      } catch { /* lookup failed — serve default tenant as fallback */ }
    }
  }

  // Block suspended/cancelled tenants at the edge for custom domains
  if (!isPlatformHost(hostname) &&
      (tenantStatus === 'suspended' || tenantStatus === 'cancelled')) {
    return new NextResponse(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Servicio suspendido</title></head>' +
      '<body style="font-family:sans-serif;text-align:center;padding:60px">' +
      '<h1>Tienda no disponible</h1>' +
      '<p>Esta tienda está temporalmente suspendida. Contacta al administrador para más información.</p>' +
      '</body></html>',
      { status: 402, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  // Build request headers with tenant context
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenantSlug)
  if (tenantId) requestHeaders.set('x-tenant-id', tenantId)
  if (isHtml) {
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', csp)
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  // Cache custom domain resolution in a cookie
  if (!isPlatformHost(hostname) && tenantSlug !== DEFAULT_TENANT_SLUG && tenantId) {
    response.cookies.set(CUSTOM_DOMAIN_CACHE_COOKIE,
      JSON.stringify({ slug: tenantSlug, id: tenantId, status: tenantStatus }),
      { httpOnly: true, sameSite: 'lax', maxAge: CUSTOM_DOMAIN_CACHE_TTL, path: '/' }
    )
  }

  return isHtml ? withSecurityHeaders(response, nonce, csp) : response
}

export const config = {
  /*
   * Match every path except Next.js internals and static assets, so the CSP is
   * attached to all HTML navigations — not just /admin.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon-.*\\.png|apple-touch-icon\\.png|.*\\.svg|sw\\.js|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest).*)',
  ],
}
