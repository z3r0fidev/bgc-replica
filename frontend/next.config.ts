import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true,
  },
});

import path from "path";

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    root: path.resolve("."),
  },

  // Performance optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      'date-fns',
      'lodash',
    ],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },

  // Compression
  compress: true,

  // Output optimization
  poweredByHeader: false,

  async rewrites() {
    // This was previously hardcoded to http://127.0.0.1:8000 unconditionally
    // - correct for local `next dev`, but unreachable from Vercel's
    // infrastructure in any deployed environment.
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    // `fallback`, not a plain array (Issue #144). A plain-array return is
    // Next's implicit "afterFiles" phase, which is checked before dynamic
    // routes are resolved - that shadowed this app's own dynamic API routes
    // (src/app/api/auth/[...nextauth]/route.ts) behind this catch-all,
    // sending NextAuth's own /api/auth/* traffic to the backend (which has
    // no such routes) and 404ing Google OAuth/Passkey sign-in in
    // production. `fallback` rewrites only run after Next has tried and
    // failed to resolve the request against its own routes (static AND
    // dynamic), so real app routes now win and only genuinely
    // backend-owned /api/* paths get proxied.
    //
    // vercel.json used to carry an identical rewrite "so both mechanisms
    // agree regardless of which one actually handles a given request on
    // Vercel" - that hedge turned out to be load-bearing in the wrong
    // direction: a live Vercel preview deployment of this exact fix still
    // 404'd on /api/auth/providers even though the build output confirmed
    // the [...nextauth] route compiled correctly, meaning vercel.json's
    // flat (equivalent-to-afterFiles) rewrite was still shadowing it on
    // Vercel's actual routing layer regardless of this file's `fallback`
    // phase. Removed vercel.json's copy so this is the single source of
    // truth for the /api/* proxy - see vercel.json's git history and the
    // Issue #144 PR for the full investigation.
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${apiUrl}/api/:path*`,
        },
      ],
    };
  },
  async headers() {
    // Content-Security-Policy and Content-Security-Policy-Report-Only are
    // NOT set here (Issue #68, Phase 1) - they need a fresh per-request
    // nonce for script-src, which a static next.config.ts can't produce.
    // See src/proxy.ts, which sets both on every response this config's
    // own matcher covers (all HTML document routes). Static assets/API
    // routes excluded by that matcher don't need a CSP header.
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(withPWA(nextConfig), {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "openlogic-distribution-ltd",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
});
