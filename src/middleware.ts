import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buildCsp, generateNonce } from '@/lib/csp'
import { slugFromHostname, DEFAULT_TENANT_ID, DEFAULT_TENANT_SLUG } from '@/lib/tenant-edge'

const CUSTOM_DOMAIN_CACHE_COOKIE = 'x-cd-tenant'
const CUSTOM_DOMAIN_CACHE_TTL = 300

const VIEWER_BLOCKED_ADMIN_PATHS = [
  '/admin/equipo',
  '/admin/sql',
  '/admin/setup',
  '/admin/center',
  '/admin/extensions',
  '/admin/seguridad',
  '/admin/activar',
  '/admin/vercel-logs',
]

const VIEWER_WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function isPlatformHost(host: string): boolean {
  const h = host.split(':')[0].toLowerCase()
  return h === 'fabrick.cl' || h === 'www.fabrick.cl' ||
    h === 'solucionesfabrick.com' || h === 'www.solucionesfabrick.com' || h.endsWith('.solucionesfabrick.com') ||
    h.endsWith('.fabrick.cl') || h === 'localhost' || h.endsWith('.localhost') ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(h)
}

function normalizeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = (4 - (base64.length % 4)) % 4
  return base64 + '='.repeat(padding)
}

type EdgeSessionPayload = { exp?: number; rol?: string; tenant_id?: string }

function decodeSessionPayloadUnsafe(value: string): EdgeSessionPayload {
  try {
    const dotIdx = value.lastIndexOf('.')
    if (dotIdx === -1) return {}
    const data = value.slice(0, dotIdx)
    const payloadStr = atob(normalizeBase64Url(data))
    return JSON.parse(payloadStr) as EdgeSessionPayload
  } catch {
    return {}
  }
}

async function isValidSession(value: string): Promise<boolean> {
  try {
    const dotIdx = value.lastIndexOf('.')
    if (dotIdx === -1) return false
    const data = value.slice(0, dotIdx)
    const sigB64 = value.slice(dotIdx + 1)

    const secret = process.env.ADMIN_SESSION_SECRET
    if (!secret) {
      if (process.env.NODE_ENV === 'production') return false
      console.warn('[middleware] ADMIN_SESSION_SECRET is not set. Using insecure dev fallback.')
    }
    const effectiveSecret = secret ?? 'fabrick-admin-dev-only-secret'
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(effectiveSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const base64 = normalizeBase64Url(sigB64)
    const binaryStr = atob(base64)
    const sigBytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) sigBytes[i] = binaryStr.charCodeAt(i)

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data))
    if (!valid) return false

    const payload = decodeSessionPayloadUnsafe(value)
    if (typeof payload.exp !== 'number') return false
    if (Date.now() > payload.exp) return false
    return true
  } catch {
    return false
  }
}

function withSecurityHeaders(response: NextResponse, nonce: string, csp: string): NextResponse {
  response.headers.set('x-nonce', nonce)
  response.headers.set('Content-Security-Policy', csp)
  return response
}

function isHtmlRequest(request: NextRequest): boolean {
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/_next/')) return false
  if (pathname.startsWith('/api/')) return false
  if (pathname.startsWith('/sw.js')) return false
  if (/\.(?:png|jpe?g|gif|svg|webp|ico|css|js|map|txt|xml|webmanifest|woff2?|ttf|eot|mp4|webm|pdf)$/i.test(pathname)) return false
  return true
}

