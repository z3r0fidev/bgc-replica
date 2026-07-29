import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Toaster } from "@/components/ui/sonner";
import { SocketProvider } from "@/providers/socket-provider";
import { OfflineIndicator } from "@/components/pwa/offline-indicator";
import { Navbar } from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"] });

// Forces every route to render dynamically (Issue #68, Phase 1). Nonce-based
// CSP requires a fresh per-request nonce on Next.js's own <script> tags, but
// statically-generated HTML is produced once at build time and can never
// carry a per-request value - confirmed empirically: on a page left static,
// Next's own script chunks rendered with no nonce attribute at all and were
// blocked by the enforcing CSP. This trades away static optimization/ISR
// caching app-wide for a working nonce-based script-src (a real cost,
// evaluated and accepted - see the Issue #68 plan for the full reasoning).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "BGCLive Replica",
  description: "A modern social networking platform",
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // next-themes injects a synchronous inline <script> (before hydration, to
  // avoid a flash of the wrong theme) that isn't one of Next's own
  // framework-injected scripts, so it doesn't get auto-nonced - it needs the
  // nonce passed explicitly. See src/proxy.ts, which sets this header.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <SocketProvider>
            <OfflineIndicator />
            <Navbar />
            {children}
          </SocketProvider>
          <Toaster />
          <InstallPrompt />
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
