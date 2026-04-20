import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

const TOKEN_MAX_AGE_MS = 8 * 60 * 60 * 1000 // 8 hours

function isValidAdminToken(token: string): boolean {
  const secret = process.env.ADMIN_TOKEN_SECRET
  if (!secret) return false

  const lastDot = token.lastIndexOf('.')
  if (lastDot === -1) return false
  const payload = token.slice(0, lastDot)
  const sig = token.slice(lastDot + 1)
  const expected = createHmac('sha256', secret).update(payload).digest('hex')

  if (sig !== expected) return false

  // Payload format: "<id>:<email>:<issuedAtMs>"
  const parts = payload.split(':')
  const issuedAt = parseInt(parts[parts.length - 1], 10)
  if (isNaN(issuedAt)) return false
  if (Date.now() - issuedAt > TOKEN_MAX_AGE_MS) return false

  return true
}

export function middleware(request: NextRequest) {
  const tokenCookie = request.cookies.get('admin-token')
  const isAdmin = request.nextUrl.pathname.startsWith('/admin')
  const isLogin = request.nextUrl.pathname === '/admin/login'

  if (isAdmin && !isLogin && (!tokenCookie || !isValidAdminToken(tokenCookie.value))) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
