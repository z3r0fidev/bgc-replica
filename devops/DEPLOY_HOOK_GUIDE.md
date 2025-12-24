# Deployment Hook Configuration Guide

**Date:** December 23, 2025
**Context:** BGC Replica Backend Deployment (FastAPI)

## Overview
This guide explains how to set up a `DEPLOY_HOOK_URL` to automate backend deployments via GitHub Actions. A deployment hook is a unique URL provided by your hosting platform (Render, Railway, etc.) that triggers a fresh build and deploy when accessed (usually via a `POST` request).

## Supported Providers & Instructions

### Option 1: Render.com (Recommended)
Render provides native "Deploy Hooks" for services.
1.  **Navigate:** Go to your Service Dashboard > Settings.
2.  **Locate:** Scroll down to the "Build & Deploy" section.
3.  **Create:** Look for "Deploy Hook" and copy the provided URL.
    *   *Format:* `https://api.render.com/deploy/srv-xxxxxx?key=yyyyyy`
4.  **GitHub Secret:** Add this URL as `DEPLOY_HOOK_URL`.

### Option 2: Railway.app (Recommended)
Railway supports deployment triggers via their CLI.
*   **Recommendation:** Use the official Railway CLI Docker image in GitHub Actions (`ghcr.io/railwayapp/cli:latest`). This is more reliable than raw webhooks and supports service linking.
*   **Requirement:** Create a `RAILWAY_TOKEN` in your project settings and add it as a GitHub Secret.

### Option 3: Custom/Generic (AWS Lambda / Other)
If hosting on a custom VPS or cloud function:
1.  **Endpoint:** Create an authenticated API endpoint (e.g., `/api/webhooks/deploy`).
2.  **Logic:** The endpoint should trigger a `git pull` and restart the service (e.g., via a systemd script or Docker command).
3.  **Security:** Ensure the endpoint requires a secret key (passed via query param or header) to prevent unauthorized deployments.

---

## Implementation Steps (Railway CLI Method)

1.  **Obtain Token:** 
    *   Go to Railway Dashboard > Settings > Tokens.
    *   Generate a new token (or use an existing one).
2.  **Add Secret:**
    *   Go to GitHub Repo > Settings > Secrets and variables > Actions.
    *   New Repository Secret.
    *   Name: `RAILWAY_TOKEN`.
    *   Value: (Paste your Railway Token).
3.  **Configure Workflow:** Create `.github/workflows/deploy.yml`:
    ```yaml
    name: Deploy
    on:
      push:
        branches: [main]
    jobs:
      deploy:
        runs-on: ubuntu-latest
        container: ghcr.io/railwayapp/cli:latest
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        steps:
          - uses: actions/checkout@v4
          - run: railway up
    ```
