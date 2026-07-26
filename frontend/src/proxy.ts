import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Shared origin allowlists, kept as single sources of truth so the
// enforcing and report-only policies below can't drift from each other.
const IMG_SRC = "'self' data: https://*.supabase.co https://lh3.googleusercontent.com https://*.sentry.io"
const CONNECT_SRC = "'self' http://localhost:8000 http://127.0.0.1:8000 ws://localhost:8000 ws://127.0.0.1:8000 https://*.up.railway.app wss://*.up.railway.app https://*.supabase.co wss://*.supabase.co https://*.sentry.io blob:"
const FRAME_SRC = "'self' https://accounts.google.com"

// Static `<style>` elements that a handful of dependencies inject via JS at
// module/mount time - fixed content, not per-request, so a CSP hash source
// covers them permanently (until the dependency version bumps and changes
// the string) without weakening style-src-elem's nonce restriction.
// Verified empirically (Issue #127): built the app (`next build && next
// start`), loaded a real page in Chromium, read each <style> element's
// actual textContent, and hashed exactly that - not derived from source by
// inspection, since a JS bundler could in principle alter the string.
const STYLE_ELEM_HASHES = [
  // sonner@2.0.7's Toaster component - one `<style>` with its complete
  // component CSS, appended unconditionally on mount via an internal
  // `__insertCSS` helper with no nonce/hash support in this version (no
  // public API to inject one). Present on every page via the root layout's
  // <Toaster />.
  `'sha256-CIxDM5jnsGiKqXs2v7NKCY5MzdR9gu6TtiMJrDw29AY='`,
  // @radix-ui/react-scroll-area@1.2.10's Viewport - one `<style>` hiding the
  // native scrollbar, via dangerouslySetInnerHTML with no nonce/hash prop.
  // Present wherever ScrollArea renders (e.g. /chat, /users).
  `'sha256-vGQdhYJbTuF+M8iCn1IZCHpdkiICocWHDq4qnQF4Rjw='`,
  // @radix-ui/react-select@2.2.6's Viewport - same pattern as ScrollArea
  // above, same fixed scrollbar-hiding CSS (different selector). Only
  // present while a Select's dropdown is open, so not caught by the
  // page-load-only E2E spec, but the same static-string reasoning applies -
  // hash taken directly from the installed package's source, not triggered
  // live (@radix-ui/react-scroll-area's matching live-vs-source hash
  // confirmed this is a safe substitute for the ones that can't easily be
  // triggered by a page load alone).
  `'sha256-441zG27rExd4/il+NvIqyL8zFx5XmyNQtE381kSkUJk='`,
]

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

  // style-src is split (Issue #68, Phase 2): style-src-elem is
  // nonce-restricted like script-src, but style-src-attr stays permissive
  // since Radix/Framer Motion/@tanstack/react-virtual/@dnd-kit set inline
  // style *attributes* via JS at runtime - no nonce source expression can
  // cover style-src-attr at all, so this is a deliberate, documented
  // exception rather than an oversight. See Issue #127 for the full
  // reasoning and the Report-Only baseline data that shaped this split.
  const styleSrcElem = `style-src-elem 'self' 'nonce-${nonce}' ${STYLE_ELEM_HASHES.join(' ')}`
  const styleSrcAttr = `style-src-attr 'unsafe-inline'`

  const enforced = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    styleSrcElem,
    styleSrcAttr,
    ...BASE_DIRECTIVES,
  ].join('; ')

  // Report-Only forward-tests the next tightening target ahead of actually
  // enforcing it, reusing this request's real nonce. style-src-attr has no
  // stricter target to forward-test (see comment above), so it's identical
  // to the enforced value here.
  const reportOnly = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    styleSrcElem,
    styleSrcAttr,
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
