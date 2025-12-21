# Frontend Developer Tools Guide

This guide outlines the implementation of essential developer tools for the Next.js 16 (React 19) frontend to improve component development, build performance, and runtime efficiency.

## 1. Storybook (Component Development & Documentation)
Storybook allows you to develop UI components in isolation, which is perfect for our `shadcn/ui` based architecture.

### Installation
```bash
npx storybook@latest init
```

### Configuration for Tailwind CSS 4
Next.js 16 + Tailwind 4 requires importing the global CSS into Storybook's preview.

1.  Update `.storybook/preview.ts`:
    ```typescript
    import type { Preview } from "@storybook/react";
    import "../src/app/globals.css"; // Path to your global CSS

    const preview: Preview = {
      parameters: {
        controls: {
          matchers: {
            color: /(background|color)$/i,
            date: /Date$/,
          },
        },
      },
    };

    export default preview;
    ```

### Usage
- Run Storybook: `npm run storybook`
- Create a story: `src/components/ui/button.stories.tsx`

---

## 2. Next Bundle Analyzer (Build Optimization)
Visualize the size of your JavaScript bundles to identify large dependencies.

### Installation
```bash
npm install -D @next/bundle-analyzer
```

### Configuration
Update `next.config.ts`:
```typescript
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig = {
  // your existing config
};

export default process.env.ANALYZE === "true" 
  ? withBundleAnalyzer({ enabled: true })(nextConfig) 
  : nextConfig;
```

### Usage
Run the analysis:
```bash
ANALYZE=true npm run build
```

---

## 3. React Scan (Runtime Performance)
Identify unnecessary re-renders in React 19.

### Installation
```bash
npm install react-scan
```

### Configuration
Add to `src/app/layout.tsx` (Development only):
```typescript
import { ReactScan } from "react-scan";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {process.env.NODE_ENV === "development" && <ReactScan />}
        {children}
      </body>
    </html>
  );
}
```

---

## 4. Pre-commit Hooks (Husky + lint-staged)
Ensure code quality before every commit.

### Installation
```bash
npx husky-init && npm install
npm install -D lint-staged
```

### Configuration
Update `package.json`:
```json
"lint-staged": {
  "*.{js,jsx,ts,tsx}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```
Update `.husky/pre-commit`:
```bash
npx lint-staged
```
