# Node.js Deprecation Triage Report

**Date:** December 23, 2025
**Environment:** Frontend (Next.js 16.1.0, Node.js 22+)

## Summary
The following `DeprecationWarning`s were reported during frontend execution:
1. `[DEP0169] DeprecationWarning: url.parse()`
2. `[DEP0060] DeprecationWarning: util._extend`

## Investigation Results
- **Source Code Check**: A comprehensive search of `frontend/src` and configuration files returned **zero matches**. Your project's source code is already using modern standards.
- **Root Cause**: These warnings are originating from **third-party dependencies** within `node_modules`. 
  - `DEP0169` is commonly triggered by older networking or OAuth libraries (e.g., sub-dependencies of `next-auth` or `webpack`).
  - `DEP0060` is often found in legacy utility wrappers used by older build tools.

## Triage & Severity
- **Severity**: **LOW**. These are warnings, not errors. They do not impact the current functionality of the BGC Replica application.
- **Implication**: In future major versions of Node.js (e.g., Node 24+), these APIs may be removed, which would cause dependencies using them to fail if they aren't updated by their maintainers.

## Recommendations

### 1. Maintain Dependency Updates
Continue keeping your dependencies updated. Maintainers of major libraries (Next.js, Auth.js) are actively working to remove these legacy calls in their release cycles.
```bash
cd frontend
npm update
```

### 2. Implementation Guidelines (for future code)
If you need to perform URL parsing or object extension in new code, follow these modern standards:

**URL Parsing:**
```typescript
// DON'T USE (Deprecated)
// const url = require('url').parse(urlString);

// DO USE (WHATWG URL API)
const url = new URL(urlString);
console.log(url.hostname);
```

**Object Extension:**
```typescript
// DON'T USE (Deprecated)
// const newObj = require('util')._extend(obj1, obj2);

// DO USE (Modern JS)
const newObj = Object.assign({}, obj1, obj2);
// OR (Spread Operator - Recommended)
const newObj = { ...obj1, ...obj2 };
```

### 3. Identifying Specific Culprits
If you wish to identify exactly which package is causing the warning, run the dev server with the trace flag:
```powershell
# From the frontend directory
node --trace-deprecation node_modules/next/dist/bin/next dev
```
This will print a stack trace for every warning, pointing to the exact file in `node_modules`.