function isViewerBlockedPage(pathname: string): boolean {
  return VIEWER_BLOCKED_ADMIN_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function isAllowedViewerApiWrite(pathname: string): boolean {
  return pathname === '/api/admin/demo/events' || pathname === '/api/admin/logout'
}

function isIntegrationsApi(pathname: string): boolean {
  return pathname === '/api/admin/integrations' || pathname.startsWith('/api/admin/integrations/')
}

function isMainIntegrationsApi(pathname: string): boolean {
  return pathname === '/api/admin/integrations'
}

function tenantIntegrationRewriteTarget(pathname: string): string | null {
  if (pathname === '/api/admin/integrations') return '/api/admin/tenant-integrations'
  if (pathname === '/api/admin/integrations/reveal') return '/api/admin/tenant-integrations/reveal'
  if (pathname === '/api/admin/integrations/quota') return '/api/admin/tenant-integrations/quota'
  if (pathname === '/api/admin/integrations/test') return '/api/admin/tenant-integrations/test'
  if (pathname === '/api/admin/integrations/oauth/revoke') return '/api/admin/tenant-integrations/oauth/revoke'
  return null
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce()
  const isHtml = isHtmlRequest(request)
  const isDev = process.env.NODE_ENV !== 'production'
  const csp = buildCsp({ nonce, isDev })
  const pathname = request.nextUrl.pathname
  const method = request.method.toUpperCase()

  const sessionCookie = request.cookies.get('admin_session')
  let sessionPayload: EdgeSessionPayload = {}
  let validAdminSession = false

  if (sessionCookie?.value) {
    validAdminSession = await isValidSession(sessionCookie.value)
    if (validAdminSession) sessionPayload = decodeSessionPayloadUnsafe(sessionCookie.value)
  }

  if (pathname.startsWith('/api/admin') && VIEWER_WRITE_METHODS.has(method)) {
    if (validAdminSession && sessionPayload.rol === 'viewer' && !isAllowedViewerApiWrite(pathname)) {
      return NextResponse.json({ error: 'Modo demo: solo lectura. Acción bloqueada.' }, { status: 403 })
    }
  }

  if (isIntegrationsApi(pathname)) {
    if (!validAdminSession) {
      return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
    }
    if (sessionPayload.rol === 'viewer') {
      return NextResponse.json({ error: 'Modo demo: integraciones es una zona crítica.' }, { status: 403 })
    }
    if (isMainIntegrationsApi(pathname) && WRITE_METHODS.has(method) && sessionPayload.rol !== 'superadmin') {
      return NextResponse.json({ error: 'Solo superadmin puede modificar credenciales de integraciones.' }, { status: 403 })
    }
  }

  const isAdmin = pathname.startsWith('/admin')
  const isLogin = pathname === '/admin/login'
  const isJoin = pathname === '/admin/unirse'
  const isDemo = pathname === '/admin/acceso-demo'

  if (isAdmin && !isLogin && !isJoin && !isDemo) {
    if (!sessionCookie?.value || !validAdminSession) {
      const redirect = NextResponse.redirect(new URL('/admin/login', request.url))
      return isHtml ? withSecurityHeaders(redirect, nonce, csp) : redirect
    }

    const suspendedPath = '/admin/plan-suspendido'
    const isSuspendedPage = pathname === suspendedPath
    if (!isSuspendedPage && sessionPayload.tenant_id && sessionPayload.tenant_id !== DEFAULT_TENANT_ID) {
      const tenantStatus = request.cookies.get('tenant_status')?.value
      if (tenantStatus === 'suspended' || tenantStatus === 'cancelled') {
        const redirect = NextResponse.redirect(new URL(suspendedPath, request.url))
        return isHtml ? withSecurityHeaders(redirect, nonce, csp) : redirect
      }
    }

    if (sessionPayload.rol === 'viewer' && isViewerBlockedPage(pathname)) {
      const redirect = NextResponse.redirect(new URL('/admin?demo=blocked', request.url))
      return isHtml ? withSecurityHeaders(redirect, nonce, csp) : redirect
    }

    if (pathname.startsWith('/admin/equipo') && sessionPayload.rol !== 'superadmin') {
      const redirect = NextResponse.redirect(new URL('/admin?forbidden=team', request.url))
      return isHtml ? withSecurityHeaders(redirect, nonce, csp) : redirect
    }
  }

  const hostname = request.headers.get('host') ?? ''
  let tenantSlug = DEFAULT_TENANT_SLUG
  let tenantId: string | null = DEFAULT_TENANT_ID
  let tenantStatus: string | null = null

  if (isPlatformHost(hostname)) {
    tenantSlug = slugFromHostname(hostname) ?? DEFAULT_TENANT_SLUG
    if (tenantSlug === DEFAULT_TENANT_SLUG) tenantId = DEFAULT_TENANT_ID
    else tenantId = null
  } else {
    const cached = request.cookies.get(CUSTOM_DOMAIN_CACHE_COOKIE)?.value
    if (cached) {
      try {
        const { slug, id, status } = JSON.parse(cached) as { slug: string; id: string; status?: string }
        tenantSlug = slug
        tenantId = id
        tenantStatus = status ?? null
      } catch {}
    }

    if (tenantSlug === DEFAULT_TENANT_SLUG) {
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
      } catch {}
    }
  }

  if (!isPlatformHost(hostname) && (tenantStatus === 'suspended' || tenantStatus === 'cancelled')) {
    return new NextResponse(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Servicio suspendido</title></head>' +
      '<body style="font-family:sans-serif;text-align:center;padding:60px">' +
      '<h1>Tienda no disponible</h1>' +
      '<p>Esta tienda está temporalmente suspendida. Contacta al administrador para más información.</p>' +
      '</body></html>',
      { status: 402, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-slug', tenantSlug)
  if (tenantId) requestHeaders.set('x-tenant-id', tenantId)
  if (isHtml) {
    requestHeaders.set('x-nonce', nonce)
    requestHeaders.set('Content-Security-Policy', csp)
  }

  const integrationTarget = tenantIntegrationRewriteTarget(pathname)
  if (integrationTarget) {
    const rewriteUrl = request.nextUrl.clone()
    rewriteUrl.pathname = integrationTarget
    return NextResponse.rewrite(rewriteUrl, { request: { headers: requestHeaders } })
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })

  if (!isPlatformHost(hostname) && tenantSlug !== DEFAULT_TENANT_SLUG && tenantId) {
    response.cookies.set(CUSTOM_DOMAIN_CACHE_COOKIE,
      JSON.stringify({ slug: tenantSlug, id: tenantId, status: tenantStatus }),
      { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: CUSTOM_DOMAIN_CACHE_TTL, path: '/' }
    )
  }

  return isHtml ? withSecurityHeaders(response, nonce, csp) : response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|icon-.*\\.png|apple-touch-icon\\.png|.*\\.svg|sw\\.js|robots\\.txt|sitemap\\.xml|manifest\\.webmanifest).*)',
  ],
}
