# Research: PWA Modernization & Performance Optimization

## 1. Advanced PWA Integration

**Decision**: Use **`protocol_handlers`** for deep-linking and **`share_target`** for OS-level integration.

**Rationale**:
- **Protocol Handlers**: Registering `web+bgclive:` allows links like `web+bgclive://profile/123` to open the app directly, mimicking native app behavior.
- **Share Target**: Enables users to share photos/links from other apps (e.g., Photos gallery) directly into the BGCLive feed.
- **Next.js Integration**: Use `@ducanh2912/next-pwa` for robust Next.js 14 App Router support, enabling `withPWA` in `next.config.ts`.

## 2. Service Worker Caching Strategies

**Decision**: Use **Workbox Stale-While-Revalidate (SWR)** for the Social Feed API and **Cache-First** for static branding.

**Rationale**:
- **SWR**: Provides instant UI feedback by serving cached posts while fetching the latest community updates in the background.
- **Cache-First**: Maximizes performance for high-fidelity assets (logo, icons) that change infrequently.
- **Offline Support**: Ensures the "Offline Mode" can render the last known state of the feed without a network connection.

## 3. Social Feed Virtualization

**Decision**: Combine **`@tanstack/react-virtual`** with **`framer-motion`** layout animations.

**Rationale**:
- **DOM Efficiency**: Renders only ~10 active nodes regardless of feed size (SC-003), preventing memory leaks during long sessions.
- **Smooth UX**: `framer-motion`'s `layout` prop ensures items animate smoothly as they enter/exit the virtual window.
- **Precision**: `estimateSize` ensures scrollbars remain accurate even with variable-height community posts.

## 4. Edge Caching & CDN Optimization

**Decision**: Standardize on **`Cache-Control: public, max-age=31536000, immutable`** for media assets via Supabase Storage.

**Rationale**:
- **Latency**: Reduces TTFB to < 100ms (SC-004) by serving assets from the geographically nearest Edge node.
- **Cost**: Minimizes egress traffic from the primary Supabase origin.
- **Busting**: Use unique versioning query strings (e.g., `?v=timestamp`) for profile photo updates to bypass Edge caches when content changes.
