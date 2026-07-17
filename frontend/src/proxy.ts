import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Shared origin allowlists, kept as single sources of truth so the
// enforcing and report-only policies below can't drift from each other.
const IMG_SRC = "'self' data: https://*.supabase.co https://lh3.googleusercontent.com https://*.sentry.io"
const CONNECT_SRC = "'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:8000 ws://127.0.0.1:8000 https://*.up.railway.app wss://*.up.railway.app https://*.supabase.co wss://*.supabase.co https://*.sentry.io blob:"
const FRAME_SRC = "'self' https://accounts.google.com"

// Directives that don't need a per-request nonce and aren't part of the
// Phase 1/Phase 2 script-src/style-src work - added now per issue #68's
// security review since they're zero functional cost. frame-ancestors is
// CSP3's replacement for X-Frame-Options (both are sent; X-Frame-Options
// covers browsers without CSP3 support).
const BASE_DIRECTIVES = [
  `img-src ${IMG_SRC}`,
  `font-src 'self' data:`,
  `connect-src ${CONNECT_SRC}`,
  `frame-src ${FRAME_SRC}`,
  `worker-src 'self' blob:`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'self'`,
  `upgrade-insecure-requests`,
  `report-uri /api/csp-report`,
]

/**
 * Builds this request's enforcing and report-only CSP header values from a
 * shared per-request nonce. Content-Security-Policy generation moved here
 * (Issue #68, Phase 1) from next.config.ts's static headers() - a static
 * config can't produce a fresh per-request nonce, which is what makes
 * nonce-based script-src (vs. the 'unsafe-inline'/'unsafe-eval' it
 * replaces) possible.
 */
function buildCsp(nonce: string) {
  // React uses eval() in dev to reconstruct server-side error stacks for
  // the browser - documented Next.js behavior, not a workaround. Neither
  // React nor Next.js use eval in production.
  const isDev = process.env.NODE_ENV === 'development'
  const scriptSrc = `'self' 'nonce-${nonce}' 'strict-dynamic' https://accounts.google.com${isDev ? " 'unsafe-eval'" : ''}`

  const enforced = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // style-src is intentionally unchanged here (still 'unsafe-inline') -
    // Phase 2 splits this into style-src-elem (nonce-restricted) /
    // style-src-attr (kept permissive), since Radix/Framer Motion/
    // @tanstack/react-virtual/@dnd-kit set inline style *attributes* via
    // JS at runtime, which nonces cannot cover at all. See the Issue #68
    // plan for the full reasoning.
    `style-src 'self' 'unsafe-inline'`,
    ...BASE_DIRECTIVES,
  ].join('; ')

  // Report-Only forward-tests the Phase 2 target (style-src split) ahead
  // of actually enforcing it, reusing this request's real nonce so the
  // nonce-restricted style-src-elem test is meaningful rather than
  // comparing against a value nothing can ever match.
  const reportOnly = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `style-src-elem 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-inline'`,
    ...BASE_DIRECTIVES,
  ].join('; ')

  return { enforced, reportOnly }
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const { enforced, reportOnly } = buildCsp(nonce)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)

  const token = request.cookies.get('access_token')?.value || request.headers.get('Authorization')?.split(' ')[1]

  // Define protected routes
  const protectedPrefixes = ['/settings', '/profile', '/dashboard', '/feed', '/forums', '/chat', '/rooms', '/groups', '/users', '/connections', '/admin']
  const isProtectedRoute = protectedPrefixes.some(prefix => request.nextUrl.pathname.startsWith(prefix))

  let response: NextResponse

  if (isProtectedRoute && !token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('from', request.nextUrl.pathname)
    response = NextResponse.redirect(url)
  } else if (token && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    response = NextResponse.redirect(new URL('/', request.url))
  } else {
    response = NextResponse.next({ request: { headers: requestHeaders } })
  }

  response.headers.set('Content-Security-Policy', enforced)
  response.headers.set('Content-Security-Policy-Report-Only', reportOnly)
  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
