import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buildCsp, generateNonce } from '@/lib/csp'

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

    const secret = process.env.ADMIN_SESSION_SECRET ?? 'fabrick-admin-dev-only-secret'
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
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
  request: NextRequest,
  response: NextResponse,
  nonce: string,
): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production'
  const csp = buildCsp({ nonce, isDev })

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

  // Admin gate (unchanged, but now also emits the CSP nonce on its responses).
  const isAdmin = request.nextUrl.pathname.startsWith('/admin')
  const isLogin = request.nextUrl.pathname === '/admin/login'
  const isJoin = request.nextUrl.pathname === '/admin/unirse'

  if (isAdmin && !isLogin && !isJoin) {
    const sessionCookie = request.cookies.get('admin_session')
    if (!sessionCookie?.value || !(await isValidSession(sessionCookie.value))) {
      const redirect = NextResponse.redirect(new URL('/admin/login', request.url))
      return isHtml ? withSecurityHeaders(request, redirect, nonce) : redirect
    }

    // Check role restriction for /admin/equipo
    if (request.nextUrl.pathname.startsWith('/admin/equipo')) {
      try {
        const dotIdx = sessionCookie.value.lastIndexOf('.')
        if (dotIdx !== -1) {
          const data = sessionCookie.value.slice(0, dotIdx)
          const payloadBase64 = normalizeBase64Url(data)
          const payloadStr = atob(payloadBase64)
          const payload = JSON.parse(payloadStr) as { rol?: string }
          if (payload.rol !== 'superadmin') {
            const redirect = NextResponse.redirect(new URL('/admin?forbidden=team', request.url))
            return isHtml ? withSecurityHeaders(request, redirect, nonce) : redirect
          }
        }
      } catch {
        const redirect = NextResponse.redirect(new URL('/admin/login', request.url))
        return isHtml ? withSecurityHeaders(request, redirect, nonce) : redirect
      }
    }
  }

  if (!isHtml) return NextResponse.next()

  // Forward the nonce on the REQUEST so server components can read it via `headers()`.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  return withSecurityHeaders(request, response, nonce)
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
