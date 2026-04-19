import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

export async function middleware(request: NextRequest) {
  const isAdmin = request.nextUrl.pathname.startsWith('/admin')
  const isLogin = request.nextUrl.pathname === '/admin/login'

  if (isAdmin && !isLogin) {
    const sessionCookie = request.cookies.get('admin_session')
    if (!sessionCookie?.value || !(await isValidSession(sessionCookie.value))) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
